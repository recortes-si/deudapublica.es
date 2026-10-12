// Modules receive their dependencies explicitly and keep their state private.
function createContext(data) {
  const format = (value, digits = 1) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const signed = (value, digits = 0) => `${value < 0 ? '−' : '+'}${format(Math.abs(value), digits)}`;
  return { charts: createChartTheme(), data, format, escapeHtml, signed, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)') };
}
