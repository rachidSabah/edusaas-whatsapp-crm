// WhatsApp Service Providers
import type { WhatsAppConfig, WhatsAppMessage, WhatsAppSendResult, WhatsAppWebhookPayload } from './types';

/**
 * Evolution API Provider
 * https://doc.evolution-api.com
 */
export class EvolutionAPIProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    try {
      // Format phone number (remove +, spaces, etc.)
      const formattedNumber = to.replace(/\D/g, '');
      
      const response = await fetch(
        `${this.config.apiUrl}/message/sendText/${this.config.instanceId || 'default'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.apiKey,
          },
          body: JSON.stringify({
            number: formattedNumber,
            options: {
              delay: 1000,
            },
            textMessage: {
              text: message,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Evolution API error: ${error}` };
      }

      const result = await response.json() as { key?: { id?: string } };
      return { 
        success: true, 
        messageId: result.key?.id || `msg_${Date.now()}` 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    try {
      const formattedNumber = to.replace(/\D/g, '');
      
      const response = await fetch(
        `${this.config.apiUrl}/message/sendMedia/${this.config.instanceId || 'default'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.config.apiKey,
          },
          body: JSON.stringify({
            number: formattedNumber,
            mediaMessage: {
              mediatype: 'image',
              media: mediaUrl,
              caption: caption || '',
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Evolution API error: ${error}` };
      }

      const result = await response.json() as { key?: { id?: string } };
      return { 
        success: true, 
        messageId: result.key?.id || `msg_${Date.now()}` 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  parseWebhook(payload: WhatsAppWebhookPayload): WhatsAppMessage | null {
    try {
      const { data, event } = payload;
      
      if (event !== 'messages.upsert') return null;
      
      const message = data.message;
      const body = message.conversation || 
                   message.extendedTextMessage?.text || 
                   message.imageMessage?.caption || '';
      
      return {
        id: data.key.id,
        from: data.key.remoteJid.replace('@s.whatsapp.net', ''),
        to: data.key.fromMe ? data.key.remoteJid : '',
        body,
        timestamp: new Date(data.messageTimestamp * 1000).toISOString(),
        type: message.imageMessage ? 'image' : 
              message.audioMessage ? 'audio' : 
              message.videoMessage ? 'video' : 'text',
        mediaUrl: message.imageMessage?.url || 
                  message.audioMessage?.url || 
                  message.videoMessage?.url,
        isFromMe: data.key.fromMe,
      };
    } catch (error) {
      console.error('Error parsing webhook:', error);
      return null;
    }
  }
}

/**
 * Custom Webhook Provider
 * For custom WhatsApp integrations
 */
export class CustomWebhookProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppSendResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          to,
          message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Webhook error: ${error}` };
      }

      const result = await response.json() as { messageId?: string };
      return { 
        success: true, 
        messageId: result.messageId || `msg_${Date.now()}` 
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  parseWebhook(payload: any): WhatsAppMessage | null {
    // Custom webhook parsing - adapt based on your webhook format
    try {
      return {
        id: payload.id || `msg_${Date.now()}`,
        from: payload.from || payload.sender || '',
        to: payload.to || '',
        body: payload.body || payload.message || payload.text || '',
        timestamp: payload.timestamp || new Date().toISOString(),
        type: payload.type || 'text',
        mediaUrl: payload.mediaUrl || payload.media,
        isFromMe: payload.fromMe || false,
      };
    } catch (error) {
      return null;
    }
  }
}

/**
 * Get the appropriate WhatsApp provider
 */
export function getWhatsAppProvider(config: WhatsAppConfig): EvolutionAPIProvider | CustomWebhookProvider {
  switch (config.provider) {
    case 'evolution':
      return new EvolutionAPIProvider(config);
    case 'business_api':
    case 'custom':
    default:
      return new CustomWebhookProvider(config);
  }
}

/**
 * Send WhatsApp message using configured provider
 */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  to: string,
  message: string
): Promise<WhatsAppSendResult> {
  const provider = getWhatsAppProvider(config);
  return provider.sendMessage(to, message);
}

/**
 * Parse incoming WhatsApp webhook
 */
export function parseWhatsAppWebhook(
  config: WhatsAppConfig,
  payload: WhatsAppWebhookPayload
): WhatsAppMessage | null {
  const provider = getWhatsAppProvider(config);
  if (provider instanceof EvolutionAPIProvider) {
    return provider.parseWebhook(payload);
  }
  return (provider as CustomWebhookProvider).parseWebhook(payload);
}
