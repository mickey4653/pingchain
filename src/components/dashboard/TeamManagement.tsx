"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Plus, Settings, UserPlus, BarChart3, Shield, Mail, Calendar, Crown, Share2, MessageSquare } from 'lucide-react'
import { Team, TeamMember, TeamRole, TeamAnalytics } from '@/lib/team-features/types'
import { SharedContacts } from './SharedContacts'
import { TeamMessaging } from './TeamMessaging'
import { TeamActivity } from './TeamActivity'

interface TeamManagementProps {
  loading?: boolean
}

export function TeamManagement({ loading = false }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null)
  const [userPermissions, setUserPermissions] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '' })
  const [inviteData, setInviteData] = useState({ email: '', role: 'member' as TeamRole })

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam.id)
    }
  }, [selectedTeam])

  const loadTeams = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTeamDetails = async (teamId: string) => {
    try {
      // Load team members
      const membersResponse = await fetch(`/api/teams/${teamId}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setTeamMembers(membersData.members)
        
        // Get current user's permissions
        const currentUser = membersData.members.find((member: TeamMember) => 
          member.id === 'current-user-id' // This would be the actual user ID
        )
        if (currentUser) {
          setUserPermissions(currentUser.permissions)
        }
      }

      // Load team analytics
      const analyticsResponse = await fetch(`/api/teams/${teamId}/analytics`)
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setTeamAnalytics(analyticsData.analytics)
      }
    } catch (error) {
      console.error('Error loading team details:', error)
    }
  }

  const createTeam = async () => {
    if (!newTeamData.name.trim()) return

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamData)
      })

      if (response.ok) {
        setShowCreateTeam(false)
        setNewTeamData({ name: '', description: '' })
        loadTeams()
      }
    } catch (error) {
      console.error('Error creating team:', error)
    }
  }

  const inviteMember = async () => {
    if (!selectedTeam || !inviteData.email.trim()) return

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      })

      if (response.ok) {
        setShowInviteMember(false)
        setInviteData({ email: '', role: 'member' })
        loadTeamDetails(selectedTeam.id)
      }
    } catch (error) {
      console.error('Error inviting member:', error)
    }
  }

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />
      case 'member': return <Users className="h-4 w-4 text-gray-600" />
      default: return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canPerformAction = (action: string) => {
    if (!userPermissions) return false
    return userPermissions[action] || false
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading team data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teams Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Teams
            </CardTitle>
            <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Team Name</label>
                    <Input
                      value={newTeamData.name}
                      onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newTeamData.description}
                      onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })}
                      placeholder="Enter team description"
                      rows={3}
                    />
                  </div>
                  <Button onClick={createTeam} className="w-full">
                    Create Team
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No teams found.</p>
              <p className="text-sm text-muted-foreground">Create your first team to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedTeam?.id === team.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{team.name}</h3>
                    <Badge variant="outline">{team.memberCount} members</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {team.createdAt.toLocaleDateString()}</span>
                    <span>Updated {team.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Team Details */}
      {selectedTeam && (
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="contacts">Shared Contacts</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Team Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Team Members</CardTitle>
                  {canPerformAction('inviteMembers') && (
                    <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                              type="email"
                              value={inviteData.email}
                              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                              placeholder="Enter email address"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Role</label>
                            <Select value={inviteData.role} onValueChange={(value) => setInviteData({ ...inviteData, role: value as TeamRole })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={inviteMember} className="w-full">
                            Send Invitation
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Joined {member.joinedAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            {canPerformAction('shareContacts') ? (
              <SharedContacts teamId={selectedTeam.id} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You don't have permission to view shared contacts.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            {canPerformAction('viewMessages') ? (
              <TeamMessaging teamId={selectedTeam.id} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You don't have permission to view team messages.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {canPerformAction('viewMessages') ? (
              <TeamActivity teamId={selectedTeam.id} />
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You don't have permission to view team activity.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {canPerformAction('viewAnalytics') && teamAnalytics ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Team Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{teamAnalytics.memberCount}</div>
                      <div className="text-sm text-muted-foreground">Total Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{teamAnalytics.activeMembers}</div>
                      <div className="text-sm text-muted-foreground">Active Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{teamAnalytics.sharedContactsCount}</div>
                      <div className="text-sm text-muted-foreground">Shared Contacts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{teamAnalytics.totalMessages}</div>
                      <div className="text-sm text-muted-foreground">Team Messages</div>
                    </div>
                  </div>

                  {/* Role Distribution */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Role Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(teamAnalytics.roleDistribution).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role as TeamRole)}
                            <span className="text-sm capitalize">{role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(count / teamAnalytics.memberCount) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">You don't have permission to view team analytics.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
} 