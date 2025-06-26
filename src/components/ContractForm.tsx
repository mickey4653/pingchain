'use client';

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@clerk/nextjs'
import { createContract } from '@/lib/firebase-service'
import type { Contract, Frequency } from '@/types/firebase'

interface ContractFormProps {
  contactId: string
  onSuccess?: () => void
}

export function ContractForm({ contactId, onSuccess }: ContractFormProps) {
  const [frequency, setFrequency] = useState<Frequency>('WEEKLY')
  const [timeOfDay, setTimeOfDay] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const { userId } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      await createContract({
        frequency,
        timeOfDay,
        daysOfWeek,
        userId,
        contactId,
      })

      toast({
        title: 'Success',
        description: 'Contract created successfully',
      })

      // Reset form
      setFrequency('WEEKLY')
      setTimeOfDay('')
      setDaysOfWeek([])

      onSuccess?.()
    } catch (error) {
      console.error('Error creating contract:', error)
      toast({
        title: 'Error',
        description: 'Failed to create contract',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Communication Contract</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
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
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              placeholder="e.g., 09:00"
            />
          </div>

          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex flex-wrap gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Button
                  key={day}
                  type="button"
                  variant={daysOfWeek.includes(index) ? 'default' : 'outline'}
                  onClick={() => toggleDay(index)}
                  className="w-12"
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Contract'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 