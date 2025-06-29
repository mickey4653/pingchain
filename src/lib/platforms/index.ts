// Platform Integration System
// Core interface for all communication platforms

export interface PlatformMessage {
  id: string
  platform: 'whatsapp' | 'imessage' | 'slack' | 'email' | 'telegram'
  contactId: string
  content: string
  timestamp: Date
  direction: 'inbound' | 'outbound'
  metadata?: Record<string, any>
}

export interface PlatformContact {
  id: string
  platform: 'whatsapp' | 'imessage' | 'slack' | 'email' | 'telegram'
  name: string
  identifier: string // phone number, email, slack ID, etc.
  avatar?: string
  lastSeen?: Date
}

export interface PlatformConfig {
  platform: string
  enabled: boolean
  credentials?: Record<string, string>
  syncInterval?: number // minutes
}

// Abstract base class for all platforms
export abstract class PlatformAdapter {
  abstract name: string
  abstract config: PlatformConfig
  
  abstract connect(): Promise<boolean>
  abstract disconnect(): Promise<void>
  abstract isConnected(): boolean
  
  abstract getMessages(contactId?: string, limit?: number): Promise<PlatformMessage[]>
  abstract sendMessage(contactId: string, content: string): Promise<string>
  abstract getContacts(): Promise<PlatformContact[]>
  
  abstract startSync(): Promise<void>
  abstract stopSync(): Promise<void>
}

// Platform Manager - orchestrates all platforms
export class PlatformManager {
  private adapters: Map<string, PlatformAdapter> = new Map()
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map()
  
  registerAdapter(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }
  
  async connectAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.connect()
        console.log(`✅ Connected to ${name}`)
      } catch (error) {
        console.error(`❌ Failed to connect to ${name}:`, error)
      }
    }
  }
  
  async startAllSync(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      if (adapter.config.enabled) {
        await adapter.startSync()
      }
    }
  }
  
  async stopAllSync(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      await adapter.stopSync()
    }
  }
  
  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform)
  }
  
  getAllMessages(): PlatformMessage[] {
    const allMessages: PlatformMessage[] = []
    for (const adapter of this.adapters.values()) {
      // This would need to be async in real implementation
      // For now, return empty array
    }
    return allMessages
  }
} 