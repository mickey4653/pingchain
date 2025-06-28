import nodemailer from 'nodemailer'

// Create Gmail transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  })
}

export interface EmailReminder {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmailReminder(reminder: EmailReminder): Promise<boolean> {
  try {
    // Only run on server side
    if (typeof window !== 'undefined') {
      console.log('Gmail can only be used on the server side')
      return false
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log('Gmail credentials not found, logging email instead:', reminder)
      return true
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: reminder.to,
      subject: reminder.subject,
      text: reminder.text,
      html: reminder.html,
    }

    await transporter.sendMail(mailOptions)
    console.log('Email sent successfully via Gmail:', reminder.to)
    return true
  } catch (error) {
    console.error('Error sending email via Gmail:', error)
    return false
  }
}

// Create reminder email content (same as SendGrid)
export function createReminderEmail(
  contactName: string,
  hoursSinceLastMessage: number,
  lastMessage: string
): EmailReminder {
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

  return {
    to: process.env.USER_EMAIL || 'user@example.com',
    subject,
    text,
    html
  }
}

// Create scheduled follow-up email (same as SendGrid)
export function createFollowupEmail(
  contactName: string,
  scheduledMessage: string
): EmailReminder {
  const subject = `Scheduled Follow-up: ${contactName}`
  
  const text = `Hi there!

It's time for your scheduled follow-up with ${contactName}.

Suggested message: "${scheduledMessage}"

Open PingChain to send this message or customize it.

Best regards,
Your PingChain Assistant`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hi there!</h2>
      
      <p>It's time for your scheduled follow-up with <strong>${contactName}</strong>.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
        <p style="margin: 0; font-style: italic;">"${scheduledMessage}"</p>
      </div>
      
      <p>Open PingChain to send this message or customize it.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
           style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
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

  return {
    to: process.env.USER_EMAIL || 'user@example.com',
    subject,
    text,
    html
  }
} 