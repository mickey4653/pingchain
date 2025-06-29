import { db } from '@/lib/firebase-admin'
import { TeamMember, TeamRole, TeamPermissions, TeamInvitation } from './types'

export class TeamManager {
  private static instance: TeamManager

  static getInstance(): TeamManager {
    if (!TeamManager.instance) {
      TeamManager.instance = new TeamManager()
    }
    return TeamManager.instance
  }

  /**
   * Create a new team
   */
  async createTeam(
    ownerId: string,
    teamName: string,
    description?: string
  ): Promise<string> {
    const teamRef = db.collection('teams').doc()
    
    const team = {
      id: teamRef.id,
      name: teamName,
      description: description || '',
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      memberCount: 1,
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        defaultRole: 'member' as TeamRole
      }
    }

    await teamRef.set(team)

    // Add owner as first member
    await this.addTeamMember(teamRef.id, ownerId, 'owner')

    return teamRef.id
  }

  /**
   * Get team details
   */
  async getTeam(teamId: string): Promise<any> {
    const teamDoc = await db.collection('teams').doc(teamId).get()
    
    if (!teamDoc.exists) {
      throw new Error('Team not found')
    }

    return { id: teamDoc.id, ...teamDoc.data() }
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string): Promise<any[]> {
    const memberships = await db.collection('team_memberships')
      .where('userId', '==', userId)
      .get()

    const teamIds = memberships.docs.map(doc => doc.data().teamId)
    
    if (teamIds.length === 0) return []

    const teams = await Promise.all(
      teamIds.map(async (teamId) => {
        const team = await this.getTeam(teamId)
        const membership = memberships.docs.find(doc => doc.data().teamId === teamId)
        return {
          ...team,
          role: membership?.data().role || 'member',
          joinedAt: membership?.data().joinedAt
        }
      })
    )

    return teams
  }

  /**
   * Add member to team
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole = 'member'
  ): Promise<void> {
    const membershipRef = db.collection('team_memberships').doc()
    
    const membership = {
      id: membershipRef.id,
      teamId,
      userId,
      role,
      joinedAt: new Date(),
      permissions: this.getRolePermissions(role)
    }

    await membershipRef.set(membership)

    // Update team member count
    await db.collection('teams').doc(teamId).update({
      memberCount: db.FieldValue.increment(1),
      updatedAt: new Date()
    })
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const membership = await db.collection('team_memberships')
      .where('teamId', '==', teamId)
      .where('userId', '==', userId)
      .get()

    if (!membership.empty) {
      await membership.docs[0].ref.delete()

      // Update team member count
      await db.collection('teams').doc(teamId).update({
        memberCount: db.FieldValue.increment(-1),
        updatedAt: new Date()
      })
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamRole
  ): Promise<void> {
    const membership = await db.collection('team_memberships')
      .where('teamId', '==', teamId)
      .where('userId', '==', userId)
      .get()

    if (!membership.empty) {
      await membership.docs[0].ref.update({
        role: newRole,
        permissions: this.getRolePermissions(newRole)
      })
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const memberships = await db.collection('team_memberships')
      .where('teamId', '==', teamId)
      .get()

    const members: TeamMember[] = []

    for (const doc of memberships.docs) {
      const membership = doc.data()
      
      // Get user details (in a real app, you'd fetch from users collection)
      const userDetails = {
        id: membership.userId,
        name: `User ${membership.userId.slice(-4)}`, // Mock name
        email: `user${membership.userId.slice(-4)}@example.com`, // Mock email
        avatar: null
      }

      members.push({
        ...userDetails,
        role: membership.role,
        joinedAt: membership.joinedAt.toDate(),
        permissions: membership.permissions
      })
    }

    return members.sort((a, b) => {
      const roleOrder = { owner: 0, admin: 1, member: 2 }
      return roleOrder[a.role] - roleOrder[b.role]
    })
  }

  /**
   * Check user permissions
   */
  async checkPermission(
    userId: string,
    teamId: string,
    permission: keyof TeamPermissions
  ): Promise<boolean> {
    const membership = await db.collection('team_memberships')
      .where('teamId', '==', teamId)
      .where('userId', '==', userId)
      .get()

    if (membership.empty) return false

    const userPermissions = membership.docs[0].data().permissions
    return userPermissions[permission] || false
  }

  /**
   * Create team invitation
   */
  async createInvitation(
    teamId: string,
    inviterId: string,
    email: string,
    role: TeamRole = 'member'
  ): Promise<string> {
    const invitationRef = db.collection('team_invitations').doc()
    
    const invitation: TeamInvitation = {
      id: invitationRef.id,
      teamId,
      inviterId,
      email,
      role,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      token: this.generateInvitationToken()
    }

    await invitationRef.set(invitation)
    return invitationRef.id
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(
    invitationId: string,
    userId: string
  ): Promise<void> {
    const invitationDoc = await db.collection('team_invitations').doc(invitationId).get()
    
    if (!invitationDoc.exists) {
      throw new Error('Invitation not found')
    }

    const invitation = invitationDoc.data() as TeamInvitation

    if (invitation.status !== 'pending') {
      throw new Error('Invitation already used or expired')
    }

    if (invitation.expiresAt.toDate() < new Date()) {
      throw new Error('Invitation expired')
    }

    // Add user to team
    await this.addTeamMember(invitation.teamId, userId, invitation.role)

    // Update invitation status
    await invitationDoc.ref.update({
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedBy: userId
    })
  }

  /**
   * Get team analytics
   */
  async getTeamAnalytics(teamId: string): Promise<any> {
    const members = await this.getTeamMembers(teamId)
    
    // Get shared contacts
    const sharedContacts = await db.collection('shared_contacts')
      .where('teamId', '==', teamId)
      .get()

    // Get team messages
    const teamMessages = await db.collection('team_messages')
      .where('teamId', '==', teamId)
      .get()

    return {
      memberCount: members.length,
      roleDistribution: this.getRoleDistribution(members),
      sharedContactsCount: sharedContacts.size,
      totalMessages: teamMessages.size,
      activeMembers: members.filter(m => 
        m.joinedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    }
  }

  /**
   * Share contact with team
   */
  async shareContact(
    teamId: string,
    contactId: string,
    sharedBy: string,
    permissions: string[] = ['view']
  ): Promise<void> {
    const sharedContactRef = db.collection('shared_contacts').doc()
    
    await sharedContactRef.set({
      id: sharedContactRef.id,
      teamId,
      contactId,
      sharedBy,
      permissions,
      sharedAt: new Date(),
      lastAccessed: new Date()
    })
  }

  /**
   * Get shared contacts for team
   */
  async getSharedContacts(teamId: string): Promise<any[]> {
    const sharedContacts = await db.collection('shared_contacts')
      .where('teamId', '==', teamId)
      .get()

    return sharedContacts.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }

  /**
   * Get role permissions
   */
  private getRolePermissions(role: TeamRole): TeamPermissions {
    switch (role) {
      case 'owner':
        return {
          manageTeam: true,
          inviteMembers: true,
          removeMembers: true,
          changeRoles: true,
          viewAnalytics: true,
          shareContacts: true,
          editContacts: true,
          deleteContacts: true,
          sendMessages: true,
          viewMessages: true
        }
      case 'admin':
        return {
          manageTeam: false,
          inviteMembers: true,
          removeMembers: true,
          changeRoles: false,
          viewAnalytics: true,
          shareContacts: true,
          editContacts: true,
          deleteContacts: false,
          sendMessages: true,
          viewMessages: true
        }
      case 'member':
        return {
          manageTeam: false,
          inviteMembers: false,
          removeMembers: false,
          changeRoles: false,
          viewAnalytics: false,
          shareContacts: true,
          editContacts: false,
          deleteContacts: false,
          sendMessages: true,
          viewMessages: true
        }
      default:
        return {
          manageTeam: false,
          inviteMembers: false,
          removeMembers: false,
          changeRoles: false,
          viewAnalytics: false,
          shareContacts: false,
          editContacts: false,
          deleteContacts: false,
          sendMessages: false,
          viewMessages: false
        }
    }
  }

  /**
   * Get role distribution
   */
  private getRoleDistribution(members: TeamMember[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {}
    
    members.forEach(member => {
      distribution[member.role] = (distribution[member.role] || 0) + 1
    })

    return distribution
  }

  /**
   * Generate invitation token
   */
  private generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
} 