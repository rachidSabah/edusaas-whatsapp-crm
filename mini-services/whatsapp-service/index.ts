/**
 * WhatsApp Service using Baileys
 * 
 * This service handles WhatsApp Web connections for sending/receiving messages.
 * It runs as a separate Node.js process and communicates with the main app via HTTP API.
 */

// Import Baileys - using require style for CommonJS compatibility
import baileys from '@whiskeysockets/baileys';
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  DisconnectReason
} = baileys;

import { Boom } from '@hapi/boom';
import P from 'pino';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3030;
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

// Logger
const logger = P({ level: 'silent' }, 'error');

// Store connections per organization
const connections = new Map<string, {
  socket: any;
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  phone?: string;
}>();

// Pending QR codes for organizations
const pendingQRCodes = new Map<string, string>();

/**
 * Get Turso credentials with fallback
 */
function getTursoCredentials() {
  // Fallback credentials
  const fallbackUrl = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
  const fallbackToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDAwMjQ3MTAsImlkIjoiMDE5NmFhYjktMTMwYS03NDc2LTk3Y2MtMTcxZjYzYzI5YmJhIiwicmlkIjoiNjczYjQxNTItYmI1Yy00MTI0LTlmZTUtYTU2MzVlMDIzODNlIn0.I8hmDhMdlI8XZ_7HsJ7m6n3YQ7PxQBZCG6XzF4I2elL-6N1FqFM5rWPlqDIdkWnNlR6U7gkHPXVvTtXsAQjBAg';
  
  return {
    url: TURSO_URL || fallbackUrl,
    token: TURSO_TOKEN || fallbackToken
  };
}

/**
 * Execute SQL query against Turso via HTTP
 */
async function tursoQuery<T = Record<string, any>>(sql: string, args: any[] = []): Promise<T[]> {
  const { url, token } = getTursoCredentials();
  
  const httpUrl = url.startsWith('libsql://') 
    ? url.replace('libsql://', 'https://')
    : url;

  // Format arguments for Turso HTTP API
  const formattedArgs = args.map(arg => {
    if (arg === null || arg === undefined) return { type: 'null' };
    if (typeof arg === 'string') return { type: 'text', value: arg };
    if (typeof arg === 'number') return { type: arg % 1 === 0 ? 'integer' : 'float', value: String(arg) };
    if (typeof arg === 'boolean') return { type: 'integer', value: arg ? '1' : '0' };
    return { type: 'text', value: String(arg) };
  });

  const response = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: formattedArgs,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Turso error: ${response.status} - ${text}`);
  }

  const result = await response.json() as {
    results: Array<{
      response: {
        result: {
          cols: Array<{ name: string }>;
          rows: Array<Array<{ type: string; value?: string | number | null }>>;
        };
      };
    }>;
  };

  const cols = result?.results?.[0]?.response?.result?.cols;
  const rows = result?.results?.[0]?.response?.result?.rows;

  if (!cols || !rows) return [];

  return rows.map((row) => {
    const obj: Record<string, any> = {};
    cols.forEach((col, i) => {
      const cell = row[i];
      if (cell?.type === 'null') {
        obj[col.name] = null;
      } else if (cell?.type === 'integer') {
        obj[col.name] = parseInt(cell.value as string, 10);
      } else if (cell?.type === 'float') {
        obj[col.name] = parseFloat(cell.value as string);
      } else {
        obj[col.name] = cell?.value ?? null;
      }
    });
    return obj as T;
  });
}

/**
 * Execute SQL statement against Turso
 */
async function tursoExecute(sql: string, args: any[] = []): Promise<void> {
  await tursoQuery(sql, args);
}

/**
 * Start WhatsApp connection for an organization
 */
async function startWhatsAppConnection(organizationId: string): Promise<void> {
  // Check if already connected
  const existing = connections.get(organizationId);
  if (existing && existing.status === 'connected') {
    return;
  }

  // Create auth state directory
  const authDir = join(__dirname, 'auth_states', organizationId);
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state as any,
    logger,
    printQRInTerminal: true,
    browser: ['EduSaaS', 'Chrome', '1.0.0'],
  });

  connections.set(organizationId, {
    socket,
    status: 'connecting',
  });

  // Save credentials when updated
  socket.ev.on('creds.update', saveCreds);

  // Handle connection updates
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const conn = connections.get(organizationId);

    if (qr) {
      // Generate QR code in terminal
      qrcodeTerminal.generate(qr, { small: true });
      
      // Generate Data URL for frontend
      const qrDataUrl = await QRCode.toDataURL(qr);
      
      // Store QR for API access
      pendingQRCodes.set(organizationId, qrDataUrl);
      
      if (conn) {
        conn.qrCode = qrDataUrl;
      }

      // Update database with QR code for frontend
      await tursoExecute(
        `UPDATE organizations SET whatsappQRCode = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [qrDataUrl, organizationId]
      );
      
      await tursoExecute(
        `UPDATE whatsapp_accounts SET qrCode = ?, updatedAt = CURRENT_TIMESTAMP WHERE organizationId = ?`,
        [qrDataUrl, organizationId]
      );

      console.log(`[Org ${organizationId}] QR Code generated and saved to DB`);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log(`[Org ${organizationId}] Connection closed. Reconnecting: ${shouldReconnect}`);
      
      if (conn) {
        conn.status = 'disconnected';
        conn.qrCode = undefined;
      }
      
      pendingQRCodes.delete(organizationId);

      // Update database
      await tursoExecute(
        `UPDATE organizations SET whatsappConnected = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [organizationId]
      );

      if (shouldReconnect) {
        // Reconnect after delay
        setTimeout(() => startWhatsAppConnection(organizationId), 5000);
      }
    } else if (connection === 'open') {
      console.log(`[Org ${organizationId}] WhatsApp connected!`);
      
      if (conn) {
        conn.status = 'connected';
        conn.qrCode = undefined;
        
        // Get phone number
        try {
          const user = socket.user;
          if (user) {
            conn.phone = user.id.split(':')[0];
          }
        } catch (e) {
          // Ignore
        }
      }
      
      pendingQRCodes.delete(organizationId);

      // Update database
      await tursoExecute(
        `UPDATE organizations SET whatsappConnected = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [organizationId]
      );
    }
  });

  // Handle incoming messages
  socket.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key?.fromMe && msg.message) {
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || '';
        
        console.log(`[Org ${organizationId}] Message from ${sender}: ${text}`);
        
        // Store message in database
        try {
          // Find or create contact
          let contacts = await tursoQuery<{ id: string }>(
            `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
            [organizationId, sender]
          );

          let contactId: string;
          if (contacts.length === 0) {
            contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await tursoExecute(
              `INSERT INTO contacts (id, organizationId, phone, tags) VALUES (?, ?, ?, 'PROSPECT')`,
              [contactId, organizationId, sender]
            );
          } else {
            contactId = contacts[0].id;
          }

          // Find or create conversation
          let conversations = await tursoQuery<{ id: string }>(
            `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
            [organizationId, contactId]
          );

          let conversationId: string;
          if (conversations.length === 0) {
            conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await tursoExecute(
              `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
              [conversationId, organizationId, contactId]
            );
          } else {
            conversationId = conversations[0].id;
          }

          // Store message
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await tursoExecute(
            `INSERT INTO messages (id, organizationId, conversationId, content, direction, status, whatsappId)
             VALUES (?, ?, ?, ?, 'inbound', 'delivered', ?)`,
            [msgId, organizationId, conversationId, text, msg.key.id]
          );

          // Update conversation
          await tursoExecute(
            `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [conversationId]
          );

          // Check for auto-reply
          const orgSettings = await tursoQuery<{ aiEnabled: number }>(
            `SELECT aiEnabled FROM organizations WHERE id = ?`,
            [organizationId]
          );

          if (orgSettings[0]?.aiEnabled === 1) {
            // Check if we should auto-reply (simple greeting detection)
            const lowerText = text.toLowerCase();
            if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'bonjour' || lowerText === 'salut') {
              const reply = 'Bonjour! Merci pour votre message. Un conseiller vous répondra dans les plus brefs délais.';
              
              await socket.sendMessage(sender, { text: reply });
              
              // Store reply
              const replyMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await tursoExecute(
                `INSERT INTO messages (id, organizationId, conversationId, content, direction, status, isAiGenerated)
                 VALUES (?, ?, ?, ?, 'outbound', 'sent', 1)`,
                [replyMsgId, organizationId, conversationId, reply]
              );
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    }
  });
}

/**
 * Send a message to a phone number
 */
async function sendMessage(organizationId: string, to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const conn = connections.get(organizationId);
  
  if (!conn || conn.status !== 'connected') {
    return { success: false, error: 'WhatsApp not connected for this organization' };
  }

  try {
    // Format phone number (add @s.whatsapp.net if not present)
    const jid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    
    await conn.socket.sendMessage(jid, { text: message });
    
    // Store in database
    // Find or create contact
    let contacts = await tursoQuery<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [organizationId, to]
    );

    let contactId: string;
    if (contacts.length === 0) {
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await tursoExecute(
        `INSERT INTO contacts (id, organizationId, phone, tags) VALUES (?, ?, ?, 'PROSPECT')`,
        [contactId, organizationId, to]
      );
    } else {
      contactId = contacts[0].id;
    }

    // Find or create conversation
    let conversations = await tursoQuery<{ id: string }>(
      `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
      [organizationId, contactId]
    );

    let conversationId: string;
    if (conversations.length === 0) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await tursoExecute(
        `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
        [conversationId, organizationId, contactId]
      );
    } else {
      conversationId = conversations[0].id;
    }

    // Store message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await tursoExecute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status)
       VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
      [msgId, organizationId, conversationId, message]
    );

    // Update conversation
    await tursoExecute(
      `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );

    return { success: true };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get connection status
 */
function getConnectionStatus(organizationId: string) {
  const conn = connections.get(organizationId);
  const qr = pendingQRCodes.get(organizationId);
  
  return {
    status: conn?.status || 'disconnected',
    qrCode: qr,
    phone: conn?.phone,
  };
}

// HTTP Server for API
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Connect to WhatsApp for organization
    if (path === '/connect' && request.method === 'POST') {
      const body = await request.json() as { organizationId: string };
      await startWhatsAppConnection(body.organizationId);
      return Response.json({ success: true, message: 'Connecting to WhatsApp...' });
    }

    // Get connection status
    if (path === '/status' && request.method === 'GET') {
      const organizationId = url.searchParams.get('organizationId');
      if (!organizationId) {
        return Response.json({ error: 'organizationId required' }, { status: 400 });
      }
      return Response.json(getConnectionStatus(organizationId));
    }

    // Send message
    if (path === '/send' && request.method === 'POST') {
      const body = await request.json() as { organizationId: string; to: string; message: string };
      
      if (!body.organizationId || !body.to || !body.message) {
        return Response.json({ error: 'organizationId, to, and message required' }, { status: 400 });
      }
      
      const result = await sendMessage(body.organizationId, body.to, body.message);
      return Response.json(result);
    }

    // Disconnect
    if (path === '/disconnect' && request.method === 'POST') {
      const body = await request.json() as { organizationId: string };
      const conn = connections.get(body.organizationId);
      
      if (conn) {
        await conn.socket.end();
        connections.delete(body.organizationId);
        pendingQRCodes.delete(body.organizationId);
        
        await tursoExecute(
          `UPDATE organizations SET whatsappConnected = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [body.organizationId]
        );
      }
      
      return Response.json({ success: true });
    }

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok', connections: connections.size });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Request error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// Start server
import { createServer } from 'http';

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Read body for POST requests
    let body = {};
    if (req.method === 'POST') {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString();
      if (data) body = JSON.parse(data);
    }

    // Mock Request object for handleRequest
    const mockRequest = {
      method: req.method,
      url: url.toString(),
      json: async () => body
    };

    const response = await handleRequest(mockRequest as any);
    const responseData = await response.json();
    
    res.writeHead(response.status || 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseData));
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});

server.listen(PORT, () => {
  console.log(`WhatsApp Service running on http://localhost:${PORT}`);
});
console.log('API Endpoints:');
console.log('  POST /connect     - Start WhatsApp connection');
console.log('  GET  /status     - Get connection status');
console.log('  POST /send       - Send message');
console.log('  POST /disconnect - Disconnect');
console.log('  GET  /health     - Health check');
