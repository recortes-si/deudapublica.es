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

### Finanzas públicas y saldo anual

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
El selector actualiza el desglose de ingresos y el saldo anual. Al elegir un año
fuera del periodo corto, las gráficas vuelven a toda la serie.
El gráfico de saldo usa un eje simétrico alrededor de cero: verde arriba para
superávit, rojo abajo para déficit. Tocar una barra selecciona ese año.
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

Las vistas del MEI, impuestos habituales, salarios e inflación y reparto del coste
laboral se han retirado, junto con sus controles, estilos y enlaces. Sus datasets
originales permanecen en `data/` para conservar su trazabilidad, con
`archived: true` en `data/sources.json`. Las fuentes archivadas no se publican
ni sus series se cargan en el build o se incluyen en el HTML final.
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
España), con eje derecho propio y valores exactos en el tooltip, el resumen del
año elegido y la tabla. Si una serie se amplía sin una observación de deuda,
se muestra «sin dato» y un hueco en la línea; no se inventa ni se arrastra otro año.

### Desglose navegable del presupuesto

`data/official/pge-2024-politicas.json` admite tantos niveles de `children` como sean necesarios. Los programas llevan su código oficial y cada política desglosada identifica la tabla 1.6, columna 2024-P, del documento de Hacienda. Los importes se expresan en millones y los hijos deben conservar el total de la política; el resto no separado y el redondeo se identifican expresamente. No mezclar ejecución de Seguridad Social ni COFOG con estos créditos presupuestados. El IMV y las prestaciones familiares permanecen agrupados como en el programa 221A.

Orden editorial: situación y trayectoria de la deuda → factura futura e intereses → ingresos y déficit → gasto total → presupuesto estatal detallado → plan de repago → hacer crecer la economía → inmigración y cuentas públicas → precariedad y gasto → claves y fuentes. La navegación sigue el mismo orden y está disponible también en móviles.

### Apartados comparativos (crecer, inmigración, precariedad)

Tres secciones editoriales con cifras oficiales enlazadas (Banco Mundial, INE, Seguridad
Social, Eurostat) y comentario propio. No se cargan a través del catálogo de datos:
son análisis comparativo con fuentes citadas en línea, igual que las secciones de
«factura futura» o «claves». El crecimiento del gasto que citan reutiliza las variables
`FINANCE_SPEND_GROWTH` y `FINANCE_SOURCE` de la sección de finanzas públicas.
