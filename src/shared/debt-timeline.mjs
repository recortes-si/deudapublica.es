export function validateDebtTimeline(raw, years) {
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!Number.isInteger(raw.observedThrough) || raw.observedThrough < Math.max(...years)) throw new Error('Cronología: actualiza observedThrough para cubrir el último año fiscal');
  if (!raw.governments?.length || !Array.isArray(raw.events)) throw new Error('Cronología: faltan gobiernos o sucesos');
  const ids = new Set();
  raw.governments.forEach((government,index) => {
    if (!government.id || ids.has(government.id) || !government.name || !government.shortName || !government.party || !date(government.start) || (government.end != null && (!date(government.end) || government.end < government.start)) || (index && government.start <= raw.governments[index-1].start)) throw new Error('Cronología: gobierno duplicado, fecha inválida u orden incorrecto');
    ids.add(government.id);
  });
  if (new Date(raw.governments[0].start).getUTCFullYear() > Math.min(...years)) throw new Error('Cronología: falta el gobierno del primer año fiscal');
  const events = new Set();
  raw.events.forEach(event => {
    if (!Number.isInteger(event.year) || events.has(event.year) || !event.label || !event.shortLabel || !event.description || !/^https?:$/.test(new URL(event.sourceUrl).protocol)) throw new Error('Cronología: suceso inválido o duplicado');
    events.add(event.year);
  });
  return raw;
}

// Annual data: attribute the band to whoever held office for most days.
// Exact appointment/cessation dates remain available beside the chart.
export function governmentForYear(timeline, year) {
  const yearStart = Date.UTC(year,0,1), yearEnd = Date.UTC(year+1,0,1);
  const terms = timeline.governments.map((government,index) => {
    const start = Date.parse(government.start);
    const end = index < timeline.governments.length-1 ? Date.parse(timeline.governments[index+1].start) : Date.UTC(timeline.observedThrough+1,0,1);
    return { government, duration:Math.max(0,Math.min(end,yearEnd)-Math.max(start,yearStart)) };
  });
  terms.sort((a,b)=>b.duration-a.duration);
  return terms[0]?.duration ? terms[0].government : null;
}

export function governmentSegments(timeline, years) {
  const result=[];
  years.forEach((year,index)=>{
    const government=governmentForYear(timeline,year);
    const previous=result.at(-1);
    if (previous?.government?.id===government?.id) { previous.endIndex=index;previous.endYear=year; }
    else result.push({government,startIndex:index,endIndex:index,startYear:year,endYear:year});
  });
  return result;
}
