function createChartTheme() {
  const palettes = {
    dark: { background:'#10243e', panel:'#1b2c43', text:'#b5c7da', ink:'#fff', grid:'#2d405b', axis:'#8ba2bc', debt:'#80b9e8', deficit:'#ff715b', surplus:'#80c58a', finance:['#ff9a85','#80b9e8','#d7f84b','#c3a0ee'], growth:['#80b9e8','#ff9a85','#80c58a'] },
    light: { background:'#fff', panel:'#f1f5f8', text:'#526579', ink:'#10243e', grid:'#e0e7ec', axis:'#68788b', debt:'#246fa7', deficit:'#bb3434', surplus:'#436828', finance:['#a84919','#3274a2','#10243e','#75539e'], growth:['#246fa7','#a84919','#436828'] }
  };
  let theme='light';
  try { const saved=localStorage.getItem('deudapublica-chart-theme'); if(saved in palettes) theme=saved; } catch {}
  const listeners=new Set();
  function apply() {
    document.documentElement.dataset.chartTheme=theme;
    document.querySelectorAll('[data-chart-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartThemeChoice===theme)));
  }
  apply();
  document.querySelectorAll('[data-chart-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
    theme=button.dataset.chartThemeChoice;apply();try { localStorage.setItem('deudapublica-chart-theme',theme); } catch {}
    listeners.forEach(fn=>fn());
  }));
  function init(element,kind) {
    element.closest('.chart-card,.finance-chart-card,.budget-card,.repay-chart-card,.white-card')?.classList.add('chart-surface');
    const chart=echarts.init(element,null,{renderer:'svg'}),set=chart.setOption.bind(chart);
    chart.setOption=(option,...args)=>{
      const p=palettes[theme],result={...option,textStyle:{...option.textStyle,color:p.text}};
      if(option.tooltip) result.tooltip={...option.tooltip,backgroundColor:p.background,borderColor:p.axis,textStyle:{...option.tooltip.textStyle,color:p.ink}};
      if(option.legend) result.legend={...option.legend,textStyle:{...option.legend.textStyle,color:p.text}};
      for(const key of ['xAxis','yAxis']) if(option[key]) {
        const axes=(Array.isArray(option[key])?option[key]:[option[key]]).map(axis=>({...axis,nameTextStyle:{...axis.nameTextStyle,color:p.text},axisLabel:{...axis.axisLabel,color:p.text},axisLine:{...axis.axisLine,lineStyle:{...axis.axisLine?.lineStyle,color:p.axis}},splitLine:{...axis.splitLine,lineStyle:{...axis.splitLine?.lineStyle,color:p.grid}}}));
        result[key]=Array.isArray(option[key])?axes:axes[0];
      }
      const colors=kind==='finance'?p.finance:kind==='growth'?p.growth:kind==='repayment'?[p.deficit,p.surplus]:null;
      if(colors) { result.color=colors;result.series=option.series.map((series,i)=>({...series,lineStyle:{...series.lineStyle,color:colors[i]},itemStyle:{...series.itemStyle,color:colors[i]}})); }
      if(kind==='budget') result.series=option.series.map(series=>({...series,itemStyle:{...series.itemStyle,borderColor:p.background},levels:series.levels?.map(level=>({...level,itemStyle:{...level.itemStyle,borderColor:p.background}}))}));
      return set(result,...args);
    };
    return chart;
  }
  return { init,get palette(){return palettes[theme];},subscribe(fn){listeners.add(fn);} };
}
