"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Bell, Mail, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationSettings {
  browser: boolean
  email: boolean
  emailProvider: 'resend' | 'sendgrid' | 'gmail'
  userEmail: string
  overdueThreshold: number // hours
  questionThreshold: number // hours
  scheduledReminders: boolean
  highPriorityOnly: boolean
}

export function NotificationSettings() {
  const { userId } = useAuth()
  const { toast } = useToast()
  const notifications = useNotifications()
  
  const [settings, setSettings] = useState<NotificationSettings>({
    browser: true,
    email: false,
    emailProvider: 'resend',
    userEmail: '',
    overdueThreshold: 24,
    questionThreshold: 12,
    scheduledReminders: true,
    highPriorityOnly: false
  })

  const [loading, setLoading] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = async () => {
    setLoading(true)
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings))
      
      // Force a page reload to refresh the notification system with new settings
      window.location.reload()
      
      toast({
        title: 'Settings saved',
        description: 'Your notification preferences have been updated. The page will reload to apply changes.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        updateSetting('browser', true)
        toast({
          title: 'Permission granted',
          description: 'Browser notifications are now enabled.',
        })
      } else {
        updateSetting('browser', false)
        toast({
          title: 'Permission denied',
          description: 'Browser notifications are disabled. You can enable them in your browser settings.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleBrowserToggle = (checked: boolean) => {
    if (checked) {
      requestNotificationPermission()
    } else {
      updateSetting('browser', false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in your browser
                </p>
              </div>
              <Switch
                checked={settings.browser}
                onCheckedChange={handleBrowserToggle}
              />
            </div>
            
            {!notifications.permissionGranted && settings.browser && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Browser notification permission required. Click the switch above to enable.
                </span>
              </div>
            )}
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive reminders via email
                </p>
              </div>
              <Switch
                checked={settings.email}
                onCheckedChange={(checked) => updateSetting('email', checked)}
              />
            </div>
            
            {settings.email && (
              <div className="space-y-4 pl-4">
                <div>
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={settings.userEmail}
                    onChange={(e) => updateSetting('userEmail', e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="emailProvider">Email Provider</Label>
                  <Select
                    value={settings.emailProvider}
                    onValueChange={(value: 'resend' | 'sendgrid' | 'gmail') => 
                      updateSetting('emailProvider', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="gmail">Gmail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Reminder Thresholds */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Reminder Timing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="overdueThreshold">Overdue Conversation (hours)</Label>
                <Input
                  id="overdueThreshold"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.overdueThreshold || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    updateSetting('overdueThreshold', isNaN(value) ? 24 : value)
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When to remind about conversations you haven't responded to
                </p>
              </div>
              
              <div>
                <Label htmlFor="questionThreshold">Unanswered Questions (hours)</Label>
                <Input
                  id="questionThreshold"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.questionThreshold || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    updateSetting('questionThreshold', isNaN(value) ? 12 : value)
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When to remind about questions that need answers
                </p>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Scheduled Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Allow scheduled check-in reminders
                </p>
              </div>
              <Switch
                checked={settings.scheduledReminders}
                onCheckedChange={(checked) => updateSetting('scheduledReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">High Priority Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only show high priority reminders
                </p>
              </div>
              <Switch
                checked={settings.highPriorityOnly}
                onCheckedChange={(checked) => updateSetting('highPriorityOnly', checked)}
              />
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={saveSettings} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>

          {/* Test Email Button */}
          {settings.email && settings.userEmail && (
            <Button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/notifications/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: settings.userEmail,
                      provider: settings.emailProvider
                    })
                  })
                  
                  if (response.ok) {
                    toast({
                      title: 'Test Email Sent',
                      description: `Test email sent to ${settings.userEmail} via ${settings.emailProvider}`,
                    })
                  } else {
                    throw new Error('Failed to send test email')
                  }
                } catch (error) {
                  console.error('Test email error:', error)
                  toast({
                    title: 'Error',
                    description: 'Failed to send test email. Check your email provider settings.',
                    variant: 'destructive',
                  })
                }
              }}
              variant="outline"
              className="w-full"
            >
              Test Email Notification
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 