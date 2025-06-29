export type TeamRole = 'owner' | 'admin' | 'member'

export interface TeamPermissions {
  manageTeam: boolean
  inviteMembers: boolean
  removeMembers: boolean
  changeRoles: boolean
  viewAnalytics: boolean
  shareContacts: boolean
  editContacts: boolean
  deleteContacts: boolean
  sendMessages: boolean
  viewMessages: boolean
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: TeamRole
  joinedAt: Date
  permissions: TeamPermissions
  lastActive?: Date
  status?: 'active' | 'inactive' | 'pending'
}

export interface TeamInvitation {
  id: string
  teamId: string
  inviterId: string
  email: string
  role: TeamRole
  status: 'pending' | 'accepted' | 'expired'
  createdAt: Date
  expiresAt: Date
  token: string
  acceptedAt?: Date
  acceptedBy?: string
}

export interface Team {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  memberCount: number
  settings: {
    allowMemberInvites: boolean
    requireApproval: boolean
    defaultRole: TeamRole
  }
}

export interface SharedContact {
  id: string
  teamId: string
  contactId: string
  sharedBy: string
  permissions: string[]
  sharedAt: Date
  lastAccessed: Date
  notes?: string
}

export interface TeamMessage {
  id: string
  teamId: string
  senderId: string
  content: string
  type: 'text' | 'contact_share' | 'reminder' | 'note'
  relatedContactId?: string
  createdAt: Date
  readBy: string[]
}

export interface TeamAnalytics {
  memberCount: number
  roleDistribution: { [key: string]: number }
  sharedContactsCount: number
  totalMessages: number
  activeMembers: number
  recentActivity: Array<{
    type: string
    userId: string
    timestamp: Date
    details: any
  }>
  communicationMetrics: {
    messagesPerDay: number
    activeConversations: number
    responseRate: number
  }
}

export interface TeamSettings {
  allowMemberInvites: boolean
  requireApproval: boolean
  defaultRole: TeamRole
  contactSharingEnabled: boolean
  messageHistoryRetention: number // days
  autoArchiveInactive: boolean
  notificationPreferences: {
    newMember: boolean
    contactShared: boolean
    messageReceived: boolean
    reminderCreated: boolean
  }
} 