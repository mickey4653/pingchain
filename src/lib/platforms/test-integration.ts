// Test Platform Integration
// This file helps verify that the platform adapters are working correctly

import { SlackAdapter, SlackConfig } from './adapters/slack-adapter'
import { DiscordAdapter, DiscordConfig } from './adapters/discord-adapter'
import { PlatformManager } from './index'

export async function testPlatformIntegration() {
  console.log('🧪 Testing Platform Integration...')
  
  const platformManager = new PlatformManager()
  
  // Test Slack adapter (with mock config)
  console.log('\n📡 Testing Slack Adapter...')
  const slackConfig: SlackConfig = {
    platform: 'slack',
    enabled: true,
    botToken: 'test-token',
    appToken: 'test-app-token',
    signingSecret: 'test-secret',
    channels: ['C1234567890'],
    syncInterval: 5
  }
  
  const slackAdapter = new SlackAdapter(slackConfig)
  platformManager.registerAdapter(slackAdapter)
  
  // Test Discord adapter (with mock config)
  console.log('\n🎮 Testing Discord Adapter...')
  const discordConfig: DiscordConfig = {
    platform: 'discord',
    enabled: true,
    botToken: 'test-token',
    guildId: '123456789012345678',
    channels: ['1234567890123456789'],
    syncInterval: 5
  }
  
  const discordAdapter = new DiscordAdapter(discordConfig)
  platformManager.registerAdapter(discordAdapter)
  
  // Test platform manager
  console.log('\n🏗️ Testing Platform Manager...')
  console.log('Registered adapters:', Array.from(platformManager['adapters'].keys()))
  
  // Test connection (will fail with test tokens, but should handle errors gracefully)
  console.log('\n🔗 Testing Connections...')
  try {
    await platformManager.connectAll()
  } catch (error) {
    console.log('Expected connection failure with test tokens:', error)
  }
  
  console.log('\n✅ Platform Integration Test Complete!')
  console.log('\n📋 Next Steps:')
  console.log('1. Add real platform credentials in the UI')
  console.log('2. Test connections with real tokens')
  console.log('3. Start syncing messages and contacts')
  console.log('4. Integrate with Loop Core for message processing')
}

// Test individual adapter methods
export async function testSlackAdapter() {
  console.log('🧪 Testing Slack Adapter Methods...')
  
  const config: SlackConfig = {
    platform: 'slack',
    enabled: true,
    botToken: 'test-token',
    appToken: 'test-app-token',
    signingSecret: 'test-secret',
    channels: ['C1234567890'],
    syncInterval: 5
  }
  
  const adapter = new SlackAdapter(config)
  
  console.log('Adapter name:', adapter.name)
  console.log('Adapter config:', adapter.config)
  console.log('Is connected (should be false):', adapter.isConnected())
  
  try {
    await adapter.connect()
  } catch (error) {
    console.log('Expected connection failure:', error)
  }
  
  console.log('✅ Slack Adapter Test Complete!')
}

export async function testDiscordAdapter() {
  console.log('🧪 Testing Discord Adapter Methods...')
  
  const config: DiscordConfig = {
    platform: 'discord',
    enabled: true,
    botToken: 'test-token',
    guildId: '123456789012345678',
    channels: ['1234567890123456789'],
    syncInterval: 5
  }
  
  const adapter = new DiscordAdapter(config)
  
  console.log('Adapter name:', adapter.name)
  console.log('Adapter config:', adapter.config)
  console.log('Is connected (should be false):', adapter.isConnected())
  
  try {
    await adapter.connect()
  } catch (error) {
    console.log('Expected connection failure:', error)
  }
  
  console.log('✅ Discord Adapter Test Complete!')
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - expose test functions
  (window as any).testPlatformIntegration = testPlatformIntegration
  ;(window as any).testSlackAdapter = testSlackAdapter
  ;(window as any).testDiscordAdapter = testDiscordAdapter
  
  console.log('🧪 Platform integration tests available in browser console:')
  console.log('- testPlatformIntegration()')
  console.log('- testSlackAdapter()')
  console.log('- testDiscordAdapter()')
} 