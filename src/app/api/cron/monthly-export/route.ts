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
export async function GET(request?: Request) {
  try {
    let month: number;
    let year: number;

    const url = request ? new URL(request.url) : null;
    const paramMonth = url?.searchParams.get("month");
    const paramYear = url?.searchParams.get("year");

    if (paramMonth && paramYear) {
      month = parseInt(paramMonth, 10);
      year = parseInt(paramYear, 10);
    } else {
      // Convert current server time to WIB (Asia/Jakarta, GMT+7)
      const wibNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );

      // Automated Cron Execution:
      // Scheduled in Vercel as "0 19 28-31 * *" (19:00 UTC = 02:00 WIB next day)
      // Only execute if today is the 1st of the month in WIB
      if (wibNow.getDate() !== 1) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: `Ekspor otomatis hanya berjalan pada tanggal 1 bulan baru pukul 02:00 WIB (Hari ini: tanggal ${wibNow.getDate()}).`,
        });
      }

      // Calculate previous month for export
      const currentWibMonth = wibNow.getMonth(); // 0-indexed
      if (currentWibMonth === 0) {
        month = 12; // December
        year = wibNow.getFullYear() - 1;
      } else {
        month = currentWibMonth; // Previous month 1-indexed
        year = wibNow.getFullYear();
      }
    }

    // Build date range for the target month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59`;

    // Query Supabase for all logs in this month
    const { data: logs, error: dbError } = await getSupabase()
      .from("daily_logs")
      .select("*")
      .gte("log_date", startDate)
      .lte("log_date", endDate.substring(0, 10))
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
