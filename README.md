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
el indicador de protección social utiliza el código COFOG `10`.

Marca los años provisionales en `provisionalSpendingYears`. El gasto sobre PIB
usa el PIB inferido de la deuda y la ratio **del mismo año**; si no está disponible,
se muestra `—`, sin mezclar periodos.

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

### Población y nuevas fuentes

Actualiza `value`, `date` (`AAAA-MM-DD`) y `sourceId` del JSON de población.
La fecha aparece junto a la equivalencia por habitante, que no representa una
deuda individual. Para reemplazar un dataset, añade su ficha al catálogo y cambia
el ID correspondiente en `site.json`. Para un formato de datos nuevo, añade un
adaptador en `scripts/lib/data.mjs`; la presentación usa su modelo normalizado.

## Criterios de lectura

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
