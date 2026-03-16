import QRCode from 'qrcode';
import { writeFileSync } from 'fs';

// Get fresh QR code from WhatsApp service
async function main() {
  try {
    // Get fresh QR code
    const statusRes = await fetch('http://localhost:3030/status?organizationId=org_001');
    const status = await statusRes.json() as { status: string; qrCode?: string };
    
    if (!status.qrCode) {
      console.log('No QR code available. Status:', status.status);
      return;
    }
    
    const qrCodeData = status.qrCode;
    
    // Generate QR code as data URL
    const url = await QRCode.toDataURL(qrCodeData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    // Save as HTML file
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR Code - EduSaaS</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #25D366; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 30px; }
    img { border-radius: 10px; max-width: 100%; }
    .note { font-size: 14px; color: #999; margin-top: 20px; line-height: 1.6; }
    .refresh { margin-top: 20px; padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 WhatsApp QR Code</h1>
    <p>Scan this QR code with your WhatsApp mobile app</p>
    <img src="${url}" alt="WhatsApp QR Code" />
    <p class="note">
      <strong>Instructions:</strong><br>
      1. Open WhatsApp on your phone<br>
      2. Go to Settings → Linked Devices<br>
      3. Tap "Link a Device"<br>
      4. Scan the QR code above
    </p>
    <button class="refresh" onclick="location.reload()">🔄 Refresh QR Code</button>
  </div>
</body>
</html>
    `;
    
    writeFileSync('/home/z/my-project/download/whatsapp-qr.html', html);
    console.log('✅ QR code saved to /home/z/my-project/download/whatsapp-qr.html');
    
    // Also save as PNG
    const pngBuffer = await QRCode.toBuffer(qrCodeData, {
      width: 400,
      margin: 2
    });
    writeFileSync('/home/z/my-project/download/whatsapp-qr.png', pngBuffer);
    console.log('✅ QR code PNG saved to /home/z/my-project/download/whatsapp-qr.png');
    
    // Generate terminal QR
    const terminalQR = await QRCode.toString(qrCodeData, { type: 'terminal', small: true });
    console.log('\n' + '='.repeat(60));
    console.log('        📱 WHATSAPP QR CODE - SCAN TO CONNECT');
    console.log('='.repeat(60));
    console.log(terminalQR);
    console.log('─'.repeat(60));
    console.log('  Scan this QR code with WhatsApp to connect!');
    console.log('─'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
