import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: { 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', async () => {
    console.log('✅ Connected!\n');
    
    // Check account info
    console.log('=== ACCOUNT INFO ===');
    console.log('Name:', client.info.pushname);
    console.log('Phone:', client.info.wid.user);
    console.log('Platform:', client.info.platform);
    
    // Access properties that might not be in types
    const info: any = client.info;
    console.log('Is Business:', info.isBusiness || 'Unknown');
    console.log('WhatsApp Version:', info.wa_version || 'Unknown');
    console.log('\nFull Info:', JSON.stringify(client.info, null, 2));
    
    // Try to get status capability
    console.log('\n=== TESTING STATUS CAPABILITY ===');
    
    try {
        // Test sending to yourself first
        const myNumber = `${client.info.wid.user}@c.us`;
        console.log('\nTest 1: Sending message to yourself...');
        await client.sendMessage(myNumber, 'Test message 🤖');
        console.log('✅ Self-message works!');
        
        // Test status
        console.log('\nTest 2: Attempting status post...');
        const result = await client.sendMessage('status@broadcast', 'Test status from diagnostic script');
        console.log('✅ Status command sent');
        console.log('Result ID:', result.id._serialized);
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
    
    console.log('\n=== NOW CHECK YOUR WHATSAPP ===');
    console.log('1. Check if you got a message from yourself');
    console.log('2. Check your Status tab');
    console.log('3. Look for "Test status from diagnostic script"');
});

client.initialize();

process.on('SIGINT', async () => {
    await client.destroy();
    process.exit(0);
});