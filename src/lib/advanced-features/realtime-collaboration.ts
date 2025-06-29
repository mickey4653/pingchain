import { db } from '@/lib/firebase-admin'
import { io, Socket } from 'socket.io'

export interface PresenceData {
  userId: string
  teamId: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: Date
  currentActivity?: string
}

export interface CollaborationSession {
  id: string
  teamId: string
  type: 'contact_edit' | 'message_draft' | 'reminder_creation' | 'analytics_view'
  participants: string[]
  data: any
  createdAt: Date
  updatedAt: Date
}

export class RealtimeCollaboration {
  private static instance: RealtimeCollaboration
  private io: any
  private activeSessions: Map<string, CollaborationSession> = new Map()
  private userPresence: Map<string, PresenceData> = new Map()

  static getInstance(): RealtimeCollaboration {
    if (!RealtimeCollaboration.instance) {
      RealtimeCollaboration.instance = new RealtimeCollaboration()
    }
    return RealtimeCollaboration.instance
  }

  initialize(server: any) {
    this.io = io(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('User connected:', socket.id)

      // Join team room
      socket.on('join-team', (teamId: string) => {
        socket.join(`team-${teamId}`)
        console.log(`User joined team: ${teamId}`)
      })

      // Update presence
      socket.on('update-presence', async (data: PresenceData) => {
        await this.updateUserPresence(data)
        socket.to(`team-${data.teamId}`).emit('presence-updated', data)
      })

      // Join collaboration session
      socket.on('join-session', async (sessionId: string, userId: string) => {
        const session = this.activeSessions.get(sessionId)
        if (session) {
          socket.join(`session-${sessionId}`)
          session.participants.push(userId)
          this.activeSessions.set(sessionId, session)
          socket.to(`session-${sessionId}`).emit('user-joined-session', userId)
        }
      })

      // Leave collaboration session
      socket.on('leave-session', (sessionId: string, userId: string) => {
        const session = this.activeSessions.get(sessionId)
        if (session) {
          session.participants = session.participants.filter(id => id !== userId)
          this.activeSessions.set(sessionId, session)
          socket.to(`session-${sessionId}`).emit('user-left-session', userId)
        }
      })

      // Real-time editing
      socket.on('edit-start', (sessionId: string, userId: string, field: string) => {
        socket.to(`session-${sessionId}`).emit('edit-started', { userId, field })
      })

      socket.on('edit-update', (sessionId: string, userId: string, field: string, value: any) => {
        socket.to(`session-${sessionId}`).emit('edit-updated', { userId, field, value })
      })

      // Live typing indicators
      socket.on('typing-start', (teamId: string, userId: string, context: string) => {
        socket.to(`team-${teamId}`).emit('typing-started', { userId, context })
      })

      socket.on('typing-stop', (teamId: string, userId: string) => {
        socket.to(`team-${teamId}`).emit('typing-stopped', userId)
      })

      // Disconnect handling
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        this.handleUserDisconnect(socket.id)
      })
    })
  }

  async updateUserPresence(data: PresenceData) {
    this.userPresence.set(data.userId, data)
    
    // Store in Firestore for persistence
    await db.collection('user_presence').doc(data.userId).set({
      ...data,
      lastSeen: new Date()
    })
  }

  async getUserPresence(userId: string): Promise<PresenceData | null> {
    const cached = this.userPresence.get(userId)
    if (cached) return cached

    // Fallback to Firestore
    const doc = await db.collection('user_presence').doc(userId).get()
    return doc.exists ? doc.data() as PresenceData : null
  }

  async getTeamPresence(teamId: string): Promise<PresenceData[]> {
    const snapshot = await db.collection('user_presence')
      .where('teamId', '==', teamId)
      .get()

    return snapshot.docs.map(doc => doc.data() as PresenceData)
  }

  createCollaborationSession(
    teamId: string,
    type: CollaborationSession['type'],
    data: any,
    creatorId: string
  ): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const session: CollaborationSession = {
      id: sessionId,
      teamId,
      type,
      participants: [creatorId],
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.activeSessions.set(sessionId, session)
    return sessionId
  }

  getCollaborationSession(sessionId: string): CollaborationSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  updateCollaborationSession(sessionId: string, updates: Partial<CollaborationSession>) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      const updatedSession = { ...session, ...updates, updatedAt: new Date() }
      this.activeSessions.set(sessionId, updatedSession)
      
      // Notify participants
      this.io.to(`session-${sessionId}`).emit('session-updated', updatedSession)
    }
  }

  endCollaborationSession(sessionId: string) {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      // Notify participants
      this.io.to(`session-${sessionId}`).emit('session-ended', sessionId)
      
      // Clean up
      this.activeSessions.delete(sessionId)
    }
  }

  private handleUserDisconnect(socketId: string) {
    // Update presence to offline for disconnected users
    // This would need to be implemented based on your user tracking
  }

  // Broadcast to team
  broadcastToTeam(teamId: string, event: string, data: any) {
    this.io.to(`team-${teamId}`).emit(event, data)
  }

  // Broadcast to session
  broadcastToSession(sessionId: string, event: string, data: any) {
    this.io.to(`session-${sessionId}`).emit(event, data)
  }
} 