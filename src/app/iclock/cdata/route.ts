import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, rawBiometricPunches } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// 1. Initial Handshake / Settings Request from Device
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sn = url.searchParams.get("SN");
  
  if (!sn) {
    return new NextResponse("UNKNOWN DEVICE", { status: 400 });
  }

  // The device expects a plain text "OK" to confirm the server is reachable and ready
  return new NextResponse("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

// 2. Data Push from Device (Punches)
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const sn = url.searchParams.get("SN");
    const table = url.searchParams.get("table");

    if (!sn) {
      return new NextResponse("UNKNOWN DEVICE", { status: 400 });
    }

    // Read the raw plain text body
    const textBody = await request.text();
    
    // If the device is just pushing something else (like OPERLOG), just say OK to clear its buffer
    if (table !== "ATTLOG") {
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // Split by lines (each line is one punch)
    const lines = textBody.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // Extract unique biometric IDs from the batch to lookup employees
    const biometricIds = new Set<string>();
    const punchRecords: { biometricId: string, timestampStr: string, verifyType: string }[] = [];

    for (const line of lines) {
      // eSSL ATTLOG format: USERID \t YYYY-MM-DD HH:MM:SS \t STATUS \t VERIFY_TYPE \t ...
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const biometricId = parts[0];
        const timestampStr = parts[1]; // e.g. "2026-09-25 10:00:00"
        let verifyType = "0"; // 0: Password, 1: Fingerprint, 2: Card, 15: Face
        if (parts.length >= 4) {
          verifyType = parts[3];
        }
        biometricIds.add(biometricId);
        punchRecords.push({ biometricId, timestampStr, verifyType });
      }
    }

    if (punchRecords.length === 0) {
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // Lookup employees by biometric ID
    const foundEmployees = await db.select({
      id: employees.id,
      biometricId: employees.biometricId,
      organizationId: employees.organizationId,
      locationId: employees.locationId,
    })
    .from(employees)
    .where(inArray(employees.biometricId, Array.from(biometricIds)));

    const empMap = new Map(foundEmployees.map(e => [e.biometricId, e]));
    const inserts = [];

    for (const record of punchRecords) {
      const emp = empMap.get(record.biometricId);
      
      // If we don't know the employee, we can't reliably assign an organization/location right now.
      // In a strict architecture, we might log this to an 'unmapped_punches' table.
      // For now, if mapped, we insert.
      if (emp && emp.biometricId) {
        inserts.push({
          id: crypto.randomUUID(),
          organizationId: emp.organizationId,
          locationId: emp.locationId,
          employeeId: emp.id,
          biometricId: emp.biometricId,
          machineId: sn,
          punchTimestamp: new Date(record.timestampStr),
          punchType: "BIOMETRIC", // Defaulting as BIOMETRIC
          sourceType: "ADMS_PUSH",
        });
      }
    }

    if (inserts.length > 0) {
      await db.insert(rawBiometricPunches).values(inserts);
    }

    // Return plain text OK with count of records successfully parsed, so the device deletes them from memory
    return new NextResponse(`OK\n`, { 
      status: 200, 
      headers: { "Content-Type": "text/plain" } 
    });

  } catch (err) {
    console.error("ADMS Error:", err);
    // Even on error, sometimes we must return OK to prevent the device from getting stuck in a loop,
    // but typically a 500 will make it retry later. Let's make it retry.
    return new NextResponse("ERROR", { status: 500 });
  }
}
