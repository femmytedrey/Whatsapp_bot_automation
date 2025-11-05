import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import * as fs from "fs";
import * as path from "path";
import {
  VENDOR_NUMBER,
  YOUR_PRIMARY_NUMBER,
  MARKUP_PERCENT,
} from "./config/static.config";
import { PriceParser } from "./lib/priceParser";
import { GadgetFilter } from "./lib/gadgetFilter";
import { isValidGadgetStatus } from "./lib/helpers";
import {
  messageBuffer,
  resetBufferTimeout,
} from "./lib/dm_message.helper";

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
      resetBufferTimeout(client);
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
      // console.log(media, "really just a media");

      if (!media || !media.mimetype || !media.data) {
        console.log("⚠️  Media incomplete");
        return;
      }

      // const isVideo = media.mimetype.includes("video");
      const isVideo = msg.type === "video";
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
        resetBufferTimeout(client);
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
      resetBufferTimeout(client);
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
