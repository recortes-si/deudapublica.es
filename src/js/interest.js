function initInterest({ data, format, escapeHtml, reducedMotion, charts }) {
  const { interest } = data;
  const chart=charts.init(document.querySelector('#interest-chart'),'interest');
  const choices = document.querySelector('.tax-choices');
  const checkboxes = [...choices.querySelectorAll('input[type="checkbox"]')];
  const adjustments = document.querySelector('.tax-adjustments');
  const sliders = [...adjustments.querySelectorAll('input[type="range"]')];
  const editButtons = [...adjustments.querySelectorAll('[data-edit]')];
  let activeEditor = sliders.find(input => interest.example.ids.includes(input.dataset.measure))?.dataset.measure;
  const summary = document.querySelector('.tax-summary');
  function updateExample() {
    const parameters = Object.fromEntries(sliders.map(input => [input.dataset.measure, Number(input.value)]));
    const ids = checkboxes.filter(input => input.checked).map(input => input.value);
    const result = taxComparison(interest.value, interest.taxes.items, ids, parameters);
    for (const item of interest.taxes.items) {
      document.querySelector(`[data-cost="${item.id}"]`).textContent = `${format(measureCost(item, parameters[item.id]),0)} M€`;
      const slider = sliders.find(input => input.dataset.measure === item.id);
      if (slider) {
        const value = parameters[item.id];
        const text = item.control.type === 'vat' ? `${item.control.from}% → ${value}%` : `−${value}%`;
        document.querySelector(`[data-output="${item.id}"]`).textContent = `${value}%`;
        document.querySelector(`[data-rate="${item.id}"]`).textContent = text;
        slider.setAttribute('aria-valuetext', item.control.type === 'vat' ? `IVA general del ${item.control.from} al ${value} por ciento; todos los tipos bajan proporcionalmente` : `Rebaja proporcional del ${value} por ciento${item.excludeIds?.length ? ", excluyendo RETA" : " de recaudación"}`);
        slider.disabled = !ids.includes(item.id);
      }
    }
    const palette=charts.palette,colors=['#a8ccee','#e0eca5','#f5b59f','#b9ccdc','#efd19b','#a2d3c9','#ceb9eb','#b8d9be','#e8c2aa'];
    const selected=ids.map(id=>{const item=interest.taxes.items.find(item=>item.id===id),cost=measureCost(item,parameters[id]);const rate=item.control ? item.control.type==='vat' ? ' · '+item.control.from+'% → '+parameters[id]+'%' : ' · −'+parameters[id]+'%' : ' · suprimir';return {name:(item.shortName||item.name)+rate,cost,color:colors[interest.taxes.items.indexOf(item)%colors.length]};}).filter(item=>item.cost>0);
    document.querySelector('#interest-chart-total').textContent=format(result.total,0)+' M€';
    document.querySelector('#interest-chart-balance-label').textContent=result.covered?'Ahorro sin utilizar':'Falta por cubrir';
    document.querySelector('#interest-chart-balance').textContent=format(Math.abs(result.remaining),0)+' M€';
    document.querySelector('#interest-chart-balance').dataset.covered=String(result.covered);
    document.querySelector('#interest-chart-legend').innerHTML=selected.map(item=>'<span><i style="background:'+item.color+'"></i><span>'+escapeHtml(item.name)+'<b>'+format(item.cost,0)+' M€</b></span></span>').join('');
    document.querySelector('#interest-chart-result').textContent=result.count===0?'Elige los impuestos que reducirías.':result.covered?'Ahorro disponible: '+format(result.remaining,0)+' M€ al año.':'Faltan '+format(-result.remaining,0)+' M€ al año para cubrir esta selección.';
    document.querySelector('#interest-chart').setAttribute('aria-label','Intereses pagados: '+format(interest.value,0)+' M€. Rebajas elegidas: '+format(result.total,0)+' M€. '+selected.map(item=>item.name+': '+format(item.cost,0)+' M€').join('; ')+'. '+document.querySelector('#interest-chart-result').textContent);
    chart.setOption({animation:!reducedMotion.matches,color:[palette.debt,...selected.map(item=>item.color)],grid:{left:116,right:74,top:24,bottom:36},tooltip:{trigger:'axis',axisPointer:{type:'shadow'},confine:true,formatter:points=>'<strong>'+escapeHtml(points[0].axisValue)+'</strong><br>'+points.filter(point=>point.value>0).map(point=>point.marker+escapeHtml(point.seriesName)+': '+format(point.value,0)+' M€').join('<br>')},xAxis:{type:'value',min:0,max:Math.max(interest.value,result.total)*1.2,axisLabel:{fontSize:10,formatter:value=>format(value,0)},splitNumber:3},yAxis:{type:'category',inverse:true,data:['Intereses pagados','Rebajas elegidas'],axisTick:{show:false},axisLine:{show:false},axisLabel:{fontSize:11,fontWeight:600}},series:[{name:'Intereses pagados',type:'bar',stack:'comparison',barMaxWidth:38,data:[interest.value,0],itemStyle:{color:palette.debt,borderRadius:[0,5,5,0]},label:{show:true,position:'right',color:palette.ink,fontSize:11,formatter:point=>point.value>0?format(point.value,0):''}},...selected.map((item,index)=>({name:item.name,type:'bar',stack:'comparison',barMaxWidth:38,data:[0,item.cost],itemStyle:{color:item.color,borderRadius:index===selected.length-1?[0,5,5,0]:0},label:{show:index===selected.length-1,position:'right',color:result.covered?palette.ink:palette.deficit,fontSize:11,fontWeight:700,formatter:point=>point.value>0?format(result.total,0):''}}))]},true);
    if (!ids.includes(activeEditor)) activeEditor = sliders.find(input => ids.includes(input.dataset.measure))?.dataset.measure;
    adjustments.hidden = !activeEditor;
    adjustments.querySelectorAll('[data-editor]').forEach(panel => { panel.hidden = panel.dataset.editor !== activeEditor; });
    editButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.edit === activeEditor)));
    const share = interest.value ? result.total / interest.value * 100 : 0;
    document.querySelector('#tax-count').textContent = result.count;
    document.querySelector('#tax-total').textContent = `${format(result.total, 0)} M€`;
    summary.classList.toggle('over-budget', !result.covered);
    document.querySelector('#tax-meter-fill').style.width = `${Math.min(100, share)}%`;
    document.querySelector('#tax-meter').setAttribute('aria-label', `La selección equivale al ${format(share)}% del ahorro en intereses`);
    document.querySelector('#tax-status').textContent = result.count === 0 ? `Selecciona medidas. El ahorro anual disponible sería de ${format(interest.value, 0)} M€.` : !result.covered ? `Esta selección no se cubriría: faltarían ${format(-result.remaining, 0)} M€ al año.` : `Se cubrirían las medidas y quedarían ${format(result.remaining, 0)} M€ de ahorro anual.`;
  }
  function selectExample(ids) {
    checkboxes.forEach(input => { input.checked = ids.includes(input.value); });
    sliders.forEach(input => { input.value = interest.taxes.items.find(item => item.id === input.dataset.measure).control.default; });
    activeEditor = sliders.find(input => ids.includes(input.dataset.measure))?.dataset.measure;
    updateExample();
  }
  choices.addEventListener('input', updateExample);
  choices.addEventListener('change', event => {
    if (event.target.checked && sliders.some(input => input.dataset.measure === event.target.value)) activeEditor = event.target.value;
    updateExample();
  });
  adjustments.addEventListener('input', updateExample);
  editButtons.forEach(button => button.addEventListener('click', () => {
    activeEditor = button.dataset.edit;
    checkboxes.find(input => input.value === activeEditor).checked = true;
    updateExample();
  }));
  document.querySelector('#tax-reset').addEventListener('click', () => selectExample(interest.example.ids));
  document.querySelector('#tax-only').addEventListener('click', () => selectExample(data.config.taxOnlyExampleIds));
  updateExample();
  return {resize:()=>chart.resize(),refresh:updateExample};
}
