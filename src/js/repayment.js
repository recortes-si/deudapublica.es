function initRepayment({data,format,escapeHtml,reducedMotion,charts}) {
 const p=data.repayment,chart=charts.init(document.querySelector('#repay-chart'),'repayment');
 const byId=id=>document.getElementById(id),cuts=[...document.querySelectorAll('[data-repay-cut]')];
 const horizon=byId('repay-horizon'),rate=byId('repay-rate'),inflation=byId('repay-inflation'),pensionMode=byId('repay-pension-mode'),taxIncome=byId('repay-tax-income'),growth=byId('repay-growth');
 let modelRate=p.rate;
 const settings=()=>({inflation:Number(inflation.value),pensionMode:pensionMode.value,reductions:Object.fromEntries(cuts.map(input=>[input.dataset.repayCut,-Number(input.value)]))});
 function render() {
  const years=Number(horizon.value),r=modelRate,measures=repaymentMeasures(p,settings()),primary=p.primary+measures.total;
  const income=repaymentRevenue(p,{taxChange:Number(taxIncome.value),growth:Number(growth.value),years:p.maxHorizon});
  const target=requiredSpendingAdjustment({debt:p.debt,primary:p.primary,rate:r,years,extraRevenue:income.rows.map(row=>row.total)});
  const projection=repaymentProjection({debt:p.debt,primary,primaryByYear:income.rows.map(row=>primary+row.total),rate:r,years:p.maxHorizon}),baseline=repaymentProjection({debt:p.debt,primary:p.primary,rate:r,years});
  const first=projection.rows[1],gap=target-measures.total,balance=primary+income.first-p.debt*r;
  byId('repay-horizon-output').textContent=years+' años';byId('repay-rate-output').textContent=format(r*100,2)+'%';byId('repay-inflation-output').textContent=format(Number(inflation.value),2)+'%';
  const sign=Math.abs(balance)<.01?'balanced':balance>0?'surplus':'deficit';
  byId('repay-balance').dataset.sign=sign;
  byId('repay-balance-name').textContent=sign==='surplus'?'Superávit':sign==='deficit'?'Déficit':'Equilibrio';
  const signedBalance=(sign==='deficit'?'−':sign==='surplus'?'+':'')+format(Math.abs(balance),0)+' M€';
  byId('repay-balance-value').textContent=signedBalance+'/año';
  byId('repay-balance-explanation').textContent=sign==='surplus'?'Después de pagar todos los gastos e intereses, sobra dinero para devolver deuda.':sign==='deficit'?'Aún se gasta más de lo que entra. La deuda sigue creciendo.':'Los ingresos cubren los gastos e intereses. La deuda se estabiliza, pero todavía no se devuelve.';
  byId('repay-tax-income-output').textContent=(Number(taxIncome.value)>0?'+':'')+format(Number(taxIncome.value),0)+'%';byId('repay-growth-output').textContent=format(Number(growth.value),2)+'%';
  byId('repay-extra-income').textContent='Ingresos adicionales: '+format(income.first,0)+' M€ el primer año';
  byId('repay-total').textContent=format(measures.total+income.first,0)+' M€';byId('repay-principal').textContent=format(Math.max(0,first.principal),0)+' M€';
  const original=p.primary-p.debt*r;
  byId('repay-original-balance').textContent=(original<0?'−':'+')+format(Math.abs(original),0)+' M€';
  byId('repay-account-saving').textContent=(measures.total<0?'−':'+')+format(Math.abs(measures.total),0)+' M€';byId('repay-account-balance').textContent=signedBalance;byId('repay-account-income').textContent=(income.first<0?'−':'+')+format(Math.abs(income.first),0)+' M€';
  const share=Math.max(0,Math.min(100,original<0?(measures.total+income.first)/-original*100:100));
  byId('repay-meter-label').textContent=sign==='surplus'?'Déficit cerrado. La mejora restante genera superávit.':'Déficit cubierto: '+format(share,0)+'%';
  byId('repay-meter-fill').style.width=share+'%';byId('repay-meter').setAttribute('aria-label',byId('repay-meter-label').textContent);
  const chosen=[...measures.items,...income.items].filter(item=>Math.abs(item.value)>.01);
  byId('repay-chosen').innerHTML=chosen.length?'<strong>Tus cambios, por partida</strong>'+chosen.map(item=>'<p><span>'+escapeHtml(item.name)+'</span><b>'+(item.value<0?'−':'+')+format(Math.abs(item.value),0)+' M€</b></p>').join(''):'Aún no has cambiado ninguna partida.';
  byId('repay-target').textContent=format(Math.max(0,target),0)+' M€';document.querySelector('.repay-target > span').textContent='Mejora anual por gasto necesaria, tras los ingresos, para devolverla en '+years+' años';
  const status=byId('repay-status');status.dataset.met=gap<=.01?'true':'false';status.textContent=gap>.01?'Faltan '+format(gap,0)+' M€/año de mejora por gasto para cumplir ese plazo.':'Tus cambios cubren el objetivo de '+years+' años con estos supuestos.';
  byId('repay-finish').textContent=projection.paidAfter===null?('Sin repago en '+p.maxHorizon+' años'):projection.paidAfter+' años';
  byId('repay-paid-interest').textContent=format(projection.rows.slice(1,years+1).reduce((sum,row)=>sum+row.interest,0),0)+' M€';
  const power=measures.pensionPurchasingChange*100,nominal=measures.pensionNominalChange*100;
  byId('repay-pension-effect').textContent='Contributivas: cuantía nominal '+(nominal<0?'−':'+')+format(Math.abs(nominal),2)+'%; poder adquisitivo '+(power<0?'−':'+')+format(Math.abs(power),2)+'% en el ejemplo. Incluye revalorización, cambio individual y ajuste global de protección social.';
  cuts.forEach(input=>{const key=input.dataset.repayCut,value=measures.items.find(item=>item.id===key).value;byId('repay-output-'+key).textContent=(Number(input.value)>0?'+':'')+format(Number(input.value),1)+'%';const saving=byId('repay-saving-'+key);if(saving)saving.textContent=(value<0?'Mayor gasto: ':'Ahorro: ')+format(Math.abs(value),0)+' M€/año';});
  chart.setOption({animation:!reducedMotion.matches,color:['#bb3434','#436828'],tooltip:{trigger:'axis',confine:true,formatter:points=>`<strong>Año ${escapeHtml(points[0].axisValue)}</strong><br>${points.map(point=>`${point.marker}${escapeHtml(point.seriesName)}: ${format(point.value*1000,0)} M€`).join('<br>')}`},grid:{left:54,right:16,top:22,bottom:35},xAxis:{type:'category',boundaryGap:false,data:baseline.rows.map(row=>String(row.offset)),axisLabel:{interval:Math.max(0,Math.floor(years/6)-1),fontSize:10}},yAxis:{type:'value',min:0,axisLabel:{fontSize:10},splitLine:{lineStyle:{color:'#e2e8e6'}}},series:[{name:'Sin ajustes adicionales',type:'line',showSymbol:false,lineStyle:{width:2,type:'dashed'},data:baseline.rows.map(row=>row.debt/1000)},{name:'Con tus medidas',type:'line',showSymbol:false,lineStyle:{width:3},areaStyle:{opacity:.08},data:projection.rows.slice(0,years+1).map(row=>row.debt/1000)}]},true);
 }
 [horizon,inflation,taxIncome,growth,...cuts].forEach(input=>input.addEventListener('input',render));pensionMode.addEventListener('change',render);
 rate.addEventListener('input',()=>{modelRate=Number(rate.value)/100;render();});
 document.querySelectorAll('[data-benefit-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-benefit-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.querySelectorAll('[data-benefit-panel]').forEach(panel=>panel.hidden=panel.dataset.benefitPanel!==button.dataset.benefitTab);
 }));
 document.querySelectorAll('[data-spending-tab]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-spending-tab]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.querySelectorAll('[data-spending-panel]').forEach(panel=>panel.hidden=panel.dataset.spendingPanel!==button.dataset.spendingTab);
 }));
 byId('repay-complete').addEventListener('click',()=>{
  const income=repaymentRevenue(p,{taxChange:Number(taxIncome.value),growth:Number(growth.value),years:p.maxHorizon});
  const target=requiredSpendingAdjustment({debt:p.debt,primary:p.primary,rate:modelRate,years:Number(horizon.value),extraRevenue:income.rows.map(row=>row.total)});
  const ids=['general','economy','health','education'];
  const fixed=repaymentMeasures(p,{...settings(),reductions:{...settings().reductions,...Object.fromEntries(ids.map(id=>[id,0]))}}).total;
  const percent=Math.max(0,Math.min(100,Math.ceil((target-fixed)/p.cuts.filter(item=>ids.includes(item.id)).reduce((sum,item)=>sum+item.base,0)*1000)/10));
  cuts.filter(input=>ids.includes(input.dataset.repayCut)).forEach(input=>input.value=-percent);render();
 });
 byId('repay-reset').addEventListener('click',()=>{horizon.value=p.defaultHorizon;modelRate=p.rate;rate.value=(p.rate*100).toFixed(2);inflation.value=p.defaultInflation;pensionMode.value='ipc';taxIncome.value=0;growth.value=0;cuts.forEach(input=>input.value=0);render();});
 render();return {resize:()=>chart.resize(),refresh:render};
}
