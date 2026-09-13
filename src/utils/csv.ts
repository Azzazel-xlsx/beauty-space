/**
 * CSV Sanitization and Export Utility (RFC 4180 & OWASP CSV Formula Injection Defense)
 * Prevents CWE-1236 (Improper Neutralization of Formula Elements in a CSV File)
 */

/**
 * Sanitizes a single cell value before inclusion in a CSV file.
 * If the value starts with any formula-triggering character (=, +, -, @, tab, cr),
 * an apostrophe is prepended so Excel / Sheets treat it strictly as raw text.
 * Also escapes double-quotes according to RFC 4180 (" -> "").
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  // Pure numbers and booleans do not trigger formula execution
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  let str = String(value);

  // Check for formula triggers: =, +, -, @, \t, \r
  // Note: single negative sign on negative numbers is normal, but text starting with '-' or formula triggers must be sanitized.
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  const trimmed = str.trimStart();

  if (trimmed.length > 0 && formulaTriggers.includes(trimmed[0])) {
    // If it's a valid negative number, keep it as a number
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      str = `'${str}`;
    }
  }

  // Escape double-quotes by doubling them (RFC 4180)
  const escaped = str.replace(/"/g, '""');

  // Enclose in double-quotes
  return `"${escaped}"`;
}

/**
 * Builds an RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function buildCsvString(headers: string[], rows: (unknown[])[]): string {
  const headerRow = headers.map(h => sanitizeCsvCell(h)).join(',');
  const dataRows = rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(',')).join('\r\n');
  return '\uFEFF' + headerRow + '\r\n' + dataRows;
}
