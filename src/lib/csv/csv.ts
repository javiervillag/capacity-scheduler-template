export type CsvResult<T> = {
  rows: T[];
  errors: string[];
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): CsvResult<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ["CSV is empty."] };

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows: Record<string, string>[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const cells = splitCsvLine(line);
    if (cells.length !== headers.length) {
      errors.push(`Row ${index + 2}: expected ${headers.length} columns, found ${cells.length}.`);
      return;
    }
    rows.push(Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])));
  });

  return { rows, errors };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const stringValue = String(value ?? "");
    return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function requireColumns(rows: Record<string, string>[], columns: string[]) {
  const available = new Set(Object.keys(rows[0] ?? {}));
  return columns.filter((column) => !available.has(column));
}
