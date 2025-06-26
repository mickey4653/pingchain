'use client'

import { useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface MessageDraftProps {
  initialMessage?: string
  onSend: (message: string) => void
}

const toneOptions = [
  { id: 'casual', label: 'Casual' },
  { id: 'professional', label: 'Professional' },
  { id: 'empathetic', label: 'Empathetic' },
  { id: 'friendly', label: 'Friendly' },
]

export default function MessageDraft({ initialMessage = '', onSend }: MessageDraftProps) {
  const [message, setMessage] = useState(initialMessage)
  const [selectedTone, setSelectedTone] = useState('friendly')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleToneChange = async (tone: string) => {
    setSelectedTone(tone)
    setIsGenerating(true)
    
    // TODO: Call OpenAI API to rewrite message with new tone
    // For now, we'll just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Example of how the AI might rewrite the message
    const toneExamples = {
      casual: "Hey! Just wanted to check in...",
      professional: "I hope this message finds you well. I wanted to follow up...",
      empathetic: "I understand this might be a busy time. I wanted to reach out...",
      friendly: "Hi there! I was thinking about our conversation...",
    }
    
    setMessage(toneExamples[tone as keyof typeof toneExamples])
    setIsGenerating(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <div className="mt-1">
            <textarea
              id="message"
              name="message"
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tone</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {toneOptions.map((tone) => (
              <button
                key={tone.id}
                onClick={() => handleToneChange(tone.id)}
                disabled={isGenerating}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTone === tone.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isGenerating && selectedTone === tone.id && (
                  <SparklesIcon className="h-4 w-4 mr-1 animate-pulse" />
                )}
                {tone.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => onSend(message)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
} 