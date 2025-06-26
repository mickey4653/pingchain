'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Contract as FirebaseContract } from '@/types/firebase'
import { Calendar, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { createContract, deleteContract, updateContract } from '@/lib/firebase-service'

interface ContractListProps {
  contactId: string
}

export function ContractList({ contactId }: ContractListProps) {
  const [contracts, setContracts] = useState<FirebaseContract[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<FirebaseContract | null>(null)
  const [newContract, setNewContract] = useState({
    frequency: 'DAILY' as const,
    timeOfDay: '',
    daysOfWeek: [] as number[]
  })
  const { userId } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!userId || !contactId) return

    // Set up real-time listener for contracts
    const q = query(
      collection(db, 'contracts'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newContracts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FirebaseContract))
      setContracts(newContracts)
      setLoading(false)
    }, (error) => {
      console.error('Error listening to contracts:', error)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [userId, contactId])

  const handleAddContract = async () => {
    if (!userId) return

    try {
      await createContract({
        ...newContract,
        userId,
        contactId
      })

      setNewContract({
        frequency: 'DAILY',
        timeOfDay: '',
        daysOfWeek: []
      })
      setIsAddDialogOpen(false)

      toast({
        title: 'Success',
        description: 'Contract created successfully',
      })
    } catch (error) {
      console.error('Error creating contract:', error)
      toast({
        title: 'Error',
        description: 'Failed to create contract',
        variant: 'destructive',
      })
    }
  }

  const handleEditContract = async () => {
    if (!editingContract) return

    try {
      await updateContract(editingContract.id, {
        frequency: editingContract.frequency,
        timeOfDay: editingContract.timeOfDay,
        daysOfWeek: editingContract.daysOfWeek
      })

      setEditingContract(null)
      setIsEditDialogOpen(false)

      toast({
        title: 'Success',
        description: 'Contract updated successfully',
      })
    } catch (error) {
      console.error('Error updating contract:', error)
      toast({
        title: 'Error',
        description: 'Failed to update contract',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (contractId: string) => {
    try {
      await deleteContract(contractId)
      toast({
        title: 'Success',
        description: 'Contract deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting contract:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete contract',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contracts</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={newContract.frequency}
                  onValueChange={(value) => setNewContract({ ...newContract, frequency: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeOfDay">Time of Day (HH:mm)</Label>
                <Input
                  id="timeOfDay"
                  type="time"
                  value={newContract.timeOfDay}
                  onChange={(e) => setNewContract({ ...newContract, timeOfDay: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <Button
                      key={day}
                      variant={newContract.daysOfWeek.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const days = newContract.daysOfWeek.includes(index)
                          ? newContract.daysOfWeek.filter(d => d !== index)
                          : [...newContract.daysOfWeek, index]
                        setNewContract({ ...newContract, daysOfWeek: days })
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleAddContract} className="w-full">
                Add Contract
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{contract.frequency}</span>
              </div>
              {contract.timeOfDay && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>At {contract.timeOfDay}</span>
                </div>
              )}
              {contract.daysOfWeek.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Days: {contract.daysOfWeek.map(day => 
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                  ).join(', ')}
                </div>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                Created: {format(contract.createdAt.toDate(), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingContract(contract)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(contract.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {contracts.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No contracts set up yet
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          {editingContract && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-frequency">Frequency</Label>
                <Select
                  value={editingContract.frequency}
                  onValueChange={(value) => setEditingContract({ ...editingContract, frequency: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-timeOfDay">Time of Day (HH:mm)</Label>
                <Input
                  id="edit-timeOfDay"
                  type="time"
                  value={editingContract.timeOfDay || ''}
                  onChange={(e) => setEditingContract({ ...editingContract, timeOfDay: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <Button
                      key={day}
                      variant={editingContract.daysOfWeek.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const days = editingContract.daysOfWeek.includes(index)
                          ? editingContract.daysOfWeek.filter(d => d !== index)
                          : [...editingContract.daysOfWeek, index]
                        setEditingContract({ ...editingContract, daysOfWeek: days })
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleEditContract} className="w-full">
                Update Contract
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
} 