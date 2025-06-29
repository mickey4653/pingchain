"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Settings, MessageSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PlatformConfig {
  platform: string
  enabled: boolean
  credentials: Record<string, string>
  channels: string[]
  syncInterval: number
}

interface PlatformStatus {
  platform: string
  connected: boolean
  lastSync?: Date
  messageCount: number
  contactCount: number
}

export function PlatformConfiguration() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<Record<string, PlatformConfig>>({})
  const [statuses, setStatuses] = useState<Record<string, PlatformStatus>>({})
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  
  // Load configurations from localStorage
  useEffect(() => {
    const savedConfigs = localStorage.getItem('platformConfigs')
    if (savedConfigs) {
      setConfigs(JSON.parse(savedConfigs))
    } else {
      // Default configurations
      setConfigs({
        slack: {
          platform: 'slack',
          enabled: false,
          credentials: {
            botToken: '',
            appToken: '',
            signingSecret: ''
          },
          channels: [],
          syncInterval: 5
        },
        discord: {
          platform: 'discord',
          enabled: false,
          credentials: {
            botToken: '',
            guildId: ''
          },
          channels: [],
          syncInterval: 5
        }
      })
    }
  }, [])
  
  // Save configurations to localStorage
  const saveConfigs = (newConfigs: Record<string, PlatformConfig>) => {
    localStorage.setItem('platformConfigs', JSON.stringify(newConfigs))
    setConfigs(newConfigs)
  }
  
  // Update configuration
  const updateConfig = (platform: string, updates: Partial<PlatformConfig>) => {
    const newConfigs = { ...configs }
    newConfigs[platform] = { ...newConfigs[platform], ...updates }
    saveConfigs(newConfigs)
  }
  
  // Update credentials
  const updateCredentials = (platform: string, key: string, value: string) => {
    const newConfigs = { ...configs }
    newConfigs[platform].credentials[key] = value
    saveConfigs(newConfigs)
  }
  
  // Add channel
  const addChannel = (platform: string, channel: string) => {
    if (!channel.trim()) return
    
    const newConfigs = { ...configs }
    if (!newConfigs[platform].channels.includes(channel)) {
      newConfigs[platform].channels.push(channel)
      saveConfigs(newConfigs)
    }
  }
  
  // Remove channel
  const removeChannel = (platform: string, channel: string) => {
    const newConfigs = { ...configs }
    newConfigs[platform].channels = newConfigs[platform].channels.filter(c => c !== channel)
    saveConfigs(newConfigs)
  }
  
  // Test platform connection
  const testConnection = async (platform: string) => {
    setTesting(platform)
    
    try {
      const config = configs[platform]
      const response = await fetch('/api/platforms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, config })
      })
      
      if (response.ok) {
        const result = await response.json()
        setStatuses(prev => ({
          ...prev,
          [platform]: {
            platform,
            connected: true,
            lastSync: new Date(),
            messageCount: result.messageCount || 0,
            contactCount: result.contactCount || 0
          }
        }))
        
        toast({
          title: 'Connection Successful',
          description: `Successfully connected to ${platform}!`,
        })
      } else {
        throw new Error('Connection failed')
      }
    } catch (error) {
      setStatuses(prev => ({
        ...prev,
        [platform]: {
          platform,
          connected: false,
          messageCount: 0,
          contactCount: 0
        }
      }))
      
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${platform}. Check your credentials.`,
        variant: 'destructive',
      })
    } finally {
      setTesting(null)
    }
  }
  
  // Start platform sync
  const startSync = async (platform: string) => {
    setLoading(true)
    
    try {
      const config = configs[platform]
      const response = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, config })
      })
      
      if (response.ok) {
        toast({
          title: 'Sync Started',
          description: `Started syncing with ${platform}.`,
        })
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: `Failed to start sync with ${platform}.`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'slack': return '💬'
      case 'discord': return '🎮'
      case 'whatsapp': return '📱'
      case 'imessage': return '💬'
      default: return '📡'
    }
  }
  
  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'slack': return 'Slack'
      case 'discord': return 'Discord'
      case 'whatsapp': return 'WhatsApp'
      case 'imessage': return 'iMessage'
      default: return platform
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(configs).map(([platform, config]) => (
            <Card key={platform} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getPlatformIcon(platform)}</span>
                    <div>
                      <h3 className="font-medium">{getPlatformName(platform)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.enabled ? 'default' : 'secondary'}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {statuses[platform] && (
                          <Badge variant={statuses[platform].connected ? 'default' : 'destructive'}>
                            {statuses[platform].connected ? 'Connected' : 'Disconnected'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => updateConfig(platform, { enabled })}
                  />
                </div>
              </CardHeader>
              
              {config.enabled && (
                <CardContent className="space-y-4">
                  {/* Credentials */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Credentials</h4>
                    
                    {platform === 'slack' && (
                      <>
                        <div>
                          <Label htmlFor={`${platform}-botToken`}>Bot Token</Label>
                          <Input
                            id={`${platform}-botToken`}
                            type="password"
                            value={config.credentials.botToken || ''}
                            onChange={(e) => updateCredentials(platform, 'botToken', e.target.value)}
                            placeholder="xoxb-your-bot-token"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${platform}-appToken`}>App Token</Label>
                          <Input
                            id={`${platform}-appToken`}
                            type="password"
                            value={config.credentials.appToken || ''}
                            onChange={(e) => updateCredentials(platform, 'appToken', e.target.value)}
                            placeholder="xapp-your-app-token"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${platform}-signingSecret`}>Signing Secret</Label>
                          <Input
                            id={`${platform}-signingSecret`}
                            type="password"
                            value={config.credentials.signingSecret || ''}
                            onChange={(e) => updateCredentials(platform, 'signingSecret', e.target.value)}
                            placeholder="your-signing-secret"
                          />
                        </div>
                      </>
                    )}
                    
                    {platform === 'discord' && (
                      <>
                        <div>
                          <Label htmlFor={`${platform}-botToken`}>Bot Token</Label>
                          <Input
                            id={`${platform}-botToken`}
                            type="password"
                            value={config.credentials.botToken || ''}
                            onChange={(e) => updateCredentials(platform, 'botToken', e.target.value)}
                            placeholder="your-discord-bot-token"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${platform}-guildId`}>Guild ID</Label>
                          <Input
                            id={`${platform}-guildId`}
                            value={config.credentials.guildId || ''}
                            onChange={(e) => updateCredentials(platform, 'guildId', e.target.value)}
                            placeholder="your-guild-id"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Channels */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Channels</h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Channel ID"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addChannel(platform, (e.target as HTMLInputElement).value)
                            ;(e.target as HTMLInputElement).value = ''
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          const input = document.querySelector(`input[placeholder="Channel ID"]`) as HTMLInputElement
                          if (input) {
                            addChannel(platform, input.value)
                            input.value = ''
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="flex items-center gap-1">
                          {channel}
                          <button
                            onClick={() => removeChannel(platform, channel)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sync Settings */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Sync Settings</h4>
                    <div>
                      <Label htmlFor={`${platform}-syncInterval`}>Sync Interval (minutes)</Label>
                      <Select
                        value={config.syncInterval.toString()}
                        onValueChange={(value) => updateConfig(platform, { syncInterval: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 minute</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => testConnection(platform)}
                      disabled={testing === platform}
                      variant="outline"
                    >
                      {testing === platform ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          {statuses[platform]?.connected ? (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Test Connection
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => startSync(platform)}
                      disabled={loading || !statuses[platform]?.connected}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Start Sync
                    </Button>
                  </div>
                  
                  {/* Status */}
                  {statuses[platform] && (
                    <div className="text-sm text-muted-foreground">
                      <div>Messages: {statuses[platform].messageCount}</div>
                      <div>Contacts: {statuses[platform].contactCount}</div>
                      {statuses[platform].lastSync && (
                        <div>Last sync: {statuses[platform].lastSync.toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
} 