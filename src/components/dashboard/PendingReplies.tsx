import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, MessageSquare, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { PendingReply } from '@/lib/dashboard-data'

interface PendingRepliesProps {
  pendingReplies: PendingReply[]
  onReplyNow: (contactId: string, messageContent: string) => void
  onScheduleReminder: (contactId: string, contactName: string, message: string) => void
  getMessageDate: (message: any) => Date
}

export function PendingReplies({
  pendingReplies,
  onReplyNow,
  onScheduleReminder,
  getMessageDate
}: PendingRepliesProps) {
  const getPriorityInfo = (hoursSinceReceived: number) => {
    if (hoursSinceReceived >= 72) {
      return {
        level: 'critical',
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Critical'
      }
    } else if (hoursSinceReceived >= 48) {
      return {
        level: 'high',
        icon: AlertCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'High'
      }
    } else if (hoursSinceReceived >= 24) {
      return {
        level: 'medium',
        icon: Clock,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Medium'
      }
    } else {
      return {
        level: 'low',
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Low'
      }
    }
  }

  const sortedReplies = [...pendingReplies].sort((a, b) => b.hoursSinceReceived - a.hoursSinceReceived)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Replies ({pendingReplies.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingReplies.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pending replies</p>
            <p className="text-sm text-muted-foreground mt-1">All caught up! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReplies.map((reply) => {
              const priority = getPriorityInfo(reply.hoursSinceReceived)
              const PriorityIcon = priority.icon
              
              return (
                <div 
                  key={reply.id} 
                  className={`flex items-center justify-between p-4 border rounded-lg ${priority.bgColor} ${priority.borderColor}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <PriorityIcon className={`w-5 h-5 ${priority.color}`} />
                      <span className="font-medium">{reply.contact.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priority.bgColor} ${priority.color} border ${priority.borderColor}`}>
                        {priority.label} Priority
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {reply.hoursSinceReceived}s ago
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-8">
                      {reply.message.content.substring(0, 120)}...
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => onReplyNow(reply.contact.id, reply.message.content)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Reply Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onScheduleReminder(
                        reply.contact.id,
                        reply.contact.name,
                        `Follow up on: ${reply.message.content.substring(0, 50)}...`
                      )}
                    >
                      Remind Later
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 