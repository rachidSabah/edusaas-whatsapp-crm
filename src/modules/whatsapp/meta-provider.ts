/**
 * WhatsApp Business API (Meta) Provider
 * Official Meta WhatsApp Business API implementation
 */

import type { WhatsAppSendResult, WhatsAppMessage } from './types';

export interface MetaConfig {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
}

export interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          document?: {
            mime_type: string;
            sha256: string;
            id: string;
            filename: string;
          };
          audio?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          video?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

/**
 * Meta WhatsApp Business API Provider
 */
export class MetaWhatsAppProvider {
  private config: MetaConfig;
  private apiVersion = 'v22.0';
  private apiUrl = 'https://graph.facebook.com';

  constructor(config: MetaConfig) {
    this.config = config;
  }

  /**
   * Send text message via Meta API
   */
  async sendMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    try {
      const formattedNumber = to.replace(/[^0-9]/g, '');

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedNumber,
            type: 'text',
            text: {
              preview_url: false,
              body: message,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Meta API error:', error);
        return {
          success: false,
          error: `Meta API error: ${error.error?.message || 'Unknown error'}`,
        };
      }

      const result = await response.json() as { messages?: Array<{ id: string }> };
      return {
        success: true,
        messageId: result.messages?.[0]?.id || `msg_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending message via Meta API:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send media message via Meta API
   */
  async sendMedia(
    to: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video' = 'image',
    caption?: string
  ): Promise<WhatsAppSendResult> {
    try {
      const formattedNumber = to.replace(/[^0-9]/g, '');

      const body: Record<string, any> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedNumber,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
        },
      };

      // Add caption for image and document
      if ((mediaType === 'image' || mediaType === 'document') && caption) {
        body[mediaType].caption = caption;
      }

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Meta API error: ${error.error?.message || 'Unknown error'}`,
        };
      }

      const result = await response.json() as { messages?: Array<{ id: string }> };
      return {
        success: true,
        messageId: result.messages?.[0]?.id || `msg_${Date.now()}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send template message via Meta API
   */
  async sendTemplate(
    to: string,
    templateName: string,
    templateLanguage: string = 'fr',
    parameters?: string[]
  ): Promise<WhatsAppSendResult> {
    try {
      const formattedNumber = to.replace(/[^0-9]/g, '');

      const body: Record<string, any> = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage,
          },
        },
      };

      if (parameters && parameters.length > 0) {
        body.template.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({ type: 'text', text: param })),
          },
        ];
      }

      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Meta API error: ${error.error?.message || 'Unknown error'}`,
        };
      }

      const result = await response.json() as { messages?: Array<{ id: string }> };
      return {
        success: true,
        messageId: result.messages?.[0]?.id || `msg_${Date.now()}`,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Parse incoming webhook from Meta
   */
  parseWebhook(payload: MetaWebhookPayload): WhatsAppMessage | null {
    try {
      if (payload.object !== 'whatsapp_business_account') {
        return null;
      }

      const entry = payload.entry?.[0];
      if (!entry) return null;

      const change = entry.changes?.[0];
      if (!change) return null;

      const value = change.value;
      const messages = value.messages;

      if (!messages || messages.length === 0) {
        return null;
      }

      const message = messages[0];

      // Extract message body based on type
      let body = '';
      let type = 'text';
      let mediaUrl: string | undefined;

      if (message.text?.body) {
        body = message.text.body;
        type = 'text';
      } else if (message.image) {
        type = 'image';
        mediaUrl = message.image.id;
      } else if (message.document) {
        type = 'document';
        mediaUrl = message.document.id;
        body = message.document.filename || 'Document';
      } else if (message.audio) {
        type = 'audio';
        mediaUrl = message.audio.id;
      } else if (message.video) {
        type = 'video';
        mediaUrl = message.video.id;
      }

      return {
        id: message.id,
        from: message.from,
        to: value.metadata.display_phone_number,
        body,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        type: type as any,
        mediaUrl,
        isFromMe: false,
      };
    } catch (error) {
      console.error('Error parsing Meta webhook:', error);
      return null;
    }
  }

  /**
   * Verify webhook token
   */
  verifyWebhookToken(token: string): boolean {
    return token === this.config.webhookVerifyToken;
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<WhatsAppSendResult> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: `Meta API error: ${error.error?.message || 'Unknown error'}`,
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get message media URL
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.apiVersion}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { url?: string };
      return data.url || null;
    } catch (error) {
      console.error('Error getting media URL:', error);
      return null;
    }
  }
}

/**
 * Create Meta provider instance
 */
export function createMetaProvider(config: MetaConfig): MetaWhatsAppProvider {
  return new MetaWhatsAppProvider(config);
}
