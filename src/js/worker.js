function initWorker({data,format,escapeHtml,reducedMotion},timeline) {
  const chart=echarts.init(document.querySelector('#worker-chart'),null,{renderer:'canvas'});
  const earningsChart=echarts.init(document.querySelector('#earnings-chart'),null,{renderer:'canvas'});
  const shareChart=echarts.init(document.querySelector('#state-share-chart'),null,{renderer:'canvas'});
  const slider=document.querySelector('#worker-year'), earningsMode=document.querySelector('#earnings-mode');
  const spent=document.querySelector('#worker-spent'),other=document.querySelector('#worker-other'),mode=document.querySelector('#worker-vat-mode');
  const rows=data.earnings.rows,first=rows[0],taxes=data.commonTaxes.items;
  let selectedTax=taxes[0];
  const scenario=row=>workerScenario({year:row.year,taxWedgePercent:row.taxShare},data.fiscalContext,Number(spent.value),Number(other.value),mode.value);
  const commonGrid={left:48,right:18,top:24,bottom:34};
  const xAxis=()=>({type:'category',boundaryGap:false,data:rows.map(row=>String(row.year)),axisLabel:{fontSize:10,interval:Math.max(0,Math.floor(rows.length/5)-1)}});
  const marker=(year,value)=>({symbol:'circle',symbolSize:10,label:{show:false},data:[{coord:[String(year),value]}]});
  function renderTaxes() {
    const item=selectedTax,observation=item.rows.find(row=>row.year===timeline.year),difference=observation.rate-item.first.rate;
    document.querySelector('#common-tax-title').textContent=item.name;
    document.querySelector('#common-tax-base').textContent=`${item.base} · ${item.kind==='statutory'?'tipo legal a 31 de diciembre':'tipo efectivo del perfil OCDE'}`;
    document.querySelector('#common-tax-description').textContent=item.description;
    document.querySelector('#common-tax-sources').innerHTML=item.sources.map(source=>`<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`).join('');
    document.querySelector('#common-tax-result').textContent=`${timeline.year}: ${format(observation.rate)}% · ${difference<0?'−':'+'}${format(Math.abs(difference))} puntos respecto a ${item.first.year}`;
    document.querySelectorAll('[data-common-tax]').forEach(button=>{const active=button.dataset.commonTax===item.id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    chart.setOption({animation:!reducedMotion.matches,color:[item.color],grid:commonGrid,
      tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>${points[0].axisValue}: ${format(points[0].value,2)}%</strong><br>${escapeHtml(item.name)}<br>${escapeHtml(item.base)}${item.kind==='statutory'?'<br>Tipo al cierre del año':''}`},xAxis:xAxis(),
      yAxis:{type:'value',min:0,max:Math.ceil((Math.max(...item.rows.map(row=>row.rate))+1)/5)*5,axisLabel:{fontSize:11,formatter:value=>`${value}%`},splitLine:{lineStyle:{color:'#e2e8e6'}}},
      series:[{name:item.name,type:'line',data:item.rows.map(row=>row.rate),step:item.kind==='statutory'?'end':false,showSymbol:false,lineStyle:{width:3},areaStyle:{opacity:.08},markPoint:marker(timeline.year,observation.rate)}]
    },true);
  }
  function renderEarnings() {
    const real=earningsMode.value==='real',selected=rows.find(row=>row.year===timeline.year);
    document.querySelector('#earnings-unit').textContent=real?`Euros de ${first.year} · descontando inflación de consumo`:`Índice ${first.year} = 100 · salarios nominales frente a precios`;
    document.querySelector('#earnings-legend').innerHTML=`<span><i class="gross-dot"></i>Salario bruto${real?' real':''}</span><span><i class="worker-net-dot"></i>Nómina neta${real?' real':''}</span>${real?'':'<span><i class="prices-dot"></i>Precios · IPCA</span>'}`;
    document.querySelector('#earnings-year-result').textContent=`${selected.year}${selected.estimated?' (salario estimado OCDE)':''}: ${format(selected.gross,0)} € brutos → ${format(selected.net,0)} € netos. Con los precios de ${first.year}, ese neto equivale a ${format(selected.realNet,0)} € (${selected.realNetIndex<100?'−':'+'}${format(Math.abs(selected.realNetIndex-100))}% de poder de compra respecto al inicio).`;
    const lines=real?[['Bruto real','realGross'],['Neto real','realNet']]:[['Salario bruto','grossIndex'],['Nómina neta','netIndex'],['Precios · IPCA','prices']];
    earningsChart.setOption({animation:!reducedMotion.matches,color:['#3274a2','#436828','#a84919'],grid:commonGrid,
      tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>${points[0].axisValue}</strong><br>${points.map(point=>`${point.marker}${point.seriesName}: ${format(point.value,real?0:1)}${real?' €':' puntos'}`).join('<br>')}`},xAxis:xAxis(),
      yAxis:{type:'value',min:real?0:80,axisLabel:{fontSize:10,formatter:value=>real?`${format(value/1000,0)} mil €`:String(value)},splitLine:{lineStyle:{color:'#e2e8e6'}}},
      series:lines.map(([name,key],i)=>({name,type:'line',data:rows.map(row=>row[key]),showSymbol:false,lineStyle:{width:3,type:i===2?'dashed':'solid'},...(i===1?{markPoint:marker(selected.year,selected[key])}:{} )}))
    },true);
  }
  function renderShares() {
    const observations=rows.map(row=>({...scenario(row),row})),selected=observations.find(item=>item.row.year===timeline.year),initial=observations[0];
    const total=100-selected.retained,difference=total-(100-initial.retained);
    document.querySelector('#worker-spent-output').textContent=`${spent.value}%`;
    document.querySelector('#worker-other-output').textContent=`${other.value}%`;
    document.querySelector('#state-share-year').textContent=timeline.year;
    document.querySelector('#state-share-total').textContent=`${format(total)}%`;
    document.querySelector('#state-share-caption').textContent='IRPF + cotizaciones + consumo del escenario';
    document.querySelector('#state-retained').textContent=`${format(selected.retained)} €`;
    document.querySelector('#state-retained-caption').textContent='valor de bienes sin impuestos + ahorro';
    document.querySelector('#state-share-result').textContent=`Antes de consumir: ${format(selected.row.taxShare)}% en IRPF y cotizaciones, y ${format(selected.net)} € de nómina neta. Después del consumo del escenario: ${format(total)}% en impuestos (${difference<0?'−':'+'}${format(Math.abs(difference))} puntos frente a ${first.year}).`;
    const parts=[['IRPF',selected.row.incomeTax/selected.row.cost*100],['Cuota empresa',selected.row.employerSSC/selected.row.cost*100],['Cuota trabajador',selected.row.employeeSSC/selected.row.cost*100],['IVA del escenario',selected.vat],['Otros (supuesto)',selected.other],['Bienes sin impuestos',selected.purchasing],['Ahorro sin gastar',selected.savings]];
    document.querySelector('#worker-breakdown').innerHTML=parts.map(([name,value])=>`<div><span>${name}</span><strong>${format(value)} €</strong></div>`).join('');
    const series=[['IRPF',item=>item.row.incomeTax/item.row.cost*100],['Cuota empresa',item=>item.row.employerSSC/item.row.cost*100],['Cuota trabajador',item=>item.row.employeeSSC/item.row.cost*100],['IVA del escenario',item=>item.vat],['Otros (supuesto)',item=>item.other],['Bienes + ahorro',item=>item.retained]];
    shareChart.setOption({animation:!reducedMotion.matches,color:['#805d99','#b86c35','#e6ac72','#a84919','#68788b','#436828'],grid:commonGrid,
      tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>${points[0].axisValue} · por cada 100 € de coste</strong><br>${points.filter(point=>point.value>.001).map(point=>`${point.marker}${point.seriesName}: ${format(point.value)} €`).join('<br>')}<br>Consumo: escenario seleccionado`},
      xAxis:{...xAxis(),boundaryGap:true},yAxis:{type:'value',min:0,max:100,axisLabel:{fontSize:10,formatter:value=>`${value}%`},splitLine:{lineStyle:{color:'#e2e8e6'}}},
      series:series.map(([name,value])=>({name,type:'bar',stack:'cost',barMaxWidth:30,data:observations.map(item=>({value:value(item),itemStyle:{opacity:item.row.year===timeline.year?1:.75}}))}))
    },true);
  }
  function render() {
    slider.value=timeline.year;
    document.querySelector('#worker-year-output').textContent=timeline.year;
    renderTaxes();renderEarnings();renderShares();
  }
  document.querySelectorAll('[data-common-tax]').forEach(button=>button.addEventListener('click',()=>{selectedTax=taxes.find(item=>item.id===button.dataset.commonTax);renderTaxes();}));
  slider.addEventListener('input',()=>timeline.select(slider.value));
  earningsMode.addEventListener('change',renderEarnings);
  [spent,other].forEach(input=>input.addEventListener('input',renderShares));
  mode.addEventListener('change',renderShares);
  shareChart.on('click',point=>timeline.select(Number(point.name)));
  timeline.subscribe(render);
  return {resize:()=>{chart.resize();earningsChart.resize();shareChart.resize();},refresh:render};
}
