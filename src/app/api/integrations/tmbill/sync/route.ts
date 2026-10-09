import { NextResponse } from "next/server";
import { TMBillService } from "@/domains/integrations/tmbill.service";
import { db } from "@/db";
import { employees } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const organizationId = body.organizationId;
    const locationId = body.locationId || null;
    const fromDate = body.fromDate; // YYYY-MM-DD 00:00:00
    const toDate = body.toDate; // YYYY-MM-DD 23:59:59

    if (!organizationId || !fromDate || !toDate) {
      return NextResponse.json({ error: "Missing required fields: organizationId, fromDate, toDate" }, { status: 400 });
    }

    const tmbillService = new TMBillService(organizationId, locationId);
    
    console.log(`Starting TMBill sync for org ${organizationId} from ${fromDate} to ${toDate}`);
    
    const result = await tmbillService.syncOrders(fromDate, toDate);

    // After pulling raw orders, push them into Sales module as un-reconciled imported sales
    // Find a valid employee ID to act as the "recorder" to satisfy foreign key constraints
    const firstEmployee = await db.select().from(employees).limit(1);
    let systemUserId = null;
    if (firstEmployee.length > 0) {
      systemUserId = firstEmployee[0].id;
    } else {
      // Fallback valid UUID if no employee exists (though it might still fail FK if empty)
      systemUserId = "00000000-0000-0000-0000-000000000000"; 
    }

    const pushedSalesCount = await tmbillService.pushToSalesInvoices(systemUserId);

    return NextResponse.json({
      success: true,
      message: "TMBill sync completed.",
      result: {
        ...result,
        pushedToSales: pushedSalesCount
      }
    });

  } catch (error: any) {
    console.error("API TMBill Sync Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
