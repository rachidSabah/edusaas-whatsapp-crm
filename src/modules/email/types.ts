// Email Provider Types
export type EmailProvider = 'smtp' | 'brevo' | 'mailchimp' | 'gmail' | 'microsoft';

export interface EmailConfig {
  id: string;
  provider: EmailProvider;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  imapHost: string | null;
  imapPort: number;
  imapUser: string | null;
  imapPassword: string | null;
  popHost: string | null;
  popPort: number;
  popUser: string | null;
  popPassword: string | null;
  brevoApiKey: string | null;
  mailchimpApiKey: string | null;
  mailchimpListId: string | null;
  gmailClientId: string | null;
  gmailClientSecret: string | null;
  gmailRefreshToken: string | null;
  fromEmail: string;
  fromName: string | null;
}

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  cc?: string;
  bcc?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProviderInterface {
  send(params: SendEmailParams, config: EmailConfig): Promise<SendResult>;
  testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }>;
}

export const EMAIL_PROVIDERS: Record<EmailProvider, { name: string; description: string }> = {
  smtp: {
    name: 'Serveur SMTP',
    description: 'Configuration SMTP personnalisée',
  },
  brevo: {
    name: 'Brevo (Sendinblue)',
    description: 'Service email transactionnel Brevo',
  },
  mailchimp: {
    name: 'Mailchimp',
    description: 'Mailchimp Transactional (Mandrill)',
  },
  gmail: {
    name: 'Gmail',
    description: 'Compte Gmail via OAuth2',
  },
  microsoft: {
    name: 'Microsoft 365',
    description: 'Exchange Online / Outlook',
  },
};
