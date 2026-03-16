# WhatsApp Service

This is a standalone WhatsApp service using Baileys (free WhatsApp Web API) that runs as a separate process and provides HTTP endpoints for the main EduSaaS application.

## Features

- **Free WhatsApp Integration**: Uses Baileys library which connects to WhatsApp Web - no API costs
- **QR Code Authentication**: Scan QR code to connect your WhatsApp account
- **Send Messages**: Send WhatsApp messages via HTTP API
- **Receive Messages**: Auto-receive and store incoming messages
- **Auto-Reply**: Basic auto-reply for greeting messages
- **Multi-Organization**: Support for multiple organizations

## Installation

```bash
bun install
```

## Running

```bash
bun run start
# or for development with auto-reload
bun run dev
```

The service runs on port 3030 by default.

## API Endpoints

### POST /connect
Start WhatsApp connection for an organization.

```json
{
  "organizationId": "org_123"
}
```

### GET /status
Get connection status and QR code.

Query params: `organizationId`

Returns:
```json
{
  "status": "connecting" | "connected" | "disconnected",
  "qrCode": "2@abc123...",  // Only when connecting
  "phone": "+1234567890"    // Only when connected
}
```

### POST /send
Send a WhatsApp message.

```json
{
  "organizationId": "org_123",
  "to": "+1234567890",
  "message": "Hello from EduSaaS!"
}
```

### POST /disconnect
Disconnect WhatsApp for an organization.

```json
{
  "organizationId": "org_123"
}
```

### GET /health
Health check endpoint.

## Environment Variables

- `PORT`: Server port (default: 3030)
- `TURSO_DATABASE_URL`: Turso database URL
- `TURSO_AUTH_TOKEN`: Turso authentication token

## Integration with EduSaaS

The main EduSaaS application communicates with this service via HTTP. The WhatsApp send API in the main app automatically tries this service first before falling back to configured providers.

### Starting both services

From the main project:

```bash
# Terminal 1: Start main app
bun run dev

# Terminal 2: Start WhatsApp service
cd mini-services/whatsapp-service && bun run start
```

## Notes

1. **Session Persistence**: Session data is stored in `auth_states/` directory
2. **QR Code Expiry**: QR codes expire after ~20 seconds, new ones are generated automatically
3. **Rate Limiting**: WhatsApp may block numbers that send too many messages
4. **Business Use**: For large-scale business use, consider WhatsApp Business API
