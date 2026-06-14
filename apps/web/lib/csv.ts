// Tiny, dependency-free CSV export helper.
// `toCsv` is pure (easy to reason about / test); `downloadCsv` triggers a browser download.

type Row = Record<string, string | number | null | undefined>;

/** Build an RFC-4180-ish CSV string from an array of flat objects. Keys of the
 *  first row become the header. Values are escaped; a UTF-8 BOM is prepended so
 *  Excel opens accented characters correctly. */
export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}

/** Download `rows` as a CSV file named `filename`. No-op (returns false) when empty. */
export function downloadCsv(filename: string, rows: Row[]): boolean {
  if (rows.length === 0) return false;
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Today's date as YYYY-MM-DD, handy for export filenames. */
export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
