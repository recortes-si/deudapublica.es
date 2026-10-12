# Datos de cada gráfico

<!-- Generado por npm run docs:data. Editar data/charts.json, no este fichero. -->

Contrato verificable de las visualizaciones publicadas. `npm run check` comprueba que fuentes, CSV/JSON, modelos, módulos y contenedores existen, que cada gráfico ECharts tiene ficha y que este documento está actualizado.

Los ficheros se leen durante la construcción. El navegador recibe `window.APP_DATA` y dibuja desde ese modelo; no descarga datos ni usa APIs. Los ceros de referencia, bases de 100, unidades, colores y límites de controles son constantes de presentación o supuestos, no observaciones históricas.

Para formatos, extracción, validaciones y actualización: [guía de datos](data.md). Para composición y publicación: [arquitectura](architecture.md).

| Visualización | Contenedor | Código que representa |
| --- | --- | --- |
| [Deuda pública y saldo anual](#debt) | `#debt-chart` | [src/js/debt-chart.js](../src/js/debt-chart.js) |
| [Intereses e impuestos equivalentes](#interest) | `#interest-chart` | [src/js/interest.js](../src/js/interest.js) |
| [Recaudación, gasto, inflación, salario, ahorro y deuda](#inflation) | `#finance-chart` | [src/js/finances.js](../src/js/finances.js) |
| [Cesta y poder de compra de 100 euros](#purchasing) | `#inflacion` | [src/js/finances.js](../src/js/finances.js) |
| [Desglose de ingresos totales](#income) | `#income-parts` | [src/js/finances.js](../src/js/finances.js) |
| [Gasto por funciones: queso, barras y desglose](#spending) | `#spending-donut` | [src/js/spending.js](../src/js/spending.js) |
| [Presupuesto estatal navegable](#budget) | `#budget-chart` | [src/js/budget.js](../src/js/budget.js) |
| [Intereses frente al gasto en educación](#debt-cost) | `.cost-scale` | [scripts/lib/render-repayment.mjs](../scripts/lib/render-repayment.mjs) |
| [Simulador de repago](#repayment) | `#repay-chart` | [src/js/repayment.js](../src/js/repayment.js) |
| [PIB total y por habitante](#growth) | `#gdp-pcap-chart` | [src/js/growth-chart.js](../src/js/growth-chart.js) |
| [Brecha de vivienda y emancipación](#housing) | `#housing-chart` | [src/js/housing.js](../src/js/housing.js) |
| [Comparación de tasas de condenados](#security) | `.migration-rate-comparison` | [scripts/lib/render-editorial.mjs](../scripts/lib/render-editorial.mjs) |
| [Cifras de inmigración, ayudas, servicios y trabajo](#editorial) | `.migration-kpis` | [scripts/lib/render-editorial.mjs](../scripts/lib/render-editorial.mjs) |
| [Contador y escala humana](#counter) | `#live-debt` | [src/js/indicators.js](../src/js/indicators.js) |

<a id="debt"></a>

## Deuda pública y saldo anual

- Contenedor: `#debt-chart`. Código: [src/js/debt-chart.js](../src/js/debt-chart.js).
- Modelo: `APP_DATA.debtHistory.rows`, `APP_DATA.debtTimeline`.
- Unidades: mil M€, % del PIB, euros constantes o euros por habitante.

### Entradas

- [data/raw/bde-deuda-anual.csv](../data/raw/bde-deuda-anual.csv) · `site.json → debtSourceId`. Fuente: [Banco de España · Deuda bruta consolidada de las Administraciones Públicas. Datos anuales](https://datos.bde.es/datos/es/datasets/000/003.html), 1994-2025.
- [data/raw/eurostat-deuda-pib.json](../data/raw/eurostat-deuda-pib.json) · `site.json → ratioSourceId`. Fuente: [Eurostat · Government deficit/surplus, debt and associated data](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en), 1995-2025.
- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.
- [data/raw/eurostat-inflacion-2000-2025.json](../data/raw/eurostat-inflacion-2000-2025.json) · `site.json → inflationSourceId`. Fuente: [Eurostat · IPCA · índice medio anual de precios de consumo · España](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table?lang=en), 2000–2025 (serie archivada prc_hicp_aind).
- [data/official/poblacion-serie.json](../data/official/poblacion-serie.json) · `site.json → populationSeriesSourceId`. Fuente: [Banco Mundial · World Development Indicators · Población total de España (serie histórica)](https://data.worldbank.org/indicator/SP.POP.TOTL), 1995-2025.
- [data/official/debt-timeline.json](../data/official/debt-timeline.json) · `site.json → debtTimelineSourceId`. Fuente: [La Moncloa · Banco de España · Gobiernos y sucesos de contexto de la serie de deuda](https://www.lamoncloa.gob.es/presidente/presidentes-desde-1823/Paginas/index.aspx), 2000–2025.

### Cálculo

Deuda nominal BDE y saldo B9 de Eurostat. PIB implícito = deuda / (ratio/100). Constantes = nominal × IPCA(base)/IPCA(año). Por habitante = nominal/población. Gobiernos: presidente con más días en cada año.

### Alcance y límites

Dos ejes independientes. Déficit no es aumento de deuda; IPCA no es deflactor del PIB. Las franjas de gobierno no atribuyen causalidad. Huecos de deuda no se interpolan.

<a id="interest"></a>

## Intereses e impuestos equivalentes

- Contenedor: `#interest-chart`. Código: [src/js/interest.js](../src/js/interest.js).
- Modelo: `APP_DATA.interest`.
- Unidades: M€ anuales.

### Entradas

- [data/raw/eurostat-intereses-2024.json](../data/raw/eurostat-intereses-2024.json) · `site.json → interestSourceId`. Fuente: [Eurostat · Intereses devengados por las Administraciones Públicas · SEC 2010 D.41 · S.13](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2024.
- [data/official/fiscal-scenarios-2024.json](../data/official/fiscal-scenarios-2024.json) · `site.json → taxSourceId`. Fuente: [AEAT · Ministerio de Hacienda · Seguridad Social · Escenarios de impuestos y cotizaciones: importes y metodología por partida](https://www.hacienda.gob.es/ig/memorias/memoria-tributaria-2024/mat-2024.pdf), 2024.

### Cálculo

D41PAY realizado del año frente a suma de measureCost(partida, control). IVA: base × (tipo inicial − elegido)/tipo inicial; rebaja proporcional: base × porcentaje/100. Se resta RETA del agregado de cotizaciones.

### Alcance y límites

Bases tributarias y ámbitos diferentes, identificados por partida. No incluye respuestas económicas ni estima cómo liquidar el principal.

<a id="inflation"></a>

## Recaudación, gasto, inflación, salario, ahorro y deuda

- Contenedor: `#finance-chart`. Código: [src/js/finances.js](../src/js/finances.js).
- Modelo: `APP_DATA.finances.rows`, `APP_DATA.debtHistory.rows`, `APP_DATA.citizenIncome.rows`.
- Unidades: variación acumulada en % desde el año elegido.

### Entradas

- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.
- [data/raw/eurostat-inflacion-2000-2025.json](../data/raw/eurostat-inflacion-2000-2025.json) · `site.json → inflationSourceId`. Fuente: [Eurostat · IPCA · índice medio anual de precios de consumo · España](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table?lang=en), 2000–2025 (serie archivada prc_hicp_aind).
- [data/raw/oecd-salarios-impuestos-2000-2025.csv](../data/raw/oecd-salarios-impuestos-2000-2025.csv) · `site.json → citizenIncomeSourceId`. Fuente: [OCDE · Labour taxation · tablas nacionales OCDE, persona soltera sin hijos al 100% del salario medio](https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_TAX_WAGES_COU@DF_TW_COU&df[ag]=OECD.CTP.TPS&df[vs]=2.1&dq=ESP...S_C0.AW100._Z.A&pd=2000,2025), 2000–2025.
- [data/raw/bde-deuda-anual.csv](../data/raw/bde-deuda-anual.csv) · `site.json → debtSourceId`. Fuente: [Banco de España · Deuda bruta consolidada de las Administraciones Públicas. Datos anuales](https://datos.bde.es/datos/es/datasets/000/003.html), 1994-2025.
- [data/raw/eurostat-deuda-pib.json](../data/raw/eurostat-deuda-pib.json) · `site.json → ratioSourceId`. Fuente: [Eurostat · Government deficit/surplus, debt and associated data](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en), 1995-2025.
- [data/official/poblacion-serie.json](../data/official/poblacion-serie.json) · `site.json → populationSeriesSourceId`. Fuente: [Banco Mundial · World Development Indicators · Población total de España (serie histórica)](https://data.worldbank.org/indicator/SP.POP.TOTL), 1995-2025.

### Cálculo

Cada serie: (valor año/valor inicio − 1) × 100. Poder de compra: (IPCA inicio/IPCA año − 1) × 100. Recaudación = D2REC+D5REC+D91REC+D61REC. Fin común observado; OCDE excluye estimatedYears.

### Alcance y límites

Salario neto THP: soltero sin hijos al 100% del salario medio, antes de IVA. Totales estatales y perfil individual no miden la misma población. D61 incluye cotizaciones imputadas.

<a id="purchasing"></a>

## Cesta y poder de compra de 100 euros

- Contenedor: `#inflacion`. Código: [src/js/finances.js](../src/js/finances.js).
- Modelo: `APP_DATA.debtHistory.rows`, `APP_DATA.citizenIncome.rows`.
- Unidades: euros del ejemplo inicial.

### Entradas

- [data/raw/eurostat-inflacion-2000-2025.json](../data/raw/eurostat-inflacion-2000-2025.json) · `site.json → inflationSourceId`. Fuente: [Eurostat · IPCA · índice medio anual de precios de consumo · España](https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table?lang=en), 2000–2025 (serie archivada prc_hicp_aind).
- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.
- [data/raw/oecd-salarios-impuestos-2000-2025.csv](../data/raw/oecd-salarios-impuestos-2000-2025.csv) · `site.json → citizenIncomeSourceId`. Fuente: [OCDE · Labour taxation · tablas nacionales OCDE, persona soltera sin hijos al 100% del salario medio](https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_TAX_WAGES_COU@DF_TW_COU&df[ag]=OECD.CTP.TPS&df[vs]=2.1&dq=ESP...S_C0.AW100._Z.A&pd=2000,2025), 2000–2025.

### Cálculo

Cesta = 100 × IPCA año/IPCA inicio. Ahorro = 100 × IPCA inicio/IPCA año. Usa el mismo periodo que inflación.

### Alcance y límites

100 € es una base ilustrativa, no una observación del ahorro total. No se presupone rendimiento ni una cesta individual idéntica al IPCA.

<a id="income"></a>

## Desglose de ingresos totales

- Contenedor: `#income-parts`. Código: [src/js/finances.js](../src/js/finances.js).
- Modelo: `APP_DATA.finances.rows`.
- Unidades: M€ y % de TR.

### Entradas

- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.

### Cálculo

Agrupa impuestos D2+D5+D91, cotizaciones D61, ventas P11_P12_P131, rentas D4, transferencias D7, capital D9−D91 y subvenciones D39. Porcentaje = partida/TR × 100.

### Alcance y límites

La deuda emitida es financiación y no ingreso TR. Transferencias de capital excluyen D91 para evitar duplicarlo.

<a id="spending"></a>

## Gasto por funciones: queso, barras y desglose

- Contenedor: `#spending-donut`. Código: [src/js/spending.js](../src/js/spending.js).
- Modelo: `APP_DATA.spendingHistory`.
- Unidades: euros por cada 100 de gasto y M€.

### Entradas

- [data/official/spending-cofog-2020-2024.csv](../data/official/spending-cofog-2020-2024.csv) · `site.json → spendingSourceId`. Fuente: [Intervención General de la Administración del Estado · Clasificación funcional del gasto de las Administraciones Públicas (COFOG)](https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/iacogof.aspx), 2020-2024 (2024 provisional).

### Cálculo

Share = valor función/TOTAL × 100. Queso = tres funciones destacadas + resto. Barras = cuatro featuredSpendingCodes; tabla/lista incluye todas las funciones.

### Alcance y límites

Todas las Administraciones. Los años provisionales dependen de site.json. No es el presupuesto estatal PGE ni una atribución de financiación por deuda.

<a id="budget"></a>

## Presupuesto estatal navegable

- Contenedor: `#budget-chart`. Código: [src/js/budget.js](../src/js/budget.js).
- Modelo: `APP_DATA.budget.root`.
- Unidades: M€ presupuestados y % del nivel.

### Entradas

- [data/official/pge-2024-politicas.json](../data/official/pge-2024-politicas.json) · `site.json → budgetSourceId`. Fuente: [Ministerio de Hacienda · Secretaría de Estado de Presupuestos y Gastos · Presupuestos Generales del Estado consolidados. Políticas de gasto](https://www.sepg.pap.hacienda.gob.es/sitios/sepg/es-ES/Presupuestos/DocumentacionEstadisticas/Estadisticas/Paginas/Estadisticas.aspx), 2024-P.

### Cálculo

Cada agrupación suma sus hojas recursivamente. Áreas proporcionales a nodeTotal. La lista y árbol sin JS usan el mismo JSON.

### Alcance y límites

PGE estatal consolidado prorrogado, capítulos 1 a 8. Agrupaciones editoriales y restos/ redondeos se identifican en el fichero. No mezclar con ejecución o COFOG.

<a id="debt-cost"></a>

## Intereses frente al gasto en educación

- Contenedor: `.cost-scale`. Código: [scripts/lib/render-repayment.mjs](../scripts/lib/render-repayment.mjs).
- Modelo: `APP_DATA.repayment`.
- Unidades: educación = 100%; M€ anuales.

### Entradas

- [data/raw/bde-deuda-anual.csv](../data/raw/bde-deuda-anual.csv) · `site.json → debtSourceId`. Fuente: [Banco de España · Deuda bruta consolidada de las Administraciones Públicas. Datos anuales](https://datos.bde.es/datos/es/datasets/000/003.html), 1994-2025.
- [data/raw/eurostat-deuda-pib.json](../data/raw/eurostat-deuda-pib.json) · `site.json → ratioSourceId`. Fuente: [Eurostat · Government deficit/surplus, debt and associated data](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en), 1995-2025.
- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.
- [data/raw/eurostat-intereses-2024.json](../data/raw/eurostat-intereses-2024.json) · `site.json → interestSourceId`. Fuente: [Eurostat · Intereses devengados por las Administraciones Públicas · SEC 2010 D.41 · S.13](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2024.
- [data/official/social-benefits-2024.json](../data/official/social-benefits-2024.json) · `site.json → benefitsSourceId`. Fuente: [Seguridad Social · Ministerio de Inclusión · Ejecución presupuestaria: pensiones, complementos, IMV y prestaciones familiares](https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Documents/2025/310325-ejecucion-presupuesto-dic-2024.pdf), 2024 · acumulado a diciembre.
- [data/official/spending-cofog-2020-2024.csv](../data/official/spending-cofog-2020-2024.csv) · `site.json → spendingSourceId`. Fuente: [Intervención General de la Administración del Estado · Clasificación funcional del gasto de las Administraciones Públicas (COFOG)](https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/iacogof.aspx), 2020-2024 (2024 provisional).
- [data/official/repayment-plan.json](../data/official/repayment-plan.json) · Parámetros del escenario, no observaciones.

### Cálculo

Intereses D41PAY/COFOG09 del año del plan × 100. Escenarios ilustrativos: intereses × 10; deuda × 0,01.

### Alcance y límites

Comparación de tamaños y supuestos, no previsión ni presupuesto intercambiable. Año de referencia distinto del último cierre cuando así lo indique el plan.

<a id="repayment"></a>

## Simulador de repago

- Contenedor: `#repay-chart`. Código: [src/js/repayment.js](../src/js/repayment.js).
- Modelo: `APP_DATA.repayment`.
- Unidades: mil M€ de principal por año de escenario.

### Entradas

- [data/raw/bde-deuda-anual.csv](../data/raw/bde-deuda-anual.csv) · `site.json → debtSourceId`. Fuente: [Banco de España · Deuda bruta consolidada de las Administraciones Públicas. Datos anuales](https://datos.bde.es/datos/es/datasets/000/003.html), 1994-2025.
- [data/raw/eurostat-deuda-pib.json](../data/raw/eurostat-deuda-pib.json) · `site.json → ratioSourceId`. Fuente: [Eurostat · Government deficit/surplus, debt and associated data](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en), 1995-2025.
- [data/raw/eurostat-finanzas-publicas.json](../data/raw/eurostat-finanzas-publicas.json) · `site.json → financesSourceId`. Fuente: [Eurostat · Ingresos, impuestos y gasto de las Administraciones Públicas · SEC 2010](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2000–2025.
- [data/raw/eurostat-intereses-2024.json](../data/raw/eurostat-intereses-2024.json) · `site.json → interestSourceId`. Fuente: [Eurostat · Intereses devengados por las Administraciones Públicas · SEC 2010 D.41 · S.13](https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table?lang=en), 2024.
- [data/official/social-benefits-2024.json](../data/official/social-benefits-2024.json) · `site.json → benefitsSourceId`. Fuente: [Seguridad Social · Ministerio de Inclusión · Ejecución presupuestaria: pensiones, complementos, IMV y prestaciones familiares](https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Documents/2025/310325-ejecucion-presupuesto-dic-2024.pdf), 2024 · acumulado a diciembre.
- [data/official/spending-cofog-2020-2024.csv](../data/official/spending-cofog-2020-2024.csv) · `site.json → spendingSourceId`. Fuente: [Intervención General de la Administración del Estado · Clasificación funcional del gasto de las Administraciones Públicas (COFOG)](https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Paginas/iacogof.aspx), 2020-2024 (2024 provisional).
- [data/official/repayment-plan.json](../data/official/repayment-plan.json) · Parámetros del escenario, no observaciones.

### Cálculo

Saldo primario = B9+intereses. Deuda siguiente = max(0,deuda+intereses−saldo primario ajustado). Intereses sobre principal pendiente. Cambios de prestaciones antes de protección social; ingresos fiscales con cambio proporcional y crecimiento nominal compuesto.

### Alcance y límites

Escenario de tipo constante y supuestos explícitos, no pronóstico. COFOG y obligaciones presupuestarias de Seguridad Social no son bases reconciliadas. Se impide doble cómputo de RETA/intereses/prestaciones.

<a id="growth"></a>

## PIB total y por habitante

- Contenedor: `#gdp-pcap-chart`. Código: [src/js/growth-chart.js](../src/js/growth-chart.js).
- Modelo: `APP_DATA.gdpPerCapita.series`.
- Unidades: índice 100 = baseYear (2000).

### Entradas

- [data/official/gdp-per-capita.json](../data/official/gdp-per-capita.json) · `site.json → gdpPerCapitaSourceId`. Fuente: [Banco Mundial · World Development Indicators · PIB (corriente), PIB per cápita (corriente) y PIB per cápita real (constante 2015) de España](https://data.worldbank.org/indicator/NY.GDP.PCAP.KD), 1995-2025.

### Cálculo

Cada serie gdp, pcap, pcapReal se divide por su propio valor en baseYear y multiplica por 100. Redondeo visual a una decimal.

### Alcance y límites

PIB corriente y per cápita corriente en dólares; per cápita real en dólares de 2015. Diferencia corriente/real no aísla inflación por efectos del tipo de cambio.

<a id="housing"></a>

## Brecha de vivienda y emancipación

- Contenedor: `#housing-chart`. Código: [src/js/housing.js](../src/js/housing.js).
- Modelo: `APP_DATA.housing.rows`.
- Unidades: miles de hogares/viviendas.

### Entradas

- [data/official/housing.json](../data/official/housing.json) · `site.json → housingSourceId`. Fuente: [INE · Ministerio de Vivienda y Agenda Urbana · Hogares nuevos, viviendas terminadas y precios de compra](https://www.ine.es/jaxiT3/Tabla.htm?t=60131), 2014-2025.
- [data/official/housing-emancipation.json](../data/official/housing-emancipation.json) · `site.json → emancipationHousingSourceId`. Fuente: [Cagigas Castro y Beraza Pérez · Revista ICE, n.º 942 · El déficit de vivienda de emancipación: demanda joven de vivienda](https://www.revistasice.com/index.php/ICE/article/download/7963/8228), 2014-2024.

### Cálculo

ECH 2014–2020: diferencia de medias anuales. ECP desde 2021: hogares enero(t+1)−enero(t). Viviendas: total anual o suma de cuatro trimestres. Brecha acumulada = suma nuevos hogares−suma terminadas. ICE = stock estimado independiente.

### Alcance y límites

Acumulación cero antes de 2014, no déficit nacional preexistente; enlace ECH/ECP aproximado. Sin ajuste por vacantes, demoliciones ni geografía. Hogares ICE no se suman a brecha ni se extrapolan a 2025. IPV compra Q4 solo se usa en la tabla/resumen, no alquiler.

<a id="security"></a>

## Comparación de tasas de condenados

- Contenedor: `.migration-rate-comparison`. Código: [scripts/lib/render-editorial.mjs](../scripts/lib/render-editorial.mjs).
- Modelo: `APP_DATA.editorial`.
- Unidades: condenados por 1.000 habitantes adultos.

### Entradas

- [data/official/editorial-indicators.json](../data/official/editorial-indicators.json) · `site.json → editorialDataFile`.
- Referencia publicada. Fuente: [INE · Registro Central de Penados · Condenados adultos: tasas por nacionalidad](https://www.ine.es/dyngs/Prensa/ECAECM2024.htm), 2024.

### Cálculo

Tasas del INE transcritas al JSON editorial. Ancho de cada barra = tasa/max(tasas) × 100, redondeado a dos decimales para el CSS.

### Alcance y límites

Nacionalidad no equivale a inmigración. Condenas firmes registradas; tasas sin ajuste por edad, sexo o situación económica. No identifica causalidad ni coste neto.

<a id="editorial"></a>

## Cifras de inmigración, ayudas, servicios y trabajo

- Contenedor: `.migration-kpis`. Código: [scripts/lib/render-editorial.mjs](../scripts/lib/render-editorial.mjs).
- Modelo: `APP_DATA.editorial`, `APP_DATA.population`.
- Unidades: unidad y ámbito por indicador.

### Entradas

- [data/official/editorial-indicators.json](../data/official/editorial-indicators.json) · `site.json → editorialDataFile`.
- [data/official/ine-poblacion-2025.json](../data/official/ine-poblacion-2025.json) · `site.json → populationSourceId`. Fuente: [Instituto Nacional de Estadística · Censo Anual de Población. Primeros resultados 2025](https://www.ine.es/dyngs/Prensa/CensoVariables2025.htm), 1 de enero de 2025.

### Cálculo

Tarjetas desde indicators[id].value. Población en millones = población/1e6. IMV extranjero = titulares extranjeros/titulares totales × 100. Redondeo solo de presentación.

### Alcance y límites

IMV no mide el porcentaje de inmigrantes que vive de ayudas. Esperas son del SNS completo. Indicadores laborales antiguos sin fecha/tabla exactas están marcados legacy-unverified; se preservan, no se inventa su procedencia.

<a id="counter"></a>

## Contador y escala humana

- Contenedor: `#live-debt`. Código: [src/js/indicators.js](../src/js/indicators.js).
- Modelo: `APP_DATA.debt`, `APP_DATA.latest`, `APP_DATA.previous`, `APP_DATA.population`.
- Unidades: euros, euros por segundo y por habitante.

### Entradas

- [data/raw/bde-deuda-anual.csv](../data/raw/bde-deuda-anual.csv) · `site.json → debtSourceId`. Fuente: [Banco de España · Deuda bruta consolidada de las Administraciones Públicas. Datos anuales](https://datos.bde.es/datos/es/datasets/000/003.html), 1994-2025.
- [data/raw/eurostat-deuda-pib.json](../data/raw/eurostat-deuda-pib.json) · `site.json → ratioSourceId`. Fuente: [Eurostat · Government deficit/surplus, debt and associated data](https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table?lang=en), 1995-2025.
- [data/official/ine-poblacion-2025.json](../data/official/ine-poblacion-2025.json) · `site.json → populationSourceId`. Fuente: [Instituto Nacional de Estadística · Censo Anual de Población. Primeros resultados 2025](https://www.ine.es/dyngs/Prensa/CensoVariables2025.htm), 1 de enero de 2025.

### Cálculo

Prolonga diferencia entre los dos últimos cierres usando 365,25 días/año, desde el cierre más reciente. Equivalencia por habitante usa población INE configurada.

### Alcance y límites

Proyección lineal ilustrativa, no contador oficial en tiempo real. Puede crecer o reducirse. Población puntual INE y población histórica del Banco Mundial tienen fechas distintas.
