# Guía de datos y metodología

[Mapa verificable de cada gráfico](charts.md) · [Arquitectura](architecture.md)

## Contrato de datos

Los gráficos publicados consumen CSV o JSON local, nunca series numéricas
copiadas en `src/js` o HTML. El build valida y normaliza esos ficheros e incrusta
el modelo en `window.APP_DATA`. JSON es válido para series, árboles, observaciones
individuales y escenarios; no hace falta convertir un árbol presupuestario a CSV.

`data/sources.json` contiene la referencia oficial, fecha y ficheros de cada fuente;
`data/site.json` selecciona las fuentes activas. `data/charts.json` enlaza cada
visualización con entradas, modelos, cálculo y unidad. Las fichas se generan con
`npm run docs:data`; el build comprueba que el documento coincide con el registro.
Actualizar datos no implica descargar nada durante el build ni publicar automáticamente.

## Ficheros originales, procesados y archivados

| Fichero dentro de data/ | Uso y campos |
| --- | --- |
| raw/bde-deuda-anual.csv | Entrada directa. Columna total DANPDE2010_P00000_PS_APU en M€; filas por año; `_` = ausente. Las otras columnas tienen unidades distintas y no se usan. La codificación de etiquetas del original presenta caracteres de sustitución; se identifica por código ASCII, no por esas etiquetas. |
| raw/eurostat-deuda-pib.json | JSON-stat: dimensions/index/value. Serie España deuda/PIB; porcentaje. |
| raw/eurostat-finanzas-publicas.json | JSON-stat gov_10a_main, S13, A, MIO_EUR, ES. Indicadores por código; no por posición fija. |
| raw/eurostat-intereses-2024.json | JSON-stat D41PAY, S13, MIO_EUR, ES; una observación anual. |
| raw/eurostat-inflacion-2000-2025.json | JSON-stat IPCA, A, INX_A_AVG, CP00, ES. Índice medio anual. |
| raw/oecd-salarios-impuestos-2000-2025.csv | CSV OCDE; REF_AREA, MEASURE, UNIT_MEASURE, HOUSEHOLD_TYPE, INCOME_PRINCIPAL, INCOME_SPOUSE, FREQ, TIME_PERIOD, OBS_VALUE, UNIT_MULT. Perfil y años estimados se validan. |
| official/spending-cofog-2020-2024.csv | CSV procesado IGAE; code,function y una columna por año, M€. TOTAL y diez funciones. |
| official/pge-2024-politicas.json | JSON procesado Hacienda: year, dataset, status, scope, unit, total, root. Hojas value; ramas children; code/sourceLocator cuando están disponibles. |
| official/ine-poblacion-2025.json | Observación INE: value en personas, date, sourceId. |
| official/poblacion-serie.json | Serie Banco Mundial: year,population en personas. Por habitante histórico. |
| official/gdp-per-capita.json | Series Banco Mundial: year,gdp,pcap,pcapReal; dólares corrientes/constantes; baseYear para índices. |
| official/fiscal-scenarios-2024.json | Extracción fiscal procesada; items con value en M€, ámbitos, sourceUrl, sourceLocator, basis, note, controles y excludeIds. |
| official/social-benefits-2024.json | Transcripción de ejecución SS: items/value en M€, locator, note, checks de subtotales. |
| official/repayment-plan.json | Parámetros propios de simulación; year, plazos, inflación supuesta, opciones y funciones. No es una fuente de predicciones oficiales. |
| official/debt-timeline.json | Contexto: governments con fechas de cargo, events con year y sourceUrl; observedThrough. |
| official/housing.json | Consolidación procesada: historicalHouseholds (ECH), households (ECP), prices (IPV Q4), construction (completed anual o quarters). |
| official/housing-emancipation.json | Transcripción ICE: year,households; estimated=true, baseYear, unit y notes. |
| official/editorial-indicators.json | Observaciones individuales con unidad, ámbito, periodo, procedencia y estado de verificación. |
| raw/housing-ech-2013-2020.csv | Evidencia ECH original, delimitador punto y coma y miles en formato español. No lo lee el adaptador CSV general. Selección total/todas nacionalidades; multiplicar miles × 1000. |
| raw/housing-households.csv; raw/housing-prices.csv | Extractos procesados del INE, year/households y year/index. Respaldo de housing.json; el build lee el JSON, no ambos a la vez. |
| raw/housing-construction.csv | Totales anuales transcritos, year/completed/source. Respaldo del JSON; para años trimestrales contrastar también quarters. |
| raw/aeat-cuadro-5.1-2024.xlsx; raw/aeat-cuadro-6.4-2024.xlsx | Originales AEAT de respaldo. No se leen Excel en el build; extracciones en official/aeat-impuestos-2024.json y catálogo fiscal activo. |
| official/aeat-impuestos-2024.json | Extracción original AEAT, respaldo del catálogo fiscal procesado. No se suma de nuevo a los impuestos activos. |
| raw/oecd-taxing-wages-spain-2026.pdf | Documento de respaldo, no entrada de runtime. |
| official/oecd-trabajador-2025.json; official/common-taxes.json; official/fiscal-context.json | Archivo de secciones retiradas (cuña fiscal, impuestos habituales y MEI). Solo pruebas de archivo; no se cargan en la página publicada. |

`raw` conserva descargas **y** extractos de respaldo: no significa que todos sean
originales sin procesar. `official` significa datos derivados de fuentes oficiales,
no que los JSON o las agrupaciones hayan sido publicados así por un organismo.
Las fuentes y límites figuran en catálogo y en cada fichero procesado.

## Reproducir una extracción

1. Usar URL/descarga y tabla exacta del catálogo, o sourceUrl/sourceLocator del registro.
2. Guardar descarga original y fecha de extracción sin sustituir la fecha de publicación.
3. Seleccionar país, sector, perfil y unidad documentados; conservar años y estados.
4. Si el origen es PDF/Excel, transcribir importes al CSV/JSON procesado y registrar
   tabla, página/celda, redondeo y sumas. Las extracciones actuales de PDF/Excel son
   manuales: el build no automatiza una transcripción ni descarga nuevas versiones.
5. Contrastarlo con el original y los extractos de respaldo. Ejecutar `npm run check`.
   Las comprobaciones de totales no sustituyen verificar la transcripción.
6. Actualizar periodo, estado provisional y ficha de gráfico cuando proceda;
   ejecutar `npm run docs:data` si cambió el catálogo o el registro.

Una ampliación no debe mezclar unidades, periodos, bases contables o perfiles.
Ausencia no es cero: los modelos rechazan años necesarios ausentes o muestran
huecos documentados. No usar valores estimados como observados ni convertir un
stock de demanda pendiente en un flujo anual.

## Añadir o actualizar datos

1. Guarda los ficheros en `data/raw/` o `data/official/`.
2. Actualiza la ficha de `data/sources.json`: `id`, `title`, `publisher`, `file`,
   `period`, `updated`, `url` y, cuando proceda, `license`. Usa `updated` para la fecha de publicación conocida; anota la extracción en `retrievedAt`. No inventes una fecha si falta: documenta esa limitación.
3. Si cambias de fichero o dataset, enlázalo mediante sus IDs en `data/site.json`.
4. Ejecuta `npm run check`. Revisa la página y publica el resultado.

### Deuda y porcentaje del PIB

Sustituye las descargas del Banco de España y Eurostat conservando su formato.
El adaptador identifica la columna del total por `DANPDE2010_P00000_PS_APU`, no por
su posición. El Banco de España expresa esta serie en **millones de euros**;
la web la transforma en billones (10¹² €). Eurostat debe contener una sola serie:
España, deuda consolidada, porcentaje del PIB.

Se ordenan y muestran los años con datos en ambas fuentes. La última observación,
la variación anual, los periodos y las escalas se recalculan automáticamente. Los
dos últimos años deben ser consecutivos para calcular el ritmo anual.

### Gasto COFOG: añadir años y categorías

Usa una columna por año, importes en **millones de euros**, códigos como texto y
una fila `TOTAL`. Pon entre comillas los nombres que contengan comas:

```csv
code,function,2023,2024
08,"Ocio, cultura y religión",18638,19193
```

El ejemplo muestra una fila; el fichero real debe incluir todas las funciones y
su total. Añade columnas nuevas a **todas** las filas: el selector detecta los
años y muestra el último sin cambios de código. Puedes añadir funciones como
filas nuevas: aparecerán en la tabla y en el resto del gráfico circular. Los
cuatro códigos destacados se eligen en `featuredSpendingCodes` de `site.json`;
el código COFOG `10` identifica la protección social.

Marca los años provisionales en `provisionalSpendingYears`. El modelo conserva el gasto sobre PIB,
calculado a partir de la deuda y la ratio **del mismo año**. Si ese PIB no está
disponible, el valor es `null`, sin mezclar periodos.

### Presupuesto: ampliar el árbol

El JSON del presupuesto usa `children` para agrupaciones y `value` para partidas:

```json
{
  "name": "Una agrupación",
  "children": [
    { "name": "Una partida", "value": 100 },
    { "name": "Otra partida", "value": 200 }
  ]
}
```

Los valores son millones de euros. Puedes añadir niveles sin cambiar la interfaz:
el mapa, la navegación por botones y el árbol en texto los recorren. Actualiza
`total`, `dataset`, `year`, `status` y `sourceId`; el árbol debe sumar el total.
No declares `value` y `children` en el mismo nodo.

### Intereses y equivalencias de impuestos

`data/raw/eurostat-intereses-2024.json` conserva la respuesta oficial de Eurostat:
España (ES), Administraciones Públicas (S13), intereses devengados (D41PAY),
millones de euros (MIO_EUR). La sección toma esta cifra anual realizada, no la
partida de deuda de los PGE. El promedio diario utiliza los días reales del año.

El catálogo activo es `data/official/fiscal-scenarios-2024.json`. Cada partida
incluye `id`, `name`, `value` (M€), `sourceUrl`, `sourceLocator`, `basis`,
`scope` y `note`. La interfaz, controles y tabla de fuentes se generan desde él.
Los IDs usan letras minúsculas, números y guiones. El tabaco no forma parte del simulador.

Las bases se verifican en estas fuentes:

- AEAT: informes de caja y cuadros 5.1/6.4, conservados en `data/raw/`.
  `aeat-impuestos-2024.json` conserva la extracción original.
- Herencias y donaciones: Memoria de la Administración Tributaria 2024,
  IV.11 + IV.14 + IV.16: 3.267,7 + 179,8 + 75,3 = 3.552,8 M€,
  incluyendo haciendas forales y donaciones.
- Seguridad Social: Memoria CGSS 2024, anexo I.1.B, p. 272 (cuentas consolidadas
  de entidades gestoras, servicios comunes y mutuas): cotizaciones 162.870,99 M€;
  RETA 12.362,79 M€. El simulador usa 150.508,2 M€ para las demás cotizaciones,
  excluyendo RETA para evitar contarlo dos veces. El registro de cotizaciones guarda
  el total original y `excludeIds: ["autonomous"]`; el build resta el importe RETA
  automáticamente. Las contingencias profesionales
  se contabilizan aparte de RETA: no se promete eliminar toda cuota individual.

Para una reducción proporcional añade `control`:

```json
{ "type": "reduction", "min": 0, "max": 100, "default": 5 }
```

Su coste es `value × porcentaje / 100`. El IRPF utiliza este control, inicialmente
al 10% y con rango 0–100%: es una reducción proporcional de recaudación, no una
rebaja en puntos de los tipos ni una simulación de tramos o deducciones.

La selección usa tarjetas compactas. `shortName` permite un nombre breve en la
tarjeta, conservando `name` completo en las fuentes. Un único panel visible
permite ajustar IVA, IRPF o cotizaciones; cambiar de panel conserva los porcentajes.
Seleccionar una pestaña activa esa medida. Los botones de ejemplo restablecen
selección y porcentajes. Para IVA:

```json
{ "type": "vat", "min": 0, "max": 21, "from": 21, "default": 18 }
```

Su coste estimado es `recaudación × (21 − tipo elegido) / 21`: **todos los tipos
bajan proporcionalmente**. No calcula una reforma exclusiva del tipo general.
Los cambios no incorporan efectos económicos, cambios de precios o de conducta.
`src/shared/fiscal.mjs` comparte los cálculos entre build y navegador.

`interestSourceId` y `taxSourceId` en `site.json` seleccionan las fuentes.
`taxExampleIds` configura el ejemplo inicial de cuatro medidas (36.375,429 M€);
`taxOnlyExampleIds` configura el botón de cinco impuestos completos (20.108,089 M€).
Son ejemplos, no un máximo universal de impuestos que se podrían eliminar.
Para añadir otra partida basta el JSON; para un tipo de cálculo nuevo, extiende el
modelo compartido y la validación. No mezcles agregados con sus componentes.

El escenario presupone deuda e intereses cero y el resto de las cuentas constantes;
no calcula cómo amortizar la deuda. Se comparan magnitudes anuales de distintas
bases contables, documentadas por partida. Los impuestos AEAT cubren territorio
común; herencias y donaciones incluyen territorio foral. Al actualizar el ejercicio,
sustituye ambos datasets y sus fichas: el build rechaza años diferentes, series
incorrectas, IDs duplicados, controles inválidos y ejemplos no cubiertos.
Todo sigue integrado en un solo HTML, incluidos datos y scripts.

### Población y nuevas fuentes

Actualiza `value`, `date` (`AAAA-MM-DD`) y `sourceId` del JSON de población.
La fecha aparece junto a la equivalencia por habitante, que no representa una
deuda individual. Para reemplazar un dataset, añade su ficha al catálogo y cambia
el ID correspondiente en `site.json`. Para un formato de datos nuevo, añade un
adaptador en `scripts/lib/`; la presentación usa su modelo normalizado.

## Criterios de lectura

El gráfico de evolución abre por defecto en **valor nominal**, en billones de
euros. El porcentaje del PIB sigue disponible mediante el selector.

El contador es una **proyección**, no una medición instantánea: prolonga el ritmo
medio del último año desde su cierre. Se puede pausar y respeta la preferencia de
movimiento reducido. La variación puede ser positiva o negativa.

El reparto COFOG cubre todas las Administraciones Públicas. El presupuesto PGE
cubre el ámbito estatal: son magnitudes distintas. No se atribuyen partidas
concretas de gasto a financiación mediante deuda. Las tablas, las fuentes y el
árbol presupuestario se generan durante el build y siguen disponibles sin JS.

El build rechaza números inválidos, códigos o años duplicados, fuentes inexistentes,
totales inconsistentes y variables desconocidas. Tolera el redondeo de COFOG
(hasta 1 M€ por función) y de PGE (hasta 1 M€ en el total). Valida y compone antes
de reemplazar la página publicada.

## Finanzas públicas y saldo anual

`financesSourceId` apunta a una respuesta JSON-stat de Eurostat `gov_10a_main`,
España, S.13, anual y MIO_EUR. `scripts/lib/finances.mjs` lee las posiciones
según los índices de las dimensiones, sin depender del orden de los indicadores.
La serie detecta los años disponibles: no requiere cambiar componentes al ampliarla.
Otros impuestos = D2REC + D5REC + D91REC. La curva fiscal y su crecimiento
suman también D61REC: impuestos + cotizaciones. Las cotizaciones obligatorias
públicas son impuestos según la clasificación OCDE. El agregado D61REC de
Eurostat incluye imputadas, por lo que no equivale a la recaudación fiscal OCDE
(que las excluye). Ingresos totales = TR; gasto = TE;
saldo = B9 = TR − TE. Son euros corrientes, no tipos de impuestos ni
importes ajustados por inflación. El déficit no es el incremento exacto de deuda.

`src/js/fiscal-timeline.js` selecciona cualquier año disponible de finanzas públicas.
Los selectores de año del gráfico histórico y del desglose de ingresos están
sincronizados. Elegir un año fuera del periodo visible devuelve esa gráfica a
toda la serie. «Décadas de deuda» reúne las barras de saldo anual y la línea de
deuda total al cierre, ambas en miles de millones de euros. El saldo utiliza
un eje izquierdo simétrico alrededor de cero: verde para superávit y rojo para
déficit; la deuda usa un eje derecho propio que comienza en cero. Tocar una
barra o la línea selecciona ese año. El periodo admite toda la serie fiscal
disponible, los últimos 20 años o los últimos 10. El antiguo gráfico separado
de saldo se ha retirado.
Las tablas y el desglose inicial se generan también sin JavaScript.

El desglose de TR muestra impuestos; D61REC (cotizaciones); P11_P12_P131 (ventas,
servicios y producción para uso propio); D4REC (rentas de la propiedad); D7REC
(transferencias corrientes); D9REC − D91REC (transferencias de capital, evitando
duplicar impuestos) y D39REC (subvenciones). El build verifica que suman TR en
cada año. No son íntegramente cobros de caja. Emitir deuda es financiación, no TR.

La sección «Deuda hoy. Impuestos futuros.» explica también gasto, otros ingresos
y refinanciación; no afirma una subida automática de impuestos ni convierte
el stock de deuda en una obligación tributaria individual.

### Datos archivados

Las vistas del MEI, impuestos habituales, salarios y reparto del coste
laboral se han retirado, junto con sus controles, estilos y enlaces. Sus datasets
originales permanecen en `data/` para conservar su trazabilidad, con
`archived: true` en `data/sources.json`. Las fuentes archivadas no se publican
ni sus series se cargan en el build o se incluyen en el HTML final.
La serie de IPCA vuelve a publicarse para calcular los euros constantes de la deuda; las vistas de salarios siguen archivadas.
Los adaptadores conservan sus pruebas, que leen estos archivos por separado
mediante `scripts/tests/archived-economy.mjs`.

### Coste de la deuda y simulador de repago

`data/official/repayment-plan.json` configura el año, horizonte, inflación hipotética,
reglas de revalorización y partidas COFOG. `benefitsSourceId` apunta a
`data/official/social-benefits-2024.json`: obligaciones reconocidas de contributivas,
no contributivas, complementos a mínimos, IMV y prestaciones familiares.
Cada fila identifica su localización en la fuente oficial. Se comprueban las sumas
publicadas: no contributivas + mínimos, e IMV + familiares. Las contributivas no
incluyen mínimos ni Clases Pasivas. No se agregan transferencias entre administraciones.

El simulador empieza sin cambios. Las pestañas conservan cambios independientes
entre −100% y +100% del gasto de referencia. El resultado principal muestra déficit,
equilibrio o superávit después de intereses, y cuánto principal se devuelve el
primer año. Tipos, inflación, revalorización y plazo están en opciones desplegables.
Los resultados iniciales y fuentes se generan también sin JavaScript.

`src/shared/repayment.mjs` comparte cálculos entre navegador y pruebas. Saldo
primario = saldo público + intereses; deuda siguiente = deuda anterior + intereses
− saldo primario con las medidas, con mínimo cero. El ahorro de intereses entra
al reducir el principal; no se suma dos veces. El objetivo aplica amortización a
tipo constante, con caso de interés cero.

Por defecto se mantiene IPC. Un recorte contributivo del 10% ahorra el 10% de su
base. Si se cambia la actualización, el factor que queda es (1 + subida elegida)
× (1 − recorte) / (1 + IPC supuesto); el ahorro es base × (1 − factor). Se muestra
el efecto nominal y en poder adquisitivo. Cambiar la revalorización solo afecta
al bloque contributivo, y no acumula congelaciones sucesivas. Los otros bloques
se recortan directamente sobre su base, sin volver a recortar un total agregado.

Las partidas cubren las diez funciones COFOG. Servicios generales resta
D.41 para excluir intereses. El botón de completar conserva las prestaciones,
los ingresos y las otras seis funciones, y sustituye los cambios de servicios
generales, asuntos económicos, sanidad y educación por un porcentaje común
para alcanzar el objetivo. Es un ejemplo matemático; no estima los efectos sobre
servicios, actividad, demografía o recaudación. Las bases presupuestarias de
Seguridad Social no se presentan como una reconciliación con Eurostat.

### Variaciones de gasto, impuestos y crecimiento

El selector de gasto incluye las diez funciones COFOG, ordenadas por importe.
Los controles de pantalla usan cambios de gasto: negativo reduce, positivo aumenta.
Los cálculos conservan internamente el signo de ahorro (contrario). Protección
social aplica su variación al importe que queda después de cambios individuales
en prestaciones: no suma un recorte sobre dos bases solapadas. Su encaje con las
bases presupuestarias de Seguridad Social se identifica como aproximación.
La suma de las diez bases excluye intereses, que se calculan sobre deuda pendiente.

La recaudación fiscal base incluye impuestos y cotizaciones. El cambio fiscal
es un cambio proporcional de recaudación, no de puntos en tipos. El crecimiento
es nominal y compuesto: ingresos fiscales del año t = base × (1 + cambio fiscal)
× (1 + crecimiento)^t. Se supone elasticidad uno y constantes los otros ingresos
y gastos tras las medidas. No estima respuestas a impuestos, recortes o inflación.
`repaymentRevenue` genera ingresos por año; `repaymentProjection` admite saldos
primarios anuales. `requiredSpendingAdjustment` descuenta esos flujos para
calcular el ajuste de gasto constante que completa el plazo elegido.

La gráfica histórica de saldo añade la deuda total al cierre del año (Banco de
España), con eje derecho propio, valores con tres decimales en el tooltip, resumen
redondeado a un decimal y tabla en millones de euros. Si una serie se amplía sin una observación de deuda,
se muestra «sin dato» y un hueco en la línea; no se inventa ni se arrastra otro año.

### Desglose navegable del presupuesto

`data/official/pge-2024-politicas.json` admite tantos niveles de `children` como sean necesarios. Los programas llevan su código oficial y cada política desglosada identifica la tabla 1.6, columna 2024-P, del documento de Hacienda. Los importes se expresan en millones y los hijos deben conservar el total de la política; el resto no separado y el redondeo se identifican expresamente. No mezclar ejecución de Seguridad Social ni COFOG con estos créditos presupuestados. El IMV y las prestaciones familiares permanecen agrupados como en el programa 221A.

Orden editorial: situación y trayectoria de la deuda → factura futura e intereses → ingresos y déficit → gasto y partidas (vista general y presupuesto estatal detallado) → costes reales de la deuda → hacer crecer la economía → inmigración y cuentas públicas → precariedad y gasto → claves → simulador de repago opcional → fuentes. La navegación sigue el mismo orden y está disponible también en móviles.

### Indicadores editoriales y procedencia pendiente

Las tarjetas de inmigración, IMV, condenas, esperas y trabajo se cargan desde
`data/official/editorial-indicators.json` mediante `scripts/lib/editorial.mjs`.
Cada registro tiene `id`, `value`, `unit`, `scope`, `period`, `locator`,
`status` y `sourceId` del catálogo o `sourceUrl`. Las variables de HTML se
formatean en `scripts/lib/render-editorial.mjs`. Las barras de condenas y el
porcentaje de titulares del IMV se calculan a partir de sus valores numéricos.

Siete indicadores laborales/editoriales preexistentes están marcados
`legacy-unverified`: paro, paro juvenil español y de la UE, temporalidad, I+D
español y de la UE y abandono escolar. El contenido anterior no identificaba
tabla, perfil o fecha exacta. Se conservan sus valores para no cambiar la página,
pero el fichero registra esa limitación expresamente. No son una serie histórica
ni se utilizan en los gráficos de evolución. Antes de actualizarlos o reutilizarlos,
localiza la observación oficial, periodo, denominador, ámbito y tabla; después
cambia a `documented`. Guardar una cifra en JSON no verifica por sí mismo su verdad.

El comentario editorial y las afirmaciones causales de las secciones de crecer,
inmigración y precariedad siguen siendo texto: no constituyen un resultado medido
por los modelos ni se convierten en evidencia por aparecer junto a un gráfico.

### Unidades históricas y tema de gráficos

El gráfico de deuda ofrece euros nominales (por defecto), porcentaje del PIB, euros constantes del último año fiscal y euros por habitante. Todas las vistas mantienen el saldo anual y la deuda total, con ejes independientes. La vista de porcentaje calcula el PIB implícito mediante deuda nominal / ratio oficial; el redondeo de esta ratio afecta al porcentaje del saldo.

`inflationSourceId` en `data/site.json` recupera el IPCA de España, total de consumo, índice medio anual, de Eurostat. `scripts/lib/debt-history.mjs` valida años y dimensiones y fija como año base el último año fiscal disponible. Importe constante = nominal × IPCA(base) / IPCA(año). El ajuste expresa poder adquisitivo de consumo; no es un deflactor del PIB ni una reducción del principal pendiente. La deuda al cierre también usa aquí el índice medio anual. Para añadir un año fiscal hay que aportar su IPCA; el build falla si falta. La tabla publicada incluye valores nominales y constantes sin JavaScript. Las conversiones compartidas están en `src/shared/debt-history.mjs`.

`src/js/chart-theme.js` aplica una paleta accesible clara u oscura a los siete gráficos ECharts (deuda, intereses, cuentas públicas, presupuesto, repago, PIB por habitante y vivienda). El tema claro es el predeterminado. El selector está junto al gráfico de deuda; guarda la preferencia en localStorage cuando está disponible y conserva años, filtros, partidas abiertas y medidas del simulador al cambiar. La página continúa siendo un único HTML autónomo.

Los sucesos y gobiernos de la gráfica histórica se editan en `data/official/debt-timeline.json`: cada suceso tiene año, etiqueta y fuente; cada gobierno, partido y fechas de nombramiento/cese. Las líneas señalan 2008 (crisis financiera) y 2020 (COVID). El botón «Mostrar gobiernos» añade franjas por gobierno: los datos son anuales, por lo que cada año se atribuye al presidente que ocupó el cargo más días. Los años de relevo no representan decisiones de un único gobierno. Al ampliar la serie, actualiza también `observedThrough` y los relevos necesarios.


La sección de inflación y cuentas públicas usa un único gráfico: variación acumulada de recaudación, gasto, precios, salario neto observado, deuda y poder de compra de 100 € nominales sin rendimiento. Las seis curvas empiezan en 0% y comparten la misma escala; la pérdida de compra baja de cero. Inflación acumulada = (IPCA(año) / IPCA(inicio) − 1) × 100; variación de compra = (IPCA(inicio) / IPCA(año) − 1) × 100. No son porcentajes simétricos. Dos ejemplos bajo la gráfica traducen los porcentajes a euros: el coste de una compra inicialmente de 100 € y la capacidad de compra de 100 € guardados. Un selector de año sincroniza líneas, cifras y tabla. El cálculo compartido está en `src/shared/inflation.mjs`. Se conserva el desglose fiscal para auditoría en un desplegable. Todo se publica en el único HTML estático.

La gráfica añade el salario neto anual observado del perfil OCDE soltero sin hijos con el 100% del salario medio (THP, euros; después de IRPF y cotizaciones del trabajador, antes de impuestos al consumo). `scripts/lib/citizen-income.mjs` valida el perfil y excluye años marcados como estimados en el catálogo. Todas las curvas terminan en el último año común observado, actualmente 2024. `inflationBaselineYear` fija 2000 como inicio por defecto; el selector permite elegir los demás años. El comentario del gráfico se calcula a partir de los datos: no afirma pérdida de renta real cuando el salario supera la inflación. La curva de ahorro conserva la hipótesis de 100 € sin rendimiento y no representa todo el ahorro ciudadano.

La comparación también incluye el incremento acumulado de deuda pública nominal al cierre, con el mismo año inicial y final que el resto de curvas. Deuda: (saldo nominal del año / saldo nominal inicial − 1) × 100. Comparte el eje porcentual y se publica también en la tabla; no representa déficit anual ni deuda/PIB. Los datos ausentes se mantienen como huecos.

### Compartir gráficos y escenarios

`src/js/sharing.js` añade un panel de compartir a deuda, inflación, presupuesto,
repago, crecimiento, gasto, vivienda e intereses. Exporta un PNG local con título, cifras,
leyenda y fuente, sin dependencias ni servicios de captura externos. WhatsApp y
X comparten texto y un enlace; el PNG se adjunta desde el menú nativo compatible
([Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share))
o se descarga para adjuntarlo manualmente. No se publica nada automáticamente.

Los parámetros `grafico` y `vista` conservan filtros, tema, controles del escenario
 y ruta del presupuesto. Solo se restauran controles conocidos y valores válidos;
los enlaces malformados mantienen la vista normal. En una instalación de Pages se
conserva la ruta pública, incluso dentro de un proyecto; desde localhost o un fichero
local se comparte el dominio de producción. El botón de copiar ofrece selección
manual cuando el portapapeles no está disponible. El resultado sigue siendo un único HTML.

Los gráficos usan SVG para conservar nitidez al ampliar con el navegador o mover
la ventana a una pantalla con distinta densidad de píxeles. Un `ResizeObserver`
observa los contenedores de los gráficos; los cambios de ventana, viewport móvil y
restauración de página también ajustan su tamaño, agrupados con `requestAnimationFrame`.
Las instancias y selecciones se conservan. Al compartir, el SVG se rasteriza localmente
en el PNG de 1200 píxeles de ancho.

El apartado de intereses incluye una comparación de barras en la misma escala:
intereses anuales frente al coste acumulado de las medidas fiscales elegidas.
Cada segmento identifica una medida y el saldo indica ahorro disponible o exceso.
El gráfico y su exportación PNG se actualizan con los selectores, incluido IRPF e IVA.

El simulador `src/components/repayment-planner.html` está al final, justo antes de las fuentes,
separado de la explicación de costes de la deuda. En móvil los pasos de gastos e
ingresos arrancan plegados y las partidas se eligen con un selector. Las tarjetas
siguen disponibles en escritorio. El resultado permanece visible y el desglose
de cambios se consulta bajo demanda; los valores se conservan al cambiar de partida.

Las fichas de fuentes se generan en `scripts/lib/render-sources.mjs`: muestran
organismo, título, periodo y actualización por separado, con enlaces a la fuente
y a los datos originales cuando están disponibles. Notas y condiciones de uso
se despliegan bajo demanda; las tarjetas se adaptan a una columna en móvil.

El gráfico único de vivienda muestra cifras acumuladas desde 2014 hasta 2025: hogares creados, viviendas terminadas y su diferencia. La suma conserva el signo de cada año: un exceso de construcción reduce la brecha. La referencia inicial es cero antes de 2014; no se inventa un déficit preexistente ni se presenta la cifra como un inventario de todas las viviendas que faltan.

Datos en `data/official/housing.json`: ECH (2013–2020, media anual) para los cambios de hogares de 2014–2020; ECP 60131 (enero a enero) desde 2021. Se calculan diferencias dentro de cada fuente, sin restar niveles entre ECH y ECP. El enlace es aproximado por el cambio de metodología y referencia temporal. Los extractos y los totales de construcción se conservan en `data/raw/housing-*.csv`. Construcción 2014–2017: tabla 1.2 del Observatorio anual 2024; 2018–2025: boletín n.º 56, tabla 1.2. Para añadir un año se requiere un total anual oficial o los cuatro trimestres completos, hogares en las fechas correspondientes e índices de precios de cierre.

`data/official/housing-emancipation.json` transcribe la figura 6 del estudio de Cagigas Castro y Beraza Pérez (ICE n.º 942): estimación respecto a 2014, hasta 2024. Es un stock de demanda de emancipación bloqueada: no se acumula por segunda vez, no se suma a la brecha de construcción ni se extrapola a 2025. Los precios se muestran como contexto y en la tabla, sin un segundo gráfico.
