import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { action, contactId, message, previousMessages } = await req.json()

    // Get contact information
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!contact) {
      return new NextResponse('Contact not found', { status: 404 })
    }

    switch (action) {
      case 'generateMessage': {
        const prompt = `Generate a message for ${contact.name} based on the following context:
          Previous messages: ${JSON.stringify(previousMessages)}
          Relationship: ${contact.platform}
          Current message: ${message}
          
          Generate a response that is:
          1. Natural and conversational
          2. Appropriate for the platform (${contact.platform})
          3. Maintains the relationship context
          4. Is concise but meaningful`

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
        })

        return NextResponse.json({
          suggestion: completion.choices[0].message.content,
        })
      }

      case 'analyzeTone': {
        const prompt = `Analyze the tone of this message: "${message}"
          Consider:
          1. Emotional undertones
          2. Formality level
          3. Relationship context
          4. Platform appropriateness (${contact.platform})
          
          Provide a brief analysis in JSON format with these fields:
          - tone: string (e.g., "friendly", "professional", "casual")
          - confidence: number (0-1)
          - suggestions: string[] (if any improvements needed)`

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })

        return NextResponse.json(JSON.parse(completion.choices[0].message.content))
      }

      case 'analyzeConversation': {
        const prompt = `Analyze this conversation with ${contact.name}:
          Messages: ${JSON.stringify(previousMessages)}
          Platform: ${contact.platform}
          
          Provide insights in JSON format with these fields:
          - keyTopics: string[]
          - sentiment: string
          - suggestedNextSteps: string[]
          - relationshipInsights: string`

        const completion = await openai.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'gpt-4-turbo-preview',
          temperature: 0.5,
          response_format: { type: 'json_object' },
        })

        return NextResponse.json(JSON.parse(completion.choices[0].message.content))
      }

      default:
        return new NextResponse('Invalid action', { status: 400 })
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 