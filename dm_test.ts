import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import * as fs from "fs";
import * as path from "path";
import { VENDOR_NUMBER, YOUR_PRIMARY_NUMBER, MARKUP_PERCENT } from "./config/static.config";
import { PriceParser } from "./lib/priceParser";
import { GadgetFilter } from "./lib/gadgetFilter";
import { calculateProfitInfo, isValidGadgetStatus } from "./lib/helpers";

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

const parser = new PriceParser(MARKUP_PERCENT);
const gadgetFilter = new GadgetFilter();
const DOWNLOADS_FOLDER = "./downloads";

if (!fs.existsSync(DOWNLOADS_FOLDER)) fs.mkdirSync(DOWNLOADS_FOLDER);

// ========================================
// MESSAGE BUFFER & GROUPING
// ========================================
interface BufferedMessage {
  type: "caption" | "image" | "video";
  content: string; // caption text or file path
  timestamp: number;
}

interface Product {
  caption: string;
  images: string[];
  hasVideo: boolean;
}

let messageBuffer: BufferedMessage[] = [];
let bufferTimeout: NodeJS.Timeout | null = null;
const BUFFER_WAIT_TIME = 5000; // 5 seconds of silence before processing

function randomDelay(min: number = 30000, max: number = 120000): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function resetBufferTimeout() {
  if (bufferTimeout) clearTimeout(bufferTimeout);

  bufferTimeout = setTimeout(async () => {
    if (messageBuffer.length > 0) {
      console.log(`\n⏱️  Buffer timeout! Processing ${messageBuffer.length} messages...\n`);
      await processBuffer();
    }
  }, BUFFER_WAIT_TIME);
}

async function processBuffer() {
  if (messageBuffer.length === 0) return;

  const buffer = [...messageBuffer];
  messageBuffer = [];

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

    await forwardProduct(product);

    // Random delay before next product (except last one)
    if (i < products.length - 1) {
      const delay = Math.random() * 90000 + 30000; // 30-120 seconds
      const seconds = (delay / 1000).toFixed(0);
      console.log(`\n⏳ Waiting ${seconds}s before next product...\n`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`\n✅ All products forwarded!\n`);
}

async function forwardProduct(product: Product) {
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

client.on("ready", () => {
  console.log("🚀 Bot Ready! Monitoring vendor...\n");
  console.log(`Watching: ${VENDOR_NUMBER}`);
  console.log(`Sending to: ${YOUR_PRIMARY_NUMBER}`);
  console.log(`Markup: ${MARKUP_PERCENT}%\n`);
});

client.on("message", async (msg) => {
  if (msg.from !== VENDOR_NUMBER) return;

  const messageBody = msg.body || "";

  // ========================================
  // CAPTION MESSAGE
  // ========================================
  if (messageBody && !msg.hasMedia) {
    console.log(`\n📝 Caption: ${messageBody.substring(0, 60)}...`);

    if (isValidGadgetStatus(messageBody, gadgetFilter)) {
      console.log("✅ Valid gadget");

      messageBuffer.push({
        type: "caption",
        content: messageBody,
        timestamp: Date.now(),
      });

      console.log(`📦 Buffered (total: ${messageBuffer.length})`);
      resetBufferTimeout();
    } else {
      console.log("❌ Not a gadget");
    }
  }

  // ========================================
  // MEDIA MESSAGE
  // ========================================
  if (msg.hasMedia) {
    try {
      const media = await msg.downloadMedia();

      if (!media || !media.mimetype || !media.data) {
        console.log("⚠️  Media incomplete");
        return;
      }

      const isVideo = media.mimetype.includes("video");
      const type = isVideo ? "video" : "image";

      console.log(`\n${isVideo ? "🎥" : "📸"} ${type.toUpperCase()} received`);

      // For videos, just flag it
      if (isVideo) {
        messageBuffer.push({
          type: "video",
          content: "",
          timestamp: Date.now(),
        });

        console.log(`📦 Buffered (total: ${messageBuffer.length})`);
        resetBufferTimeout();
        return;
      }

      // For images, save to file
      const timestamp = Date.now();
      const filename = `product_${timestamp}_${Date.now()}.jpg`;
      const filepath = path.join(DOWNLOADS_FOLDER, filename);

      fs.writeFileSync(filepath, media.data, "base64");

      messageBuffer.push({
        type: "image",
        content: filepath,
        timestamp: Date.now(),
      });

      console.log(`📦 Buffered (total: ${messageBuffer.length})`);
      resetBufferTimeout();
    } catch (error: any) {
      console.log(`⚠️  Media error: ${error.message}`);
    }
  }
});

client.on("qr", (qr: string) => {
  console.log("📱 Scan QR:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => console.log("✅ Authenticated!"));

client.initialize();

process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down...");
  await client.destroy();
  process.exit(0);
});
