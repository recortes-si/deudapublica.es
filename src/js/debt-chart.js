function initDebtChart({ data, format, escapeHtml, reducedMotion, charts }, timeline) {
  const chart = charts.init(document.querySelector('#debt-chart'), 'debt');
  const history = data.debtHistory, context = data.debtTimeline;
  const governmentToggle = document.querySelector('#debt-governments-toggle');
  const bands = document.querySelector('#debt-government-bands'), panel = document.querySelector('#debt-government-panel');
  let showGovernments = false;
  const dateText = date => new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date));
  function renderGovernments(rows,grid) {
    bands.hidden = panel.hidden = !showGovernments;
    governmentToggle.setAttribute('aria-pressed',String(showGovernments));
    governmentToggle.setAttribute('aria-label',showGovernments ? 'Ocultar gobiernos' : 'Mostrar gobiernos');
    for (const side of ['left','right','top','bottom']) bands.style[side] = grid[side]+'px';
    const segments = governmentSegments(context,rows.map(row=>row.year));
    bands.innerHTML = segments.map(({government:g,startIndex,endIndex})=>`<span class="government-band" data-party="${escapeHtml(g.party)}" style="flex:${endIndex-startIndex+1}"></span>`).join('');
    document.querySelector('#debt-government-list').innerHTML = segments.map(({government:g,startYear,endYear})=>`<div class="government-key" data-party="${escapeHtml(g.party)}"><strong>${escapeHtml(g.shortName)} · ${escapeHtml(g.party)}</strong><span>${startYear}—${endYear} en la gráfica</span><small>${dateText(g.start)} → ${g.end?dateText(g.end):'serie hasta '+context.observedThrough}</small></div>`).join('');
  }
  const period = document.querySelector('#debt-period'), mode = document.querySelector('#debt-mode');
  const slider = document.querySelector('#debt-year'), lastYear = data.finances.latest.year;
  const views = {
    euros: { unit:'mil M€', label:'Miles de millones de euros corrientes', note:'Euros corrientes: el importe de cada año, sin ajustar por inflación.' },
    real: { unit:`mil M€ de ${history.baseYear}`, label:`Miles de millones de euros constantes de ${history.baseYear}`, note:`Importes ajustados por el IPCA medio anual de España, a precios de ${history.baseYear}. La inflación cambia el poder de compra; no reduce el principal nominal que se debe devolver.` },
    pib: { unit:'% del PIB', label:'Porcentaje del PIB de cada año', note:'Deuda: ratio oficial sobre el PIB. Saldo: porcentaje del PIB implícito en esa ratio. Una caída del porcentaje puede coexistir con una subida de la deuda en euros.' },
    percapita: { unit:'€/persona', label:'Euros por habitante', note:'Deuda y saldo divididos entre la población del mismo año. Es una comparación de tamaño, no una factura individual.' }
  };
  const visibleRows = () => history.rows.filter(row => period.value === 'all' || row.year > lastYear - Number(period.value));
  const valueText = value => value == null ? 'Sin dato disponible' : `${format(value, mode.value === 'percapita' ? 0 : 1)} ${views[mode.value].unit}`;

  function render() {
    const rows = visibleRows(), view = views[mode.value], p = charts.palette;
    const values = rows.map(row => debtHistoryValues(row,mode.value));
    const step = mode.value === 'pib' ? 1 : mode.value === 'percapita' ? 100 : 10;
    const extent = Math.max(step,Math.ceil(Math.max(...values.map(row=>Math.abs(row.balance ?? 0)))/step)*step);
    document.querySelector('#debt-unit').textContent = `${view.label} · ${rows[0].year}—${rows.at(-1).year}`;
    document.querySelector('#debt-axis-note').textContent = `Barras: saldo anual (eje izquierdo). Línea: deuda total al cierre (eje derecho). Ambos en ${view.label.toLowerCase()}.`;
    document.querySelector('#debt-view-note').textContent = view.note;
    document.querySelector('#debt-chart').setAttribute('aria-label', `Saldo anual: superávit en verde y déficit en rojo, eje izquierdo. Deuda total al cierre: línea azul, eje derecho. ${view.label}. Datos completos en la tabla inferior.`);
    const ratioMarks = mode.value === 'pib' ? [{ yAxis:60,name:'60% del PIB',label:{show:true,formatter:'60%',color:p.text,fontSize:9} },{ yAxis:100,name:'100% del PIB',label:{show:true,formatter:'100%',color:p.text,fontSize:9} }] : [];
    const width=chart.getWidth(),compact=width<600;
    const axisUnit=mode.value==='pib'?'% del PIB':mode.value==='percapita'?'€/persona':mode.value==='real'?'mil M€ de '+history.baseYear:'mil M€';
    const grid = {left:mode.value==='percapita'?55:46,right:mode.value==='percapita'?62:52,top:84,bottom:30};
    const visibleEvents=context.events.filter(event=>rows.some(row=>row.year===event.year));
    let previousRight=-Infinity,lane=0;
    const eventLabels=visibleEvents.map(event=>{
      const label=event.year+' · '+event.shortLabel,labelWidth=label.length*(compact?5:6),index=rows.findIndex(row=>row.year===event.year);
      const x=Math.max(labelWidth/2+4,Math.min(width-labelWidth/2-4,grid.left+(width-grid.left-grid.right)*(index+.5)/rows.length));
      lane=x-labelWidth/2<previousRight+8?1-lane:0;previousRight=x+labelWidth/2;
      return {type:'text',silent:true,x,y:4+lane*18,style:{text:label,fill:p.ink,fontSize:compact?9:11,fontWeight:600,align:'center',verticalAlign:'top'}};
    });
    const eventMarks = visibleEvents.map(event=>([{
      coord:[String(event.year),-extent], name:event.label,
      lineStyle:{color:p.text,type:'dashed',width:1.5},
      label:{show:false}
    },{coord:[String(event.year),extent]}]));
    renderGovernments(rows,grid);
    chart.setOption({
      animation:!reducedMotion.matches,
      tooltip:{trigger:'axis',confine:true,textStyle:{fontSize:12},formatter:points=>{
        const row=rows.find(row=>row.year===Number(points[0].axisValue));
        const lines=points.map(point=>`${point.marker}${point.seriesName==='Saldo anual'?point.value<0?'Déficit':point.value>0?'Superávit':'Equilibrio':'Deuda total al cierre'}: ${point.value==null?'Sin dato':format(point.value,mode.value==='percapita'?0:3)+' '+view.unit}`);
        if(mode.value!=='euros' && row.debtM!=null) lines.push(`Deuda nominal: ${format(row.debtM/1000,1)} mil M€`);
        if(mode.value!=='pib' && row.ratio!=null) lines.push(`Deuda / PIB: ${format(row.ratio)}%`);
        const event=context.events.find(event=>event.year===row.year);
        if(event) lines.push(escapeHtml(event.label));
        if(showGovernments) { const g=governmentForYear(context,row.year); if(g) lines.push('Gobierno: '+escapeHtml(g.name)+' ('+escapeHtml(g.party)+')'); }
        return `<strong>${escapeHtml(points[0].axisValue)}</strong><br>${lines.join('<br>')}`;
      }},
      grid,
      graphic:eventLabels,
      xAxis:{type:'category',data:rows.map(row=>String(row.year)),axisLine:{onZero:true,lineStyle:{width:2}},axisTick:{show:false},axisLabel:{fontSize:10,interval:Math.max(0,Math.floor(rows.length/5)-1)}},
      yAxis:[
        {type:'value',name:'Saldo anual\n'+axisUnit,nameGap:18,nameTextStyle:{fontSize:compact?9:10,lineHeight:14},min:-extent,max:extent,axisLabel:{fontSize:10,formatter:value=>format(value,0)+(mode.value==='pib'?'%':'')}},
        {type:'value',name:'Deuda total\n'+axisUnit,nameGap:18,nameTextStyle:{fontSize:compact?9:10,lineHeight:14},min:0,axisLabel:{fontSize:10,formatter:value=>format(value,0)+(mode.value==='pib'?'%':'')},splitLine:{show:false}}
      ],
      series:[
        {name:'Saldo anual',type:'bar',barMaxWidth:28,markLine:{silent:true,symbol:'none',data:eventMarks},data:rows.map((row,i)=>({value:values[i].balance,itemStyle:{color:row.balanceM<0?p.deficit:p.surplus,opacity:row.year===timeline.year?1:.8,borderColor:p.ink,borderWidth:row.year===timeline.year?2:0}}))},
        {name:'Deuda total',type:'line',yAxisIndex:1,showSymbol:false,connectNulls:false,lineStyle:{color:p.debt,width:3},itemStyle:{color:p.debt},data:values.map(row=>row.debt),markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:p.axis,type:'dotted'},data:[{xAxis:String(timeline.year)},...ratioMarks]}}
      ]
    },true);
    const row=history.rows.find(row=>row.year===timeline.year),selected=debtHistoryValues(row,mode.value);
    const balance=document.querySelector('#balance-result');
    const name=row.balanceM<0?'déficit':row.balanceM>0?'superávit':'equilibrio';
    balance.textContent=selected.balance==null?'Sin dato disponible':`${selected.balance<0?'−':selected.balance>0?'+':''}${valueText(Math.abs(selected.balance))} · ${name}`;
    balance.dataset.sign=row.balanceM<0?'deficit':row.balanceM>0?'surplus':'balanced';
    document.querySelector('#balance-debt-result').textContent=valueText(selected.debt);
    document.querySelector('#debt-ratio-context').textContent=[row.ratio==null?null:`${format(row.ratio)}% del PIB`,mode.value==='euros'||row.debtM==null?null:`Deuda nominal: ${format(row.debtM/1000,1)} mil M€`].filter(Boolean).join(' · ');
    document.querySelectorAll('[data-debt-selected-year]').forEach(label=>{label.textContent=timeline.year;});
    slider.value=timeline.year;document.querySelector('#debt-year-output').textContent=timeline.year;
  }
  function showYear(year) {
    if(period.value!=='all' && year<=lastYear-Number(period.value))period.value='all';
    render();
  }
  slider.addEventListener('input',()=>timeline.select(slider.value));
  mode.addEventListener('change',render);
  governmentToggle.addEventListener('click',()=>{showGovernments=!showGovernments;render();});
  period.addEventListener('change',()=>{
    if(period.value!=='all' && timeline.year<=lastYear-Number(period.value))timeline.select(lastYear);else render();
  });
  chart.on('click',point=>timeline.select(Number(point.name)));
  timeline.subscribe(showYear);
  return {resize:()=>{chart.resize();render();},refresh:render};
}
