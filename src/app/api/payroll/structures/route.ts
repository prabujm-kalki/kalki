import { NextResponse } from "next/server";
import { db } from "@/db";
import { employeeSalaryStructures, employeeSalaryStructureComponents, salaryComponents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { upsertSalaryStructure } from "@/domains/payroll/actions";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    // Get the most recent active salary structure for this employee
    const structures = await db
      .select()
      .from(employeeSalaryStructures)
      .where(and(
        eq(employeeSalaryStructures.employeeId, employeeId),
        eq(employeeSalaryStructures.isActive, true)
      ))
      .orderBy(desc(employeeSalaryStructures.effectiveFrom))
      .limit(1);

    const activeStructure = structures[0] || null;

    let componentsWithDetails: any[] = [];

    if (activeStructure) {
      const structComps = await db
        .select({
          id: employeeSalaryStructureComponents.id,
          amount: employeeSalaryStructureComponents.amount,
          component: {
            id: salaryComponents.id,
            name: salaryComponents.name,
            type: salaryComponents.type,
            isTaxable: salaryComponents.isTaxable,
          }
        })
        .from(employeeSalaryStructureComponents)
        .innerJoin(salaryComponents, eq(employeeSalaryStructureComponents.componentId, salaryComponents.id))
        .where(eq(employeeSalaryStructureComponents.structureId, activeStructure.id));
      const uniqueStructComps = Array.from(new Map(structComps.map(c => [c.component.name, c])).values());
      componentsWithDetails = uniqueStructComps;
    }

    return NextResponse.json({ 
      structure: activeStructure ? {
        ...activeStructure,
        components: componentsWithDetails
      } : null
    });
  } catch (error) {
    console.error("Failed to fetch salary structure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    
    // Validate
    if (!body.organizationId || !body.employeeId || !body.effectiveFrom) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Deactivate previous active structures
    await db.update(employeeSalaryStructures)
      .set({ isActive: false, effectiveTo: body.effectiveFrom })
      .where(and(
        eq(employeeSalaryStructures.employeeId, body.employeeId),
        eq(employeeSalaryStructures.isActive, true)
      ));

    const structure = await db.transaction(async (tx) => {
      // Insert header
      const [newStruct] = await tx.insert(employeeSalaryStructures).values({
        organizationId: body.organizationId,
        employeeId: body.employeeId,
        effectiveFrom: body.effectiveFrom,
        payBasis: body.payBasis || "MONTHLY",
        isEpfApplicable: body.isEpfApplicable || false,
        isEsiApplicable: body.isEsiApplicable || false,
        isPtApplicable: body.isPtApplicable || false,
        isActive: true
      }).returning();
      
      // Insert components
      if (body.components && body.components.length > 0) {
        await tx.insert(employeeSalaryStructureComponents).values(
          body.components.map((c: any) => ({
            structureId: newStruct.id,
            componentId: c.componentId,
            amount: c.amount,
          }))
        );
      }
      
      return newStruct;
    });

    return NextResponse.json({ structure });
  } catch (error: any) {
    console.error("Failed to upsert salary structure:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
