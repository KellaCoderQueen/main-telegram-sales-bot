import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetches recent conversation history for a Telegram chat, formatted
 * for the Anthropic API's messages array.
 */
export async function getHistory(clientId, chatId, limit = 20) {
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("client_id", clientId)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function saveMessage(clientId, chatId, role, content) {
  const { error } = await supabase
    .from("messages")
    .insert({ client_id: clientId, chat_id: chatId, role, content });

  if (error) throw error;
}

export async function saveLead(clientId, chatId, telegramUser, summary) {
  const { error } = await supabase.from("leads").insert({
    client_id: clientId,
    chat_id: chatId,
    telegram_username: telegramUser,
    summary,
  });

  if (error) throw error;
}
