import { Client, MessageMedia } from "whatsapp-web.js";
import { calculateProfitInfo } from "./helpers";
import { PriceParser } from "./priceParser";
import { MARKUP_PERCENT, YOUR_PRIMARY_NUMBER } from "../config/static.config";
import * as fs from "fs";

interface BufferedMessage {
  type: "caption" | "image" | "video";
  content: string;
  timestamp: number;
}

interface Product {
  caption: string;
  images: string[];
  hasVideo: boolean;
}

export let messageBuffer: BufferedMessage[] = [];
export let bufferTimeout: NodeJS.Timeout | null = null;
const BUFFER_WAIT_TIME = 5000;
export function resetBufferTimeout(client: Client) {
  if (bufferTimeout) clearTimeout(bufferTimeout);

  bufferTimeout = setTimeout(async () => {
    if (messageBuffer.length > 0) {
      console.log(
        `\n⏱️  Buffer timeout! Processing ${messageBuffer.length} messages...\n`
      );
      await processBuffer(client);
    }
  }, BUFFER_WAIT_TIME);
}

export async function processBuffer(client: Client) {
  if (messageBuffer.length === 0) return;

  const buffer: BufferedMessage[] = [...messageBuffer];
  messageBuffer = [];

  if (!buffer.some((msg) => msg.type === "caption")) {
    console.log("🕒 No caption yet — skipping processing for now.");
    return;
  }

  console.log(`📦 Processing ${buffer.length} messages...\n`);

  // Group messages into products
  const products: Product[] = [];
  let currentProduct: Product | null = null;

  for (const msg of buffer) {
    if (msg.type === "caption") {
      // Save previous product if exists
      if (currentProduct) {
        products.push(currentProduct);
      }

      // Start new product
      currentProduct = {
        caption: msg.content,
        images: [],
        hasVideo: false,
      };
    } else if (msg.type === "video") {
      if (currentProduct) {
        currentProduct.hasVideo = true;
      }
    } else if (msg.type === "image") {
      if (currentProduct) {
        currentProduct.images.push(msg.content);
      }
    }
  }

  // Add last product
  if (currentProduct) {
    products.push(currentProduct);
  }

  console.log(`✅ Grouped into ${products.length} product(s)\n`);

  // Forward each product with random delay
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📦 PRODUCT ${i + 1}/${products.length}`);
    console.log(`Caption: ${product.caption.substring(0, 50)}...`);
    console.log(`Images: ${product.images.length}`);
    console.log(`Video: ${product.hasVideo ? "YES" : "NO"}`);
    console.log(`${"=".repeat(60)}`);

    await forwardProduct(product, client);

    // Random delay before next product (except last one)
    if (i < products.length - 1) {
      const delay = Math.random() * 90000 + 30000;
      const seconds = (delay / 1000).toFixed(0);
      console.log(`\n⏳ Waiting ${seconds}s before next product...\n`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log(`\n✅ All products forwarded!\n`);
}

export async function forwardProduct(product: Product, client: Client) {
  const parser = new PriceParser(MARKUP_PERCENT);

  try {
    const { newCaption, profit, priceInfo } = calculateProfitInfo(
      product.caption,
      parser
    );

    const chat = await client.getChatById(YOUR_PRIMARY_NUMBER);

    // ========================================
    // VIDEO DETECTED - ALERT ONLY
    // ========================================
    if (product.hasVideo) {
      console.log("⏭️  Video detected - sending alert");

      await chat.sendStateTyping();
      await randomDelay(1000, 2000);

      await client.sendMessage(
        YOUR_PRIMARY_NUMBER,
        `⚠️ VIDEO DETECTED\n\n` +
          `Product: "${product.caption}"\n\n` +
          `Vendor sent a video. Check manually.`
      );

      return;
    }

    // ========================================
    // NO IMAGES - TEXT ONLY
    // ========================================
    if (product.images.length === 0) {
      console.log("💬 Text only - sending caption");

      await chat.sendStateTyping();
      await randomDelay(1000, 2000);

      await client.sendMessage(YOUR_PRIMARY_NUMBER, newCaption);

      if (profit > 0) {
        await chat.sendStateTyping();
        await randomDelay(1000, 2000);
        await client.sendMessage(
          YOUR_PRIMARY_NUMBER,
          `🚀 PROFIT:\n${priceInfo}`
        );
      }

      return;
    }

    // ========================================
    // FORWARD IMAGES WITH CAPTION
    // ========================================
    console.log(`📸 Forwarding ${product.images.length} images with caption`);

    await chat.sendStateTyping();
    await randomDelay(1000, 2000);

    for (let i = 0; i < product.images.length; i++) {
      const imageMedia = MessageMedia.fromFilePath(product.images[i]);
      await client.sendMessage(YOUR_PRIMARY_NUMBER, imageMedia, {
        caption: newCaption,
      });
      console.log(`   ✅ Image ${i + 1}/${product.images.length}`);
      await randomDelay(2000, 4000); // Delay between images
    }

    // Send profit info
    if (profit > 0) {
      await chat.sendStateTyping();
      await randomDelay(1000, 2000);

      const profitMsg =
        `🚀 PROFIT:\n${priceInfo}\n\n` +
        `📋 Instructions:\n` +
        `1. Copy caption\n` +
        `2. Download images\n` +
        `3. Post to status`;
      await client.sendMessage(YOUR_PRIMARY_NUMBER, profitMsg);
    }

    console.log("✅ Product forwarded");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    // Cleanup files
    for (const filepath of product.images) {
      try {
        fs.unlinkSync(filepath);
      } catch (err) {
        // Ignore
      }
    }
  }
}

export function randomDelay(
  min: number = 30000,
  max: number = 120000
): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
