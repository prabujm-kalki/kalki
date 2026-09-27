const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/RunPayrollWizard.tsx', 'utf8');

// Fix title
code = code.replace(/Run Monthly\s*Payroll/g, 'Run {payBasis.charAt(0) + payBasis.slice(1).toLowerCase()} Payroll');

// Add selectedWeek
code = code.replace(
  'const [selectedMonth, setSelectedMonth] = useState("");',
  'const [selectedMonth, setSelectedMonth] = useState("");\n  const [selectedWeek, setSelectedWeek] = useState("");'
);

// Add getDatesFromWeek
code = code.replace(
  'const handleGeneratePreview = async () => {',
  `
  const getDatesFromWeek = (weekStr: string) => {
    const [yearStr, wStr] = weekStr.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(wStr, 10);
    const jan1 = new Date(year, 0, 1);
    const daysOffset = jan1.getDay() <= 4 ? (jan1.getDay() === 0 ? 1 : 1 - jan1.getDay()) : 8 - jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + daysOffset);
    const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const format = (d: Date) => \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, "0")}-\${String(d.getDate()).padStart(2, "0")}\`;
    return { s: format(start), e: format(end) };
  };

  const handleGeneratePreview = async () => {`
);

// Fix handleGeneratePreview logic
const pLogic = `
    if (payBasis === "MONTHLY") {
      if (!selectedMonth) return setError("Please select a month.");
      const [year, month] = selectedMonth.split("-");
      const sDate = new Date(Number(year), Number(month) - 1, 1);
      const eDate = new Date(Number(year), Number(month), 0); // Last day of month
      pStart =
        sDate.getFullYear() +
        "-" +
        String(sDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(sDate.getDate()).padStart(2, "0");
      pEnd =
        eDate.getFullYear() +
        "-" +
        String(eDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(eDate.getDate()).padStart(2, "0");
    } else if (payBasis === "WEEKLY") {
      if (!selectedWeek) return setError("Please select a week.");
      const { s, e } = getDatesFromWeek(selectedWeek);
      pStart = s;
      pEnd = e;
    } else {
      if (!pStart || !pEnd) {
        setError("Please select both start and end dates.");
        return;
      }
    }
`;
code = code.replace(/if \(payBasis === "MONTHLY"\) \{[\s\S]*?\} else \{[\s\S]*?\}\n/, pLogic);

// Fix handleFinalize
const fLogic = `
        periodStart:
          payBasis === "MONTHLY"
            ? (() => {
                const [y, m] = selectedMonth.split("-");
                return \`\${y}-\${m}-01\`;
              })()
            : payBasis === "WEEKLY"
              ? getDatesFromWeek(selectedWeek).s
              : periodStart,
        periodEnd:
          payBasis === "MONTHLY"
            ? (() => {
                const [y, m] = selectedMonth.split("-");
                const e = new Date(Number(y), Number(m), 0);
                return \`\${e.getFullYear()}-\${String(e.getMonth() + 1).padStart(2, "0")}-\${String(e.getDate()).padStart(2, "0")}\`;
              })()
            : payBasis === "WEEKLY"
              ? getDatesFromWeek(selectedWeek).e
              : periodEnd,
        previewData,
`;
// Carefully replace inside handleFinalize ONLY
const hF = code.indexOf('const handleFinalize = async () => {');
const hE = code.indexOf('} catch (e) {', hF);
const subCode = code.substring(hF, hE);
const newSubCode = subCode.replace(/periodStart:[\s\S]*?periodEnd:[\s\S]*?: periodEnd,\n\s*previewData,/m, fLogic);
code = code.substring(0, hF) + newSubCode + code.substring(hE);

// Fix UI
const uiPickers = `
            {payBasis === "MONTHLY" ? (
              <div className="kalki-form-group">
                <label>Select Month</label>
                <input
                  type="month"
                  className="kalki-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ maxWidth: "300px" }}
                />
              </div>
            ) : payBasis === "WEEKLY" ? (
              <div className="kalki-form-group">
                <label>Select Week</label>
                <input
                  type="week"
                  className="kalki-input"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  style={{ maxWidth: "300px" }}
                />
              </div>
            ) : (
`;
code = code.replace(/\{\s*payBasis === "MONTHLY" \? \([\s\S]*?\) : \(/, uiPickers);

fs.writeFileSync('src/components/payroll/RunPayrollWizard.tsx', code);
