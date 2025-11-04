import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { PriceParser } from '../priceParser';
import * as fs from 'fs';
import * as path from 'path';

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: { 
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

const VENDOR_NUMBER = '2349067401594@c.us';
const parser = new PriceParser(2.0);

// Create downloads folder if not exists
const DOWNLOADS_FOLDER = './downloads';
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
    fs.mkdirSync(DOWNLOADS_FOLDER);
}

client.on('ready', async () => {
    console.log('✅ Bot Ready! Monitoring vendor...\n');
});

client.on('message_create', async (msg) => {
    if (msg.from === 'status@broadcast') {
        const contact = await msg.getContact();
        
        if (contact.id._serialized === VENDOR_NUMBER) {
            console.log('🎯 VENDOR STATUS!');
            console.log(`Original: ${msg.body}\n`);
            
            // Process caption
            const newCaption = parser.replacePrice(msg.body);
            console.log(`Modified: ${newCaption}`);
            
            // Show price change
            const originalPrice = parser.parsePrice(msg.body);
            if (originalPrice) {
                const newPrice = parser.calculateMarkup(originalPrice);
                const profit = newPrice - originalPrice;
                console.log(`💰 ₦${originalPrice.toLocaleString()} → ₦${newPrice.toLocaleString()}`);
                console.log(`📈 Profit: ₦${profit.toLocaleString()}\n`);
            }
            
            // Download media if exists
            if (msg.hasMedia) {
                console.log('📥 Downloading media...');
                const media = await msg.downloadMedia();
                
                // Save to file
                const filename = `vendor_${Date.now()}.jpg`;
                const filepath = path.join(DOWNLOADS_FOLDER, filename);
                fs.writeFileSync(filepath, media.data, 'base64');
                console.log(`✅ Saved: ${filepath}\n`);
                
                // Post to YOUR status
                console.log('📤 Posting to your status...');
                const mediaMessage = MessageMedia.fromFilePath(filepath);
                
                await client.sendMessage('status@broadcast', mediaMessage, {
                    caption: newCaption
                });
                
                console.log('✅ POSTED TO YOUR STATUS!\n');
                console.log('='.repeat(60) + '\n');
            }
        }
    }
});

client.initialize();

process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...');
    await client.destroy();
    process.exit(0);
});