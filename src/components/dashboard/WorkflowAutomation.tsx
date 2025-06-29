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
import { 
  Zap, Plus, Play, Pause, Settings, Clock, CheckCircle, XCircle, 
  AlertCircle, MessageSquare, Bell, Webhook, Brain, User, Calendar 
} from 'lucide-react'
import { Workflow, WorkflowExecution, WorkflowTrigger, WorkflowAction } from '@/lib/advanced-features/workflow-automation'

interface WorkflowAutomationProps {
  teamId?: string
  loading?: boolean
}

export function WorkflowAutomation({ teamId, loading = false }: WorkflowAutomationProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [workflowExecutions, setWorkflowExecutions] = useState<WorkflowExecution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: {
      name: '',
      type: 'contact_created' as const,
      conditions: [{ field: '', operator: 'equals' as const, value: '' }],
      enabled: true
    },
    actions: [{ name: '', type: 'send_message' as const, parameters: {}, order: 0 }]
  })

  useEffect(() => {
    if (teamId) {
      loadWorkflows()
    }
  }, [teamId])

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowExecutions(selectedWorkflow.id)
    }
  }, [selectedWorkflow])

  const loadWorkflows = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/workflows?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows)
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWorkflowExecutions = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/executions`)
      if (response.ok) {
        const data = await response.json()
        setWorkflowExecutions(data.executions)
      }
    } catch (error) {
      console.error('Error loading workflow executions:', error)
    }
  }

  const createWorkflow = async () => {
    if (!newWorkflow.name.trim()) return

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newWorkflow,
          teamId
        })
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setNewWorkflow({
          name: '',
          description: '',
          trigger: {
            name: '',
            type: 'contact_created',
            conditions: [{ field: '', operator: 'equals', value: '' }],
            enabled: true
          },
          actions: [{ name: '', type: 'send_message', parameters: {}, order: 0 }]
        })
        loadWorkflows()
      }
    } catch (error) {
      console.error('Error creating workflow:', error)
    }
  }

  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerData: { test: true, timestamp: new Date().toISOString() }
        })
      })

      if (response.ok) {
        loadWorkflowExecutions(workflowId)
      }
    } catch (error) {
      console.error('Error executing workflow:', error)
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'contact_created': return <User className="h-4 w-4" />
      case 'message_sent': return <MessageSquare className="h-4 w-4" />
      case 'reminder_due': return <Clock className="h-4 w-4" />
      case 'team_activity': return <Bell className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_message': return <MessageSquare className="h-4 w-4" />
      case 'create_reminder': return <Clock className="h-4 w-4" />
      case 'update_contact': return <User className="h-4 w-4" />
      case 'send_notification': return <Bell className="h-4 w-4" />
      case 'webhook': return <Webhook className="h-4 w-4" />
      case 'ai_analysis': return <Brain className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading workflows...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Workflow */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Workflow Automation
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Workflow Name</label>
                    <Input
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                      placeholder="Enter workflow description"
                      rows={3}
                    />
                  </div>

                  {/* Trigger Configuration */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Trigger</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Trigger Name</label>
                        <Input
                          value={newWorkflow.trigger.name}
                          onChange={(e) => setNewWorkflow({
                            ...newWorkflow,
                            trigger: { ...newWorkflow.trigger, name: e.target.value }
                          })}
                          placeholder="Enter trigger name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Trigger Type</label>
                        <Select 
                          value={newWorkflow.trigger.type} 
                          onValueChange={(value) => setNewWorkflow({
                            ...newWorkflow,
                            trigger: { ...newWorkflow.trigger, type: value as any }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contact_created">Contact Created</SelectItem>
                            <SelectItem value="message_sent">Message Sent</SelectItem>
                            <SelectItem value="reminder_due">Reminder Due</SelectItem>
                            <SelectItem value="team_activity">Team Activity</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Actions Configuration */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Actions</h3>
                    {newWorkflow.actions.map((action, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Action Name</label>
                            <Input
                              value={action.name}
                              onChange={(e) => {
                                const updatedActions = [...newWorkflow.actions]
                                updatedActions[index].name = e.target.value
                                setNewWorkflow({ ...newWorkflow, actions: updatedActions })
                              }}
                              placeholder="Enter action name"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Action Type</label>
                            <Select 
                              value={action.type} 
                              onValueChange={(value) => {
                                const updatedActions = [...newWorkflow.actions]
                                updatedActions[index].type = value as any
                                setNewWorkflow({ ...newWorkflow, actions: updatedActions })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="send_message">Send Message</SelectItem>
                                <SelectItem value="create_reminder">Create Reminder</SelectItem>
                                <SelectItem value="update_contact">Update Contact</SelectItem>
                                <SelectItem value="send_notification">Send Notification</SelectItem>
                                <SelectItem value="webhook">Webhook</SelectItem>
                                <SelectItem value="ai_analysis">AI Analysis</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setNewWorkflow({
                        ...newWorkflow,
                        actions: [...newWorkflow.actions, { 
                          name: '', 
                          type: 'send_message', 
                          parameters: {}, 
                          order: newWorkflow.actions.length 
                        }]
                      })}
                    >
                      Add Action
                    </Button>
                  </div>
                  
                  <Button onClick={createWorkflow} className="w-full">
                    Create Workflow
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows ({workflows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No workflows found.</p>
              <p className="text-sm text-muted-foreground">Create your first workflow to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedWorkflow?.id === workflow.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{workflow.name}</h3>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                        {workflow.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          executeWorkflow(workflow.id)
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Execute
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getTriggerIcon(workflow.trigger.type)}
                      <span>{workflow.trigger.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span>{workflow.actions.length} actions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>{workflow.executionCount} executions</span>
                    </div>
                    {workflow.lastExecuted && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Last: {workflow.lastExecuted.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Workflow Details */}
      {selectedWorkflow && (
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Trigger</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {getTriggerIcon(selectedWorkflow.trigger.type)}
                        <span className="font-medium">{selectedWorkflow.trigger.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Type: {selectedWorkflow.trigger.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Actions</h4>
                    <div className="space-y-3">
                      {selectedWorkflow.actions.map((action, index) => (
                        <div key={action.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getActionIcon(action.type)}
                            <span className="font-medium">{action.name}</span>
                            <Badge variant="outline">#{index + 1}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Type: {action.type.replace('_', ' ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="executions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution History</CardTitle>
              </CardHeader>
              <CardContent>
                {workflowExecutions.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No executions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workflowExecutions.map((execution) => (
                      <div key={execution.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(execution.status)}>
                              {execution.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {execution.startedAt.toLocaleString()}
                            </span>
                          </div>
                          {execution.completedAt && (
                            <span className="text-sm text-muted-foreground">
                              Duration: {Math.round((execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000)}s
                            </span>
                          )}
                        </div>
                        
                        {execution.error && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            Error: {execution.error}
                          </div>
                        )}

                        <div className="space-y-2">
                          {execution.actions.map((action) => (
                            <div key={action.actionId} className="flex items-center justify-between text-sm">
                              <span>{action.actionName}</span>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={action.status === 'completed' ? 'default' : 
                                          action.status === 'failed' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {action.status}
                                </Badge>
                                {action.executedAt && (
                                  <span className="text-muted-foreground">
                                    {action.executedAt.toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
} 