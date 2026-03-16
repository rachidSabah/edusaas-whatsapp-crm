import express from 'express';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import dotenv from 'dotenv';
import { Boom } from '@hapi/boom';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function connectToWhatsApp() {
    // Store auth info in a local folder
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }) // suppress detailed Baileys logs for now
    });

    // Save credentials whenever they are updated
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates (QR code, connection close, connection open)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = new Boom(lastDisconnect.error)?.output?.statusCode !== 401;
            console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connection opened successfully!');
        }
    });

    // Listen for new messages
    sock.ev.on('messages.upsert', async (m) => {
        console.log(JSON.stringify(m, undefined, 2));
    });
}

app.listen(port, () => {
    console.log(`🚀 WhatsApp Microservice listening on port ${port}`);
    connectToWhatsApp();
});