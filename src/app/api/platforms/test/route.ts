import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { SlackAdapter, SlackConfig } from '@/lib/platforms/adapters/slack-adapter'
import { DiscordAdapter, DiscordConfig } from '@/lib/platforms/adapters/discord-adapter'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { platform, config } = await req.json()
    
    if (!platform || !config) {
      return new NextResponse('Missing platform or config', { status: 400 })
    }

    let adapter: SlackAdapter | DiscordAdapter
    let messageCount = 0
    let contactCount = 0

    try {
      switch (platform) {
        case 'slack':
          const slackConfig: SlackConfig = {
            platform: 'slack',
            enabled: true,
            botToken: config.credentials.botToken,
            appToken: config.credentials.appToken,
            signingSecret: config.credentials.signingSecret,
            channels: config.channels,
            syncInterval: config.syncInterval
          }
          adapter = new SlackAdapter(slackConfig)
          break
          
        case 'discord':
          const discordConfig: DiscordConfig = {
            platform: 'discord',
            enabled: true,
            botToken: config.credentials.botToken,
            guildId: config.credentials.guildId,
            channels: config.channels,
            syncInterval: config.syncInterval
          }
          adapter = new DiscordAdapter(discordConfig)
          break
          
        default:
          return new NextResponse(`Unsupported platform: ${platform}`, { status: 400 })
      }

      // Test connection
      const connected = await adapter.connect()
      if (!connected) {
        return new NextResponse(`Failed to connect to ${platform}`, { status: 500 })
      }

      // Get sample data to verify connection
      try {
        const messages = await adapter.getMessages(undefined, 5)
        messageCount = messages.length
        
        const contacts = await adapter.getContacts()
        contactCount = contacts.length
      } catch (error) {
        console.warn(`Warning: Could not fetch data from ${platform}:`, error)
        // Connection successful but data fetch failed - still consider it a success
      }

      // Disconnect
      await adapter.disconnect()

      return NextResponse.json({
        success: true,
        platform,
        messageCount,
        contactCount,
        message: `Successfully connected to ${platform}`
      })

    } catch (error) {
      console.error(`Error testing ${platform} connection:`, error)
      return new NextResponse(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
    }

  } catch (error) {
    console.error('Platform test API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 