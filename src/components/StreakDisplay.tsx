'use client';

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@clerk/nextjs'
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Streak } from '@/types/firebase'
import { format } from 'date-fns'
import { Flame } from 'lucide-react'

interface StreakDisplayProps {
  userId: string
}

export function StreakDisplay({ userId }: StreakDisplayProps) {
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) return

    // Get the user's contacts
    const fetchStreak = async () => {
      try {
        const contactsRef = collection(db, 'contacts')
        const q = query(contactsRef, where('userId', '==', userId))
        const querySnapshot = await getDocs(q)
        
        if (!querySnapshot.empty) {
          const contact = querySnapshot.docs[0]
          const streakRef = doc(db, 'streaks', contact.id)
          
          const unsubscribe = onSnapshot(streakRef, (doc) => {
            if (doc.exists()) {
              setStreak({ id: doc.id, ...doc.data() } as Streak)
            } else {
              setStreak(null)
            }
            setLoading(false)
          }, (error) => {
            console.error('Error listening to streak:', error)
            toast({
              title: 'Error',
              description: 'Failed to load streak data',
              variant: 'destructive',
            })
            setLoading(false)
          })

          return unsubscribe
        } else {
          setStreak(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching streak:', error)
        toast({
          title: 'Error',
          description: 'Failed to load streak data',
          variant: 'destructive',
        })
        setLoading(false)
      }
    }

    const unsubscribe = fetchStreak()
    return () => {
      if (unsubscribe) unsubscribe
    }
  }, [userId, toast])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement Streak</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Engagement Streak</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              {streak?.currentStreak || 0}
            </div>
            <div className="text-sm text-muted-foreground">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              {streak?.longestStreak || 0}
            </div>
            <div className="text-sm text-muted-foreground">Longest Streak</div>
          </div>
        </div>
        {streak?.lastInteraction && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Last interaction: {format(
              streak.lastInteraction instanceof Timestamp 
                ? streak.lastInteraction.toDate() 
                : new Date(streak.lastInteraction),
              'MMM d, yyyy'
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 