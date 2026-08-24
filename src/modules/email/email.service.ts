import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailProvider: string;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    this.emailProvider = this.configService.get<string>('app.email.provider') || 'console';
    this.fromEmail = this.configService.get<string>('app.email.from') || 'noreply@reki.app';
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const provider = this.emailProvider.toLowerCase();

    switch (provider) {
      case 'sendgrid':
        await this.sendViaSendGrid(options);
        break;
      case 'ses':
        await this.sendViaSES(options);
        break;
      case 'smtp':
        await this.sendViaSMTP(options);
        break;
      case 'console':
      default:
        this.sendViaConsole(options);
        break;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('app.frontendUrl')}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Verify Your REKI Account',
      html: this.getVerificationEmailTemplate(userName, verificationUrl),
      text: `Hi ${userName},\n\nWelcome to REKI! Please verify your email by clicking: ${verificationUrl}\n\nThis link expires in 24 hours.`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('app.frontendUrl')}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your REKI Password',
      html: this.getPasswordResetEmailTemplate(userName, resetUrl),
      text: `Hi ${userName},\n\nYou requested to reset your password. Click here: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
    });
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const apiKey = this.configService.get<string>('app.email.sendgridApiKey');
    
    if (!apiKey) {
      this.logger.error('SendGrid API key not configured. Falling back to console logging.');
      this.sendViaConsole(options);
      return;
    }

    try {
      // Dynamic import to avoid requiring sendgrid if not used
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);

      await sgMail.send({
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent via SendGrid to ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email via SendGrid: ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  private async sendViaSES(options: EmailOptions): Promise<void> {
    const region = this.configService.get<string>('app.email.sesRegion');
    const accessKeyId = this.configService.get<string>('app.email.sesAccessKeyId');
    const secretAccessKey = this.configService.get<string>('app.email.sesSecretAccessKey');

    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.error('AWS SES credentials not configured. Falling back to console logging.');
      this.sendViaConsole(options);
      return;
    }

    try {
      // Dynamic import to avoid requiring AWS SDK if not used
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      
      const client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
          },
          Body: {
            Html: {
              Data: options.html,
            },
            Text: {
              Data: options.text || '',
            },
          },
        },
      });

      await client.send(command);
      this.logger.log(`Email sent via AWS SES to ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email via AWS SES: ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  private async sendViaSMTP(options: EmailOptions): Promise<void> {
    const host = this.configService.get<string>('app.email.smtpHost');
    const port = this.configService.get<number>('app.email.smtpPort');
    const user = this.configService.get<string>('app.email.smtpUser');
    const pass = this.configService.get<string>('app.email.smtpPass');

    if (!host || !port || !user || !pass) {
      this.logger.error('SMTP credentials not configured. Falling back to console logging.');
      this.sendViaConsole(options);
      return;
    }

    try {
      // Dynamic import to avoid requiring nodemailer if not used
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent via SMTP to ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email via SMTP: ${error.message}`);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  private sendViaConsole(options: EmailOptions): void {
    this.logger.log('\n' + '='.repeat(60));
    this.logger.log('📧 EMAIL (Console Mode - Development Only)');
    this.logger.log('='.repeat(60));
    this.logger.log(`To: ${options.to}`);
    this.logger.log(`From: ${this.fromEmail}`);
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log('-'.repeat(60));
    this.logger.log(options.text || 'No text version provided');
    this.logger.log('='.repeat(60) + '\n');
  }

  private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to REKI!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Thanks for joining REKI - Manchester's best way to discover the city's vibes!</p>
            <p>Please verify your email address to get started:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>This link expires in 24 hours.</strong></p>
            <p>If you didn't create a REKI account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} REKI. All rights reserved.</p>
            <p>Discover Manchester's Best Vibes</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your REKI password.</p>
            <p>Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link expires in 15 minutes</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} REKI. All rights reserved.</p>
            <p>Discover Manchester's Best Vibes</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
