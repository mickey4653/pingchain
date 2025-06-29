"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Send, User, Calendar, Eye, Share2, Clock, AlertCircle } from 'lucide-react'
import { TeamMessage } from '@/lib/team-features/types'

interface TeamMessagingProps {
  teamId: string
  loading?: boolean
}

export function TeamMessaging({ teamId, loading = false }: TeamMessagingProps) {
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'contact_share' | 'reminder' | 'note'>('text')
  const [isLoading, setIsLoading] = useState(false)
  const [userContacts, setUserContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (teamId) {
      loadMessages()
      loadUserContacts()
    }
  }, [teamId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error loading team messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setUserContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Error loading user contacts:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const messageData: any = {
        content: newMessage,
        type: messageType
      }

      if (messageType === 'contact_share' && selectedContact) {
        messageData.relatedContactId = selectedContact
      }

      const response = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })

      if (response.ok) {
        setNewMessage('')
        setMessageType('text')
        setSelectedContact('')
        loadMessages()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'contact_share': return <Share2 className="h-4 w-4" />
      case 'reminder': return <Clock className="h-4 w-4" />
      case 'note': return <AlertCircle className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'contact_share': return 'bg-blue-100 text-blue-800'
      case 'reminder': return 'bg-orange-100 text-orange-800'
      case 'note': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatMessageContent = (message: TeamMessage) => {
    if (message.type === 'contact_share' && message.relatedContactId) {
      const contact = userContacts.find(c => c.id === message.relatedContactId)
      return (
        <div>
          <div>{message.content}</div>
          {contact && (
            <div className="mt-2 p-2 bg-blue-50 rounded border">
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-muted-foreground">{contact.email}</div>
            </div>
          )}
        </div>
      )
    }
    return message.content
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Team Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto space-y-4 p-4 border rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No messages yet.</p>
                <p className="text-sm text-muted-foreground">Start a conversation with your team.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">User {message.senderId.slice(-4)}</span>
                      <Badge className={getMessageColor(message.type)}>
                        <div className="flex items-center gap-1">
                          {getMessageIcon(message.type)}
                          {message.type.replace('_', ' ')}
                        </div>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {message.createdAt.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm bg-gray-50 p-3 rounded-lg">
                      {formatMessageContent(message)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {message.readBy.length} read
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Send Message */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Message Type</label>
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="contact_share">Share Contact</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {messageType === 'contact_share' && (
                <div className="flex-1">
                  <label className="text-sm font-medium">Select Contact</label>
                  <Select value={selectedContact} onValueChange={setSelectedContact}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {userContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} ({contact.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Type your ${messageType.replace('_', ' ')}...`}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </div>
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 