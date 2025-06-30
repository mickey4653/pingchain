import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Heart, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import { PendingReply } from '@/lib/dashboard-data'

interface StatsCardsProps {
  openLoops: number
  currentStreak: number
  checkInsSent: number
  pendingReplies: PendingReply[]
}

export function StatsCards({ openLoops, currentStreak, checkInsSent, pendingReplies }: StatsCardsProps) {
  const handleClearReminders = async () => {
    try {
      const response = await fetch('/api/reminders/test', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log('All reminders cleared successfully')
        // Reload the page to refresh the dashboard
        window.location.reload()
      } else {
        console.error('Failed to clear reminders')
      }
    } catch (error) {
      console.error('Error clearing reminders:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Loops</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openLoops}</div>
          <p className="text-xs text-muted-foreground">
            Conversations waiting for response
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentStreak}</div>
          <p className="text-xs text-muted-foreground">
            Days of consistent communication
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-ins Sent</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{checkInsSent}</div>
          <p className="text-xs text-muted-foreground">
            Proactive messages sent this week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Replies</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingReplies.length}</div>
          <p className="text-xs text-muted-foreground">
            Messages needing response
          </p>
          {pendingReplies.length > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 text-xs"
              onClick={handleClearReminders}
            >
              Clear All Reminders
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 