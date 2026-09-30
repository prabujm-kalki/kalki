const fs = require('fs');

let content = fs.readFileSync('src/app/api/purchasing/stock-assessment/route.ts', 'utf8');

// Ensure items is imported
if (!content.includes(', items } from "@/db/schema"')) {
  content = content.replace('vendorItems } from "@/db/schema"', 'vendorItems, items } from "@/db/schema"');
}

// Replace the query and logic
content = content.replace(
  /const configuredItems = await db\s+\.select\(\)\s+\.from\(vendorItems\)\s+\.where\([\s\S]*?\);\s+const itemsToOrder = \[\];\s+let totalAmount = 0;\s+for \(const input of stockInputs\) \{\s+const config = configuredItems\.find\(ci => ci\.itemId === input\.itemId\);\s+if \(!config\) continue;\s+const currentStock = Number\(input\.currentStock\);\s+const minStock = Number\(config\.minimumStock \|\| 0\);\s+const normalStock = Number\(config\.normalQuantity \|\| 0\);\s+const lastRate = Number\(config\.lastRate \|\| 0\);/m,
  `const configuredItems = await db
      .select({
        vendorItem: vendorItems,
        item: items
      })
      .from(vendorItems)
      .innerJoin(items, eq(vendorItems.itemId, items.id))
      .where(
        and(
          eq(vendorItems.vendorId, vendorId),
          inArray(vendorItems.itemId, itemIds),
          eq(vendorItems.isActive, true)
        )
      );

    const itemsToOrder = [];
    let totalAmount = 0;

    for (const input of stockInputs) {
      const row = configuredItems.find(ci => ci.vendorItem.itemId === input.itemId);
      if (!row) continue;
      
      const config = row.vendorItem;
      const masterItem = row.item;

      const currentStock = Number(input.currentStock);
      // Fallbacks: Use vendor setting, or fallback to master item target/base min stock
      const minStock = Number(config.minimumStock || masterItem.baseMinStock || 0);
      const normalStock = Number(config.normalQuantity || masterItem.targetStock || 0);
      
      // Critical fix: If vendor last rate is missing, fallback to master item's currentPrice
      const lastRate = Number(config.lastRate || masterItem.currentPrice || 0);`
);

fs.writeFileSync('src/app/api/purchasing/stock-assessment/route.ts', content);
console.log('Fixed stock assessment API logic');
