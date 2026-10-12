function initFinances({data,format,escapeHtml,reducedMotion,charts},timeline) {
  const fiscalChart=charts.init(document.querySelector('#finance-chart'),'inflation');
  const start=document.querySelector('#finance-start'),slider=document.querySelector('#finance-year');
  function render() {
    const story=financeInflationSeries(data.finances,data.debtHistory,Number(start.value),data.citizenIncome);
    const rows=story.rows,last=rows.at(-1),p=charts.palette;

    const years=rows.map(row=>String(row.year));
    const intervals=Math.max(0,Math.floor(rows.length/5)-1);
    const signed=value=>(value<0?'−':'+')+format(Math.abs(value));
    document.querySelectorAll('[data-inflation-first]').forEach(element=>element.textContent=story.firstYear);
    document.querySelector('#fiscal-growth-title').textContent='¿Cuánto han subido desde '+story.firstYear+'?';
    for(const [id,value] of [['fiscal-tax-index',last.taxIndex-100],['fiscal-spend-index',last.spendIndex-100],['fiscal-price-index',last.priceIndex-100]]) document.querySelector('#'+id).textContent=signed(value)+'%';
    document.querySelector('#fiscal-debt-growth').textContent=story.debtGrowth==null?'Sin dato':signed(story.debtGrowth)+'%';
    document.querySelector('#citizen-net-growth').textContent=signed(story.netGrowth)+'%';
    const wageRelation=story.netGrowthReal<0?`por debajo de los precios: pierdes un ${format(Math.abs(story.netGrowthReal))}% de compra`:story.netGrowthReal>0?`por encima de los precios: ganas un ${format(story.netGrowthReal)}% de compra`:'al mismo ritmo que los precios';
    document.querySelector('#citizen-comparison').textContent=`${story.firstYear} → ${story.lastYear}: el salario neto del perfil OCDE crece ${wageRelation}. La recaudación y el gasto ${story.taxGrowthReal>0&&story.spendGrowthReal>0?'crecen por encima de los precios':'se comparan con los precios en las curvas'}.`;
    document.querySelector('#basket-final').textContent=format(last.priceIndex)+' €';
    document.querySelector('#purchasing-change').textContent=signed(last.purchasingPower-100)+'%';
    document.querySelector('#purchasing-explanation').textContent=`Sigues teniendo 100 € nominales, sin intereses ni rendimientos, pero compras ${format(Math.abs(last.loss))}% ${last.loss>=0?'menos':'más'} que en ${story.firstYear}.`;
    document.querySelector('#fiscal-real-result').textContent=`Incluso quitando el efecto de los precios, se recauda un ${format(Math.abs(story.taxGrowthReal))}% ${story.taxGrowthReal>=0?'más':'menos'} y se gasta un ${format(Math.abs(story.spendGrowthReal))}% ${story.spendGrowthReal>=0?'más':'menos'}.`;
    document.querySelector('#purchasing-final').textContent=format(last.purchasingPower)+' €';
    document.querySelector('#finance-chart').setAttribute('aria-label',`Impuestos, gasto, inflación acumulada, salario neto del perfil OCDE y poder de compra del ahorro sin rendimiento y deuda pública nominal. Variación acumulada desde ${story.firstYear}, en porcentaje; datos hasta ${story.lastYear}. Tabla completa debajo con base ${story.firstYear}.`);
    const table=document.querySelector('#inflation-series-table');
    table.querySelector('caption').textContent=`Variación desde ${story.firstYear} · poder de compra en euros de ese año · inflación IPCA media anual`;
    table.querySelector('tbody').innerHTML=rows.map(row=>`<tr><th scope="row">${row.year}</th>${[signed(row.taxIndex-100)+'%',signed(row.spendIndex-100)+'%',signed(row.priceIndex-100)+'%',signed(row.netIndex-100)+'%',format(row.purchasingPower)+' €',row.annualInflation==null?'Sin dato':signed(row.annualInflation)+'%',row.debtIndex==null?'Sin dato':signed(row.debtIndex-100)+'%'].map(value=>`<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
    const growthMin=Math.min(0,Math.floor(Math.min(...rows.flatMap(row=>[row.taxIndex-100,row.spendIndex-100,row.priceIndex-100,row.netIndex-100,row.purchasingPower-100,row.debtIndex==null?0:row.debtIndex-100]))/10)*10);
    const colors=[p.finance[0],p.finance[2],p.finance[3],p.surplus,p.debt,document.documentElement.dataset.chartTheme==='dark'?'#ef9bd5':'#af2877'];
    fiscalChart.setOption({animation:!reducedMotion.matches,
      grid:{left:44,right:18,top:20,bottom:32},
      tooltip:{trigger:'axis',confine:true,formatter:points=>{const row=rows.find(row=>row.year===Number(points[0].axisValue));return `<strong>${row.year} · desde ${story.firstYear}</strong><br>${points.map(point=>`${point.marker}${escapeHtml(point.seriesName)}: ${point.value==null?'Sin dato':signed(point.value)+'%'}`).join('<br>')}<br>Los 100 € compran como ${format(row.purchasingPower)} € de ${story.firstYear}.`}},
      xAxis:{type:'category',boundaryGap:false,data:years,axisLabel:{fontSize:10,interval:intervals}},
      yAxis:{type:'value',min:growthMin,axisLabel:{fontSize:10,formatter:value=>format(value,0)+'%'}},
      series:[['Impuestos + cotizaciones','taxIndex'],['Gasto público','spendIndex'],['Inflación acumulada','priceIndex'],['Salario neto · perfil OCDE','netIndex'],['Ahorro sin rendimiento · poder de compra','purchasingPower'],['Deuda pública nominal','debtIndex']].map(([name,key],i)=>({name,type:'line',data:rows.map(row=>row[key]==null?null:row[key]-100),showSymbol:false,lineStyle:{color:colors[i],width:3,type:i===2?'dashed':'solid'},itemStyle:{color:colors[i]},...(i===2?{markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:p.axis,type:'dotted'},data:[{yAxis:0}]}}:{})}))
    },true);
  }
  function showYear(year) {
    const row=data.finances.rows.find(item=>item.year===year);
    slider.value=year;document.querySelector('#finance-year-output').textContent=year;
    document.querySelector('#income-year').textContent=year;
    document.querySelector('#income-total').textContent=`${format(row.revenue,0)} M€`;
    document.querySelector('#income-parts').innerHTML=row.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/row.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/row.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join('');
  }
  start.addEventListener('change',render);
  slider.addEventListener('input',()=>timeline.select(slider.value));
  timeline.subscribe(showYear);render();
  return {resize:()=>fiscalChart.resize(),refresh:render};
}
