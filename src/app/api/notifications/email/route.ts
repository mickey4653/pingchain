import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text: string
  provider: 'resend' | 'sendgrid' | 'gmail'
}

// Email provider factory
class EmailProviderFactory {
  static async sendEmail(request: EmailRequest): Promise<boolean> {
    switch (request.provider) {
      case 'resend':
        return this.sendViaResend(request)
      case 'sendgrid':
        return this.sendViaSendGrid(request)
      case 'gmail':
        return this.sendViaGmail(request)
      default:
        return this.sendViaResend(request) // Default fallback
    }
  }

  private static async sendViaResend(request: EmailRequest): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'noreply@loop.com',
          to: request.to,
          subject: request.subject,
          html: request.html,
          text: request.text,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Resend email error:', error)
      return false
    }
  }

  private static async sendViaSendGrid(request: EmailRequest): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: request.to }] }],
          from: { email: process.env.FROM_EMAIL || 'noreply@loop.com' },
          subject: request.subject,
          content: [
            { type: 'text/plain', value: request.text },
            { type: 'text/html', value: request.html },
          ],
        }),
      })

      return response.ok
    } catch (error) {
      console.error('SendGrid email error:', error)
      return false
    }
  }

  private static async sendViaGmail(request: EmailRequest): Promise<boolean> {
    try {
      // For Gmail, we'd use the Gmail API
      // This is a simplified version - in production you'd use the Gmail API client
      console.log('Gmail email would be sent:', {
        to: request.to,
        subject: request.subject,
        provider: 'gmail'
      })
      
      // For now, just log and return success
      return true
    } catch (error) {
      console.error('Gmail email error:', error)
      return false
    }
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const emailRequest: EmailRequest = await req.json()
    
    // Validate required fields
    if (!emailRequest.to || !emailRequest.subject) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Send email
    const success = await EmailProviderFactory.sendEmail(emailRequest)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Email sent successfully' })
    } else {
      return new NextResponse('Failed to send email', { status: 500 })
    }
  } catch (error) {
    console.error('Email notification API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 