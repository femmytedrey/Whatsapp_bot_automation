/**
 * Test Script: WhatsApp Connection
 * 
 * Purpose: Verify you can connect to WhatsApp Web via script
 * 
 * What this does:
 * 1. Opens WhatsApp Web connection
 * 2. Shows QR code in terminal
 * 3. You scan with phone
 * 4. Confirms connection successful
 * 
 * Run: npx ts-node test_connection.ts
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// Create WhatsApp client with local authentication
// LocalAuth saves session so you don't need to scan QR every time
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'  // Session saved here
    }),
    puppeteer: {
        headless: false,  // Set to true to hide browser (after testing)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Event: QR Code Generated
client.on('qr', (qr: string) => {
    console.log('📱 QR CODE RECEIVED!');
    console.log('Open WhatsApp on your phone and scan this:\n');
    qrcode.generate(qr, { small: true });
    console.log('\nWaiting for scan...');
});

// Event: Authentication in progress
client.on('authenticated', () => {
    console.log('✅ AUTHENTICATED! Loading WhatsApp...');
});

// Event: Client is ready
client.on('ready', () => {
    console.log('\n🎉 SUCCESS! WhatsApp is connected and ready!');
    console.log('====================================\n');
    
    // Get your own info
    console.log('Your WhatsApp Info:');
    console.log(`Name: ${client.info.pushname}`);
    console.log(`Phone: ${client.info.wid.user}`);
    console.log(`Platform: ${client.info.platform}`);
    
    console.log('\n====================================');
    console.log('✅ Test Complete!');
    console.log('You can now close this (Ctrl+C)');
    console.log('Next: Build the actual bot!');
});

// Event: Disconnected
client.on('disconnected', (reason: string) => {
    console.log('⚠️ Client was disconnected:', reason);
});

// Event: Authentication failure
client.on('auth_failure', (msg: string) => {
    console.error('❌ Authentication failed:', msg);
    console.log('Try deleting the ./session folder and run again');
});

// Error handling
client.on('error', (error: Error) => {
    console.error('❌ Error occurred:', error);
});

// Initialize the client
console.log('Initializing WhatsApp Web client...');
console.log('(Chrome browser will open)\n');

client.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down gracefully...');
    await client.destroy();
    process.exit(0);
});