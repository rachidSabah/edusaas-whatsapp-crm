/**
 * WhatsApp Baileys Service - Improved Implementation
 * Supports QR code generation and session management
 */

import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import dotenv from 'dotenv';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Store active sessions
const sessions = new Map();

/**
 * Generate QR code and return as data URL
 */
async function generateQRCode(sessionId) {
  try {
    const qrDataUrl = await QRCode.toDataURL(sessionId);
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

/**
 * Connect to WhatsApp using Baileys
 */
async function connectToWhatsApp(sessionId) {
  const authPath = path.join(process.cwd(), `auth_info_${sessionId}`);
  
  // Create auth directory if it doesn't exist
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Don't print in terminal, we'll handle it via API
    logger: pino({ level: 'silent' }),
    browser: ['EduSaaS', 'Safari', '1.0.0'],
  });

  // Save credentials whenever they are updated
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Store QR code
    if (qr) {
      try {
        const qrDataUrl = await generateQRCode(qr);
        sessions.set(sessionId, {
          ...sessions.get(sessionId),
          qr: qrDataUrl,
          qrRaw: qr,
          status: 'waiting_for_scan',
        });
        console.log(`✅ QR Code generated for session: ${sessionId}`);
      } catch (error) {
        console.error('Error storing QR code:', error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== 401;
      console.log(`Connection closed: ${lastDisconnect?.error}, Reconnecting: ${shouldReconnect}`);
      
      sessions.set(sessionId, {
        ...sessions.get(sessionId),
        status: 'disconnected',
        connected: false,
      });

      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(sessionId), 3000);
      } else {
        // Clean up auth files on logout
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true });
        }
      }
    } else if (connection === 'open') {
      console.log(`✅ WhatsApp connection opened for session: ${sessionId}`);
      
      const phoneNumber = sock.user?.id?.split(':')[0];
      sessions.set(sessionId, {
        ...sessions.get(sessionId),
        status: 'connected',
        connected: true,
        phoneNumber,
        socket: sock,
      });
    }
  });

  // Listen for new messages
  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    if (!message.key.fromMe) {
      console.log(`📨 New message from ${message.key.remoteJid}:`, message.message?.conversation);
      
      // Emit event or send to webhook
      // This can be integrated with your backend API
    }
  });

  // Store session
  sessions.set(sessionId, {
    sessionId,
    socket: sock,
    status: 'connecting',
    connected: false,
    createdAt: new Date(),
  });

  return sock;
}

/**
 * API Endpoints
 */

// Get QR code for a session
app.get('/api/qr/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.qr) {
    return res.status(202).json({ 
      status: 'waiting',
      message: 'QR code not yet generated, please wait...' 
    });
  }

  res.json({
    sessionId,
    qr: session.qr,
    status: session.status,
    connected: session.connected,
  });
});

// Create a new session
app.post('/api/session/create', async (req, res) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start connection
    await connectToWhatsApp(sessionId);

    res.json({
      success: true,
      sessionId,
      message: 'Session created, QR code will be available shortly',
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session status
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    status: session.status,
    connected: session.connected,
    phoneNumber: session.phoneNumber || null,
    createdAt: session.createdAt,
  });
});

// Send message
app.post('/api/message/send', async (req, res) => {
  try {
    const { sessionId, to, message } = req.body;

    if (!sessionId || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = sessions.get(sessionId);
    if (!session || !session.socket || !session.connected) {
      return res.status(400).json({ error: 'Session not connected' });
    }

    // Format phone number
    const formattedTo = to.replace(/[^0-9]/g, '');
    const jid = `${formattedTo}@s.whatsapp.net`;

    // Send message
    const result = await session.socket.sendMessage(jid, { text: message });

    res.json({
      success: true,
      messageId: result.key.id,
      to: formattedTo,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Disconnect session
app.post('/api/session/:sessionId/disconnect', (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.socket) {
    session.socket.end();
  }

  sessions.delete(sessionId);

  res.json({ success: true, message: 'Session disconnected' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 WhatsApp Baileys Service listening on port ${port}`);
  console.log(`📱 API Endpoints:`);
  console.log(`  - POST /api/session/create - Create new session`);
  console.log(`  - GET /api/qr/:sessionId - Get QR code`);
  console.log(`  - GET /api/session/:sessionId - Get session status`);
  console.log(`  - POST /api/message/send - Send message`);
  console.log(`  - POST /api/session/:sessionId/disconnect - Disconnect session`);
});
