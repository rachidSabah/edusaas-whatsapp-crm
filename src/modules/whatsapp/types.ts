// WhatsApp Types
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'video';
  mediaUrl?: string;
  isFromMe: boolean;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  pushname?: string;
  profilePicture?: string;
  isGroup: boolean;
}

export interface WhatsAppConfig {
  provider: 'evolution' | 'business-api' | 'custom';
  apiUrl: string;
  apiKey: string;
  instanceId?: string;
  webhookUrl?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppWebhookPayload {
  event: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { caption?: string; url?: string };
      audioMessage?: { url?: string };
      videoMessage?: { caption?: string; url?: string };
    };
    pushName?: string;
    messageTimestamp: number;
  };
  instance?: string;
}

// Provider display info
export const WHATSAPP_PROVIDERS = {
  evolution: {
    name: 'Evolution API',
    description: 'Open source WhatsApp API (self-hosted or cloud)',
    docs: 'https://doc.evolution-api.com',
  },
  business_api: {
    name: 'WhatsApp Business API',
    description: 'Official Meta WhatsApp Business API',
    docs: 'https://developers.facebook.com/docs/whatsapp',
  },
  custom: {
    name: 'Custom Webhook',
    description: 'Custom webhook integration',
    docs: '',
  },
};
