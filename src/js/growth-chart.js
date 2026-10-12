function initGrowthChart({ data, format, reducedMotion, charts }) {
  const rows = data.gdpPerCapita.series;
  const baseYear = data.gdpPerCapita.baseYear;
  const base = rows.find(row => row.year === baseYear);
  if (!base) throw new Error(`PIB per cápita: falta el año base ${baseYear}`);
  const index = (value, baseValue) => value / baseValue * 100;
  const defs = [
    { name: 'PIB total', key: 'gdp', color: '#10243e', width: 3, type: 'solid' },
    { name: 'PIB per cápita', key: 'pcap', color: '#a84919', width: 3, type: 'solid' },
    { name: 'PIB per cápita real', key: 'pcapReal', color: '#436828', width: 3, type: 'dashed' }
  ];
  const chart = charts.init(document.querySelector('#gdp-pcap-chart'),'growth');
  function render() {
    chart.setOption({
      animation: !reducedMotion.matches,
      color: defs.map(d => d.color),
      tooltip: { trigger: 'axis', confine: true, formatter: params => `<strong>${params[0].axisValue}</strong><br>${params.map(p => `${p.marker}${p.seriesName}: índice ${format(p.value, 0)} (100 = ${baseYear})`).join('<br>')}` },
      legend: { top: 0, right: 0, textStyle: { color: '#526579', fontSize: 11 } },
      grid: { left: 48, right: 18, top: 42, bottom: 30 },
      xAxis: { type: 'category', boundaryGap: false, data: rows.map(row => row.year), axisLabel: { fontSize: 10, interval: Math.max(0, Math.floor(rows.length / 5) - 1) } },
      yAxis: { type: 'value', name: 'Índice', nameTextStyle: { fontSize: 10 }, min: 0, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#e2e8e6' } } },
      series: defs.map(d => ({ name: d.name, type: 'line', data: rows.map(row => Math.round(index(row[d.key], base[d.key]) * 10) / 10), smooth: false, showSymbol: false, lineStyle: { width: d.width, type: d.type }, itemStyle: { color: d.color } }))
    }, true);
  }
  render();
  return { resize: () => chart.resize(), refresh: render };
}
