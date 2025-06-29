// Team & Group Communication Features
// Handles Slack/Discord bot functionality and team communication tracking

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  platforms: string[]
  lastActive: Date
  communicationScore: number // 0-100
}

export interface TeamChannel {
  id: string
  name: string
  platform: 'slack' | 'discord' | 'teams'
  type: 'public' | 'private' | 'dm'
  members: string[]
  messageCount: number
  lastActivity: Date
  healthScore: number // 0-100
}

export interface TeamMessage {
  id: string
  channelId: string
  senderId: string
  content: string
  timestamp: Date
  platform: string
  messageType: 'text' | 'reaction' | 'thread' | 'file'
  threadId?: string
  reactions?: Reaction[]
}

export interface Reaction {
  emoji: string
  count: number
  users: string[]
}

export interface TeamInsight {
  type: 'engagement' | 'collaboration' | 'communication' | 'productivity'
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  data: Record<string, any>
  timestamp: Date
}

// Team Communication Manager
export class TeamCommunicationManager {
  private members: Map<string, TeamMember> = new Map()
  private channels: Map<string, TeamChannel> = new Map()
  private messages: Map<string, TeamMessage[]> = new Map()
  private insights: TeamInsight[] = []
  
  async addMember(member: TeamMember): Promise<void> {
    this.members.set(member.id, member)
  }
  
  async addChannel(channel: TeamChannel): Promise<void> {
    this.channels.set(channel.id, channel)
    this.messages.set(channel.id, [])
  }
  
  async processMessage(message: TeamMessage): Promise<void> {
    // Store message
    const channelMessages = this.messages.get(message.channelId) || []
    channelMessages.push(message)
    this.messages.set(message.channelId, channelMessages)
    
    // Update channel activity
    const channel = this.channels.get(message.channelId)
    if (channel) {
      channel.messageCount++
      channel.lastActivity = message.timestamp
      channel.healthScore = this.calculateChannelHealth(channel)
    }
    
    // Update member activity
    const member = this.members.get(message.senderId)
    if (member) {
      member.lastActive = message.timestamp
      member.communicationScore = this.calculateMemberScore(member)
    }
    
    // Generate insights
    await this.generateInsights(message)
  }
  
  async getTeamHealth(): Promise<{
    overallScore: number
    activeMembers: number
    activeChannels: number
    totalMessages: number
    insights: TeamInsight[]
  }> {
    const activeMembers = Array.from(this.members.values()).filter(
      member => (Date.now() - member.lastActive.getTime()) < 24 * 60 * 60 * 1000
    ).length
    
    const activeChannels = Array.from(this.channels.values()).filter(
      channel => (Date.now() - channel.lastActivity.getTime()) < 7 * 24 * 60 * 60 * 1000
    ).length
    
    const totalMessages = Array.from(this.messages.values()).reduce(
      (sum, messages) => sum + messages.length, 0
    )
    
    const overallScore = this.calculateOverallTeamHealth()
    
    return {
      overallScore,
      activeMembers,
      activeChannels,
      totalMessages,
      insights: this.insights.slice(-10) // Last 10 insights
    }
  }
  
  async getMemberInsights(memberId: string): Promise<TeamInsight[]> {
    const member = this.members.get(memberId)
    if (!member) return []
    
    const insights: TeamInsight[] = []
    
    // Communication frequency insight
    const recentMessages = this.getMemberRecentMessages(memberId, 7) // Last 7 days
    if (recentMessages.length < 5) {
      insights.push({
        type: 'communication',
        title: 'Low Communication Activity',
        description: `${member.name} has been less active recently. Consider reaching out.`,
        severity: 'warning',
        data: { messageCount: recentMessages.length },
        timestamp: new Date()
      })
    }
    
    // Collaboration insight
    const collaborationScore = this.calculateCollaborationScore(memberId)
    if (collaborationScore < 30) {
      insights.push({
        type: 'collaboration',
        title: 'Low Collaboration',
        description: `${member.name} could benefit from more team collaboration.`,
        severity: 'info',
        data: { collaborationScore },
        timestamp: new Date()
      })
    }
    
    return insights
  }
  
  async getChannelInsights(channelId: string): Promise<TeamInsight[]> {
    const channel = this.channels.get(channelId)
    if (!channel) return []
    
    const insights: TeamInsight[] = []
    
    // Activity insight
    const recentMessages = this.messages.get(channelId)?.filter(
      msg => (Date.now() - msg.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000
    ) || []
    
    if (recentMessages.length < 10) {
      insights.push({
        type: 'engagement',
        title: 'Low Channel Activity',
        description: `${channel.name} has been quiet recently. Consider re-engaging the team.`,
        severity: 'warning',
        data: { messageCount: recentMessages.length },
        timestamp: new Date()
      })
    }
    
    // Health insight
    if (channel.healthScore < 50) {
      insights.push({
        type: 'communication',
        title: 'Channel Health Concerns',
        description: `${channel.name} shows signs of poor communication health.`,
        severity: 'critical',
        data: { healthScore: channel.healthScore },
        timestamp: new Date()
      })
    }
    
    return insights
  }
  
  private calculateChannelHealth(channel: TeamChannel): number {
    let health = 50 // Base score
    
    // Factor in message frequency
    const daysSinceActivity = (Date.now() - channel.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActivity < 1) health += 20
    else if (daysSinceActivity < 7) health += 10
    else if (daysSinceActivity > 30) health -= 20
    
    // Factor in member engagement
    const activeMembers = channel.members.length
    if (activeMembers > 5) health += 10
    if (activeMembers < 2) health -= 10
    
    // Factor in message count
    if (channel.messageCount > 100) health += 10
    if (channel.messageCount < 10) health -= 10
    
    return Math.max(0, Math.min(100, health))
  }
  
  private calculateMemberScore(member: TeamMember): number {
    let score = 50 // Base score
    
    // Factor in recent activity
    const daysSinceActive = (Date.now() - member.lastActive.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceActive < 1) score += 20
    else if (daysSinceActive < 7) score += 10
    else if (daysSinceActive > 30) score -= 20
    
    // Factor in platform diversity
    if (member.platforms.length > 2) score += 10
    if (member.platforms.length === 1) score -= 5
    
    return Math.max(0, Math.min(100, score))
  }
  
  private calculateOverallTeamHealth(): number {
    const memberScores = Array.from(this.members.values()).map(m => m.communicationScore)
    const channelScores = Array.from(this.channels.values()).map(c => c.healthScore)
    
    const avgMemberScore = memberScores.length > 0 ? 
      memberScores.reduce((sum, score) => sum + score, 0) / memberScores.length : 50
    
    const avgChannelScore = channelScores.length > 0 ?
      channelScores.reduce((sum, score) => sum + score, 0) / channelScores.length : 50
    
    return Math.round((avgMemberScore + avgChannelScore) / 2)
  }
  
  private getMemberRecentMessages(memberId: string, days: number): TeamMessage[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
    const allMessages: TeamMessage[] = []
    
    for (const messages of this.messages.values()) {
      allMessages.push(...messages.filter(msg => 
        msg.senderId === memberId && msg.timestamp.getTime() > cutoff
      ))
    }
    
    return allMessages
  }
  
  private calculateCollaborationScore(memberId: string): number {
    const recentMessages = this.getMemberRecentMessages(memberId, 30)
    const threadMessages = recentMessages.filter(msg => msg.threadId)
    const reactionMessages = recentMessages.filter(msg => msg.reactions && msg.reactions.length > 0)
    
    let score = 50
    
    // Factor in thread participation
    if (threadMessages.length > 5) score += 20
    if (threadMessages.length === 0) score -= 10
    
    // Factor in reaction engagement
    if (reactionMessages.length > 3) score += 15
    if (reactionMessages.length === 0) score -= 5
    
    // Factor in message diversity
    const uniqueChannels = new Set(recentMessages.map(msg => msg.channelId))
    if (uniqueChannels.size > 3) score += 15
    if (uniqueChannels.size === 1) score -= 10
    
    return Math.max(0, Math.min(100, score))
  }
  
  private async generateInsights(message: TeamMessage): Promise<void> {
    // Generate engagement insights
    if (message.messageType === 'reaction' && message.reactions) {
      const totalReactions = message.reactions.reduce((sum, reaction) => sum + reaction.count, 0)
      if (totalReactions > 10) {
        this.insights.push({
          type: 'engagement',
          title: 'High Engagement Message',
          description: 'A message received high engagement from the team.',
          severity: 'info',
          data: { reactionCount: totalReactions, channelId: message.channelId },
          timestamp: new Date()
        })
      }
    }
    
    // Generate collaboration insights
    if (message.threadId) {
      const threadMessages = this.messages.get(message.channelId)?.filter(
        msg => msg.threadId === message.threadId
      ) || []
      
      if (threadMessages.length > 5) {
        this.insights.push({
          type: 'collaboration',
          title: 'Active Thread Discussion',
          description: 'Team is actively collaborating on a topic.',
          severity: 'info',
          data: { threadLength: threadMessages.length, channelId: message.channelId },
          timestamp: new Date()
        })
      }
    }
    
    // Keep only recent insights (last 50)
    if (this.insights.length > 50) {
      this.insights = this.insights.slice(-50)
    }
  }
} 