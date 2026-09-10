import "dotenv/config";
import { Telegraf } from "telegraf";
import { loadClientConfig } from "./config/loadClient.js";
import { getAssistantReply } from "./claude.js";
import { getHistory, saveMessage, saveLead } from "./supabase.js";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const config = await loadClientConfig();

console.log(`Bot starting for client: ${config.businessName} (${config.clientId})`);

bot.start((ctx) =>
  ctx.reply(
    `Hi, I'm the assistant for ${config.businessName}. Ask me anything, or tell me what you're looking for and I'll help you get started.`
  )
);

bot.on("text", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const userMessage = ctx.message.text;

  try {
    await ctx.sendChatAction("typing");

    // Save the incoming user message, then pull recent history for context
    await saveMessage(config.clientId, chatId, "user", userMessage);
    const history = await getHistory(config.clientId, chatId);

    const { text, leadCaptured } = await getAssistantReply(config, history);

    await ctx.reply(text);
    await saveMessage(config.clientId, chatId, "assistant", text);

    if (leadCaptured) {
      const summary = history
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      await saveLead(config.clientId, chatId, ctx.from.username, summary);

      // Notify the business owner directly in Telegram if configured
      if (config.handoff.method === "telegram" && config.handoff.target) {
        await bot.telegram.sendMessage(
          config.handoff.target,
          `🔥 New qualified lead for ${config.businessName}\n` +
            `From: @${ctx.from.username || "unknown"}\n\n${summary}`
        );
      }
    }
  } catch (err) {
    console.error("Error handling message:", err);
    await ctx.reply(
      "Sorry, something went wrong on my end — a team member will follow up with you shortly."
    );
  }
});

bot.launch();
console.log("Bot is running.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
