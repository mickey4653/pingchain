import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { SlackAdapter, SlackConfig } from '@/lib/platforms/adapters/slack-adapter'
import { DiscordAdapter, DiscordConfig } from '@/lib/platforms/adapters/discord-adapter'
import { PlatformManager } from '@/lib/platforms'

// Global platform manager instance
let platformManager: PlatformManager | null = null

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

    // Initialize platform manager if not exists
    if (!platformManager) {
      platformManager = new PlatformManager()
    }

    let adapter: SlackAdapter | DiscordAdapter

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

      // Register adapter with platform manager
      platformManager.registerAdapter(adapter)

      // Connect and start sync
      const connected = await adapter.connect()
      if (!connected) {
        return new NextResponse(`Failed to connect to ${platform}`, { status: 500 })
      }

      // Start synchronization
      await adapter.startSync()

      return NextResponse.json({
        success: true,
        platform,
        message: `Started syncing with ${platform}`,
        syncInterval: config.syncInterval
      })

    } catch (error) {
      console.error(`Error starting ${platform} sync:`, error)
      return new NextResponse(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
    }

  } catch (error) {
    console.error('Platform sync API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!platformManager) {
      return NextResponse.json({
        syncing: false,
        platforms: []
      })
    }

    // Get sync status for all platforms
    const platforms = Array.from(platformManager['adapters'].keys())
    
    return NextResponse.json({
      syncing: platforms.length > 0,
      platforms
    })

  } catch (error) {
    console.error('Platform sync status API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 