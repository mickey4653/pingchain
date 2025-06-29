"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, TrendingDown, Minus, Activity, Target, Calendar, AlertTriangle } from 'lucide-react'
import { TeamMetrics, CollaborationHealth, TeamMember } from '@/lib/team-features'

interface TeamHealthProps {
  metrics?: TeamMetrics
  loading?: boolean
}

export function TeamHealth({ metrics, loading = false }: TeamHealthProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  
  // Default metrics if none provided
  const defaultMetrics: TeamMetrics = {
    overallHealth: 75,
    collaborationScore: 80,
    communicationEfficiency: 85,
    projectCompletion: 70,
    teamMorale: 78,
    memberCount: 5,
    activeProjects: 3,
    recentActivity: {
      messagesSent: 45,
      tasksCompleted: 12,
      meetingsHeld: 8,
      documentsShared: 15
    },
    collaborationHealth: {
      crossTeamProjects: 2,
      knowledgeSharing: 85,
      conflictResolution: 90,
      innovationLevel: 75
    },
    members: [
      {
        id: '1',
        name: 'Alex Johnson',
        role: 'Project Manager',
        healthScore: 85,
        engagement: 90,
        collaboration: 88,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'active',
        skills: ['Leadership', 'Communication', 'Planning'],
        recentContributions: 5
      },
      {
        id: '2',
        name: 'Sarah Chen',
        role: 'Developer',
        healthScore: 78,
        engagement: 85,
        collaboration: 82,
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'active',
        skills: ['JavaScript', 'React', 'Node.js'],
        recentContributions: 8
      },
      {
        id: '3',
        name: 'Mike Rodriguez',
        role: 'Designer',
        healthScore: 92,
        engagement: 95,
        collaboration: 90,
        lastActive: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'active',
        skills: ['UI/UX', 'Figma', 'Prototyping'],
        recentContributions: 12
      }
    ]
  }
  
  const teamMetrics = metrics || defaultMetrics
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'away': return 'bg-yellow-100 text-yellow-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      case 'away': return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
      case 'offline': return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading team health data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Overall Team Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Health Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(teamMetrics.overallHealth)}`}>
                {teamMetrics.overallHealth}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Health</div>
              <Progress value={teamMetrics.overallHealth} className="mt-2" />
            </div>
            
            {/* Team Stats */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Team Members</span>
                <span className="text-sm font-medium">{teamMetrics.memberCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Active Projects</span>
                <span className="text-sm font-medium">{teamMetrics.activeProjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Collaboration Score</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.collaborationScore)}`}>
                  {teamMetrics.collaborationScore}%
                </span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Communication</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.communicationEfficiency)}`}>
                  {teamMetrics.communicationEfficiency}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Project Completion</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.projectCompletion)}`}>
                  {teamMetrics.projectCompletion}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Team Morale</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.teamMorale)}`}>
                  {teamMetrics.teamMorale}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{teamMetrics.recentActivity.messagesSent}</div>
              <div className="text-sm text-muted-foreground">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{teamMetrics.recentActivity.tasksCompleted}</div>
              <div className="text-sm text-muted-foreground">Tasks Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{teamMetrics.recentActivity.meetingsHeld}</div>
              <div className="text-sm text-muted-foreground">Meetings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{teamMetrics.recentActivity.documentsShared}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Collaboration Health */}
      <Card>
        <CardHeader>
          <CardTitle>Collaboration Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Cross-team Projects</span>
              <Badge variant="outline">{teamMetrics.collaborationHealth.crossTeamProjects}</Badge>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Knowledge Sharing</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.collaborationHealth.knowledgeSharing)}`}>
                  {teamMetrics.collaborationHealth.knowledgeSharing}%
                </span>
              </div>
              <Progress value={teamMetrics.collaborationHealth.knowledgeSharing} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Conflict Resolution</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.collaborationHealth.conflictResolution)}`}>
                  {teamMetrics.collaborationHealth.conflictResolution}%
                </span>
              </div>
              <Progress value={teamMetrics.collaborationHealth.conflictResolution} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Innovation Level</span>
                <span className={`text-sm font-medium ${getHealthColor(teamMetrics.collaborationHealth.innovationLevel)}`}>
                  {teamMetrics.collaborationHealth.innovationLevel}%
                </span>
              </div>
              <Progress value={teamMetrics.collaborationHealth.innovationLevel} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMetrics.members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No team members found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMetrics.members.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedMember?.id === member.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(member.status)}
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{member.healthScore}%</div>
                        <div className="text-xs text-muted-foreground">Health</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{member.engagement}%</div>
                        <div className="text-xs text-muted-foreground">Engagement</div>
                      </div>
                      <Badge className={getStatusColor(member.status)}>
                        {member.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Member Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Collaboration</span>
                        <span className={getHealthColor(member.collaboration)}>
                          {member.collaboration}%
                        </span>
                      </div>
                      <Progress value={member.collaboration} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last active: {member.lastActive.toLocaleTimeString()}</span>
                      <span>{member.recentContributions} contributions</span>
                    </div>
                  </div>
                  
                  {/* Skills */}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {member.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Selected Member Details */}
      {selectedMember && (
        <Card>
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedMember.status)}
                <div>
                  <h3 className="font-medium">{selectedMember.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
                </div>
                <Badge className={getStatusColor(selectedMember.status)}>
                  {selectedMember.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Health Score</span>
                      <span className={`text-sm font-medium ${getHealthColor(selectedMember.healthScore)}`}>
                        {selectedMember.healthScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Engagement</span>
                      <span className={`text-sm font-medium ${getHealthColor(selectedMember.engagement)}`}>
                        {selectedMember.engagement}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Collaboration</span>
                      <span className={`text-sm font-medium ${getHealthColor(selectedMember.collaboration)}`}>
                        {selectedMember.collaboration}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active</span>
                      <span>{selectedMember.lastActive.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recent Contributions</span>
                      <span>{selectedMember.recentContributions}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 