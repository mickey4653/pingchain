"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Share2, Eye, Edit, Trash2, Calendar, User, Lock, Unlock } from 'lucide-react'
import { SharedContact } from '@/lib/team-features/types'
import { useUser } from '@clerk/nextjs'
import { io } from 'socket.io-client'

interface SharedContactsProps {
  teamId: string
  loading?: boolean
}

export function SharedContacts({ teamId, loading = false }: SharedContactsProps) {
  const [sharedContacts, setSharedContacts] = useState<SharedContact[]>([])
  const [userContacts, setUserContacts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [shareData, setShareData] = useState({
    permissions: ['view'],
    notes: ''
  })
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editingUsers, setEditingUsers] = useState<{ [contactId: string]: string[] }>({})
  const { user } = useUser()
  const socketRef = useRef<any>(null)

  useEffect(() => {
    if (teamId) {
      loadSharedContacts()
      loadUserContacts()
    }
  }, [teamId])

  useEffect(() => {
    if (teamId && user) {
      if (!socketRef.current) {
        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
      }
      const socket = socketRef.current
      socket.emit('join-team', teamId)
      socket.on('edit-started', ({ userId, field }: any) => {
        setEditingUsers((prev) => {
          const contactId = field
          const users = prev[contactId] || []
          if (!users.includes(userId)) {
            return { ...prev, [contactId]: [...users, userId] }
          }
          return prev
        })
      })
      socket.on('edit-updated', ({ userId, field }: any) => {
        // Optionally update UI for live changes
      })
      socket.on('edit-stopped', ({ userId, field }: any) => {
        setEditingUsers((prev) => {
          const contactId = field
          const users = (prev[contactId] || []).filter((id) => id !== userId)
          return { ...prev, [contactId]: users }
        })
      })
      return () => {
        socket.disconnect()
      }
    }
  }, [teamId, user])

  const loadSharedContacts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/contacts`)
      if (response.ok) {
        const data = await response.json()
        setSharedContacts(data.sharedContacts)
      }
    } catch (error) {
      console.error('Error loading shared contacts:', error)
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

  const shareContact = async () => {
    if (!selectedContact) return

    try {
      const response = await fetch(`/api/teams/${teamId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          permissions: shareData.permissions,
          notes: shareData.notes
        })
      })

      if (response.ok) {
        setShowShareDialog(false)
        setSelectedContact(null)
        setShareData({ permissions: ['view'], notes: '' })
        loadSharedContacts()
      }
    } catch (error) {
      console.error('Error sharing contact:', error)
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view': return <Eye className="h-4 w-4" />
      case 'edit': return <Edit className="h-4 w-4" />
      case 'delete': return <Trash2 className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'view': return 'bg-blue-100 text-blue-800'
      case 'edit': return 'bg-green-100 text-green-800'
      case 'delete': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditStart = (contactId: string) => {
    setEditingContactId(contactId)
    if (socketRef.current && user) {
      socketRef.current.emit('edit-start', teamId, user.id, contactId)
    }
  }
  const handleEditStop = (contactId: string) => {
    setEditingContactId(null)
    if (socketRef.current && user) {
      socketRef.current.emit('edit-stop', teamId, user.id, contactId)
    }
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading shared contacts...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Share New Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Contact
            </CardTitle>
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Contact with Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Select Contact</label>
                    <Select onValueChange={(contactId) => {
                      const contact = userContacts.find(c => c.id === contactId)
                      setSelectedContact(contact)
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a contact to share" />
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
                  
                  <div>
                    <label className="text-sm font-medium">Permissions</label>
                    <div className="space-y-2 mt-2">
                      {['view', 'edit', 'delete'].map((permission) => (
                        <label key={permission} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={shareData.permissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setShareData({
                                  ...shareData,
                                  permissions: [...shareData.permissions, permission]
                                })
                              } else {
                                setShareData({
                                  ...shareData,
                                  permissions: shareData.permissions.filter(p => p !== permission)
                                })
                              }
                            }}
                          />
                          <span className="text-sm capitalize">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <Textarea
                      value={shareData.notes}
                      onChange={(e) => setShareData({ ...shareData, notes: e.target.value })}
                      placeholder="Add notes about this contact..."
                      rows={3}
                    />
                  </div>
                  
                  <Button onClick={shareContact} className="w-full" disabled={!selectedContact}>
                    Share Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Shared Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shared Contacts ({sharedContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sharedContacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No shared contacts yet.</p>
              <p className="text-sm text-muted-foreground">Share a contact to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sharedContacts.map((sharedContact) => (
                <div key={sharedContact.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Contact ID: {sharedContact.contactId}</div>
                        <div className="text-sm text-muted-foreground">
                          Shared by: User {sharedContact.sharedBy.slice(-4)}
                        </div>
                        {/* Live Editing Indicator */}
                        {editingUsers[sharedContact.contactId]?.length > 0 && (
                          <div className="text-xs text-blue-600 mt-1">
                            {editingUsers[sharedContact.contactId].map((id) => `User ${id.slice(-4)}`).join(', ')} editing...
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {sharedContact.sharedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {/* Simulate edit start/stop for demo */}
                  <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditStart(sharedContact.contactId)} disabled={editingContactId === sharedContact.contactId}>
                      Start Editing
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleEditStop(sharedContact.contactId)} disabled={editingContactId !== sharedContact.contactId}>
                      Stop Editing
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Permissions:</span>
                      {sharedContact.permissions.map((permission) => (
                        <Badge key={permission} className={getPermissionColor(permission)}>
                          <div className="flex items-center gap-1">
                            {getPermissionIcon(permission)}
                            {permission}
                          </div>
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {sharedContact.notes && (
                        <div className="text-sm text-muted-foreground">
                          "{sharedContact.notes}"
                        </div>
                      )}
                      <Badge variant="outline">
                        Last accessed: {sharedContact.lastAccessed.toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 