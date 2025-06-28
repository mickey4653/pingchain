import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactName, hoursSinceLastMessage, lastMessage } = body

    if (!contactName || !hoursSinceLastMessage || !lastMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: contactName, hoursSinceLastMessage, lastMessage' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured' },
        { status: 500 }
      )
    }

    // Create email content
    const subject = `Reminder: Follow up with ${contactName}`
    const text = `Hi there!

You haven't responded to ${contactName} in ${hoursSinceLastMessage} hours.

Last message: "${lastMessage}"

Don't let this conversation slip away! Open PingChain to send a quick response.

Best regards,
Your PingChain Assistant`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hi there!</h2>
        
        <p>You haven't responded to <strong>${contactName}</strong> in <strong>${hoursSinceLastMessage} hours</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${lastMessage}"</p>
        </div>
        
        <p>Don't let this conversation slip away! Open PingChain to send a quick response.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Open PingChain
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          Your PingChain Assistant
        </p>
      </div>
    `

    // Send email using Resend's default domain
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'PingChain <noreply@pingchain.com>',

      to: [process.env.USER_EMAIL || 'user@example.com'],
      subject: subject,
      text: text,
      html: html,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: `Resend error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully via Resend',
      emailDetails: {
        to: process.env.USER_EMAIL,
        subject: subject,
        resendData: data
      }
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 