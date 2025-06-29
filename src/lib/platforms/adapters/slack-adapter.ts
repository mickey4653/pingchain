// Slack Platform Adapter
// Implements the PlatformAdapter interface for Slack integration

import { PlatformAdapter, PlatformMessage, PlatformContact, PlatformConfig } from '../index'

export interface SlackConfig extends PlatformConfig {
  botToken: string
  appToken: string
  signingSecret: string
  channels: string[]
}

export class SlackAdapter extends PlatformAdapter {
  name = 'slack'
  config: SlackConfig
  private isConnectedFlag = false
  private syncInterval?: NodeJS.Timeout
  
  constructor(config: SlackConfig) {
    super()
    this.config = config
  }
  
  async connect(): Promise<boolean> {
    try {
      // Test connection by fetching team info
      const response = await fetch('https://slack.com/api/team.info', {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`)
      }
      
      this.isConnectedFlag = true
      console.log(`✅ Connected to Slack workspace: ${data.team.name}`)
      return true
      
    } catch (error) {
      console.error('❌ Failed to connect to Slack:', error)
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
    console.log('🔌 Disconnected from Slack')
  }
  
  isConnected(): boolean {
    return this.isConnectedFlag
  }
  
  async getMessages(contactId?: string, limit: number = 50): Promise<PlatformMessage[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Slack')
    }
    
    try {
      const messages: PlatformMessage[] = []
      
      // Get messages from all configured channels
      for (const channelId of this.config.channels) {
        const response = await fetch(`https://slack.com/api/conversations.history`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: channelId,
            limit: Math.min(limit, 100)
          })
        })
        
        if (!response.ok) {
          console.error(`Failed to fetch messages from channel ${channelId}`)
          continue
        }
        
        const data = await response.json()
        if (!data.ok) {
          console.error(`Slack API error for channel ${channelId}:`, data.error)
          continue
        }
        
        // Convert Slack messages to PlatformMessage format
        for (const slackMessage of data.messages) {
          if (slackMessage.type === 'message' && !slackMessage.subtype) {
            const message: PlatformMessage = {
              id: slackMessage.ts,
              platform: 'slack',
              contactId: slackMessage.user || 'unknown',
              content: slackMessage.text || '',
              timestamp: new Date(parseFloat(slackMessage.ts) * 1000),
              direction: 'inbound', // All messages from Slack are inbound
              metadata: {
                channelId,
                threadTs: slackMessage.thread_ts,
                reactions: slackMessage.reactions,
                attachments: slackMessage.attachments
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
      console.error('Error fetching Slack messages:', error)
      return []
    }
  }
  
  async sendMessage(contactId: string, content: string): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Slack')
    }
    
    try {
      // For Slack, contactId is the channel ID
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: contactId,
          text: content
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`)
      }
      
      const data = await response.json()
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`)
      }
      
      console.log(`✅ Message sent to Slack channel ${contactId}`)
      return data.ts // Return timestamp as message ID
      
    } catch (error) {
      console.error('Error sending Slack message:', error)
      throw error
    }
  }
  
  async getContacts(): Promise<PlatformContact[]> {
    if (!this.isConnected()) {
      throw new Error('Not connected to Slack')
    }
    
    try {
      const contacts: PlatformContact[] = []
      
      // Get users
      const usersResponse = await fetch('https://slack.com/api/users.list', {
        headers: {
          'Authorization': `Bearer ${this.config.botToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        if (usersData.ok) {
          for (const user of usersData.members) {
            if (!user.is_bot && !user.deleted) {
              contacts.push({
                id: user.id,
                platform: 'slack',
                name: user.real_name || user.name,
                identifier: user.id,
                avatar: user.profile?.image_72,
                lastSeen: new Date(user.updated * 1000)
              })
            }
          }
        }
      }
      
      // Get channels as contacts too
      for (const channelId of this.config.channels) {
        const channelResponse = await fetch('https://slack.com/api/conversations.info', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ channel: channelId })
        })
        
        if (channelResponse.ok) {
          const channelData = await channelResponse.json()
          if (channelData.ok) {
            contacts.push({
              id: channelData.channel.id,
              platform: 'slack',
              name: `#${channelData.channel.name}`,
              identifier: channelData.channel.id,
              lastSeen: new Date(channelData.channel.updated * 1000)
            })
          }
        }
      }
      
      return contacts
      
    } catch (error) {
      console.error('Error fetching Slack contacts:', error)
      return []
    }
  }
  
  async startSync(): Promise<void> {
    if (this.syncInterval) {
      return // Already syncing
    }
    
    console.log(`🔄 Starting Slack sync (${this.config.syncInterval || 5} minute intervals)`)
    
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
      console.log('🛑 Stopped Slack sync')
    }
  }
  
  private async performSync(): Promise<void> {
    try {
      // Get recent messages
      const messages = await this.getMessages(undefined, 20)
      
      // Get contacts
      const contacts = await this.getContacts()
      
      console.log(`📥 Synced ${messages.length} messages and ${contacts.length} contacts from Slack`)
      
      // Here you would typically emit events or call callbacks to notify the main system
      // For now, we'll just log the sync results
      
    } catch (error) {
      console.error('Error during Slack sync:', error)
    }
  }
} 