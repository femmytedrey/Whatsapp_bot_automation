"""
Nigerian Price Parser Module

Handles all Nigerian price formats:
- 450k → 450,000
- 1m → 1,000,000
- 4.5m → 4,500,000
- ₦1,500,000 → 1,500,000
"""

import re
from typing import List, Tuple, Optional
import math


class NigerianPriceParser:
    """Parse and manipulate Nigerian price formats"""
    
    def __init__(self, markup_percent: float = 2.0):
        self.markup_percent = markup_percent
        
        # All possible price patterns
        self.patterns = [
            # Format: 450k, 1m, 4.5m
            r'(?:₦|N|NGN|naira)?\s*(\d+\.?\d*)\s*([kmb])\b',
            
            # Format: ₦1,000,000 or 1,000,000
            r'(?:₦|N|NGN)?\s*([\d,]{4,})',
            
            # Format: Price: 450k
            r'(?:price|cost|amount)[\s:]+(?:₦|N)?\s*(\d+\.?\d*)\s*([kmb])?',
        ]
    
    def parse_abbreviated(self, price_str: str) -> Optional[float]:
        """
        Convert abbreviated prices to numeric
        
        Examples:
            450k → 450000
            1m → 1000000
            4.5m → 4500000
        """
        price_str = price_str.lower().strip()
        
        # Find number and suffix
        match = re.search(r'(\d+\.?\d*)\s*([kmb])', price_str)
        if not match:
            return None
        
        number = float(match.group(1))
        suffix = match.group(2)
        
        multipliers = {
            'k': 1_000,
            'm': 1_000_000,
            'b': 1_000_000_000
        }
        
        return number * multipliers.get(suffix, 1)
    
    def parse_formatted(self, price_str: str) -> Optional[float]:
        """
        Convert formatted prices to numeric
        
        Examples:
            1,000,000 → 1000000
            ₦450,000 → 450000
        """
        # Remove currency symbols and commas
        number_str = re.sub(r'[₦N,\s]', '', price_str)
        
        try:
            return float(number_str)
        except ValueError:
            return None
    
    def find_all_prices(self, text: str) -> List[Tuple[str, float]]:
        """
        Find ALL prices in text
        
        Returns: [(original_string, numeric_value), ...]
        
        Example:
            Input: "iPhone 450k MacBook 1.5m"
            Output: [("450k", 450000), ("1.5m", 1500000)]
        """
        prices = []
        text_lower = text.lower()
        
        for pattern in self.patterns:
            matches = re.finditer(pattern, text_lower, re.IGNORECASE)
            
            for match in matches:
                original = match.group(0)
                
                # Try abbreviated format
                if re.search(r'[kmb]', original):
                    value = self.parse_abbreviated(original)
                else:
                    # Try formatted price
                    value = self.parse_formatted(original)
                
                # Only include valid prices (> 1000)
                if value and value >= 1000:
                    prices.append((original.strip(), value))
        
        # Remove duplicates, sort by value
        seen_values = set()
        unique_prices = []
        for orig, val in prices:
            if val not in seen_values:
                seen_values.add(val)
                unique_prices.append((orig, val))
        
        unique_prices.sort(key=lambda x: x[1], reverse=True)
        return unique_prices
    
    def format_price(self, value: float, style: str = 'auto') -> str:
        """
        Format numeric value to Nigerian style
        
        Styles:
            'auto': Smart formatting based on value
            'full': ₦1,500,000
            'abbreviated': 450k or 1.5m
        """
        if style == 'full':
            return f"₦{value:,.0f}"
        
        elif style == 'abbreviated' or style == 'auto':
            # Use abbreviated for common formats
            if value >= 1_000_000:
                # Format millions
                if value % 1_000_000 == 0:
                    return f"{int(value / 1_000_000)}m"
                else:
                    return f"{value / 1_000_000:.1f}m".rstrip('0').rstrip('.')
            
            elif value >= 1_000:
                # Format thousands
                if value % 1_000 == 0:
                    return f"{int(value / 1_000)}k"
                else:
                    return f"{value / 1_000:.1f}k".rstrip('0').rstrip('.')
            
            else:
                return f"₦{value:,.0f}"
        
        return f"₦{value:,.0f}"
    
    def calculate_markup(self, original: float) -> float:
        """
        Calculate new price with markup
        
        Example:
            original: 450000, markup: 2%
            returns: 459000
        """
        new_price = original * (1 + self.markup_percent / 100)

        # if new_price % 1000 == 0:
        #     return new_price
        
        # final_price = math.ceil(new_price / 1000) * 1000
        # return final_price
        
        # Round to nice numbers
        if new_price >= 1_000_000:
            # Round UP to nearest 10k
            return math.ceil(new_price / 10_000) * 10_000
        elif new_price >= 100_000:
            # Round UP to nearest 1k
            return math.ceil(new_price / 1_000) * 1_000
        else:
            # Round UP to nearest 100
            return math.ceil(new_price / 100) * 100
    
    def replace_prices(self, text: str) -> str:
        """
        Find all prices and replace with marked-up versions
        
        Example:
            Input: "iPhone 12 450k available"
            Output: "iPhone 12 459k available"
        """
        prices = self.find_all_prices(text)
        
        if not prices:
            return text
        
        new_text = text
        
        # Replace each price (reverse order to preserve positions)
        for original_str, original_value in reversed(prices):
            # Calculate new price
            new_value = self.calculate_markup(original_value)
            
            # Match format style of original
            if 'k' in original_str.lower() or 'm' in original_str.lower():
                new_str = self.format_price(new_value, 'abbreviated')
            else:
                new_str = self.format_price(new_value, 'full')
            
            # Preserve currency symbol if present
            if '₦' in original_str:
                if '₦' not in new_str:
                    new_str = '₦' + new_str
            
            # Replace in text
            new_text = new_text.replace(original_str, new_str, 1)
        
        return new_text


# ============= TESTING CODE =============

def test_price_parser():
    """Test the price parser with real examples"""
    
    parser = NigerianPriceParser(markup_percent=2.0)
    
    print("="*60)
    print("NIGERIAN PRICE PARSER - TEST")
    print("="*60)
    
    # Test cases (real vendor captions)
    test_cases = [
        "iPhone 12 64gb 450k",
        "12 Pro Max 256gb 1m",
        "Samsung S23 Ultra 850k available",
        "MacBook Pro M2 4.5m DM",
        "AirPods Pro 85k sealed",
        "HP Laptop 16gb ram 420k nego",
        "PS5 + 2 pads 650k",
        "Dell Inspiron i7 ₦450,000",
        "iPhone 15 Pro Max 1.8m brand new",
        "Gaming laptop 1.2m negotiable",
    ]
    
    print("\nTEST: Price Replacement (2% markup)")
    print("-"*60)
    
    for caption in test_cases:
        new_caption = parser.replace_prices(caption)
        
        if caption != new_caption:
            print(f"\n✅ PROCESSED:")
            print(f"   Original: {caption}")
            print(f"   Modified: {new_caption}")
            
            # Show price change
            old_prices = parser.find_all_prices(caption)
            new_prices = parser.find_all_prices(new_caption)
            
            if old_prices and new_prices:
                old_val = old_prices[0][1]
                new_val = new_prices[0][1]
                diff = new_val - old_val
                print(f"   Change: ₦{old_val:,.0f} → ₦{new_val:,.0f} (+₦{diff:,.0f})")
        else:
            print(f"\n❌ NO CHANGE: {caption}")
    
    print("\n" + "="*60)
    print("✅ Test Complete!")
    print("="*60)


if __name__ == "__main__":
    test_price_parser()