function initBudget({ data, format, escapeHtml, reducedMotion, charts }) {
  const budgetChart = charts.init(document.querySelector('#budget-chart'),'budget');
  const budgetBack = document.querySelector('#budget-back');
  const budgetHome = document.querySelector('#budget-home');
  const budgetSummary = document.querySelector('#budget-level-summary');
  const budgetPath = document.querySelector('#budget-path');
  const budgetList = document.querySelector('#budget-list');
  const budgetStack = [data.budget.root];
  const budgetColors = ['#a8ccee', '#e0eca5', '#f5b59f', '#b9ccdc', '#efd19b', '#a2d3c9', '#ceb9eb', '#b8d9be', '#e8c2aa', '#b6c5ed'];
  const budgetNumber = value => `${format(value, 0)} M€`;
  const nodeTotal = node => node.children ? node.children.reduce((sum, child) => sum + nodeTotal(child), 0) : node.value;
  const canOpen = node => Boolean(node?.children?.length);
  function enterBudget(node) { if (!canOpen(node)) return; budgetStack.push(node); drawBudget(node); }
  function drawBudget(node, animate = !reducedMotion.matches) {
    const items = node.children || [];
    const levelTotal = items.reduce((sum, item) => sum + nodeTotal(item), 0);
    budgetBack.disabled = budgetStack.length === 1;
    budgetHome.disabled = budgetStack.length === 1;
    document.querySelector('#budget-current-title').textContent = node.name;
    budgetSummary.textContent = `${budgetNumber(levelTotal)} · ${format(levelTotal / data.budget.total * 100, 1)}% del presupuesto estatal · ${items.length} partidas${node.sourceLocator ? ' · ' + node.sourceLocator : ''}`;
    budgetPath.innerHTML = budgetStack.map((item,index) => index===budgetStack.length-1 ? `<span aria-current="location">${escapeHtml(item.name)}</span>` : `<button type="button" data-budget-depth="${index}">${escapeHtml(item.name)}</button>`).join('<span class="budget-path-separator" aria-hidden="true">›</span>');
    budgetList.innerHTML = items.map((item,index) => {
      const open=canOpen(item),share=levelTotal ? nodeTotal(item)/levelTotal*100 : 0;
      const content=`<span class="budget-item-name"><i style="background:${budgetColors[index % budgetColors.length]}" aria-hidden="true"></i>${escapeHtml(item.name)}${item.code ? `<small>${escapeHtml(item.code)}</small>` : ''}</span><b>${budgetNumber(nodeTotal(item))}<small>${format(share,1)}% de este nivel</small></b><span class="budget-item-action">${open ? 'Abrir desglose →' : 'Sin más desglose'}</span><span class="budget-share-track" aria-hidden="true"><i style="width:${share}%;background:${budgetColors[index % budgetColors.length]}"></i></span>`;
      return `<li class="${open ? 'is-expandable' : 'is-final'}">${open ? `<button type="button" data-budget-index="${index}">${content}</button>` : `<div class="budget-final-item">${content}</div>`}</li>`;
    }).join('');
    budgetChart.setOption({
      aria:{enabled:true,label:{description:`${node.name}. ${items.map(item=>`${item.name}: ${budgetNumber(nodeTotal(item))}, ${canOpen(item)?'desglose disponible':'partida final'}`).join('. ')}. Lista navegable debajo del gráfico.`}},
      animation: animate, color: budgetColors,
      tooltip: { confine: true, trigger: 'item', borderWidth: 1, padding:12, textStyle: { fontSize: 12 }, formatter: params => {
        const item=items.find(item=>item.name===params.name);
        return `<strong>${escapeHtml(params.name)}</strong><br>${budgetNumber(params.value)} · ${format(levelTotal ? params.value / levelTotal * 100 : 0)}% del nivel<br><br>${canOpen(item) ? 'Abrir desglose →' : 'Partida final · sin más desglose disponible'}`;
      } },
      series: [{
        type: 'treemap', left: 0, top: 0, width: '100%', height: '100%', data: items.map((item,index) => ({
          name:item.name, value:nodeTotal(item), cursor:canOpen(item)?'pointer':'default',
          label:{formatter:`{${canOpen(item)?'action':'final'}|${canOpen(item) ? 'Abrir →' : 'Sin más desglose'}}\n{name|${item.name.replace(/[{}]/g,'')}}\n{amount|${budgetNumber(nodeTotal(item))}}`},
          itemStyle:{color:budgetColors[index % budgetColors.length]},
          emphasis:{disabled:!canOpen(item),itemStyle:{borderColor:'#246fa7',borderWidth:3,shadowBlur:10,shadowColor:'rgba(16,36,62,.18)'}}
        })), roam: false, nodeClick: false,
        breadcrumb: { show: false }, animationDuration: 250,
        label: { show: true, position: 'insideTopLeft', padding:[12,10], overflow:'truncate', color:'#10243e', fontSize:13, lineHeight:21, rich:{name:{fontSize:13,fontWeight:700,lineHeight:21},amount:{fontSize:18,fontWeight:800,lineHeight:28},action:{fontSize:10,fontWeight:700,lineHeight:26,color:'#fff',backgroundColor:'#10243e',borderRadius:4,padding:[3,6]},final:{fontSize:10,lineHeight:26,color:'#294b69'}} },
        itemStyle: { borderWidth:4, gapWidth:4, borderRadius:7 },
        levels: [{ itemStyle: { borderWidth:4, gapWidth:4 } }]
      }]
    }, true);
    budgetChart.off('click');
    budgetChart.on('click', params => { const target=items.find(item=>item.name===params.name); if(target) enterBudget(target); });
    budgetChart.off('mouseover');
    budgetChart.on('mouseover', params => budgetChart.getZr().setCursorStyle(canOpen(items.find(item=>item.name===params.name))?'pointer':'default'));
    budgetChart.getZr().setCursorStyle('default');

  }
  budgetList.addEventListener('click', event => {
    const button = event.target.closest('[data-budget-index]'); if (!button) return;
    enterBudget(budgetStack.at(-1).children[Number(button.dataset.budgetIndex)]); budgetBack.focus();
  });
  budgetPath.addEventListener('click',event=>{const button=event.target.closest('[data-budget-depth]');if(!button)return;budgetStack.splice(Number(button.dataset.budgetDepth)+1);drawBudget(budgetStack.at(-1));budgetList.querySelector('button')?.focus();});
  budgetBack.addEventListener('click', () => {
    if (budgetStack.length > 1) { budgetStack.pop(); drawBudget(budgetStack.at(-1)); if (budgetBack.disabled) budgetList.querySelector('button')?.focus(); }
  });
  budgetHome.addEventListener('click', () => { budgetStack.splice(1); drawBudget(budgetStack[0]); budgetList.querySelector('button')?.focus(); });
  const pgeSource = data.sources.find(source => source.id === data.budget.sourceId);
  const budgetSource = document.querySelector('#budget-source'); budgetSource.href=pgeSource.url;budgetSource.target='_blank';budgetSource.rel='noreferrer';
  drawBudget(data.budget.root);
  return { resize: () => { budgetChart.resize(); budgetChart.clear(); drawBudget(budgetStack.at(-1), false); }, refresh: () => drawBudget(budgetStack.at(-1)) };
}
