"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Zap, RefreshCw, CheckCircle, XCircle, Cloud, Link2, Database, Settings } from 'lucide-react'

interface CRMIntegrationProps {
  teamId?: string
  loading?: boolean
}

export function CRMIntegration({ teamId, loading = false }: CRMIntegrationProps) {
  const [configs, setConfigs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [newConfig, setNewConfig] = useState({
    provider: 'salesforce',
    name: '',
    apiKey: '',
    accessToken: '',
    instanceUrl: '',
    isActive: true,
    syncSettings: {
      syncContacts: true,
      syncDeals: true,
      syncActivities: false,
      bidirectional: false,
      autoSync: false,
      syncInterval: 60
    }
  })
  const [syncResult, setSyncResult] = useState<any>(null)

  useEffect(() => {
    loadConfigs()
  }, [teamId])

  const loadConfigs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/crm${teamId ? `?teamId=${teamId}` : ''}`)
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs)
      }
    } catch (error) {
      console.error('Error loading CRM configs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createConfig = async () => {
    try {
      const response = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newConfig, teamId })
      })
      if (response.ok) {
        setShowDialog(false)
        setNewConfig({
          provider: 'salesforce',
          name: '',
          apiKey: '',
          accessToken: '',
          instanceUrl: '',
          isActive: true,
          syncSettings: {
            syncContacts: true,
            syncDeals: true,
            syncActivities: false,
            bidirectional: false,
            autoSync: false,
            syncInterval: 60
          }
        })
        loadConfigs()
      }
    } catch (error) {
      console.error('Error creating CRM config:', error)
    }
  }

  const syncConfig = async (configId: string) => {
    setSyncingId(configId)
    setSyncResult(null)
    try {
      const response = await fetch(`/api/crm/${configId}/sync`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setSyncResult({ configId, ...data.result })
        loadConfigs()
      }
    } catch (error) {
      setSyncResult({ configId, success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] })
    } finally {
      setSyncingId(null)
    }
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            CRM Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading CRM integrations...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add CRM Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              CRM Integration
            </CardTitle>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect CRM
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect CRM</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Provider</label>
                    <Select value={newConfig.provider} onValueChange={v => setNewConfig({ ...newConfig, provider: v as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salesforce">Salesforce</SelectItem>
                        <SelectItem value="hubspot">HubSpot</SelectItem>
                        <SelectItem value="pipedrive">Pipedrive</SelectItem>
                        <SelectItem value="zoho">Zoho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Connection Name</label>
                    <Input value={newConfig.name} onChange={e => setNewConfig({ ...newConfig, name: e.target.value })} placeholder="e.g. My Salesforce" />
                  </div>
                  {newConfig.provider === 'salesforce' && (
                    <>
                      <div>
                        <label className="text-sm font-medium">Access Token</label>
                        <Input value={newConfig.accessToken} onChange={e => setNewConfig({ ...newConfig, accessToken: e.target.value })} placeholder="Salesforce Access Token" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Instance URL</label>
                        <Input value={newConfig.instanceUrl} onChange={e => setNewConfig({ ...newConfig, instanceUrl: e.target.value })} placeholder="https://your-instance.salesforce.com" />
                      </div>
                    </>
                  )}
                  {['hubspot', 'pipedrive'].includes(newConfig.provider) && (
                    <div>
                      <label className="text-sm font-medium">API Key</label>
                      <Input value={newConfig.apiKey} onChange={e => setNewConfig({ ...newConfig, apiKey: e.target.value })} placeholder="API Key" />
                    </div>
                  )}
                  {newConfig.provider === 'zoho' && (
                    <div>
                      <label className="text-sm font-medium">Access Token</label>
                      <Input value={newConfig.accessToken} onChange={e => setNewConfig({ ...newConfig, accessToken: e.target.value })} placeholder="Zoho Access Token" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Sync Settings</label>
                    <div className="flex gap-4 flex-wrap">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={newConfig.syncSettings.syncContacts} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, syncContacts: e.target.checked } })} /> Contacts
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={newConfig.syncSettings.syncDeals} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, syncDeals: e.target.checked } })} /> Deals
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={newConfig.syncSettings.syncActivities} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, syncActivities: e.target.checked } })} /> Activities
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={newConfig.syncSettings.bidirectional} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, bidirectional: e.target.checked } })} /> Bidirectional
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={newConfig.syncSettings.autoSync} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, autoSync: e.target.checked } })} /> Auto Sync
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        Interval:
                        <Input type="number" min={5} max={1440} value={newConfig.syncSettings.syncInterval} onChange={e => setNewConfig({ ...newConfig, syncSettings: { ...newConfig.syncSettings, syncInterval: Number(e.target.value) } })} className="w-16" /> min
                      </label>
                    </div>
                  </div>
                  <Button onClick={createConfig} className="w-full">
                    Connect
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* CRM Configs List */}
      <Card>
        <CardHeader>
          <CardTitle>Connected CRMs ({configs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8">
              <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No CRM connections found.</p>
              <p className="text-sm text-muted-foreground">Connect your CRM to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div key={config.id} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-muted-foreground">{config.provider}</div>
                      <div className="text-xs text-muted-foreground">Last Sync: {config.lastSync ? new Date(config.lastSync).toLocaleString() : 'Never'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => syncConfig(config.id)} disabled={syncingId === config.id}>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" style={{ display: syncingId === config.id ? 'inline' : 'none' }} />
                      Sync
                    </Button>
                    {syncResult && syncResult.configId === config.id && (
                      <span className={`text-xs ml-2 ${syncResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {syncResult.success ? <CheckCircle className="inline h-4 w-4 mr-1" /> : <XCircle className="inline h-4 w-4 mr-1" />}
                        {syncResult.success ? 'Sync successful' : 'Sync failed'}
                        {syncResult.errors && syncResult.errors.length > 0 && (
                          <span className="ml-2">{syncResult.errors.join(', ')}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 