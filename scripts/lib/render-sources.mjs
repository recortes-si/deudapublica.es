// Keep source cards independent from chart and financial templates.
export function sourceCards(sources, { escapeHtml }) {
  const link = (url, label, title, className = '') => `<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label + ': ' + title)}">${label} <span aria-hidden="true">↗</span></a>`;
  return sources.map(source => {
    const licenseUrl = /^https?:\/\//.test(source.license || '');
    const notes = source.note || (!licenseUrl && source.license ? source.license : '');
    const details = notes || licenseUrl ? `<details class="source-notes"><summary>Notas y condiciones de uso</summary>${notes ? `<p>${escapeHtml(notes)}</p>` : ''}${licenseUrl ? link(source.license, 'Condiciones de uso', source.publisher) : ''}</details>` : '';
    return `<li><article class="source-item"><div class="source-card-top"><span class="source-publisher">${escapeHtml(source.publisher)}</span><span class="source-kind">${source.file ? 'Datos' : 'Referencia'}</span></div><h3>${escapeHtml(source.title)}</h3><dl class="source-metadata"><div><dt>Periodo</dt><dd>${escapeHtml(source.period)}</dd></div><div><dt>Actualización</dt><dd><time datetime="${escapeHtml(source.updated)}">${escapeHtml(source.updated)}</time></dd></div></dl><div class="source-actions">${link(source.url, 'Consultar fuente', source.title, 'source-primary')}${source.download && source.download !== source.url ? link(source.download, 'Datos originales', source.title) : ''}</div>${details}</article></li>`;
  }).join('');
}
