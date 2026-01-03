import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');

interface AddedNotificationEmailData {
  addedEmail: string;
  organizationName: string;
  inviterName: string;
  dashboardLink: string;
}

/**
 * Send "Added to Team" notification email
 * @param data Notification data
 * @returns Resend email ID
 */
export async function sendAddedNotificationEmail(data: AddedNotificationEmailData): Promise<string> {
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder_key_for_build') {
      throw new Error('RESEND_API_KEY is not configured. Please add it to your .env file to enable email sending.');
    }

    // Determine sender email address
    const fromEmail = process.env.EMAIL_FROM_NOREPLY || `noreply@${process.env.EMAIL_DOMAIN || 'niravana.in'}`;

    // Prepare email content
    const subject = `${data.inviterName} added you to ${data.organizationName} on Lawptimize`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .info-box {
      background-color: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 14px;
    }
    .info-box strong {
      color: #059669;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    .alternative-link {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8fafc;
      border-radius: 4px;
      font-size: 13px;
      color: #64748b;
    }
    .alternative-link p {
      margin: 5px 0;
    }
    .alternative-link a {
      color: #10b981;
      word-break: break-all;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #f8fafc;
      color: #64748b;
      font-size: 14px;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 You've been added!</h1>
      <p>Welcome to the team on Lawptimize</p>
    </div>

    <div class="content">
      <p>Hello,</p>

      <p><strong>${data.inviterName}</strong> has added you to the organization <strong>${data.organizationName}</strong> on Lawptimize.</p>

      <div class="info-box">
        <p><strong>Organization:</strong> ${data.organizationName}</p>
        <p><strong>Added by:</strong> ${data.inviterName}</p>
        <p><strong>Access Level:</strong> Team Member</p>
      </div>

      <p>You can now access the organization's workspace, manage cases, and collaborate with your team.</p>

      <div style="text-align: center;">
        <a href="${data.dashboardLink}" class="cta-button">Go to Dashboard</a>
      </div>

      <div class="alternative-link">
        <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
        <p><a href="${data.dashboardLink}">${data.dashboardLink}</a></p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Lawptimize</strong> - Legal Practice Management</p>
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
You've been added to ${data.organizationName} on Lawptimize!

${data.inviterName} has added you to the organization ${data.organizationName} on Lawptimize.

Organization: ${data.organizationName}
Added by: ${data.inviterName}
Access Level: Team Member

You can now access the organization's workspace immediately.

Go to your Dashboard:
${data.dashboardLink}

---
Lawptimize - Legal Practice Management
This is an automated email. Please do not reply directly to this message.
    `;

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: `Lawptimize <${fromEmail}>`,
      to: data.addedEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
    }

    if (!emailData || !emailData.id) {
      throw new Error('No email ID returned from Resend');
    }

    return emailData.id;
  } catch (error) {
    console.error('Error sending added notification email:', error);
    throw new Error(`Failed to send added notification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
