// RFC-style CSV reader: quoted commas, escaped quotes, CRLF and multiline cells.
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV: comillas sin cerrar');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function numeric(value, context, { positive = false } = {}) {
  const result = Number(String(value ?? '').replace(',', '.'));
  if (value == null || String(value).trim() === '' || !Number.isFinite(result) || result < 0 || (positive && result === 0)) {
    throw new Error(`${context}: se esperaba un número ${positive ? 'positivo' : 'no negativo'}, recibido ${value}`);
  }
  return result;
}
