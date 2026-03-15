// WhatsApp Service - Main service for WhatsApp operations
import type { WhatsAppConfig, WhatsAppMessage, WhatsAppSendResult } from './types';
import { sendWhatsAppMessage, parseWhatsAppWebhook, getWhatsAppProvider } from './providers';

export interface WhatsAppServiceConfig extends WhatsAppConfig {
  organizationId: string;
  aiEnabled?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyCategories?: string[];
}

export interface MessageContext {
  message: WhatsAppMessage;
  organizationId: string;
  contact?: {
    name: string;
    number: string;
  };
  student?: {
    id: string;
    name: string;
    parentId?: string;
  };
}

/**
 * WhatsApp Service Class
 */
export class WhatsAppService {
  private config: WhatsAppServiceConfig;

  constructor(config: WhatsAppServiceConfig) {
    this.config = config;
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    return sendWhatsAppMessage(this.config, to, message);
  }

  /**
   * Send an absence notification to parent
   */
  async sendAbsenceNotification(
    parentPhone: string,
    parentName: string,
    studentName: string,
    date: string,
    reason?: string
  ): Promise<WhatsAppSendResult> {
    const message = `Bonjour ${parentName},

Nous vous informons que votre enfant ${studentName} a été marqué(e) absent(e) le ${date}.
${reason ? `Motif: ${reason}` : ''}

Pour plus d'informations, veuillez contacter l'établissement.

Cordialement,
L'administration`;

    return this.sendTextMessage(parentPhone, message);
  }

  /**
   * Send a delay notification to parent
   */
  async sendDelayNotification(
    parentPhone: string,
    parentName: string,
    studentName: string,
    date: string,
    time: string
  ): Promise<WhatsAppSendResult> {
    const message = `Bonjour ${parentName},

Nous vous informons que votre enfant ${studentName} est arrivé(e) en retard le ${date} à ${time}.

Pour plus d'informations, veuillez contacter l'établissement.

Cordialement,
L'administration`;

    return this.sendTextMessage(parentPhone, message);
  }

  /**
   * Process incoming message (for AI auto-reply)
   */
  async processIncomingMessage(context: MessageContext): Promise<string | null> {
    const { message, contact } = context;

    // If auto-reply is disabled, return null
    if (!this.config.autoReplyEnabled) {
      return null;
    }

    const body = message.body.toLowerCase().trim();

    // Basic auto-reply patterns
    if (body === 'bonjour' || body === 'bonsoir' || body === 'salut' || body === 'hello' || body === 'hi') {
      return `Bonjour ${contact?.name || ''}! 👋

Bienvenue sur notre service WhatsApp. Comment puis-je vous aider?

Répondez avec:
- *1* pour les horaires
- *2* pour les absences
- *3* pour contacter l'administration
- *aide* pour plus d'options`;
    }

    if (body === '1' || body.includes('horaire')) {
      return `📅 *Horaires de l'établissement:*

Lundi - Vendredi: 8h00 - 17h00
Samedi: 8h00 - 12h00
Dimanche: Fermé

Pour plus d'informations, contactez le secrétariat.`;
    }

    if (body === '2' || body.includes('absence')) {
      return `📋 *Signaler une absence:*

Pour signaler l'absence de votre enfant:
1. Envoyez un message avec le nom de l'enfant
2. Indiquez la date et la raison

Exemple: "Absence Ahmed - 15/03/2024 - Maladie"

L'administration prendra en compte votre demande.`;
    }

    if (body === '3' || body.includes('contact') || body.includes('administration')) {
      return `📞 *Contact Administration:*

Téléphone: +212 XXX XXX XXX
Email: contact@ecole.ma
WhatsApp: Ce numéro

Nos conseillers sont disponibles du lundi au vendredi de 9h à 16h.`;
    }

    if (body === 'aide' || body === 'help') {
      return `🤖 *Menu d'aide - WhatsApp Bot*

Commandes disponibles:
• *bonjour* - Saluer le bot
• *1* ou *horaire* - Voir les horaires
• *2* ou *absence* - Signaler une absence
• *3* ou *contact* - Contacter l'administration
• *aide* - Ce menu d'aide

Pour toute autre question, notre équipe vous répondra dans les meilleurs délais.`;
    }

    // For unrecognized messages, return null (no auto-reply)
    // The message will be forwarded to human operators
    return null;
  }

  /**
   * Handle incoming webhook
   */
  handleWebhook(payload: any): WhatsAppMessage | null {
    return parseWhatsAppWebhook(this.config, payload);
  }
}

/**
 * Create WhatsApp service instance
 */
export function createWhatsAppService(config: WhatsAppServiceConfig): WhatsAppService {
  return new WhatsAppService(config);
}
