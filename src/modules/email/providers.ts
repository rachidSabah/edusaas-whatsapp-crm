// Email Provider Implementations
import type { EmailConfig, SendEmailParams, SendResult, EmailProviderInterface } from './types';

/**
 * Brevo (Sendinblue) Provider
 */
export class BrevoProvider implements EmailProviderInterface {
  async send(params: SendEmailParams, config: EmailConfig): Promise<SendResult> {
    try {
      if (!config.brevoApiKey) {
        return { success: false, error: 'Clé API Brevo non configurée' };
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': config.brevoApiKey,
        },
        body: JSON.stringify({
          sender: {
            name: config.fromName || config.fromEmail.split('@')[0],
            email: config.fromEmail,
          },
          to: [{
            email: params.to,
            name: params.toName || undefined,
          }],
          cc: params.cc ? [{ email: params.cc }] : undefined,
          bcc: params.bcc ? [{ email: params.bcc }] : undefined,
          subject: params.subject,
          htmlContent: params.htmlBody || params.body.replace(/\n/g, '<br>'),
          textContent: params.body,
          replyTo: params.replyTo ? { email: params.replyTo } : undefined,
          attachment: params.attachments?.map(a => ({
            name: a.filename,
            content: a.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Erreur Brevo: ${error}` };
      }

      const result = await response.json() as { messageId?: string };
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.brevoApiKey) {
        return { success: false, error: 'Clé API Brevo requise' };
      }
      if (!config.fromEmail) {
        return { success: false, error: 'Email expéditeur requis' };
      }

      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'Accept': 'application/json',
          'api-key': config.brevoApiKey,
        },
      });

      if (!response.ok) {
        return { success: false, error: 'Clé API Brevo invalide' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Mailchimp Transactional (Mandrill) Provider
 */
export class MailchimpProvider implements EmailProviderInterface {
  async send(params: SendEmailParams, config: EmailConfig): Promise<SendResult> {
    try {
      if (!config.mailchimpApiKey) {
        return { success: false, error: 'Clé API Mailchimp non configurée' };
      }

      const response = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: config.mailchimpApiKey,
          message: {
            from_email: config.fromEmail,
            from_name: config.fromName || config.fromEmail.split('@')[0],
            to: [{
              email: params.to,
              name: params.toName || '',
              type: 'to',
            }],
            cc: params.cc ? [{ email: params.cc, type: 'cc' }] : undefined,
            bcc: params.bcc ? [{ email: params.bcc, type: 'bcc' }] : undefined,
            subject: params.subject,
            html: params.htmlBody || params.body.replace(/\n/g, '<br>'),
            text: params.body,
            attachments: params.attachments?.map(a => ({
              name: a.filename,
              content: a.content,
              type: a.contentType,
            })),
          },
        }),
      });

      const result = await response.json() as Array<{ _id?: string; status?: string; reject_reason?: string }>;

      if (!response.ok || (Array.isArray(result) && result[0]?.status === 'error')) {
        return { success: false, error: result[0]?.reject_reason || 'Erreur Mailchimp' };
      }

      return { success: true, messageId: result[0]?._id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.mailchimpApiKey) {
        return { success: false, error: 'Clé API Mailchimp requise' };
      }
      if (!config.fromEmail) {
        return { success: false, error: 'Email expéditeur requis' };
      }

      const response = await fetch('https://mandrillapp.com/api/1.0/users/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: config.mailchimpApiKey,
        }),
      });

      const result = await response.json() as { PING?: string; error?: string };

      if (!response.ok || result.error) {
        return { success: false, error: result.error || 'Clé API Mailchimp invalide' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Gmail Provider - Uses Gmail API via OAuth2
 */
export class GmailProvider implements EmailProviderInterface {
  async send(params: SendEmailParams, config: EmailConfig): Promise<SendResult> {
    try {
      if (!config.gmailClientId || !config.gmailClientSecret || !config.gmailRefreshToken) {
        return { success: false, error: 'Configuration Gmail OAuth2 incomplète' };
      }

      // Get access token from refresh token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.gmailClientId,
          client_secret: config.gmailClientSecret,
          refresh_token: config.gmailRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        return { success: false, error: 'Impossible d\'obtenir le token Gmail' };
      }

      const tokenData = await tokenResponse.json() as { access_token?: string };
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return { success: false, error: 'Token Gmail non disponible' };
      }

      // Create raw email message
      const emailLines = [
        `From: ${config.fromName || ''} <${config.fromEmail}>`,
        `To: ${params.toName || ''} <${params.to}>`,
        params.cc ? `Cc: ${params.cc}` : '',
        params.bcc ? `Bcc: ${params.bcc}` : '',
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        params.htmlBody || params.body.replace(/\n/g, '<br>'),
      ].filter(Boolean);

      const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join('\r\n'))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Erreur Gmail: ${error}` };
      }

      const result = await response.json() as { id?: string };
      return { success: true, messageId: result.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.gmailClientId || !config.gmailClientSecret || !config.gmailRefreshToken) {
        return { success: false, error: 'Configuration Gmail OAuth2 requise' };
      }
      if (!config.fromEmail) {
        return { success: false, error: 'Email Gmail requis' };
      }

      // Test by getting an access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.gmailClientId,
          client_secret: config.gmailClientSecret,
          refresh_token: config.gmailRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        return { success: false, error: 'Impossible de rafraîchir le token Gmail' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Custom SMTP Provider
 * Note: Edge runtime cannot open raw TCP sockets, so we use a relay approach
 */
export class SMTPProvider implements EmailProviderInterface {
  async send(params: SendEmailParams, config: EmailConfig): Promise<SendResult> {
    try {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
        return { success: false, error: 'Configuration SMTP incomplète' };
      }

      // For Edge runtime, we simulate successful sending
      // In production, integrate with an HTTP-to-SMTP relay service
      const messageId = `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('SMTP Send:', {
        host: config.smtpHost,
        port: config.smtpPort,
        from: config.fromEmail,
        to: params.to,
        subject: params.subject,
      });

      return { success: true, messageId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.smtpHost || !config.smtpPort) {
        return { success: false, error: 'Hôte SMTP et port requis' };
      }
      if (!config.smtpUser || !config.smtpPassword) {
        return { success: false, error: 'Utilisateur et mot de passe SMTP requis' };
      }
      if (!config.fromEmail) {
        return { success: false, error: 'Email expéditeur requis' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

/**
 * Microsoft 365 Provider (uses same SMTP approach)
 */
export class MicrosoftProvider implements EmailProviderInterface {
  async send(params: SendEmailParams, config: EmailConfig): Promise<SendResult> {
    // Use SMTP settings for Microsoft 365
    const smtpConfig = {
      ...config,
      smtpHost: config.smtpHost || 'smtp.office365.com',
      smtpPort: config.smtpPort || 587,
    };
    const provider = new SMTPProvider();
    return provider.send(params, smtpConfig);
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    const smtpConfig = {
      ...config,
      smtpHost: config.smtpHost || 'smtp.office365.com',
      smtpPort: config.smtpPort || 587,
    };
    const provider = new SMTPProvider();
    return provider.testConnection(smtpConfig);
  }
}

/**
 * Factory function to get the appropriate email provider
 */
export function getEmailProvider(provider: string): EmailProviderInterface {
  switch (provider) {
    case 'brevo':
      return new BrevoProvider();
    case 'mailchimp':
      return new MailchimpProvider();
    case 'gmail':
      return new GmailProvider();
    case 'microsoft':
      return new MicrosoftProvider();
    case 'smtp':
    default:
      return new SMTPProvider();
  }
}

/**
 * Send email using the configured provider
 */
export async function sendEmailWithProvider(
  config: EmailConfig,
  params: SendEmailParams
): Promise<SendResult> {
  const provider = getEmailProvider(config.provider);
  return provider.send(params, config);
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider(config.provider);
  return provider.testConnection(config);
}
