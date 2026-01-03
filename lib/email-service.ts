// lib/email-service.ts
import { Resend } from "resend";

export interface ResetEmailData {
  to: string;
  token: string;
  expiresAt: Date;
}

export interface ConfirmationEmailData {
  to: string;
  token: string;
  expiresAt: Date;
  userName?: string;
}

export class EmailService {
  private resend: Resend | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Lazy initialization of Resend client
  private getResend(): Resend {
    if (!this.resend) {
      if (!this.apiKey) {
        throw new Error("Resend API key is not configured");
      }
      this.resend = new Resend(this.apiKey);
    }
    return this.resend;
  }

  // Send password reset email
  async sendPasswordResetEmail(data: ResetEmailData): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${data.token}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; transition: transform 0.2s; }
            .button:hover { transform: translateY(-1px); }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 24px 0; }
            .warning strong { color: #856404; }
            .code-block { background: #f8f9fa; border: 1px solid #e9ecef; padding: 16px; border-radius: 6px; font-family: 'SF Mono', Monaco, monospace; word-break: break-all; font-size: 14px; margin: 16px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer p { margin: 0; color: #6c757d; font-size: 14px; }
            .divider { height: 1px; background: #e9ecef; margin: 30px 0; }
            .security-notice { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 16px; border-radius: 4px; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Your Password</h1>
              <p>SynthQA Test Case Generator</p>
            </div>
            
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
              
              <p style="font-size: 16px; line-height: 1.6;">We received a request to reset your password for your SynthQA account. Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              
              <div class="warning">
                <strong>⏰ Valid for 24 hours:</strong> This link will expire on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}. You have plenty of time to reset your password.
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
              <div class="code-block">${resetUrl}</div>
              
              <div class="divider"></div>
              
              <div class="security-notice">
                <strong>🛡️ Security Notice:</strong> If you didn't request this password reset, you can safely ignore this email. Your password won't be changed unless you click the reset link above.
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">
                <strong>Need help?</strong> Reply to this email or contact our support team if you have any questions.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>SynthQA Test Case Generator</strong></p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p style="margin-top: 12px;">For security, this link expires in 24 hours.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const resend = this.getResend();
      const { data: emailData, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <onboarding@resend.dev>",
        to: data.to,
        subject: "🔐 Reset Your Password - SynthQA",
        html: emailHtml,
      });

      if (error) {
        console.error("Password reset email error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Password reset email send failed:", error);
      return false;
    }
  }

  // Send email confirmation email
  async sendConfirmationEmail(data: ConfirmationEmailData): Promise<boolean> {
    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/confirm-email?token=${data.token}`;
    const userName = data.userName || "there";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to SynthQA! Confirm Your Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; }
            .button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; margin: 24px 0; font-weight: 600; font-size: 16px; transition: transform 0.2s; }
            .button:hover { transform: translateY(-1px); }
            .welcome-box { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 16px; border-radius: 4px; margin: 24px 0; }
            .welcome-box strong { color: #0c5460; }
            .code-block { background: #f8f9fa; border: 1px solid #e9ecef; padding: 16px; border-radius: 6px; font-family: 'SF Mono', Monaco, monospace; word-break: break-all; font-size: 14px; margin: 16px 0; }
            .footer { background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer p { margin: 0; color: #6c757d; font-size: 14px; }
            .divider { height: 1px; background: #e9ecef; margin: 30px 0; }
            .features { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 24px 0; }
            .feature-item { margin: 8px 0; color: #495057; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to SynthQA!</h1>
              <p>AI-Powered Test Case Generation</p>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; margin-bottom: 20px;">Hello${
                userName !== "there" ? ` ${userName}` : ""
              },</p>
              
              <p style="font-size: 16px; line-height: 1.6;">Welcome to SynthQA! We're excited to have you on board. To get started, please confirm your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmUrl}" class="button">Confirm My Email</a>
              </div>
              
              <div class="welcome-box">
                <strong>✨ What's Next?</strong> Once you confirm your email, you'll be able to:
                <div class="features">
                  <div class="feature-item">• Generate AI-powered test cases instantly</div>
                  <div class="feature-item">• Create and manage requirements</div>
                  <div class="feature-item">• Build comprehensive test coverage</div>
                  <div class="feature-item">• Export and share your test cases</div>
                </div>
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
              <div class="code-block">${confirmUrl}</div>
              
              <div class="divider"></div>
              
              <p style="font-size: 16px; line-height: 1.6;">
                <strong>⏰ Important:</strong> This confirmation link will expire on ${data.expiresAt.toLocaleDateString()} at ${data.expiresAt.toLocaleTimeString()}. Don't worry - you have 3 days to confirm!
              </p>
              
              <p style="font-size: 16px; line-height: 1.6;">
                <strong>Need help?</strong> Reply to this email or contact our support team. We're here to help you get the most out of SynthQA!
              </p>
            </div>
            
            <div class="footer">
              <p><strong>SynthQA Test Case Generator</strong></p>
              <p>This is an automated message. Please do not reply to this email.</p>
              <p style="margin-top: 12px;">Confirmation link expires in 3 days.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const resend = this.getResend();
      const { data: emailData, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <onboarding@resend.dev>",
        to: data.to,
        subject: "🎉 Welcome to SynthQA! Please confirm your email",
        html: emailHtml,
      });

      if (error) {
        console.error("Confirmation email error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Confirmation email send failed:", error);
      return false;
    }
  }

  // Test Resend connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Resend connection test failed:", error);
      return false;
    }
  }
}

// Factory function to create email service with Resend
export function createEmailService(): EmailService | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY environment variable is not set");
    return null;
  }

  return new EmailService(apiKey);
}
