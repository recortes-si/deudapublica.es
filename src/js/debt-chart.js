function initDebtChart({ data, format, reducedMotion }) {
  const latest = data.latest;
  const debtChart = echarts.init(document.querySelector('#debt-chart'), null, { renderer: 'canvas' });
  let debtMode = 'euros';
  let debtPeriod = 'all';
  const lime = '#d7f84b', orange = '#ff715b';
  const crisis = ['2008', '2020'];

  const crisisMarks = rows => {
    const present = crisis.filter(year => rows.some(row => row.year === Number(year)));
    return present.length ? present.map(year => ({ xAxis: year, label: { show: true, position: 'insideEndTop', formatter: year === '2008' ? 'crisis' : 'covid', color: '#a4b8cb', fontSize: 9 } })) : [];
  };
  const ratioMarks = () => ({
    silent: true, symbol: 'none',
    label: { show: true, position: 'insideEndTop', formatter: '{b}', color: '#a4b8cb', fontSize: 9 },
    lineStyle: { color: '#68788b', type: 'dashed' },
    data: [{ yAxis: 60, name: '60 %' }, { yAxis: 100, name: '100 %' }]
  });

  function renderDebt() {
    const rows = data.debt.filter(row => debtPeriod === 'all' || row.year > latest.year - Number(debtPeriod));
    const first = rows[0], last = rows.at(-1);
    const unit = document.querySelector('#debt-unit');

    if (debtMode === 'both') {
      unit.textContent = `€ total y % del PIB · ${first.year}—${last.year}`;
      debtChart.setOption({
        animation: !reducedMotion.matches,
        color: [lime, orange],
        tooltip: { confine: true, trigger: 'axis', backgroundColor: '#10243e', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 }, formatter: params => { const e = params.find(p => p.seriesName === 'Deuda'); const r = params.find(p => p.seriesName === 'Deuda / PIB'); return `<strong>${params[0].axisValue}</strong><br>${e.marker} Deuda: ${format(e.value, 2)} bill. €<br>${r.marker} Sobre el PIB: ${format(r.value)}%`; } },
        legend: { top: 0, right: 0, textStyle: { color: '#a4b8cb', fontSize: 11 }, data: ['Deuda', 'Deuda / PIB'] },
        grid: { left: 58, right: 58, top: 34, bottom: 34 },
        xAxis: { type: 'category', boundaryGap: false, data: rows.map(row => row.year), axisLine: { lineStyle: { color: '#52667d' } }, axisLabel: { color: '#a4b8cb', fontSize: 10, interval: Math.max(0, Math.floor(rows.length / 5) - 1) } },
        yAxis: [
          { type: 'value', name: '€ billones', nameTextStyle: { color: '#a4b8cb', fontSize: 10 }, min: 0, axisLabel: { color: '#a4b8cb', fontSize: 10, formatter: value => format(value, 1) }, splitLine: { lineStyle: { color: '#2d405b' } } },
          { type: 'value', name: '% del PIB', nameTextStyle: { color: '#a4b8cb', fontSize: 10 }, min: 0, axisLabel: { color: '#a4b8cb', fontSize: 10, formatter: value => value + '%' }, splitLine: { show: false } }
        ],
        series: [
          { name: 'Deuda', type: 'line', data: rows.map(row => row.euros), smooth: false, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3 }, itemStyle: { color: lime, borderColor: '#10243e', borderWidth: 2 }, areaStyle: { color: 'rgba(215,248,75,.14)' } },
          { name: 'Deuda / PIB', type: 'line', yAxisIndex: 1, data: rows.map(row => row.ratio), smooth: false, symbol: 'circle', symbolSize: 5, lineStyle: { width: 3 }, itemStyle: { color: orange, borderColor: '#10243e', borderWidth: 2 }, markLine: ratioMarks() }
        ]
      }, true);
    } else {
      const isRatio = debtMode === 'pib';
      const isPerCapita = debtMode === 'percapita';
      const color = isRatio ? orange : lime;
      const values = rows.map(row => isRatio ? row.ratio : isPerCapita ? row.perCapita : row.euros);
      unit.textContent = `${isRatio ? 'En porcentaje del PIB' : isPerCapita ? 'En euros por habitante' : 'En billones de euros'} · ${first.year}—${last.year}`;
      debtChart.setOption({
        animation: !reducedMotion.matches,
        color: [color],
        tooltip: { confine: true, trigger: 'axis', backgroundColor: color, borderWidth: 0, textStyle: { color: '#10243e', fontSize: 12 }, formatter: params => { const point = params[0]; const text = isRatio ? format(point.value) + '% del PIB' : isPerCapita ? format(point.value, 0) + ' € por habitante' : format(point.value, 2) + ' bill. €'; return `<strong>${text}</strong><br>${point.axisValue}`; } },
        grid: { left: isRatio || isPerCapita ? 52 : 58, right: 15, top: 18, bottom: 34 },
        xAxis: { type: 'category', boundaryGap: false, data: rows.map(row => row.year), axisLine: { lineStyle: { color: '#52667d' } }, axisLabel: { color: '#a4b8cb', fontSize: 10, interval: Math.max(0, Math.floor(rows.length / 5) - 1) } },
        yAxis: { type: 'value', min: 0, axisLabel: { color: '#a4b8cb', fontSize: 10, formatter: value => isRatio ? value + '%' : isPerCapita ? format(value, 0) : format(value, 1) }, splitLine: { lineStyle: { color: '#2d405b' } } },
        series: [{ type: 'line', data: values, smooth: false, symbol: 'circle', symbolSize: 6, lineStyle: { width: 3 }, itemStyle: { borderColor: '#10243e', borderWidth: 2 }, areaStyle: { color: 'rgba(215,248,75,.2)' }, markLine: isRatio ? ratioMarks() : !isPerCapita && crisisMarks(rows).length ? { silent: true, symbol: 'none', lineStyle: { color: '#68788b', type: 'dashed' }, data: crisisMarks(rows) } : undefined }]
      }, true);
    }
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
