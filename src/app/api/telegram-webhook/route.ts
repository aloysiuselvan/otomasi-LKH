import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";
import { classifyWorkLog } from "@/lib/gemini/classifier";
import type { DailyLogInsert } from "@/lib/supabase/types";

/**
 * Telegram Bot Token used to verify incoming webhook requests
 * and to send reply messages back to the user.
 */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Sends a text message to a Telegram chat.
 */
async function sendTelegramMessage(
  chatId: number,
  text: string
): Promise<void> {
  await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
}

/**
 * POST /api/telegram-webhook
 *
 * Receives incoming messages from the Telegram Bot webhook.
 * Flow:
 *   1. Extract text message from the update payload.
 *   2. Send the text to Gemini API for classification.
 *   3. Save the classified log entry to Supabase.
 *   4. Reply to the user with a confirmation message.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Telegram sends various update types; we only process text messages.
    const message = body?.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const chatId: number = message.chat.id;
    const rawInput: string = message.text;

    // Ignore bot commands like /start, /help
    if (rawInput.startsWith("/")) {
      await sendTelegramMessage(
        chatId,
        "👋 Kirim pesan berisi kegiatan harianmu, dan saya akan mencatatnya."
      );
      return NextResponse.json({ ok: true, command: true });
    }

    // Step 1: Classify the work log using Gemini AI
    const classification = await classifyWorkLog(rawInput);

    // Step 2: Prepare the record for Supabase
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const logEntry: DailyLogInsert = {
      log_date: today,
      raw_input: rawInput,
      is_skp: classification.is_skp,
      skp_category: classification.skp_category,
      short_description: classification.short_description,
    };

    // Step 3: Insert into Supabase
    const { error: dbError } = await getSupabase()
      .from("daily_logs")
      .insert(logEntry);

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      await sendTelegramMessage(
        chatId,
        "❌ Gagal menyimpan log. Silakan coba lagi."
      );
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
    }

    // Step 4: Reply with confirmation
    const categoryLabel = classification.is_skp
      ? `📂 SKP: ${classification.skp_category}`
      : "📁 Di Luar SKP";

    const confirmationMessage = [
      "✅ <b>Log berhasil disimpan!</b>",
      "",
      `${categoryLabel}`,
      `📝 ${classification.short_description}`,
      `📅 ${today}`,
    ].join("\n");

    await sendTelegramMessage(chatId, confirmationMessage);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram-webhook
 * Health check endpoint to verify the webhook route is accessible.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint is active.",
  });
}
