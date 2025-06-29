"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Heart, TrendingUp, TrendingDown, Minus, Users, MessageSquare, Clock } from 'lucide-react'
import { EmotionalProfile, RelationshipHealth } from '@/lib/emotional-intelligence'

interface EmotionalIntelligenceProps {
  profiles?: EmotionalProfile[]
  loading?: boolean
}

export function EmotionalIntelligence({ profiles = [], loading = false }: EmotionalIntelligenceProps) {
  const [selectedProfile, setSelectedProfile] = useState<EmotionalProfile | null>(null)
  
  // Calculate overall stats
  const overallStats = {
    totalContacts: profiles.length,
    averageEngagement: profiles.length > 0 
      ? Math.round(profiles.reduce((sum, p) => sum + p.emotionalEngagement, 0) / profiles.length)
      : 0,
    averageHealth: profiles.length > 0
      ? Math.round(profiles.reduce((sum, p) => sum + p.relationshipHealth.overallScore, 0) / profiles.length)
      : 0,
    improving: profiles.filter(p => p.relationshipHealth.trend === 'improving').length,
    declining: profiles.filter(p => p.relationshipHealth.trend === 'declining').length,
    stable: profiles.filter(p => p.relationshipHealth.trend === 'stable').length
  }
  
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
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }
  
  const getCommunicationStyleColor = (style: string) => {
    switch (style) {
      case 'formal': return 'bg-blue-100 text-blue-800'
      case 'casual': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotional Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading emotional intelligence data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Relationship Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{overallStats.totalContacts}</div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallStats.averageEngagement}%</div>
              <div className="text-sm text-muted-foreground">Avg Engagement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{overallStats.averageHealth}%</div>
              <div className="text-sm text-muted-foreground">Avg Health</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{overallStats.improving}</div>
              <div className="text-sm text-muted-foreground">Improving</div>
            </div>
          </div>
          
          {/* Trend Distribution */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Relationship Trends</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">{overallStats.improving} Improving</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-gray-600" />
                <span className="text-sm">{overallStats.stable} Stable</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm">{overallStats.declining} Declining</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No relationship data available yet.</p>
              <p className="text-sm text-muted-foreground">Start conversations to build emotional intelligence profiles.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.slice(0, 5).map((profile) => (
                <div
                  key={profile.contactId}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedProfile?.contactId === profile.contactId ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Contact {profile.contactId.slice(-4)}</h4>
                        {getTrendIcon(profile.relationshipHealth.trend)}
                        <Badge 
                          variant="outline" 
                          className={getCommunicationStyleColor(profile.communicationStyle.formality)}
                        >
                          {profile.communicationStyle.formality}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">Engagement</span>
                            <span className={getHealthColor(profile.emotionalEngagement)}>
                              {profile.emotionalEngagement}%
                            </span>
                          </div>
                          <Progress value={profile.emotionalEngagement} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">Health</span>
                            <span className={getHealthColor(profile.relationshipHealth.overallScore)}>
                              {profile.relationshipHealth.overallScore}%
                            </span>
                          </div>
                          <Progress value={profile.relationshipHealth.overallScore} className="h-2" />
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>Trust: {profile.relationshipHealth.trustLevel}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>Quality: {profile.relationshipHealth.communicationQuality}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Updated: {profile.lastAnalysis.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {profiles.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All {profiles.length} Contacts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Selected Profile Details */}
      {selectedProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Relationship Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Communication Style</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Formality:</span>
                    <Badge className="ml-2">{selectedProfile.communicationStyle.formality}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Verbosity:</span>
                    <Badge className="ml-2">{selectedProfile.communicationStyle.verbosity}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emoji Usage:</span>
                    <Badge className="ml-2">{selectedProfile.communicationStyle.emojiUsage}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Punctuation:</span>
                    <Badge className="ml-2">{selectedProfile.communicationStyle.punctuation}</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Relationship Health Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Overall Score</span>
                    <span className="text-sm font-medium">{selectedProfile.relationshipHealth.overallScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Trust Level</span>
                    <span className="text-sm font-medium">{selectedProfile.relationshipHealth.trustLevel}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Engagement Level</span>
                    <span className="text-sm font-medium">{selectedProfile.relationshipHealth.engagementLevel}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Communication Quality</span>
                    <span className="text-sm font-medium">{selectedProfile.relationshipHealth.communicationQuality}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Reciprocity</span>
                    <span className="text-sm font-medium">{selectedProfile.relationshipHealth.reciprocity}%</span>
                  </div>
                </div>
              </div>
              
              {selectedProfile.emotionalTriggers.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Emotional Triggers</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.emotionalTriggers.map((trigger) => (
                      <Badge key={trigger} variant="outline">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedProfile.preferredTopics.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Preferred Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.preferredTopics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 