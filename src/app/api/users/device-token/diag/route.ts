import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// In-memory ring buffer of the latest 50 mobile push diagnostic logs for instant troubleshooting
interface DiagEntry {
  timestamp: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  step: string;
  status: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  details?: any;
}

const diagLogs: DiagEntry[] = [];
const MAX_LOGS = 100;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return NextResponse.json({
      success: true,
      count: diagLogs.length,
      logs: diagLogs.slice().reverse(), // most recent first
      currentUserSession: session?.user
        ? { id: session.user.id, email: session.user.email, name: session.user.name }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, status = "INFO", details } = body;

    let userId: string | undefined;
    let userEmail: string | undefined;

    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (session?.user) {
        userId = session.user.id;
        userEmail = session.user.email;
      }
    } catch {
      // ignore session lookup failure
    }

    const entry: DiagEntry = {
      timestamp: new Date().toISOString(),
      userId,
      userEmail,
      userAgent: req.headers.get("user-agent") || undefined,
      step: String(step || "Unknown Checkpoint"),
      status: ["INFO", "SUCCESS", "WARNING", "ERROR"].includes(status) ? status : "INFO",
      details,
    };

    diagLogs.push(entry);
    if (diagLogs.length > MAX_LOGS) {
      diagLogs.shift();
    }

    console.log(`[Mobile Diag][${entry.status}] ${entry.step}:`, details || "");

    return NextResponse.json({ success: true, logged: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
