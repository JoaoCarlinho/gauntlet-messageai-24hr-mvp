import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || 'noreply@messageai.com';
const FROM_NAME = process.env.AWS_SES_FROM_NAME || 'MessageAI';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using AWS SES
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const params = {
    Source: `${FROM_NAME} <${FROM_EMAIL}>`,
    Destination: {
      ToAddresses: [options.to],
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: options.html,
          Charset: 'UTF-8',
        },
        ...(options.text && {
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  displayName: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #007AFF;
          }
          h1 {
            color: #1d1d1f;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #007AFF;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #0051D5;
          }
          .token-box {
            background-color: #f5f5f7;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e7;
            font-size: 14px;
            color: #86868b;
            text-align: center;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MessageAI</div>
          </div>

          <h1>Reset Your Password</h1>

          <p>Hi ${displayName},</p>

          <p>We received a request to reset your password for your MessageAI account. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <div class="token-box">${resetUrl}</div>

          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </div>

          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

          <div class="footer">
            <p>This is an automated message from MessageAI. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} MessageAI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Reset Your Password

    Hi ${displayName},

    We received a request to reset your password for your MessageAI account.

    Click this link to reset your password:
    ${resetUrl}

    This link will expire in 1 hour for security reasons.

    If you didn't request a password reset, you can safely ignore this email.

    MessageAI Team
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your MessageAI Password',
    html,
    text,
  });
}
