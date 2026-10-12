function initSharing({data,charts,format}) {
  const chartPeriod=id=>{const years=echarts.getInstanceByDom(document.getElementById(id)).getOption().xAxis[0].data;return years[0]+'—'+years.at(-1);};
  const specs=[
    {key:'deuda',chart:'debt-chart',anchor:'evolucion',title:'Deuda pública y saldo anual',controls:'#debt-mode,#debt-period,#debt-year',summary:()=>[text('#debt-unit')],source:'Banco de España · Eurostat. Saldo anual y deuda al cierre; escalas distintas.'},
    {key:'inflacion',chart:'finance-chart',anchor:'finanzas',title:'La inflación no borra la deuda',controls:'#finance-start',summary:()=>[chartPeriod('finance-chart')+' · variación acumulada (%)'],source:'Eurostat · Banco de España · OCDE. Salario: perfil OCDE; ahorro sin rendimientos.'},
    {key:'presupuesto',chart:'budget-chart',anchor:'presupuesto',title:'Las partidas del presupuesto estatal',summary:()=>[text('#budget-current-title')+' · M€'],source:'Hacienda · PGE 2024 prorrogados. Créditos aprobados, no gasto ejecutado.'},
    {key:'repago',chart:'repay-chart',anchor:'repago',title:'Un plan para reducir la deuda',controls:'#repago input[id],#repago select[id]',summary:()=>[text('#repay-horizon-output')+' · deuda pendiente en mil M€'],source:'Simulación con tus medidas; no es una previsión. Supuestos en deudapublica.es.'},
    {key:'crecimiento',chart:'gdp-pcap-chart',anchor:'crecer',title:'PIB total y PIB por habitante',summary:()=>[chartPeriod('gdp-pcap-chart')+' · índice 100 = 2000'],source:'Banco Mundial. Series en dólares; la comparación también recoge el tipo de cambio.'},
    {key:'intereses',chart:'interest-chart',anchor:'intereses',title:'Intereses que pagamos. Impuestos que podríamos ahorrarnos.',controls:'#intereses input',summary:()=>[`${data.interest.year} · M€ / año`],source:'Eurostat · AEAT · Hacienda · Seguridad Social. Escenario sin deuda.'},
    {key:'gasto',anchor:'gasto',title:'¿A dónde va cada 100 € de gasto?',controls:'#spending-year',host:'.spending-overview',summary:()=>[document.querySelector('#spending-year').value+' · euros de cada 100 € de gasto'],source:'IGAE · COFOG. Gasto ejecutado de todas las Administraciones.'}
  ];
  function text(selector){return document.querySelector(selector)?.innerText.replace(/\s+/g,' ').trim()||'';}
  function controls(spec){return spec.controls?[...document.querySelectorAll(spec.controls)]:[];}
  function view(spec){
    const values=Object.fromEntries(controls(spec).map(el=>[el.id||'tax-'+el.value,el.type==='checkbox'?el.checked:el.value]));
    const state={v:1,values,theme:document.documentElement.dataset.chartTheme};
    if(spec.key==='deuda')state.governments=document.querySelector('#debt-governments-toggle').getAttribute('aria-pressed')==='true';
    if(spec.key==='presupuesto'){
      const names=[...document.querySelectorAll('#budget-path button,#budget-path [aria-current]')].map(el=>el.textContent);let node=data.budget.root;state.path=[];
      for(const name of names.slice(1)){const index=node.children?.findIndex(item=>item.name===name);if(index==null||index<0)break;state.path.push(index);node=node.children[index];}
    }
    return state;
  }
  function shareUrl(spec){
    const url=new URL(location.protocol==='https:'||location.protocol==='http:'?location.href:'https://deudapublica.es/');
    if(['localhost','127.0.0.1','[::1]'].includes(url.hostname)){url.protocol='https:';url.host='deudapublica.es';url.pathname='/';}
    url.search='';url.hash=spec.anchor;url.searchParams.set('grafico',spec.key);url.searchParams.set('vista',JSON.stringify(view(spec)));return url.href;
  }
  // Apply only known, validated controls. Shared links never execute code or inject HTML.
  try {
    const params=new URLSearchParams(location.search),spec=specs.find(item=>item.key===params.get('grafico')),raw=params.get('vista');
    if(spec&&raw&&raw.length<10000){const state=JSON.parse(raw);if(state.v===1){
      if(['light','dark'].includes(state.theme))document.querySelector(`[data-chart-theme-choice="${state.theme}"]`).click();
      for(const el of controls(spec)){
        const value=state.values?.[el.id||'tax-'+el.value];if(el.type==='checkbox'){if(typeof value==='boolean'){el.checked=value;el.dispatchEvent(new Event('change',{bubbles:true}));}continue;}if(typeof value!=='string'||value.length>30)continue;
        if(el.tagName==='SELECT'){if(![...el.options].some(opt=>opt.value===value))continue;}
        else {const n=Number(value);if(!Number.isFinite(n)||n<Number(el.min)||n>Number(el.max))continue;}
        el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));
      }
      if(spec.key==='deuda'&&state.governments===true)document.querySelector('#debt-governments-toggle').click();
      if(spec.key==='presupuesto'&&Array.isArray(state.path))for(const index of state.path.slice(0,10)){if(!Number.isInteger(index)||index<0)break;const button=document.querySelector(`#budget-list [data-budget-index="${index}"]`);if(!button)break;button.click();}
    }}
  } catch { /* Malformed or old share links retain the normal default view. */ }
  const dialog=document.createElement('dialog');dialog.className='share-dialog';dialog.setAttribute('aria-labelledby','share-title');
  dialog.innerHTML=`<div class="share-dialog-top"><div><span class="card-kicker">Llévate los datos</span><h2 id="share-title">Comparte este gráfico</h2></div><button type="button" class="share-close" aria-label="Cerrar">×</button></div><p id="share-caption"></p><div class="share-preview"><img id="share-preview-image" alt="Vista previa del gráfico que vas a compartir" hidden><span id="share-loading">Preparando imagen…</span></div><div class="share-actions"><button type="button" id="share-native" disabled>Compartir imagen…</button><button type="button" id="share-download" disabled>Descargar PNG</button><a id="share-whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><a id="share-x" target="_blank" rel="noopener noreferrer">X / Twitter ↗</a><button type="button" id="share-copy">Copiar enlace</button></div><p class="share-help">WhatsApp y X abren un mensaje con el enlace y los filtros elegidos. Para enviar también el gráfico, usa «Compartir imagen» o adjunta el PNG descargado.</p><p id="share-status" role="status" aria-live="polite"></p><input id="share-link" readonly aria-label="Enlace para copiar manualmente" hidden>`;
  document.body.append(dialog);const byId=id=>document.getElementById(id);let file=null,objectUrl=null,current=null,currentUrl='',token=0;
  const status=message=>byId('share-status').textContent=message;
  function clearPreview(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;file=null;byId('share-preview-image').hidden=true;byId('share-native').disabled=byId('share-download').disabled=true;}
  dialog.querySelector('.share-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(dialog.open)return;token++;clearPreview();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  function wrap(ctx,value,x,y,width,lineHeight){let line='';for(const word of value.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line=word;}else line=next;}if(line){ctx.fillText(line,x,y);y+=lineHeight;}return y;}
  async function picture(spec){
    const palette=charts.palette,chart=spec.chart?echarts.getInstanceByDom(document.getElementById(spec.chart)):null;
    let image=null;if(chart){chart.dispatchAction({type:'hideTip'});image=new Image();image.src=chart.getDataURL({type:'svg',backgroundColor:palette.background});await image.decode();}
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=3200;const ctx=canvas.getContext('2d');ctx.fillStyle=palette.background;ctx.fillRect(0,0,1200,3200);let y=50;
    ctx.fillStyle=palette.ink;ctx.font='bold 24px system-ui';ctx.fillText('dp · deudapublica.es',56,y);ctx.fillStyle='#e21b2f';ctx.fillRect(1020,30,120,8);ctx.fillStyle='#ffc400';ctx.fillRect(1020,38,120,16);ctx.fillStyle='#e21b2f';ctx.fillRect(1020,54,120,8);
    y+=60;ctx.fillStyle=palette.ink;ctx.font='bold 36px system-ui';y=wrap(ctx,spec.title,56,y,1088,46)+16;
    ctx.fillStyle=palette.text;ctx.font='22px system-ui';for(const note of spec.summary().filter(Boolean)){y=wrap(ctx,note,56,y,1088,32)+12;}
    if(image){const h=Math.min(1800,1088*image.height/image.width),w=h*image.width/image.height;ctx.drawImage(image,(1200-w)/2,y,w,h);y+=h+24;
      const option=chart.getOption();const legend=spec.key==='deuda'?[{name:'Déficit',itemStyle:{color:palette.deficit}},{name:'Superávit',itemStyle:{color:palette.surplus}},{name:'Deuda total',itemStyle:{color:palette.debt}}]:option.series;if(option.series[0]?.type!=='treemap'){ctx.font='20px system-ui';let x=56;for(const [index,series]of legend.entries()){if(!series.name)continue;const width=ctx.measureText(series.name).width+44;if(x+width>1144){x=56;y+=32;}ctx.fillStyle=series.lineStyle?.color||series.itemStyle?.color||option.color?.[index]||palette.debt;ctx.fillRect(x,y-13,18,4);ctx.fillStyle=palette.text;ctx.fillText(series.name,x+26,y);x+=width;}y+=44;}
    }else if(spec.key==='gasto'){
      const row=data.spendingHistory.find(item=>item.year===Number(document.querySelector('#spending-year').value));
      for(const item of [...row.items].sort((a,b)=>b.share-a.share)){ctx.fillStyle=palette.ink;ctx.font='21px system-ui';ctx.fillText(item.name,56,y);ctx.textAlign='right';ctx.fillText(format(item.share,2)+' €',1144,y);ctx.textAlign='left';y+=18;ctx.fillStyle=palette.panel;ctx.fillRect(56,y,1088,12);ctx.fillStyle=palette.debt;ctx.fillRect(56,y,1088*item.share/100,12);y+=35;ctx.fillStyle=palette.text;ctx.font='17px system-ui';ctx.fillText(format(item.value,0)+' M€ al año',56,y);y+=35;}
    }
    ctx.fillStyle=palette.grid;ctx.fillRect(56,y,1088,2);y+=38;ctx.fillStyle=palette.text;ctx.font='19px system-ui';y=wrap(ctx,spec.source,56,y,1088,28)+16;y+=20;
    const cropped=document.createElement('canvas');cropped.width=1200;cropped.height=y;cropped.getContext('2d').drawImage(canvas,0,0);
    const blob=await new Promise(resolve=>cropped.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG unavailable');return new File([blob],`deudapublica-${spec.key}.png`,{type:'image/png'});
  }
  async function open(spec){
    current=spec;currentUrl=shareUrl(spec);const request=++token;clearPreview();status('');byId('share-link').hidden=true;byId('share-caption').textContent=spec.title;byId('share-loading').hidden=false;byId('share-loading').textContent='Preparando imagen…';
    const message=`${spec.title} · España en datos.`,whatsapp=new URL('https://wa.me/'),twitter=new URL('https://twitter.com/intent/tweet');whatsapp.searchParams.set('text',message+' '+currentUrl);twitter.searchParams.set('text',message);twitter.searchParams.set('url',currentUrl);byId('share-whatsapp').href=whatsapp.href;byId('share-x').href=twitter.href;dialog.showModal();
    try {const result=await picture(spec);if(request!==token)return;file=result;objectUrl=URL.createObjectURL(file);byId('share-preview-image').src=objectUrl;byId('share-preview-image').hidden=false;byId('share-loading').hidden=true;byId('share-download').disabled=false;byId('share-native').hidden=!navigator.share;byId('share-native').disabled=false;}
    catch {if(request===token){byId('share-loading').textContent='No se ha podido crear la imagen. Puedes compartir el enlace.';status('El enlace sigue disponible.');}}
  }
  byId('share-download').addEventListener('click',()=>{if(!file)return;const link=document.createElement('a');link.href=objectUrl;link.download=file.name;link.click();status('Imagen preparada para descargar. Puedes adjuntarla a tu mensaje.');});
  byId('share-native').addEventListener('click',async()=>{try{const withFile=Boolean(file&&navigator.canShare?.({files:[file]}));await navigator.share(withFile?{files:[file],title:current.title,text:current.title+' '+currentUrl}:{title:current.title,text:current.title,url:currentUrl});status(withFile?'Imagen compartida.':'Enlace compartido. Para enviar la imagen, descarga el PNG.');}catch(error){if(error.name!=='AbortError')status('No se ha podido compartir. Prueba a descargar el PNG o copiar el enlace.');}});
  byId('share-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(currentUrl);status('Enlace copiado: conserva esta vista del gráfico.');}catch{byId('share-link').hidden=false;byId('share-link').value=currentUrl;byId('share-link').focus();byId('share-link').select();status('Copia este enlace para compartir la misma vista.');}});
  for(const spec of specs){const element=spec.chart?document.getElementById(spec.chart):null;const host=spec.host?document.querySelector(spec.host):element.parentElement;const bar=document.createElement('div');bar.className='chart-share-bar';const button=document.createElement('button');button.type='button';button.className='chart-share-button';button.innerHTML='<span aria-hidden="true">↗</span> Compartir gráfico';button.setAttribute('aria-label','Compartir: '+spec.title);button.addEventListener('click',()=>open(spec));bar.append(button);if(element){if(spec.key==='deuda'||spec.key==='crecimiento')host.after(bar);else element.after(bar);}else host.append(bar);}
  const pageButton=document.createElement('a');pageButton.className='page-share-link';pageButton.href='#evolucion';pageButton.textContent='Compartir datos ↗';pageButton.addEventListener('click',event=>{event.preventDefault();open(specs[0]);});document.querySelector('footer').append(pageButton);
}
