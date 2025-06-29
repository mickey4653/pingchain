"use client"

import { NotificationSettings } from '@/components/NotificationSettings'

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <NotificationSettings />
      </div>
    </div>
  )
} 