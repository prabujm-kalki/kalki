import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "item_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "name" text NOT NULL,
        "code" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "item_subcategories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "category_id" uuid NOT NULL,
        "name" text NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL
      );
    `);

    try { await db.execute(sql`ALTER TABLE "items" ADD COLUMN "category_id" uuid;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "items" ADD COLUMN "subcategory_id" uuid;`); } catch(e) {}
    
    try { await db.execute(sql`ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "item_subcategories" ADD CONSTRAINT "item_subcategories_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "items" ADD CONSTRAINT "items_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."item_categories"("id") ON DELETE no action ON UPDATE no action;`); } catch(e) {}
    try { await db.execute(sql`ALTER TABLE "items" ADD CONSTRAINT "items_subcategory_id_item_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."item_subcategories"("id") ON DELETE no action ON UPDATE no action;`); } catch(e) {}

    console.log("Migration successful");
  } catch (err) {
    console.error(err);
  }
}

main();
