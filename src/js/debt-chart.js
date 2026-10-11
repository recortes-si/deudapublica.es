function initDebtChart({ data, format, reducedMotion }) {
  const latest = data.latest;
  const debtChart = echarts.init(document.querySelector('#debt-chart'), null, { renderer: 'canvas' });
  let debtMode = 'euros';
  let debtPeriod = 'all';
  function renderDebt() {
    const isRatio = debtMode === 'pib';
    const rows = data.debt.filter(row => debtPeriod === 'all' || row.year > latest.year - Number(debtPeriod));
    const values = rows.map(row => isRatio ? row.ratio : row.euros);
    document.querySelector('#debt-unit').textContent = `${isRatio ? 'En porcentaje del PIB' : 'En billones de euros'} · ${rows[0].year}—${rows.at(-1).year}`;
    debtChart.setOption({
      animation: !reducedMotion.matches,
      color: ['#d7f84b'],
      tooltip: { confine: true, trigger: 'axis', backgroundColor: '#d7f84b', borderWidth: 0, textStyle: { color: '#10243e', fontSize: 12 }, formatter: params => { const point = params[0]; return `<strong>${isRatio ? format(point.value) + '%' : format(point.value, 2) + ' bill. €'}</strong><br>${point.axisValue}`; } },
      grid: { left: isRatio ? 44 : 58, right: 15, top: 18, bottom: 34 },
      xAxis: { type: 'category', boundaryGap: false, data: rows.map(row => row.year), axisLine: { lineStyle: { color: '#52667d' } }, axisLabel: { color: '#a4b8cb', fontSize: 10, interval: Math.max(0, Math.floor(rows.length / 5) - 1) } },
      yAxis: { type: 'value', min: 0, axisLabel: { color: '#a4b8cb', fontSize: 10, formatter: value => isRatio ? value + '%' : format(value, 1) }, splitLine: { lineStyle: { color: '#2d405b' } } },
      series: [{ type: 'line', data: values, smooth: false, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3 }, itemStyle: { borderColor: '#10243e', borderWidth: 2 }, areaStyle: { color: 'rgba(215,248,75,.2)' } }]
    }, true);
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    debtMode = button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    renderDebt();
  }));
  document.querySelector('#debt-period').addEventListener('change', event => { debtPeriod = event.target.value; renderDebt(); });
  renderDebt();

  return { resize: () => debtChart.resize(), refresh: renderDebt };
}
