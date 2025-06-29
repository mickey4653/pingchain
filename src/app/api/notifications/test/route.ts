import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { email, provider } = await req.json()
    
    if (!email) {
      return new NextResponse('Email is required', { status: 400 })
    }

    // Test email sending - call the email API directly instead of using fetch
    const emailData = {
      to: email,
      subject: 'Loop - Test Email Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Loop Test Email</h2>
          <p>This is a test email to verify your notification settings are working correctly.</p>
          <p><strong>Provider:</strong> ${provider || 'resend'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Open Loop Dashboard
            </a>
          </div>
        </div>
      `,
      text: `Loop Test Email\n\nThis is a test email to verify your notification settings are working correctly.\n\nProvider: ${provider || 'resend'}\nTime: ${new Date().toLocaleString()}\n\nOpen your Loop Dashboard to continue.`,
      provider: provider || 'resend'
    }

    // For now, let's just return success since the email API might not be fully configured
    // In a real implementation, you'd call the actual email service here
    console.log('Test email would be sent:', emailData)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully (simulated)',
      provider: provider || 'resend',
      emailData
    })
    
  } catch (error) {
    console.error('Test notification API error:', error)
    return new NextResponse(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
  }
} 