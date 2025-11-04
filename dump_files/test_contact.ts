import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: { headless: false }
});

client.on('ready', async () => {
    console.log('✅ Getting your contacts...\n');
    
    const contacts = await client.getContacts();
    
    // Search for your vendor
    const vendorName = 'Vendor'; // Part of their saved name
    
    const vendors = contacts.filter(c => 
        c.name && c.name.toLowerCase().includes(vendorName.toLowerCase())
    );
    
    console.log('📇 Found contacts:\n');
    vendors.forEach(c => {
        console.log(`Name: ${c.name}`);
        console.log(`Number: ${c.id._serialized}`);
        console.log('---');
    });
    
    process.exit(0);
});

client.initialize();