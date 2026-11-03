export interface DateRangeResult {
  preset: "today" | "yesterday" | "this_week" | "this_month" | "custom";
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  fromDateTime: Date;
  toDateTime: Date;
  displayLabel: string;
}

export function resolveDateRange(
  preset?: string | null,
  customFrom?: string | null,
  customTo?: string | null
): DateRangeResult {
  const now = new Date();
  const formatYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const cleanPreset = (preset || "today").toLowerCase();

  if (cleanPreset === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    const yStr = formatYYYYMMDD(yesterday);
    return {
      preset: "yesterday",
      fromDate: yStr,
      toDate: yStr,
      fromDateTime: start,
      toDateTime: end,
      displayLabel: "Yesterday",
    };
  }

  if (cleanPreset === "this_week") {
    const start = new Date(now);
    const day = start.getDay(); // 0 is Sunday, 1 is Monday
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return {
      preset: "this_week",
      fromDate: formatYYYYMMDD(start),
      toDate: formatYYYYMMDD(end),
      fromDateTime: start,
      toDateTime: end,
      displayLabel: "This Week",
    };
  }

  if (cleanPreset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      preset: "this_month",
      fromDate: formatYYYYMMDD(start),
      toDate: formatYYYYMMDD(end),
      fromDateTime: start,
      toDateTime: end,
      displayLabel: "This Month",
    };
  }

  if (cleanPreset === "custom" && customFrom && customTo) {
    const start = new Date(customFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);

    return {
      preset: "custom",
      fromDate: customFrom,
      toDate: customTo,
      fromDateTime: start,
      toDateTime: end,
      displayLabel: `${customFrom} to ${customTo}`,
    };
  }

  // Default: Today
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const tStr = formatYYYYMMDD(now);

  return {
    preset: "today",
    fromDate: tStr,
    toDate: tStr,
    fromDateTime: startToday,
    toDateTime: endToday,
    displayLabel: "Today",
  };
}
