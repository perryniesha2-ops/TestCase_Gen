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

export interface TrialStartedEmailData {
  to: string;
  userName?: string;
  trialEndDate: string;
  planName: string;
}

export interface TrialEndingSoonEmailData {
  to: string;
  userName?: string;
  trialEndDate: string;
  daysLeft: number;
}

export interface SubscriptionCancelledEmailData {
  to: string;
  userName?: string;
  accessUntilDate: string;
  planName: string;
}

export interface SubscriptionEndedEmailData {
  to: string;
  userName?: string;
  planName: string;
}

export interface WelcomeToProEmailData {
  to: string;
  userName?: string;
  nextBillingDate: string;
  amount: string;
}

// Shared email styles matching your shadcn slate theme
const EMAIL_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; 
    line-height: 1.6; 
    color: #1e293b; 
    background-color: #f8fafc;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .email-wrapper { 
    max-width: 600px; 
    margin: 0 auto; 
    background-color: #f8fafc; 
    padding: 40px 20px; 
  }
  .email-container { 
    background: #ffffff; 
    border-radius: 16px; 
    overflow: hidden; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  }
  .email-header { 
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 40px 32px;
    text-align: center;
    border-bottom: 3px solid #14b8a6;
  }
  .logo-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .logo-icon {
    width: 48px;
    height: 48px;
    display: inline-block;
  }
  .logo-text {
    color: #ffffff;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .header-subtitle {
    color: #94a3b8;
    font-size: 15px;
    margin-top: 8px;
    font-weight: 500;
  }
  .email-content { 
    padding: 48px 32px; 
    background: #ffffff;
  }
  .greeting {
    font-size: 18px;
    color: #1e293b;
    margin-bottom: 24px;
    font-weight: 600;
  }
  .body-text {
    font-size: 16px;
    color: #475569;
    line-height: 1.7;
    margin-bottom: 20px;
  }
  .button-container {
    text-align: center;
    margin: 40px 0;
  }
  .button { 
    display: inline-block; 
    background: #14b8a6;
    color: #ffffff;
    text-decoration: none; 
    padding: 16px 40px; 
    border-radius: 10px;
    font-weight: 600; 
    font-size: 16px;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(20, 184, 166, 0.3);
  }
  .button:hover { 
    background: #0d9488;
    box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.4);
    transform: translateY(-1px);
  }
  .info-box {
    background: #f1f5f9;
    border-left: 4px solid #14b8a6;
    padding: 20px;
    border-radius: 8px;
    margin: 28px 0;
  }
  .info-box-title {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .info-box-text {
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
  }
  .warning-box {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 20px;
    border-radius: 8px;
    margin: 28px 0;
  }
  .warning-box-title {
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
    font-size: 15px;
  }
  .warning-box-text {
    color: #78350f;
    font-size: 14px;
    line-height: 1.6;
  }
  .code-block { 
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    word-break: break-all;
    font-size: 13px;
    margin: 20px 0;
    color: #475569;
  }
  .divider { 
    height: 1px;
    background: #e2e8f0;
    margin: 32px 0;
  }
  .email-footer { 
    background: #f8fafc;
    padding: 32px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
  }
  .footer-text {
    color: #64748b;
    font-size: 14px;
    line-height: 1.6;
    margin: 8px 0;
  }
  .footer-brand {
    font-weight: 600;
    color: #1e293b;
    font-size: 15px;
  }
  .feature-list {
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .feature-item {
    color: #475569;
    font-size: 15px;
    line-height: 1.8;
    padding: 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .checkmark {
    color: #14b8a6;
    font-weight: bold;
    font-size: 18px;
  }
`;

// SVG Logo (matching your teal/cyan brand)
const LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="10" fill="#14b8a6"/>
  <path d="M14 18L24 12L34 18V30L24 36L14 30V18Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 18L24 24M24 24L34 18M24 24V36" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

export class EmailService {
  private resend: Resend | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getResend(): Resend {
    if (!this.resend) {
      if (!this.apiKey) {
        throw new Error("Resend API key is not configured");
      }
      this.resend = new Resend(this.apiKey);
    }
    return this.resend;
  }

  async sendPasswordResetEmail(data: ResetEmailData): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${data.token}`;
    const expiryDate = data.expiresAt.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const expiryTime = data.expiresAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - SynthQA</title>
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                <div class="logo-container">
                  ${LOGO_SVG}
                  <div class="logo-text">SynthQA</div>
                </div>
                <div class="header-subtitle">AI-Powered Test Case Generator</div>
              </div>
              
              <!-- Content -->
              <div class="email-content">
                <div class="greeting">Password Reset Request</div>
                
                <p class="body-text">
                  We received a request to reset the password for your SynthQA account. 
                  Click the button below to create a new password:
                </p>
                
                <div class="button-container">
                  <a href="${resetUrl}" class="button">Reset My Password</a>
                </div>
                
                <div class="warning-box">
                  <div class="warning-box-title">⏰ This link expires soon</div>
                  <div class="warning-box-text">
                    This password reset link will expire on <strong>${expiryDate}</strong> at <strong>${expiryTime}</strong>.
                  </div>
                </div>
                
                <p class="body-text">
                  If the button above doesn't work, copy and paste this link into your browser:
                </p>
                <div class="code-block">${resetUrl}</div>
                
                <div class="divider"></div>
                
                <div class="info-box">
                  <div class="info-box-title">
                    <span>🛡️</span>
                    Security Notice
                  </div>
                  <div class="info-box-text">
                    If you didn't request this password reset, you can safely ignore this email. 
                    Your password won't be changed unless you click the reset link above.
                  </div>
                </div>
                
                <p class="body-text" style="margin-top: 32px;">
                  Need help? Reply to this email or contact our support team at support@synthqa.app.
                </p>
              </div>
              
              <!-- Footer -->
              <div class="email-footer">
                <p class="footer-brand">SynthQA</p>
                <p class="footer-text">AI-Powered Test Case Generator</p>
                
                <p class="footer-text">
                  © ${new Date().getFullYear()} SynthQA. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const resend = this.getResend();
      const { data: emailData, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <noreply@synthqa.com>",
        to: data.to,
        subject: "Reset Your Password - SynthQA",
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

  async sendConfirmationEmail(data: ConfirmationEmailData): Promise<boolean> {
    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/confirm-email?token=${data.token}`;
    const userName = data.userName || "there";
    const expiryDate = data.expiresAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SynthQA - Confirm Your Email</title>
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                <div class="logo-container">
                  ${LOGO_SVG}
                  <div class="logo-text">SynthQA</div>
                </div>
                <div class="header-subtitle">AI-Powered Test Case Generator</div>
              </div>
              
              <!-- Content -->
              <div class="email-content">
                <div class="greeting">Welcome to SynthQA${userName !== "there" ? `, ${userName}` : ""}! 🎉</div>
                
                <p class="body-text">
                  Thank you for signing up! We're excited to have you on board. 
                  To get started with generating AI-powered test cases, please confirm your email address:
                </p>
                
                <div class="button-container">
                  <a href="${confirmUrl}" class="button">Confirm My Email</a>
                </div>
                
                <div class="info-box">
                  <div class="info-box-title">
                    <span>✨</span>
                    What you can do with SynthQA
                  </div>
                  <div class="feature-list">
                    <div class="feature-item">
                      <span class="checkmark">✓</span>
                      Generate comprehensive test cases instantly with AI
                    </div>
                    <div class="feature-item">
                      <span class="checkmark">✓</span>
                      Create and manage requirements efficiently
                    </div>
                    <div class="feature-item">
                      <span class="checkmark">✓</span>
                      Build test coverage across multiple platforms
                    </div>
                    <div class="feature-item">
                      <span class="checkmark">✓</span>
                      Export and share test cases with your team
                    </div>
                  </div>
                </div>
                
                <p class="body-text">
                  If the button above doesn't work, copy and paste this link into your browser:
                </p>
                <div class="code-block">${confirmUrl}</div>
                
                <div class="divider"></div>
                
                <div class="warning-box">
                  <div class="warning-box-title">⏰ Confirmation Deadline</div>
                  <div class="warning-box-text">
                    This confirmation link will expire on <strong>${expiryDate}</strong>. 
                    Don't worry - you have plenty of time to confirm!
                  </div>
                </div>
                
                <p class="body-text" style="margin-top: 32px;">
                  <strong>Questions?</strong> We're here to help! Reply to this email or contact our support team.
                </p>
              </div>
              
              <!-- Footer -->
              <div class="email-footer">
                <p class="footer-brand">SynthQA</p>
                <p class="footer-text">AI-Powered Test Case Generator</p>
                
                <p class="footer-text">
                  © ${new Date().getFullYear()} SynthQA. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const resend = this.getResend();
      const { data: emailData, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <welcome@synthqa.com>",
        to: data.to,
        subject: "Welcome to SynthQA - Confirm Your Email",
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

  async sendTrialStartedEmail(data: TrialStartedEmailData): Promise<boolean> {
    const userName = data.userName || "there";
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${data.planName} - SynthQA</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                ${LOGO_SVG}
                <div class="logo-text">SynthQA</div>
              </div>
              <div class="header-subtitle">AI-Powered Test Case Generator</div>
            </div>
            
            <div class="email-content">
              <div class="greeting">Welcome to ${data.planName}! 🎉</div>
              
              <p class="body-text">
                Hi ${userName}, your 14-day ${data.planName} trial has started! 
                You now have access to all premium features.
              </p>
              
              <div class="info-box">
                <div class="info-box-title">
                  <span>✨</span>
                  What's included in ${data.planName}
                </div>
                <div class="feature-list">
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    500 AI-generated test cases per month
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    All AI models (GPT-4, Claude Opus)
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Cross-platform test generation
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Export to multiple formats
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Priority email support
                  </div>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${dashboardUrl}" class="button">Start Testing</a>
              </div>
              
              <div class="warning-box">
                <div class="warning-box-title">📅 Your Trial Details</div>
                <div class="warning-box-text">
                  Your trial ends on <strong>${data.trialEndDate}</strong>. After that, 
                  you'll be charged $15/month. You can cancel anytime before then at no charge.
                </div>
              </div>
              
              <div class="divider"></div>
              
              <p class="body-text">
                <strong>Need help getting started?</strong> Check out our 
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/docs" style="color: #14b8a6; text-decoration: none;">documentation</a> 
                or reply to this email.
              </p>
            </div>
            
            <div class="email-footer">
              <p class="footer-brand">SynthQA</p>
              <p class="footer-text">AI-Powered Test Case Generator</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} SynthQA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    try {
      const resend = this.getResend();
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <notifications@synthqa.com>",
        to: data.to,
        subject: `Welcome to ${data.planName}! Your trial has started 🎉`,
        html: emailHtml,
      });

      if (error) {
        console.error("Trial started email error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Trial started email send failed:", error);
      return false;
    }
  }

  async sendTrialEndingSoonEmail(
    data: TrialEndingSoonEmailData,
  ): Promise<boolean> {
    const userName = data.userName || "there";
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/billing`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your trial ends in ${data.daysLeft} days - SynthQA</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                ${LOGO_SVG}
                <div class="logo-text">SynthQA</div>
              </div>
              <div class="header-subtitle">AI-Powered Test Case Generator</div>
            </div>
            
            <div class="email-content">
              <div class="greeting">Your trial ends in ${data.daysLeft} days</div>
              
              <p class="body-text">
                Hi ${userName}, just a friendly reminder that your Pro trial ends on 
                <strong>${data.trialEndDate}</strong>.
              </p>
              
              <p class="body-text">
                After that, you'll be charged <strong>$15/month</strong> to keep your Pro features.
              </p>
              
              <div class="button-container">
                <a href="${billingUrl}" class="button">Continue with Pro</a>
              </div>
              
              <div class="info-box">
                <div class="info-box-title">
                  <span>🤔</span>
                  Not ready to commit?
                </div>
                <div class="info-box-text">
                  No problem! You can cancel anytime before ${data.trialEndDate} and you won't be charged. 
                  You'll be moved to our Free plan (20 test cases/month).
                </div>
              </div>
              
              <div class="divider"></div>
              
              <p class="body-text" style="text-align: center;">
                <a href="${billingUrl}" style="color: #64748b; text-decoration: underline; font-size: 14px;">
                  Cancel subscription
                </a>
              </p>
              
              <p class="body-text" style="margin-top: 32px;">
                Questions? Just reply to this email and we'll help you out.
              </p>
            </div>
            
            <div class="email-footer">
              <p class="footer-brand">SynthQA</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} SynthQA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    try {
      const resend = this.getResend();
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <notifications@synthqa.com>",
        to: data.to,
        subject: `Your Pro trial ends in ${data.daysLeft} days`,
        html: emailHtml,
      });

      if (error) {
        console.error("Trial ending email error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Trial ending email send failed:", error);
      return false;
    }
  }

  async sendWelcomeToProEmail(data: WelcomeToProEmailData): Promise<boolean> {
    const userName = data.userName || "there";
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SynthQA Pro! - SynthQA</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                ${LOGO_SVG}
                <div class="logo-text">SynthQA</div>
              </div>
              <div class="header-subtitle">AI-Powered Test Case Generator</div>
            </div>
            
            <div class="email-content">
              <div class="greeting">Welcome to SynthQA Pro! 🎉</div>
              
              <p class="body-text">
                Hi ${userName}, your trial is over and you're now a Pro member!
              </p>
              
              <div class="info-box">
                <div class="info-box-title">
                  <span>💳</span>
                  Billing Details
                </div>
                <div class="info-box-text">
                  You were charged <strong>${data.amount}</strong> for your first month.<br>
                  Next billing date: <strong>${data.nextBillingDate}</strong>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              
              <p class="body-text">
                You'll continue to have access to all Pro features. 
                You can manage your subscription anytime from your billing page.
              </p>
              
              <div class="divider"></div>
              
              <p class="body-text">
                Thank you for choosing SynthQA Pro! We're excited to help you build better tests.
              </p>
            </div>
            
            <div class="email-footer">
              <p class="footer-brand">SynthQA</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} SynthQA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    try {
      const resend = this.getResend();
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <notifications@synthqa.com>",
        to: data.to,
        subject: "Welcome to SynthQA Pro! 🎉",
        html: emailHtml,
      });

      if (error) {
        console.error("Welcome to Pro email error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Welcome to Pro email send failed:", error);
      return false;
    }
  }

  async sendSubscriptionCancelledEmail(
    data: SubscriptionCancelledEmailData,
  ): Promise<boolean> {
    const userName = data.userName || "there";
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/billing`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancelled - SynthQA</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                ${LOGO_SVG}
                <div class="logo-text">SynthQA</div>
              </div>
              <div class="header-subtitle">AI-Powered Test Case Generator</div>
            </div>
            
            <div class="email-content">
              <div class="greeting">Subscription Cancelled</div>
              
              <p class="body-text">
                Hi ${userName}, your ${data.planName} subscription has been cancelled.
              </p>
              
              <div class="warning-box">
                <div class="warning-box-title">📅 What happens next</div>
                <div class="warning-box-text">
                  You'll keep full ${data.planName} access until <strong>${data.accessUntilDate}</strong>. 
                  After that, you'll be moved to the Free plan (20 test cases/month).
                </div>
              </div>
              
              <p class="body-text">
                Changed your mind? You can reactivate your subscription anytime:
              </p>
              
              <div class="button-container">
                <a href="${billingUrl}" class="button">Reactivate Subscription</a>
              </div>
              
              <div class="divider"></div>
              
              <p class="body-text">
                We'd love to hear why you cancelled (optional). Your feedback helps us improve:
              </p>
              
              <p class="body-text" style="text-align: center;">
                <a href="${billingUrl}?feedback=true" style="color: #14b8a6; text-decoration: underline;">
                  Give Feedback
                </a>
              </p>
              
              <p class="body-text" style="margin-top: 32px;">
                Thanks for trying SynthQA Pro. We hope to see you again soon!
              </p>
            </div>
            
            <div class="email-footer">
              <p class="footer-brand">SynthQA</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} SynthQA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    try {
      const resend = this.getResend();
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <notifications@synthqa.com>",
        to: data.to,
        subject: "Subscription Cancelled - SynthQA",
        html: emailHtml,
      });

      if (error) {
        console.error("Subscription cancelled email error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Subscription cancelled email send failed:", error);
      return false;
    }
  }

  // 5. Subscription Ended (Period Expired)
  async sendSubscriptionEndedEmail(
    data: SubscriptionEndedEmailData,
  ): Promise<boolean> {
    const userName = data.userName || "there";
    const billingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/billing`;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your subscription has ended - SynthQA</title>
        <style>${EMAIL_STYLES}</style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <div class="logo-container">
                ${LOGO_SVG}
                <div class="logo-text">SynthQA</div>
              </div>
              <div class="header-subtitle">AI-Powered Test Case Generator</div>
            </div>
            
            <div class="email-content">
              <div class="greeting">Your subscription has ended</div>
              
              <p class="body-text">
                Hi ${userName}, your ${data.planName} subscription has ended. 
                You're now on our Free plan.
              </p>
              
              <div class="info-box">
                <div class="info-box-title">
                  <span>📊</span>
                  What's included in Free
                </div>
                <div class="feature-list">
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    20 AI-generated test cases per month
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Unlimited manual test cases
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Basic test execution tracking
                  </div>
                  <div class="feature-item">
                    <span class="checkmark">✓</span>
                    Export to CSV
                  </div>
                </div>
              </div>
              
              <p class="body-text">
                Miss ${data.planName} features? You can resubscribe anytime:
              </p>
              
              <div class="button-container">
                <a href="${billingUrl}" class="button">Upgrade to ${data.planName}</a>
              </div>
              
              <div class="divider"></div>
              
              <p class="body-text">
                Thanks for using SynthQA! We hope to see you back on ${data.planName} soon.
              </p>
            </div>
            
            <div class="email-footer">
              <p class="footer-brand">SynthQA</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} SynthQA. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

    try {
      const resend = this.getResend();
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "SynthQA <notifications@synthqa.com>",
        to: data.to,
        subject: "Your subscription has ended - SynthQA",
        html: emailHtml,
      });

      if (error) {
        console.error("Subscription ended email error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Subscription ended email send failed:", error);
      return false;
    }
  }

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

export function createEmailService(): EmailService | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new EmailService(apiKey);
}
