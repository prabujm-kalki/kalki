import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, loadAuthorizationGrants } from "@/lib/authorization";
import { 
  getImportFields, 
  createImportField, 
  updateImportField, 
  deleteImportField, 
  updateImportFieldsOrder 
} from "@/domains/settings/import-fields.service";

export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const organizationId = searchParams.get("organizationId");
  const importType = searchParams.get("importType") || "SALES_TRANSACTION";

  if (!organizationId) {
    return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
  }

  // Authorize: Must be owner or have membership (for read, any member should be able to read if needed by UI, but we'll restrict to owner for settings)
  const grants = await loadAuthorizationGrants(user.id);
  if (!grants.isOwner) {
    return NextResponse.json({ error: "Forbidden: Only owners can manage import fields" }, { status: 403 });
  }

  const fields = await getImportFields(organizationId, importType);
  return NextResponse.json({ fields });
}

export async function POST(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { organizationId, importType, internalKey, displayName, isMandatory, isActive, displayOrder, aliases } = body;

  const grants = await loadAuthorizationGrants(user.id);
  if (!grants.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!organizationId || !internalKey || !displayName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const field = await createImportField({
      organizationId,
      importType: importType || "SALES_TRANSACTION",
      internalKey,
      displayName,
      isMandatory: isMandatory ?? false,
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
      aliases: aliases ?? [],
    });
    return NextResponse.json({ field });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, organizationId, ...updateData } = body;

  const grants = await loadAuthorizationGrants(user.id);
  if (!grants.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id || !organizationId) {
    return NextResponse.json({ error: "Missing id or organizationId" }, { status: 400 });
  }

  try {
    const field = await updateImportField(id, organizationId, updateData);
    return NextResponse.json({ field });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const organizationId = searchParams.get("organizationId");

  const grants = await loadAuthorizationGrants(user.id);
  if (!grants.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!id || !organizationId) {
    return NextResponse.json({ error: "Missing id or organizationId" }, { status: 400 });
  }

  try {
    await deleteImportField(id, organizationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { organizationId, importType, orderedIds } = body;

  const grants = await loadAuthorizationGrants(user.id);
  if (!grants.isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!organizationId || !orderedIds || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await updateImportFieldsOrder(organizationId, importType || "SALES_TRANSACTION", orderedIds);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
