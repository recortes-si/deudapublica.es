function initSpending({ data, format, escapeHtml }) {
  const colors = ['var(--blue)', 'var(--acid)', 'var(--orange)', '#bac5ca'];
  const spendingSelect = document.querySelector('#spending-year');
  function renderSpending(year) {
    const observation = data.spendingHistory.find(row => row.year === Number(year));
    const featured = data.config.featuredSpendingCodes.map(code => observation.items.find(item => item.code === code));
    const highestShare = Math.max(...featured.map(item => item.share));
    document.querySelector('#spending-description').textContent = `Gasto de todas las Administraciones Públicas en ${year}${observation.provisional ? ' (provisional)' : ''}: ${format(observation.total, 0)} M€.`;
    document.querySelector('#spending-bars').innerHTML = featured.map((item, index) => `<div class="bar-row"><span>${escapeHtml(item.name)}</span><div class="bar-track"><div class="bar-fill ${index === 1 ? 'acid' : index === 2 ? 'orange' : ''}" style="width:${item.share / highestShare * 100}%"></div></div><b class="bar-value">${format(item.share)}%</b></div>`).join('');
    const rest = Math.max(0, 100 - featured.slice(0,3).reduce((sum, item) => sum + item.share, 0));
    const donutItems = [...featured.slice(0,3), { name: 'Resto de funciones', share: rest }];
    let cursor = 0;
    const stops = donutItems.map((item, index) => { const start = cursor; cursor += item.share; return `${colors[index]} ${start}% ${cursor}%`; });
    const donut = document.querySelector('#spending-donut');
    donut.style.background = `conic-gradient(${stops.join(',')})`;
    donut.setAttribute('aria-label', `Gasto ${year}: ${donutItems.map(item => `${item.name}, ${format(item.share)}%`).join('; ')}`);
    document.querySelector('#spending-legend').innerHTML = donutItems.map((item, index) => `<div><i style="background:${colors[index]}"></i><span><b>${format(item.share)}%</b>${escapeHtml(item.name)}</span></div>`).join('');
  }
  spendingSelect.addEventListener('change', event => renderSpending(event.target.value));
  renderSpending(spendingSelect.value);

}
