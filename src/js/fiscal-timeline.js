function createFiscalTimeline(data) {
  const years = data.finances.rows.map(row=>row.year);
  if (!years.length) throw new Error('No hay años disponibles de finanzas públicas');
  let year=years.at(-1);
  const listeners=new Set();
  return {years,get year(){return year;},select(value){const next=Number(value);if(!years.includes(next))throw new Error('Año fiscal no disponible');year=next;listeners.forEach(fn=>fn(year));},subscribe(fn){listeners.add(fn);fn(year);}};
}
