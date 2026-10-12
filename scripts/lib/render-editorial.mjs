export function editorialValues(data, { format }) {
  const e = data.editorial;
  const value = (id, digits = 1) => {
    if (!e.indicators[id]) throw new Error(`Editorial: falta el indicador ${id}`);
    return format(e.indicators[id].value, digits);
  };
  const period = id => e.indicators[id].period;
  const lower = text => text.charAt(0).toLowerCase() + text.slice(1);
  const source = id => {
    const item = e.indicators[id];
    return item.sourceUrl || data.sources.find(source => source.id === item.sourceId).url;
  };
  return {
    MIGRATION_CENSUS_DATE: new Intl.DateTimeFormat('es-ES', { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(data.population.date)),
    MIGRATION_CENSUS_YEAR: period('foreign-born-share').match(/\d{4}/)[0],
    IMV_PERIOD: lower(period('imv-foreign-holders')), IMV_SOURCE: source('imv-foreign-holders'),
    CONVICTIONS_YEAR: period('convictions-foreign'), CONVICTIONS_SOURCE: source('convictions-foreign'),
    SURGERY_WAIT_PERIOD: lower(period('surgery-wait-days')), SURGERY_WAIT_SOURCE: source('surgery-wait-days'),
    GROWTH_BASE_YEAR: data.gdpPerCapita.baseYear,
    MIGRATION_POPULATION: format(data.population.value / 1e6),
    MIGRATION_POPULATION_GROWTH: value('population-growth', 0),
    MIGRATION_FOREIGN_BORN: value('foreign-born-share'),
    MIGRATION_FOREIGN_NATIONALITY: value('foreign-nationality-millions'),
    IMV_FOREIGN_SHARE: format(e.imvForeignShare),
    IMV_FOREIGN_HOLDERS: value('imv-foreign-holders', 0), IMV_TOTAL_HOLDERS: value('imv-total-holders', 0),
    CONVICTIONS_FOREIGN: value('convictions-foreign'), CONVICTIONS_SPANISH: value('convictions-spanish'),
    CONVICTIONS_SPANISH_SHARE: value('convictions-spanish-share'),
    CONVICTIONS_FOREIGN_WIDTH: Number(e.convictionWidths.foreign.toFixed(2)),
    CONVICTIONS_SPANISH_WIDTH: Number(e.convictionWidths.spanish.toFixed(2)),
    SURGERY_WAIT_DAYS: value('surgery-wait-days', 0), SURGERY_WAIT_PATIENTS: value('surgery-wait-patients', 0),
    LABOR_UNEMPLOYMENT: value('unemployment'), LABOR_YOUTH_UNEMPLOYMENT: value('youth-unemployment'),
    LABOR_EU_YOUTH_UNEMPLOYMENT: value('eu-youth-unemployment'), LABOR_TEMPORARY: value('temporary-contracts', 0),
    LABOR_RESEARCH_SPAIN: value('research-spain'), LABOR_RESEARCH_EU: value('research-eu'),
    LABOR_SCHOOL_LEAVING: value('early-school-leaving', 0)
  };
}
