const fs = require('fs');

let c = fs.readFileSync('src/app/api/purchase-orders/[id]/approve/route.ts', 'utf8');

c = c.replace('if (body && body.lines && Array.isArray(body.lines)) {', `if (body && body.lines && Array.isArray(body.lines)) {
      const hasInvalidItem = body.lines.some((l) => !l.itemId);
      if (hasInvalidItem) return NextResponse.json({ error: "Missing itemId in payload" }, { status: 400 });`);

fs.writeFileSync('src/app/api/purchase-orders/[id]/approve/route.ts', c);
