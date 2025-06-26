'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getContacts, createContact, updateContact, deleteContact } from '@/lib/firebase-service'
import type { Contact, Platform, Category } from '@/types/firebase'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface ContactListProps {
  userId: string
  onContactSelect: (contactId: string) => void
}

export function ContactList({ userId, onContactSelect }: ContactListProps) {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    platform: 'WHATSAPP' as Platform,
    category: 'PERSONAL' as Category
  })

  useEffect(() => {
    if (!userId) return

    // Set up real-time listener for contacts
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newContacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contact))
      setContacts(newContacts)
      setLoading(false)
    }, (error) => {
      console.error('Error listening to contacts:', error)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [userId])

  const handleAddContact = async () => {
    if (!newContact.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const contact = await createContact({
        ...newContact,
        userId
      })
      setContacts([...contacts, contact])
      setNewContact({ 
        name: '', 
        email: '', 
        phone: '', 
        platform: 'WHATSAPP', 
        category: 'PERSONAL' 
      })
      setIsAddDialogOpen(false)
      toast({
        title: "Success",
        description: "Contact added successfully",
      })
    } catch (error) {
      console.error('Error adding contact:', error)
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      })
    }
  }

  const handleEditContact = async () => {
    if (!selectedContact || !newContact.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    try {
      await updateContact(selectedContact.id, {
        ...newContact,
        userId
      })
      setSelectedContact(null)
      setNewContact({ 
        name: '', 
        email: '', 
        phone: '', 
        platform: 'WHATSAPP', 
        category: 'PERSONAL' 
      })
      setIsEditDialogOpen(false)
      toast({
        title: "Success",
        description: "Contact updated successfully",
      })
    } catch (error) {
      console.error('Error updating contact:', error)
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      })
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId)
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      })
    }
  }

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading contacts...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select
                      value={newContact.platform}
                      onValueChange={(value: Platform) => setNewContact({ ...newContact, platform: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="IMESSAGE">iMessage</SelectItem>
                        <SelectItem value="SLACK">Slack</SelectItem>
                        <SelectItem value="DISCORD">Discord</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newContact.category}
                      onValueChange={(value: Category) => setNewContact({ ...newContact, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERSONAL">Personal</SelectItem>
                        <SelectItem value="WORK">Work</SelectItem>
                        <SelectItem value="FAMILY">Family</SelectItem>
                        <SelectItem value="FRIEND">Friend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddContact}>Add Contact</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => onContactSelect(contact.id)}
              >
                <div>
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {contact.platform} • {contact.category}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedContact(contact)
                      setNewContact({
                        name: contact.name,
                        email: contact.email || '',
                        phone: contact.phone || '',
                        platform: contact.platform,
                        category: contact.category
                      })
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteContact(contact.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No contacts found
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-platform">Platform</Label>
              <Select
                value={newContact.platform}
                onValueChange={(value: Platform) => setNewContact({ ...newContact, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="IMESSAGE">iMessage</SelectItem>
                  <SelectItem value="SLACK">Slack</SelectItem>
                  <SelectItem value="DISCORD">Discord</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={newContact.category}
                onValueChange={(value: Category) => setNewContact({ ...newContact, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                  <SelectItem value="WORK">Work</SelectItem>
                  <SelectItem value="FAMILY">Family</SelectItem>
                  <SelectItem value="FRIEND">Friend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditContact}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 