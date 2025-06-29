import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { MessageSquare, Clock, FileText, Users } from 'lucide-react'
import { Contact } from '@/types/firebase'

interface QuickActionsProps {
  contacts: Contact[]
  selectedContact: Contact | null
  setSelectedContact: (contact: Contact | null) => void
  onGenerateResponse: (contact: Contact | null) => void
  onScheduleReminder: (contactId: string, contactName: string, message: string) => void
  onCreateContract: (contactId: string, contactName: string) => void
}

export function QuickActions({
  contacts,
  selectedContact,
  setSelectedContact,
  onGenerateResponse,
  onScheduleReminder,
  onCreateContract
}: QuickActionsProps) {
  return (
    <>
      {/* Contact Selector for Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Contact for Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedContact?.id || ''}
            onValueChange={(value) => {
              const contact = contacts.find(c => c.id === value)
              setSelectedContact(contact || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a contact..." />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedContact && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {selectedContact.name} ({selectedContact.email})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => onGenerateResponse(selectedContact)}
              disabled={!selectedContact}
              className="h-20"
            >
              <div className="text-center">
                <MessageSquare className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Generate Response</div>
              </div>
            </Button>
            <Button
              onClick={() => onScheduleReminder(
                selectedContact?.id || '',
                selectedContact?.name || '',
                'Follow up on recent conversation'
              )}
              disabled={!selectedContact}
              variant="outline"
              className="h-20"
            >
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Schedule Reminder</div>
              </div>
            </Button>
            <Button
              onClick={() => onCreateContract(
                selectedContact?.id || '',
                selectedContact?.name || ''
              )}
              disabled={!selectedContact}
              variant="outline"
              className="h-20"
            >
              <div className="text-center">
                <FileText className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Create Contract</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
} 