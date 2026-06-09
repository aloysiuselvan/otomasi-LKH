import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL!;

/**
 * GET /api/cron/monthly-export
 *
 * Triggered by Vercel Cron Jobs on a monthly schedule.
 * Flow:
 *   1. Fetch all daily_logs for the current month and year.
 *   2. Send the data as a JSON payload to the Google Apps Script webhook.
 *   3. GAS handles document generation (filling tables, formatting, etc.).
 */
export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed

    // Build date range for the current month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Query Supabase for all logs in this month
    const { data: logs, error: dbError } = await getSupabase()
      .from("daily_logs")
      .select("*")
      .gte("log_date", startDate)
      .lt("log_date", endDate)
      .order("log_date", { ascending: true });

    if (dbError) {
      console.error("Supabase query error:", dbError);
      return NextResponse.json(
        { ok: false, error: dbError.message },
        { status: 500 }
      );
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No logs found for current month.",
        count: 0,
      });
    }

    // Send payload to Google Apps Script webhook
    const payload = {
      year,
      month,
      total_entries: logs.length,
      logs,
    };

    const gasResponse = await fetch(GAS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!gasResponse.ok) {
      const errorText = await gasResponse.text();
      console.error("GAS webhook error:", errorText);
      return NextResponse.json(
        { ok: false, error: "Failed to send data to Google Apps Script" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully exported ${logs.length} logs for ${year}-${String(month).padStart(2, "0")}.`,
      count: logs.length,
    });
  } catch (error) {
    console.error("Monthly export error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
