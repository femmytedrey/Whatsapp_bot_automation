export class PriceParser {
  private markupPercent: number;

  constructor(markupPercent: number = 2.0) {
    this.markupPercent = markupPercent;
  }

  // Parse prices: 1.75m → 1750000 OR ₦220,000 → 220000
  parsePrice(text: string): number | null {
    // Try abbreviated format first: 1.75m, 220k, etc
    let match = text.match(/(\d+\.?\d*)\s*([kmb])\b/i);
    if (match) {
      const num = parseFloat(match[1]);
      const suffix = match[2].toLowerCase();

      const multipliers: { [key: string]: number } = {
        k: 1_000,
        m: 1_000_000,
        b: 1_000_000_000,
      };

      return num * multipliers[suffix];
    }

    // Try naira format: ₦220,000 or ₦220000
    match = text.match(/₦\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (match) {
      const numStr = match[1].replace(/,/g, ""); // Remove commas
      return parseFloat(numStr);
    }

    return null;
  }

  // Calculate markup: 1750000 → 1785000
  calculateMarkup(original: number): number {
    let adjustedMarkup: number;

    // Progressive markup scaling
    if (original >= 5_000_000) {
      adjustedMarkup = this.markupPercent * 0.3;
    } else if (original >= 2_000_000) {
      adjustedMarkup = this.markupPercent * 0.5;
    } else if (original >= 500_000) {
      adjustedMarkup = this.markupPercent * 0.7;
    } else if (original >= 100_000) {
      adjustedMarkup = this.markupPercent;
    } else {
      adjustedMarkup = this.markupPercent * 1.5;
    }

    // Calculate new price
    let newPrice = Math.round(original * (1 + adjustedMarkup / 100));

    // === Rounding rules ===
    if (newPrice >= 1_000_000) {
      const remainder = newPrice % 10_000;
      if (remainder !== 0) newPrice = Math.ceil(newPrice / 10_000) * 10_000;
    } else if (newPrice >= 100_000) {
      const remainder = newPrice % 1_000;
      if (remainder !== 0) newPrice = Math.ceil(newPrice / 1_000) * 1_000;
    } else {
      const remainder = newPrice % 100;
      if (remainder !== 0) newPrice = Math.ceil(newPrice / 100) * 100;
    }

    // === Minimum profit safeguard ===
    if (newPrice - original < 10_000) {
      newPrice = original + 10_000;
    }

    return newPrice;
  }

  // Format back: 1785000 → 1.79m
  formatPrice(value: number): string {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      return `${millions.toFixed(2).replace(/\.?0+$/, "")}m`;
    } else if (value >= 1_000) {
      const thousands = value / 1_000;
      return `${thousands.toFixed(1).replace(/\.?0+$/, "")}k`;
    }
    return `₦${value.toLocaleString()}`;
  }

  // Main function: Replace prices in caption
  replacePrice(caption: string): string {
    // Replace abbreviated format (1.75m, 220k, etc)
    let result = caption.replace(/(\d+\.?\d*)\s*([kmb])\b/gi, (match) => {
      const original = this.parsePrice(match);
      if (!original) return match;

      const newPrice = this.calculateMarkup(original);
      return this.formatPrice(newPrice);
    });

    // Replace naira format (₦220,000)
    result = result.replace(/₦\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g, (match) => {
      const original = this.parsePrice(match);
      if (!original) return match;

      const newPrice = this.calculateMarkup(original);
      return `₦${newPrice.toLocaleString()}`;
    });

    return result;
  }
}
