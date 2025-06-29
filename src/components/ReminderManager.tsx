"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Bell, Mail, CheckCircle, XCircle, AlertTriangle, BarChart3, Clock3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ReminderNotification } from '@/lib/notifications'

interface ReminderManagerProps {
  reminders: ReminderNotification[]
  onDismiss?: (reminderId: string) => void
  onRespond?: (contactId: string) => void
  onSnooze?: (reminderId: string, hours: number) => void
  onTrackResponse?: (reminderId: string) => void
  onClearAll?: () => void
}

export function ReminderManager({ 
  reminders, 
  onDismiss, 
  onRespond, 
  onSnooze,
  onTrackResponse,
  onClearAll
}: ReminderManagerProps) {
  const { toast } = useToast()
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all')
  const [showStats, setShowStats] = useState(false)

  const filteredReminders = reminders.filter(reminder => {
    if (filter === 'all') return true
    return reminder.status === filter
  })

  const getPriorityColor = (priority: ReminderNotification['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: ReminderNotification['type']) => {
    switch (type) {
      case 'overdue': return <Clock className="h-4 w-4" />
      case 'question': return <AlertTriangle className="h-4 w-4" />
      case 'scheduled': return <Bell className="h-4 w-4" />
      case 'urgent': return <AlertTriangle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const handleDismiss = (reminderId: string) => {
    onDismiss?.(reminderId)
    toast({
      title: 'Reminder dismissed',
      description: 'This reminder has been dismissed.',
    })
  }

  const handleRespond = (contactId: string) => {
    onRespond?.(contactId)
    onTrackResponse?.(contactId) // Track that user responded
    toast({
      title: 'Opening conversation',
      description: 'Taking you to the conversation...',
    })
  }

  const handleSnooze = (reminderId: string, hours: number) => {
    onSnooze?.(reminderId, hours)
    toast({
      title: 'Reminder snoozed',
      description: `Reminder will reappear in ${hours} hour${hours !== 1 ? 's' : ''}.`,
    })
  }

  const getEffectivenessStats = () => {
    const totalReminders = reminders.length
    const respondedReminders = reminders.filter(r => r.status === 'sent').length
    const responseRate = totalReminders > 0 ? (respondedReminders / totalReminders) * 100 : 0
    
    return {
      total: totalReminders,
      responded: respondedReminders,
      responseRate: Math.round(responseRate)
    }
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Active Reminders</h3>
          <p className="text-muted-foreground text-center">
            You're all caught up! No pending reminders at the moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  const stats = getEffectivenessStats()

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({reminders.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending ({reminders.filter(r => r.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('sent')}
          >
            Sent ({reminders.filter(r => r.status === 'sent').length})
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats
          </Button>
          
          {onClearAll && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to clear all reminders? This action cannot be undone.')) {
                  onClearAll()
                }
              }}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Effectiveness Stats */}
      {showStats && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-700">Total Reminders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.responded}</div>
                <div className="text-sm text-green-700">Responded</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.responseRate}%</div>
                <div className="text-sm text-purple-700">Response Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.map((reminder) => (
          <Card key={reminder.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(reminder.type)}
                    <span className="font-medium">{reminder.contactName}</span>
                    <Badge 
                      variant="outline" 
                      className={getPriorityColor(reminder.priority)}
                    >
                      {reminder.priority}
                    </Badge>
                    {reminder.status === 'sent' && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {reminder.message}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {formatTimeAgo(reminder.createdAt)}</span>
                    {reminder.sentAt && (
                      <span>Sent: {formatTimeAgo(reminder.sentAt)}</span>
                    )}
                    {reminder.scheduledFor && (
                      <span>Scheduled: {formatTimeAgo(reminder.scheduledFor)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  {reminder.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleRespond(reminder.contactId)}
                      >
                        Respond
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSnooze(reminder.id, 1)}
                      >
                        <Clock3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(reminder.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 