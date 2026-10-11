# deudapublica.es

Una web visual para fiscalizar la deuda pública española y defender unas cuentas
responsables. El código está organizado en componentes; el resultado es **un solo
`public/index.html` autónomo**, listo para GitLab Pages, GitHub Pages o para abrir directamente.
Incluye los datos, CSS, JavaScript, Apache ECharts y su licencia. No necesita APIs,
CDN, fuentes externas ni servidor de aplicación.

## Desarrollo

Necesitas Node.js 22 o posterior; no hay dependencias que instalar.

```sh
npm run dev       # genera y sirve la página en http://localhost:8080
npm run check     # valida los datos, ejecuta las pruebas y genera la página
npm run build     # genera public/index.html
npm run preview   # sirve el resultado ya generado
```

Tras editar fuentes o componentes, ejecuta `npm run build` y recarga el navegador.
Puedes cambiar el puerto con `PORT=9090 npm run preview`.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `src/index.html` | Estructura general y orden de las secciones |
| `src/components/*.html` | Una sección por fichero: portada, contador, evolución, gasto, presupuesto… |
| `src/styles/main.css` | Diseño, estados accesibles y adaptaciones para móvil |
| `src/js/helpers.js` | Formato, escape de texto y preferencias de movimiento |
| `src/js/{indicators,debt-chart,spending,budget}.js` | Módulos con estado privado y dependencias explícitas |
| `src/js/app.js` | Inicialización y redimensionado de los gráficos |
| `data/site.json` | Fuentes activas, categorías destacadas y años provisionales |
| `data/sources.json` | Catálogo: procedencia, fichero local, periodo, actualización y licencia |
| `scripts/lib/csv.mjs` | Lectura de CSV y validación numérica |
| `scripts/lib/data.mjs` | Adaptadores de fuentes, validación y cálculos |
| `scripts/lib/render.mjs` | Variables de plantilla, tablas y contenido inicial |
| `scripts/build.mjs` | Composición e integración en el HTML final |
| `scripts/tests/` | Pruebas de datos, extensibilidad y generación |

No edites `public/index.html`: se vuelve a generar. Para añadir una sección, crea
`src/components/nombre.html` e incluye `<!-- COMPONENT:nombre -->` en la plantilla.
Las variables `{{NOMBRE}}` se definen en `templateValues` de `render.mjs`; una
variable desconocida impide generar una página incompleta. Los módulos JavaScript
se empaquetan en el orden declarado en `build.mjs`, dentro de una única función.
Cada módulo recibe su contexto y mantiene su estado privado.

## Añadir o actualizar datos

1. Guarda los ficheros en `data/raw/` o `data/official/`.
2. Actualiza la ficha de `data/sources.json`: `id`, `title`, `publisher`, `file`,
   `period`, `updated`, `url` y `license`; conserva la fecha de la publicación real.
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
adaptador en `scripts/lib/data.mjs`; la presentación usa su modelo normalizado.

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

## GitLab Pages, GitHub Pages y Nix

`.gitlab-ci.yml` utiliza Node 22, ejecuta `npm run check` y publica `public/` en la
rama principal. No requiere instalar paquetes ni descargar datos durante el build.
Los recursos están integrados, así que también funciona bajo una subruta de Pages.

### GitHub Pages

El workflow `.github/workflows/pages.yml` ejecuta las mismas pruebas y genera
`public/index.html` con Node 22. Después sube el artefacto estático y lo despliega
mediante las acciones oficiales de GitHub Pages. Se ejecuta al subir cambios a
`main` y también desde **Actions → Publicar en GitHub Pages → Run workflow**.
Solo despliega desde la rama predeterminada. Si la renombras, actualiza también
`push.branches` en el workflow.

Para activarlo en GitHub:

1. Sube el repositorio incluyendo la carpeta `.github/workflows/`.
2. En **Settings → Pages → Build and deployment → Source**, selecciona
   **GitHub Actions**.
3. Sube un cambio a `main` o ejecuta el workflow manualmente. La URL publicada
   aparecerá en el despliegue del entorno `github-pages`.

El HTML funciona tanto en la raíz como bajo `/<nombre-del-repositorio>/`:
todos los recursos están integrados. Para usar `deudapublica.es`, configura
**Custom domain** en Settings → Pages y los registros DNS correspondientes;
no se cambia el dominio de la web automáticamente.

Referencia: [workflows personalizados de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### Nix

Nix sigue disponible para el desarrollo y la generación:

```sh
nix-shell
nix-build
./result/websrv      # servidor del resultado, puerto 8080
./result/websrv 9090
```

La derivación ejecuta las mismas pruebas y genera el mismo HTML; añade `websrv`
como utilidad local. GitLab Pages publica directamente el resultado de Node.

### Finanzas públicas y el euro del trabajador

`financesSourceId` apunta a una respuesta JSON-stat de Eurostat `gov_10a_main`,
España, S.13, anual y MIO_EUR. `scripts/lib/finances.mjs` lee las posiciones
según los índices de las dimensiones, sin depender del orden de los indicadores.
La serie detecta los años disponibles: no requiere cambiar componentes al ampliarla.
Otros impuestos = D2REC + D5REC + D91REC. La curva fiscal y su crecimiento
suman también D61REC: impuestos + cotizaciones. Las cotizaciones obligatorias
públicas son impuestos según la clasificación OCDE. El agregado D61REC de
Eurostat incluye imputadas, por lo que no equivale a la recaudación fiscal OCDE
(que las excluye). Ingresos totales = TR; gasto = TE;
saldo = B9 = TR − TE. D61REC muestra cotizaciones netas en la tabla (incluidas
las imputadas según SEC 2010). Son euros corrientes, no tipos de impuestos ni
importes ajustados por inflación. El déficit no es el incremento exacto de deuda.

`workerSourceId` apunta a `official/oecd-trabajador-2025.json`, extraído de la
nota España de **OCDE (2026), Taxing Wages 2026**; el PDF original se conserva.
Usa la edición 2026, que revisa valores anteriores, y el perfil soltero sin hijos
al 100% del salario medio. Cuña fiscal de 2025: 41,4% del coste laboral; neto:
58,6%. La tasa neta sobre salario bruto es distinta (23,5%; neto 76,5%). No
representa todos los trabajadores, ni un porcentaje de la producción o facturación.
El histórico es el publicado en esa misma edición, sin mezclar revisiones.

La serie de cuña fiscal se conserva como referencia de la carga laboral del perfil.
La nueva sección del trabajador usa importes comparables del mismo modelo OCDE
y distingue tipos de impuestos, salarios nominales, salarios reales y reparto
del coste laboral, como se detalla más abajo.

`src/js/fiscal-timeline.js` sincroniza ambos selectores de año, el desglose de
recaudación, el neto del trabajador y los puntos destacados en ambos gráficos.
Solo permite años comunes de las series. Al elegir un año fuera del periodo corto,
la gráfica pública vuelve a toda la serie. Esto permite comparar las dos magnitudes
sin afirmar causalidad ni que todos los ingresos procedan de nóminas.

El desglose de TR muestra impuestos; D61REC (cotizaciones); P11_P12_P131 (ventas,
servicios y producción para uso propio); D4REC (rentas de la propiedad); D7REC
(transferencias corrientes); D9REC − D91REC (transferencias de capital, evitando
duplicar impuestos) y D39REC (subvenciones). El build verifica que suman TR en
cada año. No son íntegramente cobros de caja. Emitir deuda es financiación, no TR.
Las tablas y las comparaciones iniciales se generan también sin JS.

La sección «Deuda hoy. Impuestos futuros.» es una lectura editorial de la carga
sobre presupuestos futuros. Explica también gasto, otros ingresos y refinanciación;
no afirma una subida automática de impuestos ni convierte el stock de deuda
en una obligación tributaria individual.

### Consumo, saldo público y generaciones

`data/official/fiscal-context.json` contiene el calendario del IVA general y
el MEI con reparto entre empresa y trabajador, junto con enlaces oficiales.
`src/shared/worker.mjs` valida estos datos y comparte los cálculos entre build
y navegador. Para añadir cambios del IVA, añade una entrada con año, mes y tipo;
para ampliar el MEI, añade años consecutivos con total, empresa y trabajador.

El escenario inicial gasta todo el neto con IVA general y separa el ahorro del
consumo. La sección actual parte de los importes OCDE, con su precisión completa;
los detalles del cálculo y las vistas nuevas figuran en el apartado siguiente.

El gráfico de saldo usa un eje simétrico alrededor de cero: verde arriba para
superávit, rojo abajo para déficit. Comparte periodo y año con las otras vistas.
Una barra selecciona ese año; también se conserva una tabla sin JavaScript.

La sección de jóvenes muestra un ejemplo legal de aumento: MEI del 0,6% (2023)
al 1,2% (2029), con años futuros diferenciados. La norma mantiene 1,2% hasta 2050.
Afecta a todas las edades: no se presenta como serie fiscal específica de jóvenes,
ni como estimación de toda su carga, ni como consecuencia directa de la deuda.
El ejemplo conserva una base anual de 30.000 € y distingue coste empresarial
de descuento en nómina.

### Historial de impuestos, salarios e inflación

La sección `src/components/worker.html` sustituye la curva normalizada anterior
por tres vistas: tipos de impuestos habituales, salarios frente a precios y
reparto del coste laboral entre impuestos y valor conservado. El mismo año se
sincroniza con la sección de finanzas públicas.

- `data/official/common-taxes.json` define tarjetas, colores, bases, fuentes y
  calendarios legales (fechas ISO). IVA general y vivienda nueva se representan
  con el tipo vigente **al cierre de cada año**. Se conserva la rebaja temporal
  al 4% de vivienda desde agosto de 2011 hasta diciembre de 2012. La vivienda
  nueva no representa ITP de vivienda usada, IBI, AJD ni territorios sin IVA.
- IRPF y cotizaciones son tipos **efectivos** sobre bruto del mismo perfil OCDE,
  no tipos marginales máximos. Sus porcentajes no se suman con los de IVA, cuyas
  bases son diferentes. Las cotizaciones no se fuerzan a crecer: aparecen sus
  descensos y sus variaciones pequeñas.
- `earningsSourceId` usa CSV SDMX de `DSD_TAX_WAGES_COU@DF_TW_COU` 2.1, España,
  S_C0, AW100, cónyuge no aplicable y frecuencia anual. `scripts/lib/economy.mjs`
  lee las columnas por nombre y valida el perfil, moneda, magnitudes y su
  reconciliación con la cuña publicada. No aplica impuestos OCDE a salarios de
  otra población. En `sources.json`, `estimatedYears` identifica 2025 como salario
  estimado por la Secretaría OCDE, indicado también en la página y tabla.
- `inflationSourceId` usa Eurostat IPCA general, promedio anual. Las tres curvas
  parten de 100 en 2000: bruto nominal, neto nominal y precios. La vista alternativa
  divide el bruto/neto por IPCA del año / IPCA inicial y muestra euros de 2000.
  El IPCA incluye IVA en los precios: **no se descuenta IVA otra vez del neto real**.
  La compra de vivienda no forma parte de esta medida de inflación de consumo.
- La serie `prc_hicp_aind` está archivada hasta 2025. Para añadir años posteriores,
  usar su sustituta `prc_hicp_ainr` y enlazar/rebasar la serie homogéneamente; no
  concatenar números con distinta base. El build falla si falta algún año de precios
  o alguna de las magnitudes laborales necesarias.

En el perfil usado, 2000–2025 deja un aumento del bruto nominal del 88,68%,
precios del 77,83% y neto real del 1,21%. La carga laboral pasa de 38,63% a 41,44%
del coste. Son una comparación del perfil medio de referencia, no un seguimiento
de una persona ni una estimación específica de jóvenes.

El reparto apilado parte del coste laboral observado OCDE de cada año y separa
IRPF, cuota empresarial y cuota del trabajador. Después incorpora IVA y la carga
adicional del escenario; el resto es bienes sin impuestos + ahorro. Todas las
partidas suman 100. Por defecto, todo el neto se gasta al IVA general histórico.
El año seleccionado muestra ambos resultados, antes y después del consumo.
La vivienda es una compra puntual y no se añade automáticamente a cada nómina.

El ejemplo de vivienda conserva 200.000 € de precio antes de IVA para aislar el
cambio del 7% al 10% (14.000 € → 20.000 €). La pérdida de acceso a la deducción
para nuevas adquisiciones desde 2013 se distingue del régimen transitorio. El
límite ilustrativo de 1.356 € supone 15% (7,5% estatal + 7,5% autonómico) sobre
9.040 €, cumpliendo requisitos y cuota suficiente. Hay deducciones y porcentajes
autonómicos diferentes. No se presenta como impuesto exclusivo por edad ni
como demostración de que todos los jóvenes paguen más que todas las personas mayores.
