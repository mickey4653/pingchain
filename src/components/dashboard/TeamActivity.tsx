"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Bell, Plus, User, Calendar, MessageSquare, Share2, Users, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface TeamActivity {
  id: string
  teamId: string
  userId: string
  type: string
  title: string
  message: string
  data: any
  timestamp: Date
  readBy: string[]
}

interface TeamActivityProps {
  teamId: string
  loading?: boolean
}

export function TeamActivity({ teamId, loading = false }: TeamActivityProps) {
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newActivity, setNewActivity] = useState({
    type: 'announcement',
    title: '',
    message: ''
  })

  useEffect(() => {
    if (teamId) {
      loadActivities()
    }
  }, [teamId])

  const loadActivities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/notifications`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Error loading team activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createActivity = async () => {
    if (!newActivity.title.trim() || !newActivity.message.trim()) return

    try {
      const response = await fetch(`/api/teams/${teamId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setNewActivity({ type: 'announcement', title: '', message: '' })
        loadActivities()
      }
    } catch (error) {
      console.error('Error creating activity:', error)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Bell className="h-4 w-4" />
      case 'member_joined': return <Users className="h-4 w-4" />
      case 'contact_shared': return <Share2 className="h-4 w-4" />
      case 'message': return <MessageSquare className="h-4 w-4" />
      case 'reminder': return <Clock className="h-4 w-4" />
      case 'alert': return <AlertCircle className="h-4 w-4" />
      case 'success': return <CheckCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800'
      case 'member_joined': return 'bg-green-100 text-green-800'
      case 'contact_shared': return 'bg-purple-100 text-purple-800'
      case 'message': return 'bg-gray-100 text-gray-800'
      case 'reminder': return 'bg-orange-100 text-orange-800'
      case 'alert': return 'bg-red-100 text-red-800'
      case 'success': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return timestamp.toLocaleDateString()
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading team activity...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Team Activity
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Team Activity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Activity Type</label>
                    <Select value={newActivity.type} onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="alert">Alert</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newActivity.title}
                      onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                      placeholder="Enter activity title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      value={newActivity.message}
                      onChange={(e) => setNewActivity({ ...newActivity, message: e.target.value })}
                      placeholder="Enter activity message"
                      rows={3}
                    />
                  </div>
                  
                  <Button onClick={createActivity} className="w-full">
                    Create Activity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({activities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team activity yet.</p>
              <p className="text-sm text-muted-foreground">Create an activity to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{activity.title}</span>
                      <Badge className={getActivityColor(activity.type)}>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      {activity.message}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>User {activity.userId.slice(-4)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{activity.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Additional data display */}
                    {activity.data && Object.keys(activity.data).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium mb-1">Additional Info:</div>
                        {Object.entries(activity.data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['announcement', 'member_joined', 'contact_shared', 'message'].map((type) => {
              const count = activities.filter(a => a.type === type).length
              return (
                <div key={type} className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {type.replace('_', ' ')}s
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 