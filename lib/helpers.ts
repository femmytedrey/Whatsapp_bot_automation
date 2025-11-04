import { GadgetFilter } from "./gadgetFilter";
import { PriceParser } from "./priceParser";

export const stats = {
  totalStatuses: 0,
  gadgetsDetected: 0,
  nonGadgetsSkipped: 0,
  forwarded: 0,
};

export function isValidGadgetStatus(
  caption: string,
  gadgetFilter: GadgetFilter
): boolean {
  // Check if caption is empty
  if (!caption.trim()) {
    console.log("⚠️  Status has no caption, skipping...\n");
    stats.nonGadgetsSkipped++;
    return false;
  }

  console.log(`\n📝 Caption:\n"${caption.substring(0, 80)}..."\n`);
  console.log("🔍 Checking if gadget...");

  const isGadget = gadgetFilter.isGadget(caption);

  if (!isGadget) {
    stats.nonGadgetsSkipped++;
    console.log("\n❌ NOT A GADGET - Skipping");
    console.log(
      `📊 Stats: ${stats.gadgetsDetected} gadgets, ${stats.nonGadgetsSkipped} skipped\n`
    );
    return false;
  }

  stats.gadgetsDetected++;
  console.log("\n✅ GADGET CONFIRMED - Processing...");
  return true;
}

export function calculateProfitInfo(
  caption: string,
  parser: PriceParser
): {
  newCaption: string;
  profit: number;
  priceInfo: string;
} {
  const newCaption = parser.replacePrice(caption);
  const originalPrice = parser.parsePrice(caption);

  if (!originalPrice) {
    console.log("⚠️  No price detected in caption (but passed gadget filter)");
    return {
      newCaption,
      profit: 0,
      priceInfo: "",
    };
  }

  const newPrice = parser.calculateMarkup(originalPrice);
  const profit = newPrice - originalPrice;

  const priceInfo =
    `💰 Original: ₦${originalPrice.toLocaleString()}\n` +
    `💵 New Price: ₦${newPrice.toLocaleString()}\n` +
    `📈 Your Profit: ₦${profit.toLocaleString()}`;

  console.log(`\n${priceInfo}`);

  return {
    newCaption,
    profit,
    priceInfo,
  };
}
