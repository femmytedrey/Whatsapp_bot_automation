export class GadgetFilter {
    private gadgetKeywords: string[];
    private skipKeywords: string[];
    private minGadgetPrice: number;

    constructor() {
        // Keywords that indicate a gadget post
        this.gadgetKeywords = [
            // Phone brands
            'iphone', 'samsung', 'galaxy', 'pixel', 'oneplus', 'xiaomi',
            'redmi', 'oppo', 'tecno', 'infinix', 'huawei', 'nokia',
            'motorola', 'realme', 'vivo', 'phone', 'android',
            
            // Laptop brands
            'macbook', 'laptop', 'dell', 'hp', 'lenovo', 'asus', 'acer',
            'msi', 'alienware', 'thinkpad', 'elitebook', 'pavilion',
            'inspiron', 'latitude', 'zbook', 'chromebook',
            
            // Audio devices
            'airpod', 'earphone', 'headphone', 'earbud', 'speaker',
            'jbl', 'beats', 'bose', 'sony', 'airbuds',
            
            // Wearables
            'smartwatch', 'apple watch', 'galaxy watch', 'fitbit',
            'smart watch', 'watch',
            
            // Tablets
            'ipad', 'tablet', 'tab',
            
            // Gaming
            'ps5', 'ps4', 'playstation', 'xbox', 'nintendo', 'switch',
            'console', 'gaming',
            
            // Accessories
            'charger', 'powerbank', 'power bank', 'cable', 'adapter',
            'case', 'screen protector', 'pod',
            
            // Tech terms
            'smart', 'wireless', 'bluetooth', 'brand new', 'sealed',
            'original', 'unlocked', 'storage', 'uk used', 'tokunbo',
            
            // Specs (VERY important!)
            'gb', 'tb', 'ram', 'ssd', 'inch', 'display', 'processor',
            'core', 'camera', 'battery', 'mah', 'mp'
        ];

        // Keywords that indicate NOT a gadget post
        this.skipKeywords = [
            'meme', 'joke', 'funny', 'lol', 'haha', '😂',
            'quote', 'motivation', 'motivational', 'prayer', 'amen',
            'good morning', 'good night', 'goodmorning', 'goodnight',
            'happy birthday', 'birthday', 'congratulations', 'congrats',
            'food', 'shawarma', 'pizza', 'rice', 'jollof', 'chicken',
            'clothes', 'clothing', 'shoe', 'shoes', 'bag', 'dress',
            'shirt', 'trouser', 'fashion', 'ankara', 'fabric',
            'service', 'hiring', 'job', 'vacancy', 'recruit',
            'church', 'mosque', 'god', 'jesus', 'allah',
            'follow', 'follower', 'like', 'comment', 'share'
        ];

        // Minimum price to be considered a gadget (₦10,000)
        this.minGadgetPrice = 10000;
    }

    /**
     * Check if caption is about gadgets
     */
    public isGadget(caption: string): boolean {
        if (!caption || caption.trim().length === 0) {
            return false;
        }

        const captionLower = caption.toLowerCase();

        // Step 1: Check for skip keywords (immediate disqualification)
        for (const skipWord of this.skipKeywords) {
            if (captionLower.includes(skipWord)) {
                console.log(`❌ Skip keyword detected: "${skipWord}"`);
                return false;
            }
        }

        // Step 2: Must have a price
        const hasPrice = this.hasValidPrice(caption);
        if (!hasPrice) {
            console.log('❌ No valid price found');
            return false;
        }

        // Step 3: Check for gadget keywords
        const hasGadgetKeyword = this.hasGadgetKeywords(captionLower);

        // Step 4: Check for product spec patterns
        const hasSpecPattern = this.hasProductSpecPatterns(captionLower);

        // Step 5: Decision - must have keywords OR spec patterns
        const isGadget = hasGadgetKeyword || hasSpecPattern;

        if (isGadget) {
            console.log('✅ Gadget detected!');
        } else {
            console.log('❌ Not a gadget (no keywords or specs)');
        }

        return isGadget;
    }

    /**
     * Check if text has valid gadget price
     */
    private hasValidPrice(text: string): boolean {
        // Price patterns
        const patterns = [
            /₦\s*[\d,]+/,                          // ₦1,000,000
            /\d+\.?\d*\s*[kmb]\b/i,               // 450k, 1.5m
            /(price|cost|amount)[\s:]+[\d,kmb]+/i // Price: 450k
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                // Extract numeric value
                const priceStr = match[0];
                const value = this.extractNumericPrice(priceStr);
                
                if (value && value >= this.minGadgetPrice) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract numeric value from price string
     */
    private extractNumericPrice(priceStr: string): number | null {
        const lower = priceStr.toLowerCase();

        // Handle abbreviated format (450k, 1.5m)
        const abbrevMatch = lower.match(/(\d+\.?\d*)\s*([kmb])/);
        if (abbrevMatch) {
            const number = parseFloat(abbrevMatch[1]);
            const suffix = abbrevMatch[2];

            const multipliers: { [key: string]: number } = {
                'k': 1000,
                'm': 1000000,
                'b': 1000000000
            };

            return number * multipliers[suffix];
        }

        // Handle formatted price (1,000,000)
        const formatted = priceStr.replace(/[₦N,\s]/g, '');
        const value = parseFloat(formatted);

        return isNaN(value) ? null : value;
    }

    /**
     * Check if text contains gadget keywords
     */
    private hasGadgetKeywords(text: string): boolean {
        for (const keyword of this.gadgetKeywords) {
            if (text.includes(keyword)) {
                console.log(`  ✓ Keyword found: "${keyword}"`);
                return true;
            }
        }
        return false;
    }

    /**
     * Check for product specification patterns
     */
    private hasProductSpecPatterns(text: string): boolean {
        const patterns = [
            // Storage: 128GB, 256GB, 512GB, 1TB
            /\d+(gb|tb)\s*(storage|ssd|ram)?/i,
            
            // Phone models: iPhone 15, Galaxy S23
            /(iphone|galaxy|pixel)\s*(1[0-9]|[5-9])/i,
            
            // Screen size: 6.7", 15.6 inch
            /\d+\.?\d*\s*(inch|"|')/i,
            
            // Processor: i5, i7, M1, M2
            /(i[3579]|m[123]|ryzen|snapdragon|core)/i,
            
            // Camera: 48MP, 108MP
            /\d+\s*mp\s*(camera)?/i,
            
            // Battery: 5000mAh
            /\d+\s*mah/i
        ];

        for (const pattern of patterns) {
            if (pattern.test(text)) {
                console.log(`  ✓ Spec pattern matched: ${pattern}`);
                return true;
            }
        }

        return false;
    }

    /**
     * Add custom gadget keywords (for specific products)
     */
    public addGadgetKeywords(keywords: string[]): void {
        this.gadgetKeywords.push(...keywords.map(k => k.toLowerCase()));
    }

    /**
     * Add custom skip keywords (for specific non-products)
     */
    public addSkipKeywords(keywords: string[]): void {
        this.skipKeywords.push(...keywords.map(k => k.toLowerCase()));
    }
}

// ============= TESTING =============

if (require.main === module) {
    const filter = new GadgetFilter();

    console.log('='.repeat(60));
    console.log('GADGET FILTER TEST');
    console.log('='.repeat(60));

    const testCases = [
        // Should PASS ✅
        { caption: 'iPhone 15 Pro Max 256gb 1.5m', expected: true },
        { caption: 'Samsung Galaxy S23 Ultra 850k', expected: true },
        { caption: 'MacBook Air M2 chip 1.8m available', expected: true },
        { caption: 'PS5 + 2 controllers 650k', expected: true },
        { caption: 'Dell Laptop i7 16gb ram 420k', expected: true },
        { caption: '12 Pro Max 256gb 1m sealed', expected: true },
        
        // Should FAIL ❌
        { caption: 'This meme is hilarious 😂😂', expected: false },
        { caption: 'Good morning fam ❤️', expected: false },
        { caption: 'Happy birthday boss! 🎉', expected: false },
        { caption: 'Motivational quote for today', expected: false },
        { caption: 'Fresh jollof rice ₦2,500', expected: false },
        { caption: 'Follow me for more updates', expected: false },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
        console.log(`\nTest: "${test.caption}"`);
        console.log(`Expected: ${test.expected ? 'GADGET' : 'NOT GADGET'}`);
        
        const result = filter.isGadget(test.caption);
        const correct = result === test.expected;

        if (correct) {
            console.log('✅ PASS');
            passed++;
        } else {
            console.log(`❌ FAIL (got ${result})`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
}