import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { customers, salesInvoices, salesInvoiceLines } from '../src/db/schema';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

async function run() {
  console.log("Starting dummy data seed...");

  // 1. Get an active organization & location (default to first ones found)
  const orgResult = await pool.query('SELECT id FROM organizations LIMIT 1');
  const locResult = await pool.query('SELECT id FROM locations LIMIT 1');

  if (orgResult.rows.length === 0 || locResult.rows.length === 0) {
    console.error("No organization or location found.");
    process.exit(1);
  }

  const organizationId = orgResult.rows[0].id;
  const locationId = locResult.rows[0].id;

  console.log(`Targeting Organization: ${organizationId}, Location: ${locationId}`);

  // --- 1. Dormant VIPs Trigger ---
  const dormantCustomerId = randomUUID();
  await db.insert(customers).values({
    id: dormantCustomerId,
    organizationId,
    name: 'Dormant Test VIP',
    phone: '9999999991',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  for (let i = 0; i < 4; i++) {
    const invId = randomUUID();
    await db.insert(salesInvoices).values({
      id: invId,
      organizationId,
      locationId,
      invoiceNumber: `DORM-VIP-${i + 1}`,
      invoiceDate: fortyFiveDaysAgo, // All 45 days ago
      customerId: dormantCustomerId,
      customerName: 'Dormant Test VIP',
      customerPhone: '9999999991',
      grandTotal: '5000.00',
      totalAmount: '5000.00',
      subtotalAmount: '5000.00',
      taxableAmount: '5000.00',
      issueDate: fortyFiveDaysAgo,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMode: 'CASH',
      createdUserId: randomUUID(),
      createdUserId: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      orderCategory: 'Dine-in'
    });
  }
  console.log("✅ Seeded Dormant Test VIP (4 invoices of ₹5000 exactly 45 days ago).");

  // --- 2. Average Order Value (AOV) Drop Trigger ---
  const aovDropCustomerId = randomUUID();
  await db.insert(customers).values({
    id: aovDropCustomerId,
    organizationId,
    name: 'AOV Drop Test',
    phone: '9999999992',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Insert 2 high-value invoices 60 days ago
  for (let i = 0; i < 2; i++) {
    const invId = randomUUID();
    await db.insert(salesInvoices).values({
      id: invId,
      organizationId,
      locationId,
      invoiceNumber: `AOV-HIGH-${i + 1}`,
      invoiceDate: sixtyDaysAgo,
      customerId: aovDropCustomerId,
      customerName: 'AOV Drop Test',
      customerPhone: '9999999992',
      grandTotal: '3000.00',
      totalAmount: '3000.00',
      subtotalAmount: '3000.00',
      taxableAmount: '3000.00',
      issueDate: sixtyDaysAgo,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMode: 'CASH',
      createdUserId: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      orderCategory: 'Dine-in'
    });
  }

  const today = new Date();
  
  // Insert 3 low-value invoices today
  for (let i = 0; i < 3; i++) {
    const invId = randomUUID();
    await db.insert(salesInvoices).values({
      id: invId,
      organizationId,
      locationId,
      invoiceNumber: `AOV-LOW-${i + 1}`,
      invoiceDate: today,
      customerId: aovDropCustomerId,
      customerName: 'AOV Drop Test',
      customerPhone: '9999999992',
      grandTotal: '150.00',
      totalAmount: '150.00',
      subtotalAmount: '150.00',
      taxableAmount: '150.00',
      issueDate: today,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMode: 'CASH',
      createdUserId: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      orderCategory: 'Takeaway'
    });
  }
  console.log("✅ Seeded AOV Drop Test (2 high-value 60d ago, 3 low-value today).");

  console.log("Dummy data seeding complete! You can now refresh your dashboard.");
  process.exit(0);
}

run().catch(console.error);
