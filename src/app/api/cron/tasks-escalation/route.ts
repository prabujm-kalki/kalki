import { NextResponse } from "next/server";
import { runEscalationSweeper } from "@/domains/tasks/sweeper";

export async function GET(req: Request) {
  // In production, this must be secured (e.g., using a CRON_SECRET or Vercel specific headers)
  // For Kalki BOS testing phase, we leave it open so it can be triggered manually via browser.

  try {
    const result = await runEscalationSweeper();

    return NextResponse.json({ 
      message: "Escalation Engine successfully processed tasks.",
      ...result
    });
  } catch (error: any) {
    console.error("Escalation cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
