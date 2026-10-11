function initBudget({ data, format, escapeHtml, reducedMotion }) {
  const budgetChart = echarts.init(document.querySelector('#budget-chart'), null, { renderer: 'canvas' });
  const budgetBack = document.querySelector('#budget-back');
  const budgetHome = document.querySelector('#budget-home');
  const budgetSummary = document.querySelector('#budget-level-summary');
  const budgetPath = document.querySelector('#budget-path');
  const budgetList = document.querySelector('#budget-list');
  const budgetStack = [data.budget.root];
  const budgetColors = ['#80b9e8', '#d7f84b', '#ff9a85', '#b6c5d6', '#f2c66d', '#89c9c0', '#c3a0ee', '#98cfb6', '#e7ae87', '#98b7df'];
  const budgetNumber = value => `${format(value, 0)} M€`;
  const nodeTotal = node => node.children ? node.children.reduce((sum, child) => sum + nodeTotal(child), 0) : node.value;
  function enterBudget(node) { budgetStack.push(node); drawBudget(node); }
  function drawBudget(node, animate = !reducedMotion.matches) {
    const items = node.children || [];
    const levelTotal = items.reduce((sum, item) => sum + nodeTotal(item), 0);
    budgetBack.disabled = budgetStack.length === 1;
    budgetHome.disabled = budgetStack.length === 1;
    budgetSummary.textContent = `${budgetNumber(levelTotal)} · ${format(levelTotal / data.budget.total * 100, 1)}% del presupuesto estatal · ${items.length} partidas${node.sourceLocator ? ' · ' + node.sourceLocator : ''}`;
    budgetPath.textContent = budgetStack.map(item => item.name).join(' / ');
    budgetList.innerHTML = items.map((item,index) => `<li>${item.children ? `<button type="button" data-budget-index="${index}">${escapeHtml(item.name)} <span>Explorar →</span></button>` : `<span>${escapeHtml(item.name)}${item.code ? ` <small>· ${escapeHtml(item.code)}</small>` : ''}</span>`}<b>${budgetNumber(nodeTotal(item))}<small>${format(nodeTotal(item) / levelTotal * 100, 1)}% del nivel</small></b></li>`).join('');
    budgetChart.setOption({
      animation: animate,
      color: budgetColors,
      tooltip: { confine: true, trigger: 'item', backgroundColor: '#10243e', borderWidth: 0, textStyle: { color: '#fff', fontSize: 12 }, formatter: params => `<strong>${escapeHtml(params.name)}</strong><br>${budgetNumber(params.value)} · ${format(levelTotal ? params.value / levelTotal * 100 : 0)}% del nivel` },
      series: [{
        type: 'treemap', left: 0, top: 0, width: '100%', height: '100%', data: items.map(item => ({ name: item.name, value: nodeTotal(item) })), roam: false, nodeClick: false,
        breadcrumb: { show: false }, animationDuration: 300,
        label: { show: true, position: 'insideTopLeft', color: '#10243e', fontSize: 12, lineHeight: 17, overflow: 'truncate', formatter: params => `${params.name}\n${budgetNumber(params.value)}` },
        itemStyle: { borderColor: '#f4f6f1', borderWidth: 3, gapWidth: 3 },
        levels: [{ itemStyle: { borderColor: '#f4f6f1', borderWidth: 3, gapWidth: 3 } }]
      }]
    }, true);
    budgetChart.off('click');
    budgetChart.on('click', params => {
      const target = items.find(item => item.name === params.name);
      if (target?.children) enterBudget(target);
    });
  }
  budgetList.addEventListener('click', event => {
    const button = event.target.closest('[data-budget-index]');
    if (!button) return;
    enterBudget(budgetStack.at(-1).children[Number(button.dataset.budgetIndex)]);
    budgetBack.focus();
  });
  budgetBack.addEventListener('click', () => {
    if (budgetStack.length > 1) { budgetStack.pop(); drawBudget(budgetStack.at(-1)); if (budgetBack.disabled) budgetList.querySelector('button')?.focus(); }
  });
  budgetHome.addEventListener('click', () => { budgetStack.splice(1); drawBudget(budgetStack[0]); budgetList.querySelector('button')?.focus(); });
  const pgeSource = data.sources.find(source => source.id === data.budget.sourceId);
  const budgetSource = document.querySelector('#budget-source');
  budgetSource.href = pgeSource.url;
  budgetSource.target = '_blank';
  budgetSource.rel = 'noreferrer';
  drawBudget(data.budget.root);

  return { resize: () => { budgetChart.resize(); budgetChart.clear(); drawBudget(budgetStack.at(-1), false); }, refresh: () => drawBudget(budgetStack.at(-1)) };
}
