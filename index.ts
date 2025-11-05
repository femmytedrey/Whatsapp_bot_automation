import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { PriceParser } from "./lib/priceParser";
import { GadgetFilter } from "./lib/gadgetFilter";
import * as fs from "fs";
import * as path from "path";
import { delay, DELAYS } from "./config/delayConfig";
import {
  MARKUP_PERCENT,
  VENDOR_NUMBER,
  YOUR_PRIMARY_NUMBER,
} from "./config/static.config";
import { calculateProfitInfo, isValidGadgetStatus, stats } from "./lib/helpers";

// const client = new Client({
//   authStrategy: new LocalAuth({ dataPath: "./session" }),
//   puppeteer: {
//     headless: false,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   },
// });

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});


const parser = new PriceParser(MARKUP_PERCENT);
const gadgetFilter = new GadgetFilter();

const DOWNLOADS_FOLDER = "./downloads";
if (!fs.existsSync(DOWNLOADS_FOLDER)) {
  fs.mkdirSync(DOWNLOADS_FOLDER);
}

client.on("ready", () => {
  console.log("🚀 Bot Ready! Monitoring vendor...\n");
  console.log(client.info);
  console.log("Automation Account:", client.info.wid.user);
  console.log("Sending to:", YOUR_PRIMARY_NUMBER);
  console.log("Watching:", VENDOR_NUMBER);
  console.log("\n" + "=".repeat(60) + "\n");
});

// client.on("message_create", async (message) => {
//   console.log(message.body);
// //   const contacts = await client.getContacts();
// //   console.log("These are my contacts: ", contacts);
//   if (message.body.includes("Hello Femi")) {
//     await delay(5000);
//     client.sendMessage(message.from, "Hi, how can we help you today?");
//     message.reply(message.from, "Hi, how can we help you today?");
//   }
// });

client.on("message_create", async (msg) => {
  if (msg.from === "status@broadcast") {
    const contact = await msg.getContact();

    if (contact.id._serialized === VENDOR_NUMBER) {
      stats.totalStatuses++;
      console.log("\n🔔 NEW VENDOR STATUS!");
      console.log("=".repeat(60));
      console.log(`Status #${stats.totalStatuses}`);

      console.log("⏳ Waiting before checking (looking human)...");
      await delay(DELAYS.minBeforeChecking, DELAYS.maxBeforeChecking);
      console.log("👀 Now checking status...");

      const originalCaption = msg.body || "";

      if (!isValidGadgetStatus(originalCaption, gadgetFilter)) {
        return;
      }

      await delay(DELAYS.minProcessing, DELAYS.maxProcessing);

      const { newCaption, profit, priceInfo } = calculateProfitInfo(
        originalCaption,
        parser
      );

      try {
        if (msg.hasMedia) {
          console.log("\n📥 Downloading media...");
          await delay(DELAYS.minDownload, DELAYS.maxDownload);
          const media = await msg.downloadMedia();

          const timestamp = Date.now();
          const extension = media.mimetype.includes("video") ? "mp4" : "jpg";
          const filename = `vendor_${timestamp}.${extension}`;
          const filepath = path.join(DOWNLOADS_FOLDER, filename);

          fs.writeFileSync(filepath, media.data, "base64");
          console.log(`✅ Saved: ${filepath}`);

          console.log("\n📤 Sending to your primary WhatsApp...");

          const chat = await client.getChatById(YOUR_PRIMARY_NUMBER);
          //   await chat.sendStateTyping();
          //   await delay(2000, 4000);

          console.log("   → Caption...");
          console.log("New caption: ", newCaption);
          //   await client.sendMessage(YOUR_PRIMARY_NUMBER, newCaption);

          //   await delay(DELAYS.minBetweenMessages, DELAYS.maxBetweenMessages);

          await chat.sendStateTyping();
          await delay(3000, 5000);

          console.log("   → Media with caption...");
          const mediaFromFile = MessageMedia.fromFilePath(filepath);
          await client.sendMessage(YOUR_PRIMARY_NUMBER, mediaFromFile, {
            caption: newCaption,
          });

          await delay(DELAYS.minBetweenMessages, DELAYS.maxBetweenMessages);

          if (profit > 0) {
            await chat.sendStateTyping();
            await delay(2000, 3000);

            console.log("   → Profit info...");
            const profitMsg =
              `🚀 PROFIT INFO:\n${priceInfo}\n\n` +
              `📋 Instructions:\n` +
              `1. Copy the caption above\n` +
              `2. Download the image\n` +
              `3. Post to your status\n\n` +
              `📊 Today: ${stats.gadgetsDetected} gadgets forwarded`;
            await client.sendMessage(YOUR_PRIMARY_NUMBER, profitMsg);
          }

          try {
            fs.unlinkSync(filepath);
            console.log(`🗑️  Deleted: ${filename}`);
          } catch (err) {
            console.error(`⚠️  Could not delete ${filename}:`, err);
          }

          stats.forwarded++;
          console.log("\n✅ FORWARDED SUCCESSFULLY!");
        } else {
          console.log("\n📤 Text-only status, sending...");
          let message = newCaption;

          if (profit > 0) {
            message += `\n\n🚀 PROFIT INFO:\n${priceInfo}`;
          }

          const chat = await client.getChatById(YOUR_PRIMARY_NUMBER);
          await chat.sendStateTyping();
          await delay(DELAYS.minProcessing, DELAYS.maxProcessing);

          await client.sendMessage(YOUR_PRIMARY_NUMBER, message);

          stats.forwarded++;
          console.log("✅ Sent!\n");
        }

        console.log("=".repeat(60));
        console.log(`📊 Session Stats:`);
        console.log(`   Total statuses seen: ${stats.totalStatuses}`);
        console.log(`   Gadgets detected: ${stats.gadgetsDetected}`);
        console.log(`   Non-gadgets skipped: ${stats.nonGadgetsSkipped}`);
        console.log(`   Successfully forwarded: ${stats.forwarded}`);
        console.log("=".repeat(60) + "\n");
      } catch (error: any) {
        console.error("❌ Error:", error.message);
      }
    }
  }
});

client.on("qr", (qr: string) => {
  console.log("📱 Scan this QR code with your SECONDARY WhatsApp:");
  qrcode.generate(qr, { small: true });
  console.log("(The one that will monitor the vendor)\n");
});

client.on("authenticated", () => console.log("✅ Authenticated!"));
client.on("auth_failure", () => console.error("❌ Authentication failed!"));

client.initialize();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n📊 FINAL STATS:");
  console.log("=".repeat(60));
  console.log(`Total statuses seen: ${stats.totalStatuses}`);
  console.log(`Gadgets detected: ${stats.gadgetsDetected}`);
  console.log(`Non-gadgets skipped: ${stats.nonGadgetsSkipped}`);
  console.log(`Successfully forwarded: ${stats.forwarded}`);
  console.log("=".repeat(60));

  console.log("\n👋 Shutting down bot...");
  await client.destroy();
  process.exit(0);
});
