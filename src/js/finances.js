function initFinances({data,format,escapeHtml,reducedMotion},timeline) {
  const chart=echarts.init(document.querySelector('#finance-chart'),null,{renderer:'canvas'});
  const balanceChart=echarts.init(document.querySelector('#balance-chart'),null,{renderer:'canvas'});
  const period=document.querySelector('#finance-period');
  const slider=document.querySelector('#finance-year');
  function render() {
    const rows=data.finances.rows.filter(row=>period.value==='all' || row.year>data.finances.latest.year-Number(period.value));
    document.querySelector('#finance-unit').textContent=`Miles de millones de euros · ${rows[0].year}—${rows.at(-1).year}`;
    chart.setOption({animation:!reducedMotion.matches,color:['#a84919','#3274a2','#10243e'],grid:{left:48,right:16,top:20,bottom:32},
      tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>${points[0].axisValue}</strong><br>${points.map(point=>`${point.marker}${point.seriesName}: ${format(point.value*1000,0)} M€`).join('<br>')}`},
      xAxis:{type:'category',boundaryGap:false,data:rows.map(row=>String(row.year)),axisLabel:{fontSize:10,interval:Math.max(0,Math.floor(rows.length/5)-1)}},
      yAxis:{type:'value',min:0,axisLabel:{fontSize:11},splitLine:{lineStyle:{color:'#e2e8e6'}}},
      series:[['Impuestos + cotizaciones','fiscalRevenue'],['Ingresos totales','revenue'],['Gasto público','expenditure']].map(([name,key],i)=>({name,type:'line',data:rows.map(row=>row[key]/1000),smooth:false,showSymbol:false,lineStyle:{width:3,type:i===1?'dashed':'solid'},...(i===1?{markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:'#68788b',type:'dotted'},data:[{xAxis:String(timeline.year)}]}}:{})}))
    },true);
    const extent=Math.ceil(Math.max(...rows.map(row=>Math.abs(row.balance)))/10000)*10;
    balanceChart.setOption({animation:!reducedMotion.matches,grid:{left:48,right:16,top:20,bottom:32},tooltip:{trigger:'axis',confine:true,formatter:points=>{const point=points[0],value=point.value;return '<strong>'+point.axisValue+'</strong><br>'+ (value<0?'Déficit':value>0?'Superávit':'Equilibrio')+': '+format(value*1000,0)+' M€';}},
      xAxis:{type:'category',data:rows.map(row=>String(row.year)),axisLabel:{fontSize:10,interval:Math.max(0,Math.floor(rows.length/5)-1)},axisLine:{onZero:true,lineStyle:{color:'#10243e',width:2}}},
      yAxis:{type:'value',min:-extent,max:extent,axisLabel:{fontSize:11},splitLine:{lineStyle:{color:'#e2e8e6'}}},series:[{name:'Saldo público',type:'bar',barMaxWidth:28,data:rows.map(row=>({value:row.balance/1000,itemStyle:{color:row.balance<0?'#bb3434':'#436828',opacity:row.year===timeline.year?1:.72,borderColor:'#10243e',borderWidth:row.year===timeline.year?2:0}}))}]
    },true);
  }
  function showYear(year) {
    const row=data.finances.rows.find(item=>item.year===year);
    const worker=data.worker.history.find(item=>item.year===year);
    slider.value=year;
    const balance=document.querySelector('#balance-result');
    balance.textContent=`${year} · ${row.balance<0?'−':row.balance>0?'+':''}${format(Math.abs(row.balance),0)} M€ · ${row.balance<0?'déficit':row.balance>0?'superávit':'equilibrio'}`;
    balance.dataset.sign=row.balance<0?'deficit':'surplus';
    document.querySelector('#finance-year-output').textContent=year;
    document.querySelector('#income-year').textContent=year;
    document.querySelector('#income-total').textContent=`${format(row.revenue,0)} M€`;
    document.querySelector('#finance-worker-share').textContent=`${format(100-worker.taxWedgePercent)} € antes de IVA en ${year}`;
    document.querySelector('#income-parts').innerHTML=row.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/row.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/row.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join('');
    if(period.value!=='all' && year<=data.finances.latest.year-Number(period.value))period.value='all';
    render();
  }
  slider.addEventListener('input',()=>timeline.select(slider.value));
  period.addEventListener('change',()=>{
    if(period.value!=='all' && timeline.year<=data.finances.latest.year-Number(period.value))timeline.select(timeline.years.at(-1));
    else render();
  });
  balanceChart.on('click',point=>timeline.select(Number(point.name)));
  timeline.subscribe(showYear);
  return {resize:()=>{chart.resize();balanceChart.resize();},refresh:render};
}
