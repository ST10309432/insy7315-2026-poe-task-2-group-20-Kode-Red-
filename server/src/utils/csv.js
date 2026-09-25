/** Turn rows (array of objects) into CSV text. Values are quoted and formula-injection safe for Excel. */
function toCsv(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
  const cell = v => {
    if (v === null || v === undefined) return '';
    let s = v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`; // stop Excel treating text as a formula
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

function sendCsv(res, filename, rows, columns) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + toCsv(rows, columns)); // BOM so Excel reads UTF-8 correctly
}

module.exports = { toCsv, sendCsv };
