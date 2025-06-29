import { db } from '@/lib/firebase-admin'

export interface WorkflowTrigger {
  id: string
  name: string
  type: 'contact_created' | 'message_sent' | 'reminder_due' | 'team_activity' | 'custom'
  conditions: WorkflowCondition[]
  enabled: boolean
  createdAt: Date
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists'
  value: any
}

export interface WorkflowAction {
  id: string
  name: string
  type: 'send_message' | 'create_reminder' | 'update_contact' | 'send_notification' | 'webhook' | 'ai_analysis'
  parameters: Record<string, any>
  order: number
}

export interface Workflow {
  id: string
  name: string
  description: string
  teamId: string
  creatorId: string
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  executionCount: number
  lastExecuted?: Date
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  triggerData: any
  actions: WorkflowActionExecution[]
  status: 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface WorkflowActionExecution {
  actionId: string
  actionName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  error?: string
  executedAt?: Date
}

export class WorkflowAutomation {
  private static instance: WorkflowAutomation

  static getInstance(): WorkflowAutomation {
    if (!WorkflowAutomation.instance) {
      WorkflowAutomation.instance = new WorkflowAutomation()
    }
    return WorkflowAutomation.instance
  }

  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): Promise<string> {
    const workflowRef = db.collection('workflows').doc()
    
    const newWorkflow: Workflow = {
      ...workflow,
      id: workflowRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    }

    await workflowRef.set(newWorkflow)
    return workflowRef.id
  }

  async getWorkflows(teamId: string): Promise<Workflow[]> {
    const snapshot = await db.collection('workflows')
      .where('teamId', '==', teamId)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Workflow[]
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const doc = await db.collection('workflows').doc(workflowId).get()
    return doc.exists ? { id: doc.id, ...doc.data() } as Workflow : null
  }

  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<void> {
    await db.collection('workflows').doc(workflowId).update({
      ...updates,
      updatedAt: new Date()
    })
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await db.collection('workflows').doc(workflowId).delete()
  }

  async executeWorkflow(workflowId: string, triggerData: any): Promise<string> {
    const workflow = await this.getWorkflow(workflowId)
    if (!workflow || !workflow.enabled) {
      throw new Error('Workflow not found or disabled')
    }

    // Check if trigger conditions are met
    if (!this.evaluateTrigger(workflow.trigger, triggerData)) {
      throw new Error('Trigger conditions not met')
    }

    // Create execution record
    const executionRef = db.collection('workflow_executions').doc()
    const execution: WorkflowExecution = {
      id: executionRef.id,
      workflowId,
      triggerData,
      actions: workflow.actions.map(action => ({
        actionId: action.id,
        actionName: action.name,
        status: 'pending'
      })),
      status: 'running',
      startedAt: new Date()
    }

    await executionRef.set(execution)

    // Execute actions asynchronously
    this.executeActions(execution).catch(error => {
      console.error('Workflow execution failed:', error)
    })

    return executionRef.id
  }

  private async executeActions(execution: WorkflowExecution): Promise<void> {
    const workflow = await this.getWorkflow(execution.workflowId)
    if (!workflow) return

    try {
      for (const action of workflow.actions) {
        const actionExecution = execution.actions.find(ae => ae.actionId === action.id)
        if (!actionExecution) continue

        // Update action status to running
        actionExecution.status = 'running'
        actionExecution.executedAt = new Date()
        await this.updateExecution(execution.id, execution)

        try {
          // Execute the action
          const result = await this.executeAction(action, execution.triggerData)
          
          // Update action status to completed
          actionExecution.status = 'completed'
          actionExecution.result = result
          await this.updateExecution(execution.id, execution)

        } catch (error) {
          // Update action status to failed
          actionExecution.status = 'failed'
          actionExecution.error = error instanceof Error ? error.message : 'Unknown error'
          await this.updateExecution(execution.id, execution)
          
          // Continue with next action (don't stop the workflow)
          console.error(`Action ${action.name} failed:`, error)
        }
      }

      // Update execution status to completed
      execution.status = 'completed'
      execution.completedAt = new Date()
      await this.updateExecution(execution.id, execution)

      // Update workflow execution count
      await this.updateWorkflow(execution.workflowId, {
        executionCount: workflow.executionCount + 1,
        lastExecuted: new Date()
      })

    } catch (error) {
      // Update execution status to failed
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date()
      await this.updateExecution(execution.id, execution)
    }
  }

  private async executeAction(action: WorkflowAction, triggerData: any): Promise<any> {
    switch (action.type) {
      case 'send_message':
        return await this.executeSendMessage(action.parameters, triggerData)
      
      case 'create_reminder':
        return await this.executeCreateReminder(action.parameters, triggerData)
      
      case 'update_contact':
        return await this.executeUpdateContact(action.parameters, triggerData)
      
      case 'send_notification':
        return await this.executeSendNotification(action.parameters, triggerData)
      
      case 'webhook':
        return await this.executeWebhook(action.parameters, triggerData)
      
      case 'ai_analysis':
        return await this.executeAIAnalysis(action.parameters, triggerData)
      
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  private async executeSendMessage(parameters: any, triggerData: any): Promise<any> {
    const { contactId, messageTemplate, platform } = parameters
    
    // Replace placeholders in message template
    const message = this.replacePlaceholders(messageTemplate, triggerData)
    
    // Send message using existing message service
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        contactId,
        platform: platform || 'EMAIL'
      })
    })

    return { success: response.ok, message }
  }

  private async executeCreateReminder(parameters: any, triggerData: any): Promise<any> {
    const { contactId, title, description, dueDate, priority } = parameters
    
    const reminder = {
      contactId,
      title: this.replacePlaceholders(title, triggerData),
      description: this.replacePlaceholders(description, triggerData),
      dueDate: new Date(dueDate),
      priority: priority || 'medium',
      status: 'pending'
    }

    // Create reminder using existing reminder service
    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder)
    })

    return { success: response.ok, reminder }
  }

  private async executeUpdateContact(parameters: any, triggerData: any): Promise<any> {
    const { contactId, updates } = parameters
    
    // Update contact using existing contact service
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    return { success: response.ok }
  }

  private async executeSendNotification(parameters: any, triggerData: any): Promise<any> {
    const { userId, title, message, type } = parameters
    
    const notification = {
      userId,
      title: this.replacePlaceholders(title, triggerData),
      message: this.replacePlaceholders(message, triggerData),
      type: type || 'info'
    }

    // Send notification using existing notification service
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    })

    return { success: response.ok, notification }
  }

  private async executeWebhook(parameters: any, triggerData: any): Promise<any> {
    const { url, method, headers, body } = parameters
    
    const webhookData = {
      ...body,
      triggerData,
      timestamp: new Date().toISOString()
    }

    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(webhookData)
    })

    return { success: response.ok, status: response.status }
  }

  private async executeAIAnalysis(parameters: any, triggerData: any): Promise<any> {
    const { analysisType, data, prompt } = parameters
    
    // Use existing AI service for analysis
    const response = await fetch('/api/ai/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: this.replacePlaceholders(prompt, triggerData),
        context: data,
        analysisType
      })
    })

    const result = await response.json()
    return { success: response.ok, analysis: result }
  }

  private evaluateTrigger(trigger: WorkflowTrigger, triggerData: any): boolean {
    return trigger.conditions.every(condition => {
      const fieldValue = this.getNestedValue(triggerData, condition.field)
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value
        case 'contains':
          return String(fieldValue).includes(String(condition.value))
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value)
        case 'less_than':
          return Number(fieldValue) < Number(condition.value)
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null
        default:
          return false
      }
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private replacePlaceholders(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key)
      return value !== undefined ? String(value) : match
    })
  }

  private async updateExecution(executionId: string, execution: WorkflowExecution): Promise<void> {
    await db.collection('workflow_executions').doc(executionId).update(execution)
  }

  async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    const snapshot = await db.collection('workflow_executions')
      .where('workflowId', '==', workflowId)
      .orderBy('startedAt', 'desc')
      .limit(50)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkflowExecution[]
  }
} 