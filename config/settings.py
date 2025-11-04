"""
Configuration Settings for WhatsApp Auto-Reseller

This file contains all the settings you can adjust:
- Markup percentage
- Keywords
- Safety limits
- etc.
"""

# ============= BUSINESS SETTINGS =============

# Markup percentage (2% = 1.02x original price)
MARKUP_PERCENT = 2.0

# Your vendor's WhatsApp name (as saved in your contacts)
VENDOR_NAME = "Your Vendor Name"  # Change this!

# Your business name (for captions)
YOUR_BUSINESS_NAME = "Femidev Gadgets"


# ============= SAFETY SETTINGS =============

# Maximum posts per day (start conservative!)
MAX_POSTS_PER_DAY = 10

# Delay between posts (in seconds)
MIN_DELAY_SECONDS = 180   # 3 minutes
MAX_DELAY_SECONDS = 600   # 10 minutes

# Operating hours (24-hour format)
OPERATING_START_HOUR = 9   # 9 AM
OPERATING_END_HOUR = 21    # 9 PM

# Check vendor status every X minutes
CHECK_INTERVAL_MINUTES = 15


# ============= GADGET KEYWORDS =============

GADGET_KEYWORDS = [
    # Phone brands
    'iphone', 'samsung', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 
    'redmi', 'oppo', 'tecno', 'infinix', 'huawei', 'nokia', 
    'motorola', 'realme', 'vivo', 'phone',
    
    # Laptop brands & models
    'macbook', 'laptop', 'dell', 'hp', 'lenovo', 'asus', 'acer', 
    'msi', 'alienware', 'thinkpad', 'elitebook', 'pavilion', 
    'inspiron', 'latitude', 'zbook', 'chromebook',
    
    # Audio devices
    'airpod', 'earphone', 'headphone', 'earbud', 'speaker', 
    'jbl', 'beats', 'bose', 'sony',
    
    # Wearables
    'smartwatch', 'apple watch', 'galaxy watch', 'fitbit', 'smart watch',
    
    # Tablets
    'ipad', 'tablet', 'tab',
    
    # Gaming
    'ps5', 'ps4', 'playstation', 'xbox', 'nintendo', 'switch', 'console',
    
    # Accessories
    'charger', 'powerbank', 'power bank', 'cable', 'adapter', 
    'case', 'screen protector',
    
    # General tech terms
    'smart', 'wireless', 'bluetooth', 'brand new', 'sealed', 
    'original', 'unlocked', 'storage',
    
    # Specs indicators (VERY important!)
    'gb', 'tb', 'ram', 'ssd', 'inch', 'display', 'processor', 
    'core', 'camera', 'battery', 'mah'
]

# Skip these (non-gadget posts)
SKIP_KEYWORDS = [
    'meme', 'joke', 'funny', 'lol', 'haha',
    'quote', 'motivation', 'prayer', 'amen', 
    'good morning', 'good night', 'happy birthday', 'congratulations',
    'food', 'shawarma', 'pizza', 'rice', 'jollof', 'chicken',
    'clothes', 'shoe', 'bag', 'dress', 'shirt', 'trouser', 'fashion',
    'service', 'hiring', 'job', 'vacancy'
]

# Minimum price for gadgets (anything below is probably not a gadget)
MIN_GADGET_PRICE = 10000  # ₦10,000


# ============= FILE PATHS =============

SESSION_PATH = './whatsapp/session'
DATA_PATH = './data'
OUTPUT_PATH = './output'
LOGS_PATH = './data/logs'


# ============= CUSTOM KEYWORDS (ADD YOUR OWN) =============

# Add any specific product names your vendor uses
CUSTOM_KEYWORDS = [
    # Example:
    # 'google pixel',
    # 'nest hub',
    # 'ring doorbell',
]

# Combine all keywords
ALL_GADGET_KEYWORDS = GADGET_KEYWORDS + CUSTOM_KEYWORDS