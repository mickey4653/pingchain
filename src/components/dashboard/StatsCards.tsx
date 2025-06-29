import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Flame, CheckCircle, Clock } from 'lucide-react'

interface StatsCardsProps {
  openLoops: number
  currentStreak: number
  checkInsSent: number
  pendingReplies: any[]
}

export function StatsCards({ openLoops, currentStreak, checkInsSent, pendingReplies }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{openLoops}</div>
              <div className="text-sm text-muted-foreground">Open Loops</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-sm text-muted-foreground">Current Streak</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{checkInsSent}</div>
              <div className="text-sm text-muted-foreground">Check-Ins Sent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{pendingReplies.length}</div>
              <div className="text-sm text-muted-foreground">Pending Replies</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 