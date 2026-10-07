"use client";

import {
  ShoppingCart,
  FileText,
  Users,
  Clock,
  TrendingUp,
  IndianRupee,
  Undo2,
  ChevronDown,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const trendData = [
  { name: "Apr", sales: 900000, orders: 1100000 },
  { name: "May", sales: 1400000, orders: 1800000 },
  { name: "Jun", sales: 1800000, orders: 2300000 },
  { name: "Jul", sales: 1300000, orders: 1500000 },
  { name: "Aug", sales: 1700000, orders: 2100000 },
  { name: "Sep", sales: 2100000, orders: 2000000 },
  { name: "Oct", sales: 3200000, orders: 2500000 },
  { name: "Nov", sales: 2200000, orders: 2800000 },
  { name: "Dec", sales: 2600000, orders: 3000000 },
];

const categoryData = [
  { name: "Dine-in", value: 42, color: "#22c55e" },
  { name: "Takeaway", value: 28, color: "#3b82f6" },
  { name: "Home Delivery", value: 18, color: "#f59e0b" },
  { name: "Department Store", value: 8, color: "#a855f7" },
  { name: "Catering", value: 4, color: "#ec4899" },
];

const recentSales = [
  { id: "INV-00258", date: "06 Oct 2026", customer: "Walk-in Customer", type: "POS", amount: "1,250", status: "Paid" },
  { id: "INV-00257", date: "06 Oct 2026", customer: "Ramesh Kumar", type: "Invoice", amount: "3,450", status: "Unpaid" },
  { id: "INV-00256", date: "05 Oct 2026", customer: "Walk-in Customer", type: "POS", amount: "890", status: "Paid" },
  { id: "INV-00255", date: "05 Oct 2026", customer: "Priya Catering", type: "Invoice", amount: "12,500", status: "Partially Paid" },
  { id: "INV-00254", date: "04 Oct 2026", customer: "Walk-in Customer", type: "POS", amount: "760", status: "Paid" },
];

const topCustomers = [
  { initials: "KR", name: "Kumar Hotels", amount: "1,25,000", orders: 24, bg: "#f3e8fd", color: "#8430ce" },
  { initials: "PS", name: "Priya Catering", amount: "98,500", orders: 18, bg: "#e8f0fe", color: "#1a73e8" },
  { initials: "RK", name: "Ramesh Kumar", amount: "78,400", orders: 16, bg: "#e8f0fe", color: "#1a73e8" },
  { initials: "HS", name: "Hotel Saravana", amount: "65,200", orders: 12, bg: "#e8f0fe", color: "#1a73e8" },
  { initials: "WL", name: "Walk-in Customers", amount: "4,25,000", orders: 620, bg: "#e8f0fe", color: "#1a73e8" },
];

export function SalesOverview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "1200px", margin: "0 auto", width: "100%", zoom: 0.75 }}>
      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
        {/* Card 1 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <ShoppingCart size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Sales</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold" }}>₹ 18,42,500</div>
            <div style={{ fontSize: "0.65rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ↑ 12.4% <span style={{ color: "#9ca3af" }}>vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total Invoices</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold" }}>186</div>
            <div style={{ fontSize: "0.65rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ↑ 8.1% <span style={{ color: "#9ca3af" }}>vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#ffedd5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Receivables</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold" }}>₹ 2,45,000</div>
            <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>
              12 customers
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Overdue</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#dc2626" }}>₹ 80,000</div>
            <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>
              5 customers
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="card" style={{ padding: "1rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#f3e8fd", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea" }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Avg Order Value</div>
            <div style={{ fontSize: "1.125rem", fontWeight: "bold" }}>₹ 985</div>
            <div style={{ fontSize: "0.65rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ↑ 6.2% <span style={{ color: "#9ca3af" }}>vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "0.75rem" }}>
        {/* Trend Chart */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Sales Trend</h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", color: "#6b7280" }}>Daily</span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", color: "#6b7280" }}>Weekly</span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", backgroundColor: "#eff6ff", color: "#2563eb", borderRadius: "0.375rem" }}>Monthly</span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", border: "1px solid #e5e7eb", borderRadius: "0.375rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.25rem" }}>This Year <ChevronDown size={12}/></span>
            </div>
          </div>
          <div style={{ height: "220px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(val) => val === 0 ? "0" : `${val/100000}L`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [name === "sales" ? `₹ ${(value/100000).toFixed(2)}L` : value, name === "sales" ? "Sales" : "Orders"]}
                  labelStyle={{ color: "#374151", fontWeight: "bold", marginBottom: "0.25rem", fontSize: "11px" }}
                  contentStyle={{ borderRadius: "0.5rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} formatter={(value) => <span style={{ color: "#374151" }}>{value === "sales" ? "Sales" : "No. of Orders"}</span>}/>
                <Bar yAxisId="left" dataKey="sales" barSize={24} fill="#7cb3ff" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "0.5rem", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>Sales by Category</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ height: "150px", width: "100%", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val}%`} contentStyle={{ borderRadius: "0.5rem", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#1f2937" }}>₹ 18.42L</div>
                <div style={{ fontSize: "0.65rem", color: "#6b7280" }}>Total Sales</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              {categoryData.map((cat, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: cat.color }}></div>
                    <span style={{ color: "#374151" }}>{cat.name}</span>
                  </div>
                  <span style={{ fontWeight: "500", color: "#1f2937" }}>{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
        <button className="card" style={{ padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#f0fdf4", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <ShoppingCart size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#166534", fontSize: "0.875rem" }}>New POS Sale</div>
            <div style={{ fontSize: "0.65rem", color: "#166534", opacity: 0.8 }}>Open Cashier</div>
          </div>
        </button>

        <button className="card" style={{ padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#eff6ff", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <FileText size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem" }}>Create Invoice</div>
            <div style={{ fontSize: "0.65rem", color: "#1e40af", opacity: 0.8 }}>Customer Invoice</div>
          </div>
        </button>

        <button className="card" style={{ padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#f5f3ff", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <IndianRupee size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#5b21b6", fontSize: "0.875rem" }}>Record Receipt</div>
            <div style={{ fontSize: "0.65rem", color: "#5b21b6", opacity: 0.8 }}>Customer Payment</div>
          </div>
        </button>

        <button className="card" style={{ padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "#faf5ff", border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <Undo2 size={16} />
          </div>
          <div>
            <div style={{ fontWeight: "600", color: "#6b21a8", fontSize: "0.875rem" }}>Credit Note</div>
            <div style={{ fontSize: "0.65rem", color: "#6b21a8", opacity: 0.8 }}>Refund / Return</div>
          </div>
        </button>

        <button className="card" style={{ padding: "0.75rem", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", border: "1px solid #e5e7eb", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>•••</div>
            <div style={{ fontWeight: "600", color: "#374151", fontSize: "0.875rem" }}>More Actions</div>
          </div>
          <ChevronDown size={14} color="#6b7280" />
        </button>
      </div>

      {/* Tables Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.75rem" }}>
        {/* Recent Sales Table */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Recent Sales</h3>
            <a href="#" style={{ fontSize: "0.75rem", color: "#2563eb", textDecoration: "none" }}>View All →</a>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#6b7280", textAlign: "left" }}>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>#</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Date</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Customer</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Type</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Amount</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, i) => (
                <tr key={i} style={{ borderBottom: i !== recentSales.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "0.75rem 0", color: "#2563eb" }}>{sale.id}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>{sale.date}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>{sale.customer}</td>
                  <td style={{ padding: "0.75rem 0", color: "#6b7280" }}>{sale.type}</td>
                  <td style={{ padding: "0.75rem 0", color: "#374151" }}>₹ {sale.amount}</td>
                  <td style={{ padding: "0.75rem 0" }}>
                    <span style={{
                      padding: "0.2rem 0.4rem",
                      borderRadius: "9999px",
                      fontSize: "0.65rem",
                      fontWeight: "500",
                      backgroundColor: sale.status === "Paid" ? "#dcfce7" : sale.status === "Unpaid" ? "#fee2e2" : "#ffedd5",
                      color: sale.status === "Paid" ? "#166534" : sale.status === "Unpaid" ? "#991b1b" : "#9a3412"
                    }}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Customers Table */}
        <div className="card" style={{ padding: "1.25rem", borderRadius: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Top Customers</h3>
            <a href="#" style={{ fontSize: "0.75rem", color: "#2563eb", textDecoration: "none" }}>View All →</a>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", color: "#6b7280", textAlign: "left" }}>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500" }}>Customer</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500", textAlign: "right" }}>Sales Amount</th>
                <th style={{ paddingBottom: "0.5rem", fontWeight: "500", textAlign: "right" }}>Orders</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((cust, i) => (
                <tr key={i} style={{ borderBottom: i !== topCustomers.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: cust.bg, color: cust.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "600" }}>
                      {cust.initials}
                    </div>
                    <span style={{ color: "#374151" }}>{cust.name}</span>
                  </td>
                  <td style={{ padding: "0.5rem 0", color: "#374151", textAlign: "right" }}>₹ {cust.amount}</td>
                  <td style={{ padding: "0.5rem 0", color: "#6b7280", textAlign: "right" }}>{cust.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
