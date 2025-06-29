import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send } from 'lucide-react'

interface OpenLoop {
  id: string
  contact: any
  message: any
  daysSinceLastMessage: number
}

interface OpenLoopsProps {
  openLoops: OpenLoop[]
  onGenerateResponse: (loop: OpenLoop) => void
  onSendMessage: (message: string, contactId: string) => void
  getMessageDate: (message: any) => Date
}

export function OpenLoops({
  openLoops,
  onGenerateResponse,
  onSendMessage,
  getMessageDate
}: OpenLoopsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Open Loops ({openLoops.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {openLoops.length === 0 ? (
          <p className="text-muted-foreground">No open loops</p>
        ) : (
          <div className="space-y-4">
            {openLoops.map((loop) => (
              <div key={loop.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{loop.contact.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor((new Date().getTime() - getMessageDate(loop.message).getTime()) / 1000)}s ago
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onGenerateResponse(loop)}
                    >
                      Generate Response
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendMessage("Hi! Just checking in on our conversation.", loop.contact.id)}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Quick Check-in
                    </Button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">Last message:</p>
                  <p className="text-sm">{loop.message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 