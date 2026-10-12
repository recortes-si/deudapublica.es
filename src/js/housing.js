function initHousing({data,format,reducedMotion,charts}) {
  const {rows,baseYear}=data.housing,chart=charts.init(document.querySelector('#housing-chart'),'housing');
  const yearSelect=document.querySelector('#housing-year');
  function render(){
    const p=charts.palette,selected=rows.find(r=>r.year===Number(yearSelect.value));
    for(const [id,key] of [['households','cumulativeHouseholds'],['completed','cumulativeCompleted'],['gap','cumulativeGap']])document.querySelector('#housing-'+id).textContent=format(selected[key],0);
    document.querySelectorAll('[data-housing-year]').forEach(el=>el.textContent=selected.year);
    document.querySelector('#housing-cumulative-gap').textContent=`Déficit acumulado entre ${rows[0].year} y ${selected.year}: ${format(selected.cumulativeHouseholds,0)} hogares nuevos − ${format(selected.cumulativeCompleted,0)} viviendas terminadas = ${format(selected.cumulativeGap,0)} viviendas. Referencia inicial cero; enlace histórico aproximado.`;
    document.querySelector('#housing-price-result').textContent=`Precio de compra en ${selected.year}: ${selected.priceAccumulated>=0?'+':''}${format(selected.priceAccumulated,1)}% desde el cierre de ${baseYear} (INE).`;
    const defs=[{name:'Hogares creados · acumulado',key:'cumulativeHouseholds',type:'line',color:p.debt},{name:'Viviendas terminadas · acumulado',key:'cumulativeCompleted',type:'line',color:p.surplus},{name:'Déficit acumulado',key:'cumulativeGap',type:'line',color:p.deficit},{name:'Hogares bloqueados · estimación ICE',key:'blockedHouseholds',type:'line',color:p.finance[3],dashed:true}];
    chart.setOption({animation:!reducedMotion.matches,grid:{left:40,right:16,top:32,bottom:30},graphic:[{type:'text',left:8,top:4,style:{text:'Acumulado desde '+rows[0].year+' · miles',fill:p.text,fontSize:10}}],
      tooltip:{trigger:'axis',confine:true,textStyle:{fontSize:11},formatter:points=>{const row=rows.find(r=>r.year===Number(points[0].axisValue));return `<strong>${rows[0].year}—${row.year} · acumulado</strong><br>${points.filter(point=>row[defs[point.seriesIndex].key]!=null).map(point=>`${point.marker}${point.seriesName}: ${format(row[defs[point.seriesIndex].key],0)}`).join('<br>')}${row.blockedHouseholds==null?'<br>Hogares bloqueados: sin estimación para este año.':'<br>ICE: demanda pendiente estimada respecto a 2014.'}`;}},
      xAxis:{type:'category',data:rows.map(r=>String(r.year)),axisLabel:{fontSize:11,interval:index=>index%Math.ceil(rows.length/4)===0||index===rows.length-1},axisTick:{show:false}},
      yAxis:{type:'value',min:Math.min(0,...rows.map(r=>r.cumulativeGap/1000)),axisLabel:{fontSize:10,formatter:value=>format(value,0)},splitNumber:4},
      series:defs.map(def=>({name:def.name,type:def.type,barMaxWidth:28,showSymbol:chart.getWidth()>=600,symbolSize:5,connectNulls:false,lineStyle:{color:def.color,width:3,type:def.dashed?'dashed':'solid'},itemStyle:{color:def.color},areaStyle:def.key==='cumulativeGap'?{color:p.deficit,opacity:.1}:undefined,data:rows.map(r=>({value:r[def.key]==null?null:r[def.key]/1000,itemStyle:{opacity:def.type==='line'||r.year===selected.year?1:.65}}))}))
    },true);
  }
  yearSelect.addEventListener('change',render);
  chart.on('click',point=>{if(rows.some(r=>r.year===Number(point.name))){yearSelect.value=point.name;render();}});
  render();return {resize:()=>{chart.resize();render();},refresh:render};
}
