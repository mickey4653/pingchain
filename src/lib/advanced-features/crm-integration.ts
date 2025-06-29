import { db } from '@/lib/firebase-admin'

export interface CRMConfig {
  id: string
  userId: string
  teamId?: string
  provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho'
  name: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  instanceUrl?: string // For Salesforce
  clientId?: string
  clientSecret?: string
  isActive: boolean
  lastSync?: Date
  syncSettings: {
    syncContacts: boolean
    syncDeals: boolean
    syncActivities: boolean
    bidirectional: boolean
    autoSync: boolean
    syncInterval: number // minutes
  }
  createdAt: Date
  updatedAt: Date
}

export interface CRMSyncResult {
  success: boolean
  syncedContacts: number
  syncedDeals: number
  syncedActivities: number
  errors: string[]
  lastSync: Date
}

export interface CRMContact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  title?: string
  address?: string
  source: string
  externalId: string
  lastModified: Date
}

export interface CRMDeal {
  id: string
  title: string
  amount?: number
  stage: string
  contactId: string
  closeDate?: Date
  source: string
  externalId: string
  lastModified: Date
}

export interface CRMActivity {
  id: string
  type: 'email' | 'call' | 'meeting' | 'task'
  subject: string
  description?: string
  contactId: string
  dealId?: string
  date: Date
  source: string
  externalId: string
  lastModified: Date
}

export class CRMIntegration {
  private static instance: CRMIntegration

  static getInstance(): CRMIntegration {
    if (!CRMIntegration.instance) {
      CRMIntegration.instance = new CRMIntegration()
    }
    return CRMIntegration.instance
  }

  async createCRMConfig(config: Omit<CRMConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const configRef = db.collection('crm_configs').doc()
    
    const newConfig: CRMConfig = {
      ...config,
      id: configRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await configRef.set(newConfig)
    return configRef.id
  }

  async getCRMConfigs(userId: string, teamId?: string): Promise<CRMConfig[]> {
    let query = db.collection('crm_configs').where('userId', '==', userId)
    
    if (teamId) {
      query = query.where('teamId', '==', teamId)
    }

    const snapshot = await query.get()
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CRMConfig[]
  }

  async getCRMConfig(configId: string): Promise<CRMConfig | null> {
    const doc = await db.collection('crm_configs').doc(configId).get()
    return doc.exists ? { id: doc.id, ...doc.data() } as CRMConfig : null
  }

  async updateCRMConfig(configId: string, updates: Partial<CRMConfig>): Promise<void> {
    await db.collection('crm_configs').doc(configId).update({
      ...updates,
      updatedAt: new Date()
    })
  }

  async deleteCRMConfig(configId: string): Promise<void> {
    await db.collection('crm_configs').doc(configId).delete()
  }

  async syncCRMData(configId: string): Promise<CRMSyncResult> {
    const config = await this.getCRMConfig(configId)
    if (!config || !config.isActive) {
      throw new Error('CRM configuration not found or inactive')
    }

    const result: CRMSyncResult = {
      success: true,
      syncedContacts: 0,
      syncedDeals: 0,
      syncedActivities: 0,
      errors: [],
      lastSync: new Date()
    }

    try {
      switch (config.provider) {
        case 'salesforce':
          await this.syncSalesforce(config, result)
          break
        case 'hubspot':
          await this.syncHubSpot(config, result)
          break
        case 'pipedrive':
          await this.syncPipedrive(config, result)
          break
        case 'zoho':
          await this.syncZoho(config, result)
          break
        default:
          throw new Error(`Unsupported CRM provider: ${config.provider}`)
      }

      // Update last sync time
      await this.updateCRMConfig(configId, { lastSync: new Date() })

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  private async syncSalesforce(config: CRMConfig, result: CRMSyncResult): Promise<void> {
    if (!config.accessToken || !config.instanceUrl) {
      throw new Error('Salesforce configuration incomplete')
    }

    const headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    }

    // Sync contacts
    if (config.syncSettings.syncContacts) {
      try {
        const contactsResponse = await fetch(
          `${config.instanceUrl}/services/data/v58.0/query?q=SELECT Id,FirstName,LastName,Email,Phone,Company,Title FROM Contact`,
          { headers }
        )
        
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          const contacts = contactsData.records.map((record: any) => ({
            id: record.Id,
            firstName: record.FirstName || '',
            lastName: record.LastName || '',
            email: record.Email || '',
            phone: record.Phone || '',
            company: record.Company || '',
            title: record.Title || '',
            source: 'salesforce',
            externalId: record.Id,
            lastModified: new Date()
          }))

          await this.saveContactsToFirestore(contacts, config)
          result.syncedContacts = contacts.length
        }
      } catch (error) {
        result.errors.push(`Salesforce contacts sync failed: ${error}`)
      }
    }

    // Sync deals (Opportunities in Salesforce)
    if (config.syncSettings.syncDeals) {
      try {
        const dealsResponse = await fetch(
          `${config.instanceUrl}/services/data/v58.0/query?q=SELECT Id,Name,Amount,StageName,CloseDate,ContactId FROM Opportunity`,
          { headers }
        )
        
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json()
          const deals = dealsData.records.map((record: any) => ({
            id: record.Id,
            title: record.Name || '',
            amount: record.Amount || 0,
            stage: record.StageName || '',
            contactId: record.ContactId || '',
            closeDate: record.CloseDate ? new Date(record.CloseDate) : undefined,
            source: 'salesforce',
            externalId: record.Id,
            lastModified: new Date()
          }))

          await this.saveDealsToFirestore(deals, config)
          result.syncedDeals = deals.length
        }
      } catch (error) {
        result.errors.push(`Salesforce deals sync failed: ${error}`)
      }
    }
  }

  private async syncHubSpot(config: CRMConfig, result: CRMSyncResult): Promise<void> {
    if (!config.apiKey) {
      throw new Error('HubSpot API key required')
    }

    const headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }

    // Sync contacts
    if (config.syncSettings.syncContacts) {
      try {
        const contactsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/contacts',
          { headers }
        )
        
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          const contacts = contactsData.results.map((record: any) => ({
            id: record.id,
            firstName: record.properties.firstname || '',
            lastName: record.properties.lastname || '',
            email: record.properties.email || '',
            phone: record.properties.phone || '',
            company: record.properties.company || '',
            title: record.properties.jobtitle || '',
            source: 'hubspot',
            externalId: record.id,
            lastModified: new Date(record.updatedAt)
          }))

          await this.saveContactsToFirestore(contacts, config)
          result.syncedContacts = contacts.length
        }
      } catch (error) {
        result.errors.push(`HubSpot contacts sync failed: ${error}`)
      }
    }

    // Sync deals
    if (config.syncSettings.syncDeals) {
      try {
        const dealsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/deals',
          { headers }
        )
        
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json()
          const deals = dealsData.results.map((record: any) => ({
            id: record.id,
            title: record.properties.dealname || '',
            amount: parseFloat(record.properties.amount) || 0,
            stage: record.properties.dealstage || '',
            contactId: record.properties.associatedcontactids || '',
            closeDate: record.properties.closedate ? new Date(record.properties.closedate) : undefined,
            source: 'hubspot',
            externalId: record.id,
            lastModified: new Date(record.updatedAt)
          }))

          await this.saveDealsToFirestore(deals, config)
          result.syncedDeals = deals.length
        }
      } catch (error) {
        result.errors.push(`HubSpot deals sync failed: ${error}`)
      }
    }
  }

  private async syncPipedrive(config: CRMConfig, result: CRMSyncResult): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Pipedrive API key required')
    }

    const headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }

    // Sync contacts (Persons in Pipedrive)
    if (config.syncSettings.syncContacts) {
      try {
        const contactsResponse = await fetch(
          'https://api.pipedrive.com/v1/persons',
          { headers }
        )
        
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          const contacts = contactsData.data.map((record: any) => ({
            id: record.id.toString(),
            firstName: record.first_name || '',
            lastName: record.last_name || '',
            email: record.email?.[0]?.value || '',
            phone: record.phone?.[0]?.value || '',
            company: record.org_name || '',
            title: record.title || '',
            source: 'pipedrive',
            externalId: record.id.toString(),
            lastModified: new Date(record.update_time)
          }))

          await this.saveContactsToFirestore(contacts, config)
          result.syncedContacts = contacts.length
        }
      } catch (error) {
        result.errors.push(`Pipedrive contacts sync failed: ${error}`)
      }
    }

    // Sync deals
    if (config.syncSettings.syncDeals) {
      try {
        const dealsResponse = await fetch(
          'https://api.pipedrive.com/v1/deals',
          { headers }
        )
        
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json()
          const deals = dealsData.data.map((record: any) => ({
            id: record.id.toString(),
            title: record.title || '',
            amount: parseFloat(record.value) || 0,
            stage: record.stage_name || '',
            contactId: record.person_id?.toString() || '',
            closeDate: record.close_time ? new Date(record.close_time) : undefined,
            source: 'pipedrive',
            externalId: record.id.toString(),
            lastModified: new Date(record.update_time)
          }))

          await this.saveDealsToFirestore(deals, config)
          result.syncedDeals = deals.length
        }
      } catch (error) {
        result.errors.push(`Pipedrive deals sync failed: ${error}`)
      }
    }
  }

  private async syncZoho(config: CRMConfig, result: CRMSyncResult): Promise<void> {
    if (!config.accessToken) {
      throw new Error('Zoho access token required')
    }

    const headers = {
      'Authorization': `Zoho-oauthtoken ${config.accessToken}`,
      'Content-Type': 'application/json'
    }

    // Sync contacts
    if (config.syncSettings.syncContacts) {
      try {
        const contactsResponse = await fetch(
          'https://www.zohoapis.com/crm/v3/Contacts',
          { headers }
        )
        
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          const contacts = contactsData.data.map((record: any) => ({
            id: record.id,
            firstName: record.First_Name || '',
            lastName: record.Last_Name || '',
            email: record.Email || '',
            phone: record.Phone || '',
            company: record.Account_Name?.name || '',
            title: record.Title || '',
            source: 'zoho',
            externalId: record.id,
            lastModified: new Date(record.Modified_Time)
          }))

          await this.saveContactsToFirestore(contacts, config)
          result.syncedContacts = contacts.length
        }
      } catch (error) {
        result.errors.push(`Zoho contacts sync failed: ${error}`)
      }
    }

    // Sync deals
    if (config.syncSettings.syncDeals) {
      try {
        const dealsResponse = await fetch(
          'https://www.zohoapis.com/crm/v3/Deals',
          { headers }
        )
        
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json()
          const deals = dealsData.data.map((record: any) => ({
            id: record.id,
            title: record.Deal_Name || '',
            amount: parseFloat(record.Amount) || 0,
            stage: record.Stage || '',
            contactId: record.Contact_Name?.id || '',
            closeDate: record.Closing_Date ? new Date(record.Closing_Date) : undefined,
            source: 'zoho',
            externalId: record.id,
            lastModified: new Date(record.Modified_Time)
          }))

          await this.saveDealsToFirestore(deals, config)
          result.syncedDeals = deals.length
        }
      } catch (error) {
        result.errors.push(`Zoho deals sync failed: ${error}`)
      }
    }
  }

  private async saveContactsToFirestore(contacts: CRMContact[], config: CRMConfig): Promise<void> {
    const batch = db.batch()
    
    for (const contact of contacts) {
      const contactRef = db.collection('crm_contacts').doc()
      batch.set(contactRef, {
        ...contact,
        crmConfigId: config.id,
        userId: config.userId,
        teamId: config.teamId
      })
    }

    await batch.commit()
  }

  private async saveDealsToFirestore(deals: CRMDeal[], config: CRMConfig): Promise<void> {
    const batch = db.batch()
    
    for (const deal of deals) {
      const dealRef = db.collection('crm_deals').doc()
      batch.set(dealRef, {
        ...deal,
        crmConfigId: config.id,
        userId: config.userId,
        teamId: config.teamId
      })
    }

    await batch.commit()
  }

  async getSyncedContacts(userId: string, teamId?: string): Promise<CRMContact[]> {
    let query = db.collection('crm_contacts').where('userId', '==', userId)
    
    if (teamId) {
      query = query.where('teamId', '==', teamId)
    }

    const snapshot = await query.orderBy('lastModified', 'desc').get()
    return snapshot.docs.map(doc => doc.data() as CRMContact)
  }

  async getSyncedDeals(userId: string, teamId?: string): Promise<CRMDeal[]> {
    let query = db.collection('crm_deals').where('userId', '==', userId)
    
    if (teamId) {
      query = query.where('teamId', '==', teamId)
    }

    const snapshot = await query.orderBy('lastModified', 'desc').get()
    return snapshot.docs.map(doc => doc.data() as CRMDeal)
  }
} 