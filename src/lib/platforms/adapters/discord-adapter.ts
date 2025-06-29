// Discord Platform Adapter
// Implements the PlatformAdapter interface for Discord integration

import { PlatformAdapter, PlatformMessage, PlatformContact, PlatformConfig } from '../index'

export interface DiscordConfig extends PlatformConfig {
  botToken: string
  guildId: string
  channels: string[]
}

export class DiscordAdapter extends PlatformAdapter {
  name = 'discord'
  config: DiscordConfig
  private isConnectedFlag = false
  private syncInterval?: NodeJS.Timeout
  
  constructor(config: DiscordConfig) {
    super()
    this.config = config
  }
  
  async connect(): Promise<boolean> {
    try {
      // Test connection by fetching bot user info
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${this.config.botToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`)
      }
      
      const data = await response.json()
      this.isConnectedFlag = true
      console.log(`✅ Connected to Discord as: ${data.username}#${data.discriminator}`)
      return true
      
    } catch (error) {
      console.error('❌ Failed to connect to Discord:', error)
      this.isConnectedFlag = false
      return false
    }
  }
  
  async disconnect(): Promise<void> {
    this.isConnectedFlag = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
    console.log('🔌 Disconnected from Discord')
  }
  
  isConnected(): boolean {
    return this.isConnectedFlag
  }
  
  async getMessages(contactId?: string, limit: number = 50): Promise<PlatformMessage[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Discord')
    }
    
    try {
      const messages: PlatformMessage[] = []
      
      // Get messages from all configured channels
      for (const channelId of this.config.channels) {
        const response = await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`,
          {
            headers: {
              'Authorization': `Bot ${this.config.botToken}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (!response.ok) {
          console.error(`Failed to fetch messages from Discord channel ${channelId}`)
          continue
        }
        
        const discordMessages = await response.json()
        
        // Convert Discord messages to PlatformMessage format
        for (const discordMessage of discordMessages) {
          if (discordMessage.type === 0) { // Regular message
            const message: PlatformMessage = {
              id: discordMessage.id,
              platform: 'discord',
              contactId: discordMessage.author.id,
              content: discordMessage.content || '',
              timestamp: new Date(discordMessage.timestamp),
              direction: 'inbound', // All messages from Discord are inbound
              metadata: {
                channelId,
                guildId: discordMessage.guild_id,
                attachments: discordMessage.attachments,
                embeds: discordMessage.embeds,
                reactions: discordMessage.reactions
              }
            }
            
            // Filter by contact if specified
            if (!contactId || message.contactId === contactId) {
              messages.push(message)
            }
          }
        }
      }
      
      // Sort by timestamp (newest first)
      return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
    } catch (error) {
      console.error('Error fetching Discord messages:', error)
      return []
    }
  }
  
  async sendMessage(contactId: string, content: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Discord')
    }
    
    try {
      // For Discord, contactId is the channel ID
      const response = await fetch(`https://discord.com/api/v10/channels/${contactId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.config.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`✅ Message sent to Discord channel ${contactId}`)
      return data.id
      
    } catch (error) {
      console.error('Error sending Discord message:', error)
      throw error
    }
  }
  
  async getContacts(): Promise<PlatformContact[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Discord')
    }
    
    try {
      const contacts: PlatformContact[] = []
      
      // Get guild members
      const membersResponse = await fetch(
        `https://discord.com/api/v10/guilds/${this.config.guildId}/members?limit=1000`,
        {
          headers: {
            'Authorization': `Bot ${this.config.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (membersResponse.ok) {
        const members = await membersResponse.json()
        for (const member of members) {
          if (!member.user.bot) {
            contacts.push({
              id: member.user.id,
              platform: 'discord',
              name: member.nick || member.user.username,
              identifier: member.user.id,
              avatar: member.user.avatar ? 
                `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : 
                undefined,
              lastSeen: new Date()
            })
          }
        }
      }
      
      // Get channels as contacts too
      const channelsResponse = await fetch(
        `https://discord.com/api/v10/guilds/${this.config.guildId}/channels`,
        {
          headers: {
            'Authorization': `Bot ${this.config.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (channelsResponse.ok) {
        const channels = await channelsResponse.json()
        for (const channel of channels) {
          if (channel.type === 0) { // Text channel
            contacts.push({
              id: channel.id,
              platform: 'discord',
              name: `#${channel.name}`,
              identifier: channel.id,
              lastSeen: new Date()
            })
          }
        }
      }
      
      return contacts
      
    } catch (error) {
      console.error('Error fetching Discord contacts:', error)
      return []
    }
  }
  
  async startSync(): Promise<void> {
    if (this.syncInterval) {
      return // Already syncing
    }
    
    console.log(`🔄 Starting Discord sync (${this.config.syncInterval || 5} minute intervals)`)
    
    // Initial sync
    await this.performSync()
    
    // Set up periodic sync
    const intervalMs = (this.config.syncInterval || 5) * 60 * 1000
    this.syncInterval = setInterval(async () => {
      await this.performSync()
    }, intervalMs)
  }
  
  async stopSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
      console.log('🛑 Stopped Discord sync')
    }
  }
  
  private async performSync(): Promise<void> {
    try {
      // Get recent messages
      const messages = await this.getMessages(undefined, 20)
      
      // Get contacts
      const contacts = await this.getContacts()
      
      console.log(`📥 Synced ${messages.length} messages and ${contacts.length} contacts from Discord`)
      
      // Here you would typically emit events or call callbacks to notify the main system
      // For now, we'll just log the sync results
      
    } catch (error) {
      console.error('Error during Discord sync:', error)
    }
  }
} 