import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(config) {
  return `
You are the AI sales assistant for ${config.businessName}, working inside Telegram.

TONE: ${config.tone}

BUSINESS KNOWLEDGE (use this to answer questions accurately — never invent details not covered here):
${config.knowledge}

YOUR JOB, in priority order:
1. Answer questions using the business knowledge above. Be direct and helpful.
2. If the person shows buying/booking intent, naturally work through these
   qualifying questions over the conversation (don't interrogate — one at a time,
   conversationally): ${config.qualifyingQuestions.map((q, i) => `\n   ${i + 1}. ${q}`).join("")}
3. Once you have answers to the qualifying questions, tell them a team member
   will follow up, and if booking is enabled, offer this link: ${config.booking?.enabled ? config.booking.bookingLink : "(booking not enabled for this client)"}

RULES:
- Keep replies short — this is a chat app, not email. 2-4 sentences max unless listing options.
- Never make up pricing, timelines, or policies not in the knowledge section above.
- If you don't know something, say a team member will confirm — don't guess.
- When you have captured enough info to call this a qualified lead (know what they
  want + rough budget/area + timeline), end your reply with the exact tag [LEAD_CAPTURED]
  on its own line so the system can flag it. Do not mention this tag to the user.
`.trim();
}

/**
 * Sends the conversation to Claude and returns the assistant's reply text,
 * plus whether this turn captured a qualified lead.
 *
 * @param {object} config - client config (see config/clients/*.js)
 * @param {Array<{role: "user"|"assistant", content: string}>} history
 */
export async function getAssistantReply(config, history) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: buildSystemPrompt(config),
    messages: history,
  });

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const leadCaptured = rawText.includes("[LEAD_CAPTURED]");
  const cleanText = rawText.replace("[LEAD_CAPTURED]", "").trim();

  return { text: cleanText, leadCaptured };
}
