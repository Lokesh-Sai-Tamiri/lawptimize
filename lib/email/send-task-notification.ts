import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_for_build');

interface TaskNotificationData {
  adminEmail: string;
  adminName: string;
  memberName: string;
  taskTitle: string;
  action: 'comment' | 'move';
  commentContent?: string; // For comments
  newStatus?: string;      // For moves
  taskLink: string;
}

/**
 * Send task notification email to admin
 * @param data Notification data
 * @returns Resend email ID
 */
export async function sendTaskNotificationEmail(data: TaskNotificationData): Promise<string> {
  try {
    // Check if API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_placeholder_key_for_build') {
      console.warn('RESEND_API_KEY is not configured. Email sending skipped.');
      return 'skipped';
    }

    // Determine sender email address
    const fromEmail = process.env.EMAIL_FROM_NOREPLY || `noreply@${process.env.EMAIL_DOMAIN || 'niravana.in'}`;

    // Prepare email content
    let subject = '';
    let actionDescription = '';
    let detailsHtml = '';
    let detailsText = '';

    if (data.action === 'comment') {
      subject = `New Comment on Task: ${data.taskTitle}`;
      actionDescription = `${data.memberName} commented on a task you are managing.`;
      detailsHtml = `
        <div class="notification-box">
          <p><strong>User:</strong> ${data.memberName}</p>
          <p><strong>Task:</strong> ${data.taskTitle}</p>
          <p><strong>Comment:</strong></p>
          <blockquote style="border-left: 2px solid #ccc; margin: 10px 0; padding-left: 10px; color: #555;">
            ${data.commentContent}
          </blockquote>
        </div>`;
      detailsText = `
User: ${data.memberName}
Task: ${data.taskTitle}
Comment: ${data.commentContent}
      `;
    } else if (data.action === 'move') {
      const isCompleted = data.newStatus === 'completed';
      
      subject = isCompleted 
        ? `Task Completed: ${data.taskTitle}` 
        : `Task Moved: ${data.taskTitle}`;
      
      actionDescription = isCompleted
        ? `${data.memberName} marked a task as completed.`
        : `${data.memberName} moved a task to a new status.`;

      const statusLabel = data.newStatus === 'inProgress' ? 'In Progress' : 
                         data.newStatus === 'completed' ? 'Completed' : 
                         data.newStatus === 'todo' ? 'To Do' : data.newStatus;
      
      detailsHtml = `
        <div class="notification-box">
          <p><strong>User:</strong> ${data.memberName}</p>
          <p><strong>Task:</strong> ${data.taskTitle}</p>
          <p><strong>New Status:</strong> <span style="background-color: ${isCompleted ? '#dcfce7' : '#e2e8f0'}; color: ${isCompleted ? '#166534' : 'inherit'}; padding: 2px 6px; border-radius: 4px;">${statusLabel}</span></p>
        </div>`;
       detailsText = `
User: ${data.memberName}
Task: ${data.taskTitle}
New Status: ${statusLabel}
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .notification-box { background-color: #f0f9ff; border-left: 4px solid #0891b2; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .notification-box p { margin: 5px 0; font-size: 14px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 20px; text-align: center; }
    .footer { text-align: center; padding: 20px; background-color: #f8fafc; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Task Update</h1>
    </div>
    <div class="content">
      <p>Hello ${data.adminName},</p>
      <p>${actionDescription}</p>
      
      ${detailsHtml}

      <div style="text-align: center;">
        <a href="${data.taskLink}" class="cta-button">View Task</a>
      </div>
    </div>
    <div class="footer">
      <p>Lawptimize - Legal Practice Management</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Hello ${data.adminName},

${actionDescription}

${detailsText}

View Task: ${data.taskLink}

Lawptimize - Legal Practice Management
    `;

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: `Lawptimize <${fromEmail}>`,
      to: data.adminEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('Resend API error:', error);
      return 'failed';
    }

    return emailData?.id || 'sent';
  } catch (error) {
    console.error('Error sending task notification email:', error);
    return 'failed';
  }
}
