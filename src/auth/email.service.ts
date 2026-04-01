import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not found. Email sending will fallback to console.log.');
    }
  }

  private getFromEmail(): string {
    return this.configService.get<string>('RESEND_FROM_EMAIL') || 'Telyon <noreply@elyon.app>';
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject = 'Tu código de verificación de Telyon';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; text-align: center;">Verifica tu correo electrónico</h2>
        <p style="color: #475569; font-size: 16px; text-align: center;">
          Gracias por registrarte. Por favor, usa el siguiente código de 6 dígitos para verificar tu cuenta:
        </p>
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Este código expirará en 15 minutos. Si no solicitaste este código, puedes ignorar este mensaje.
        </p>
      </div>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.getFromEmail(),
          to: email,
          subject: subject,
          html: html,
        });
        this.logger.log(`Verification email sent to ${email}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}`, error);
        // Fallback to console in dev if Resend fails
        this.logCodeToConsole(email, code);
        return false;
      }
    } else {
      this.logCodeToConsole(email, code);
      return true;
    }
  }

  private logCodeToConsole(email: string, code: string) {
    this.logger.log('\n=============================================');
    this.logger.log(`[EMAIL FALLBACK] To: ${email}`);
    this.logger.log(`[EMAIL FALLBACK] Subject: Tu código de verificación`);
    this.logger.log(`[EMAIL FALLBACK] Code: ${code}`);
    this.logger.log('=============================================\n');
  }

  async sendInvitationLink(email: string, inviteToken: string): Promise<boolean> {
    const subject = 'Has sido invitado a unirte a tu iglesia en Telyon';
    // Using a placeholder frontend URL; this should ideally come from ConfigService
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/auth/register?invite=${inviteToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; text-align: center;">Invitación a Telyon</h2>
        <p style="color: #475569; font-size: 16px; text-align: center;">
          Has sido invitado a unirte a tu iglesia en el sistema Telyon. Por favor, crea tu cuenta haciendo clic en el siguiente enlace:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Registrarse ahora
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          Si no esperabas esta invitación, puedes ignorar este mensaje de forma segura.
        </p>
      </div>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.getFromEmail(),
          to: email,
          subject: subject,
          html: html,
        });
        this.logger.log(`Invitation email sent to ${email}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send invitation to ${email}`, error);
        this.logInviteToConsole(email, inviteLink);
        return false;
      }
    } else {
      this.logInviteToConsole(email, inviteLink);
      return true;
    }
  }

  private logInviteToConsole(email: string, link: string) {
    this.logger.log('\n=============================================');
    this.logger.log(`[EMAIL FALLBACK] To: ${email}`);
    this.logger.log(`[EMAIL FALLBACK] Subject: Invitación a Telyon`);
    this.logger.log(`[EMAIL FALLBACK] Link: ${link}`);
    this.logger.log('=============================================\n');
  }
}
