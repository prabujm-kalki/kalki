# Sales & Receivables: Basic User Manual

The **Sales & Receivables** module (often called Accounts Receivable or AR) is the financial engine that tracks money owed to your business by customers, and records when they actually pay you. 

While the "POS" handles daily walk-in cash sales, **Sales & Receivables** handles **B2B (Business-to-Business) credit sales** where you provide goods/services today and expect payment later.

---

## 1. Sales Summary
**1. What is the purpose?**
To give the Finance Manager a quick, high-level overview of the health of the company's collections. It tells you if cash is flowing in, or if customers are taking too long to pay.

**2. What inputs do we provide?**
None. It automatically reads data from all your existing Invoices, Receipts, and Credit Notes.

**3. What is the expected workflow?**
You open the dashboard. The system instantly calculates the totals for the current month.

**4. What is the expected output/result?**
A visual dashboard showing:
- Total Outstanding AR (money you are owed right now)
- Amount Invoiced this month vs Amount Collected this month
- How much of the outstanding money is "Current" vs "Overdue".

**5. How does it connect?**
It acts as the "lens" that aggregates data from **Invoices**, **Receipts**, and **Aging**, providing a single source of truth for the Finance team.

---

## 2. Invoices (Customer Invoices)
**1. What is the purpose?**
To officially request payment from a customer for goods or services provided on credit.

**2. What inputs do we provide?**
- Customer Name
- Invoice Date & Due Date
- Line items (what you sold, quantity, price)
- Tax amounts

**3. What is the expected workflow?**
1. You create an invoice for a customer.
2. The system checks the customer's "Credit Limit" to ensure they haven't exceeded their allowed debt.
3. The invoice is marked as **Open**.

**4. What is the expected output/result?**
A generated Invoice document that can be sent to the customer.

**5. How does it connect?**
- **To Accounting:** It automatically creates a Journal Entry increasing Revenue (Credit) and increasing Accounts Receivable (Debit).
- **To Customer Balance:** It increases the amount the customer owes you.
- **To Aging:** The due date dictates when this invoice will become "overdue".

---

## 3. Receipts (Customer Payments)
**1. What is the purpose?**
To record money received from a customer and apply it against their open invoices.

**2. What inputs do we provide?**
- Customer Name
- Amount Received & Payment Method (Bank Transfer, Cheque, etc.)
- Reference Number (e.g., Transaction ID)
- Which specific Open Invoices this money should pay for (Allocations).

**3. What is the expected workflow?**
1. Customer sends you a bank transfer for ₹5,000.
2. You open "Receipts", select the customer, and enter ₹5,000.
3. The system shows all their unpaid invoices.
4. You allocate the ₹5,000 to the specific invoices they intended to pay.

**4. What is the expected output/result?**
The selected invoices update their status from **Open** to **Paid** (or they remain Open but with a reduced remaining balance).

**5. How does it connect?**
- **To Accounting:** It creates a Journal Entry increasing Cash in Bank (Debit) and reducing Accounts Receivable (Credit).
- **To Customer Balance:** It immediately reduces the total amount the customer owes you.

---

## 4. Credit Notes / Refunds
**1. What is the purpose?**
To reduce the amount a customer owes you without them actually paying cash (used for returns, damages, or billing errors).

**2. What inputs do we provide?**
- Customer Name
- Original Invoice Number (optional)
- Amount to credit
- Reason (e.g., "Goods damaged in transit")

**3. What is the expected workflow?**
1. Customer complains about a damaged item worth ₹1,000.
2. You issue a Credit Note for ₹1,000.
3. This credit is applied to their account.

**4. What is the expected output/result?**
A Credit Note document is generated and the customer's debt is legally reduced.

**5. How does it connect?**
- **To Accounting:** It creates a reverse Journal Entry, reducing Revenue (Debit) and reducing Accounts Receivable (Credit).
- **To Customer Balance:** It reduces the total amount the customer owes you, just like a Receipt does, but without cash changing hands.

---

## 5. Customer Balance (Statement of Account)
**1. What is the purpose?**
To show exactly how much a specific customer owes you at this exact moment, acting as a mini-ledger for that single customer.

**2. What inputs do we provide?**
None. It is automatically calculated by the system.

**3. What is the expected workflow?**
You search for a customer to see their history before approving a new sale, or you generate a PDF "Statement of Account" at the end of the month to email them as a reminder of what they owe.

**4. What is the expected output/result?**
A clear table showing: 
`Total Invoiced` - `Total Receipts` - `Credit Notes` = `Current Outstanding Balance`.

**5. How does it connect?**
It is the mathematical sum of **Invoices**, **Receipts**, and **Credit Notes** combined. It acts as the gatekeeper for future sales (blocking sales if the balance exceeds the Credit Limit).

---

## 6. Aging (Ageing Report)
**1. What is the purpose?**
To categorize unpaid invoices based on *how late* they are, helping the collections team prioritize who to call.

**2. What inputs do we provide?**
None. It relies strictly on the "Due Dates" of Open Invoices.

**3. What is the expected workflow?**
The AR Clerk opens the Aging report every Monday morning to see which customers have crossed the 30-day or 60-day overdue mark.

**4. What is the expected output/result?**
A table that splits unpaid money into "Buckets":
- Current (Not due yet)
- 1 to 30 Days Overdue
- 31 to 60 Days Overdue
- 90+ Days Overdue

**5. How does it connect?**
- **To Invoices & Receipts:** It only looks at the *Remaining Balance* of invoices. If an invoice is fully paid by a Receipt, it disappears from this report immediately.
- **To Finance:** Extremely overdue amounts (90+ days) eventually require the Finance Manager to write them off as "Bad Debt" in the General Ledger.
