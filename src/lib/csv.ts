// CSV Export Utility for OwnsBill

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
) {
  if (data.length === 0) {
    alert("রপ্তানি করার জন্য কোনো ডেটা নেই!");
    return;
  }

  // Build CSV Header row
  const headerRow = headers.map((h) => `"${String(h.label).replace(/"/g, '""')}"`).join(",");

  // Build CSV Data rows
  const dataRows = data.map((item) => {
    return headers
      .map((h) => {
        const val = item[h.key];
        const formattedVal = val === undefined || val === null ? "" : String(val);
        return `"${formattedVal.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n"); // Add UTF-8 BOM for Bengali support in Excel
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
