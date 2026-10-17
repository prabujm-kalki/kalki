import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const po = await db
    .select({ publicToken: purchaseOrders.publicToken, id: purchaseOrders.id })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  if (!po || po.length === 0) {
    notFound();
  }

  const token = po[0].publicToken || po[0].id;
  redirect(`/public/po/${token}`);
}
