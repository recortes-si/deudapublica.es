function initFinances({data,format,escapeHtml,reducedMotion,charts},timeline) {
  const chart=charts.init(document.querySelector('#finance-chart'),'finance');
  const gdpByYear=new Map(data.debt.map(row=>[row.year,row.euros*1e6*100/row.ratio]));
  const period=document.querySelector('#finance-period');
  const slider=document.querySelector('#finance-year');
  function render() {
    const rows=data.finances.rows.filter(row=>period.value==='all' || row.year>data.finances.latest.year-Number(period.value));
    document.querySelector('#finance-unit').textContent=`Miles de millones de euros · ${rows[0].year}—${rows.at(-1).year}`;
    chart.setOption({animation:!reducedMotion.matches,color:['#a84919','#3274a2','#10243e','#8b9baa'],grid:{left:48,right:56,top:22,bottom:32},
      tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>${points[0].axisValue}</strong><br>${points.map(point=>`${point.marker}${point.seriesName}: ${format(point.value*1000,0)} M€`).join('<br>')}`},
      xAxis:{type:'category',boundaryGap:false,data:rows.map(row=>String(row.year)),axisLabel:{fontSize:10,interval:Math.max(0,Math.floor(rows.length/5)-1)}},
      yAxis:[{type:'value',min:0,axisLabel:{fontSize:11},splitLine:{lineStyle:{color:'#e2e8e6'}}},{type:'value',min:0,axisLabel:{fontSize:10,formatter:value=>format(value,0)},splitLine:{show:false}}],
      series:[['Impuestos + cotizaciones','fiscalRevenue'],['Ingresos totales','revenue'],['Gasto público','expenditure']].map(([name,key],i)=>({name,type:'line',data:rows.map(row=>row[key]/1000),smooth:false,showSymbol:false,lineStyle:{width:3,type:i===1?'dashed':'solid'},...(i===1?{markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:'#68788b',type:'dotted'},data:[{xAxis:String(timeline.year)}]}}:{})})).concat([{name:'PIB · eje derecho',type:'line',yAxisIndex:1,data:rows.map(row=>gdpByYear.has(row.year)?gdpByYear.get(row.year)/1000:null),smooth:false,showSymbol:false,lineStyle:{width:2,type:'dashed'},itemStyle:{color:'#8b9baa'}}])
    },true);
  }
  function showYear(year) {
    const row=data.finances.rows.find(item=>item.year===year);
    slider.value=year;
    document.querySelector('#finance-year-output').textContent=year;
    document.querySelector('#income-year').textContent=year;
    document.querySelector('#income-total').textContent=`${format(row.revenue,0)} M€`;
    document.querySelector('#income-parts').innerHTML=row.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/row.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/row.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join('');
    if(period.value!=='all' && year<=data.finances.latest.year-Number(period.value))period.value='all';
    render();
  }
  slider.addEventListener('input',()=>timeline.select(slider.value));
  period.addEventListener('change',()=>{
    if(period.value!=='all' && timeline.year<=data.finances.latest.year-Number(period.value))timeline.select(timeline.years.at(-1));
    else render();
  });
  timeline.subscribe(showYear);
  return {resize:()=>chart.resize(),refresh:render};
}
