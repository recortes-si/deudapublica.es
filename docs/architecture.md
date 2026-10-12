# Arquitectura y construcción

[Mapa de gráficos](charts.md) · [Guía de datos](data.md) · [Inicio](../README.md)

## Recorrido completo

```text
data/site.json + data/sources.json
                ↓ selección y rutas (sources.mjs)
      CSV/JSON local, originales o procesados
                ↓ adaptadores y validaciones (scripts/lib/)
             modelo de datos (loadData)
                ↓
plantillas + componentes + variables + tablas sin JS
                ↓ validación de data/charts.json y docs/charts.md
CSS + ECharts/licencia + imágenes + cálculos compartidos + JS
                ↓ integración y escritura temporal
             public/index.html
                ↓ navegador, sin fetch de datos
      APP_DATA → controles y gráficos SVG/HTML/CSS
```

`data/charts.json` documenta entradas y métodos; no duplica valores ni reemplaza
los adaptadores. `docs/charts.md` se genera desde él y el catálogo; la construcción
rechaza un documento obsoleto. El modelo normalizado se incrusta, no los PDF/Excel
ni las referencias archivadas. Solo se publica un HTML.

## Responsabilidades

| Módulo | Responsabilidad |
| --- | --- |
| `scripts/build.mjs` | Orquesta, protege rutas de salida e integra recursos. Valida antes de reemplazar `index.html`, usando un fichero temporal. |
| `scripts/lib/sources.mjs` | Catálogo, selección por ID y política de rutas dentro de `data/`. |
| `scripts/lib/data.mjs` | Compone modelos. Deuda, ratio, población, árbol presupuestario y COFOG se validan aquí; delega finanzas, inflación, intereses, vivienda, repago y observaciones editoriales. |
| `scripts/lib/{finances,debt-history,interest,citizen-income,housing,repayment,editorial}.mjs` | Adaptadores y validaciones por ámbito. No construyen opciones ECharts. |
| `scripts/lib/render*.mjs` | Texto inicial, controles, tablas y árboles a partir del modelo; escape de contenido. |
| `scripts/lib/components.mjs` | Composición recursiva de `<!-- COMPONENT:nombre -->`; detecta ciclos. |
| `scripts/lib/assets.mjs` | Orden explícito de dependencias del runtime compartido y del navegador. |
| `scripts/lib/chart-registry.mjs` | Verifica procedencia de gráficos, existencia de entradas/modelos/contenedores y documentación sincronizada. |
| `scripts/document-data.mjs` | Generación o comprobación del documento del registro. |
| `src/index.html` | Orden editorial y estructura general. |
| `src/components/*.html` | Presentación; `{{VARIABLE}}` se sustituye en el build. Un marcador desconocido falla. |
| `src/styles/main.css` | Diseño y responsive. No contiene observaciones estadísticas. |
| `src/shared/*.mjs` | Funciones matemáticas sin DOM. Las activas se usan en build/tests y navegador; `worker.mjs` se conserva para pruebas de datos archivados. |
| `src/js/*` | Presentación, eventos y estado privado por gráfico. Recibe `data` mediante `createContext`. |
| `src/js/chart-theme.js` | ECharts con render SVG y paletas. Preferencia clara predeterminada, persistencia opcional. |
| `src/js/app.js` | Inicialización; lista única de vistas para resize/refresh, ResizeObserver y cambios de tema/movimiento. |
| `src/js/sharing.js` | Exportación local PNG, enlace con controles y restauración validada. No publica automáticamente. |
| `src/vendor/` | ECharts vendorizado con su licencia; no se modifica como código propio. |
| `src/assets/` | Marca e iconos incrustados como data URI. |

Los ficheros compartidos del runtime son funciones con exportaciones nombradas y
sin imports. El empaquetado quita esas exportaciones y los coloca antes de los
módulos del navegador dentro de una función. No es un bundler general; un import
nuevo en esos ficheros requiere ampliar el empaquetado. `app.js` va al final.
No hay instalación npm, red ni compilador externo en CI.

## Qué se valida

- CSV: comillas, BOM, separadores, saltos y valores; formatos y dimensiones
  específicas en cada adaptador. El CSV general usa coma, no todos los formatos INE.
- Deuda: identificación de serie y últimos cierres consecutivos.
- Finanzas: país/sector/unidad, saldo, componentes de recaudación y años continuos.
- PGE/COFOG: sumas, códigos, fechas, cantidades y provisionales; tolerancias de
  redondeo documentadas en la guía.
- Intereses/impuestos: mismo ejercicio, unidades, procedencia por partida,
  exclusiones y controles; ejemplos iniciales cubiertos por el presupuesto de intereses.
- Repago: mismo año de bases, solapamientos y aritmética de los escenarios.
- Vivienda: cobertura histórica, cuatro trimestres o total anual, base, stocks ICE.
- Editorial: valor, unidad, ámbito, periodo, fuente y limitación explícita si falta
  procedencia exacta; denominadores de ayudas y barras.
- Construcción: scripts sintácticamente válidos, IDs y enlaces internos, un solo HTML.
- Registro: cada ECharts del runtime tiene ficha; modelos, fuentes, rutas y entradas
  locales existen, y el mapa generado está vigente.

La validación estructural y las sumas no certifican la veracidad de una transcripción
ni causalidad. Revisar el documento oficial sigue siendo parte de actualizar datos.

## Pruebas y conservación del resultado

`npm run check` importa las pruebas en un proceso compatible con Node 22 y construye
el HTML. Las pruebas usan copias en directorios temporales para modificar datos:
no escriben sobre fuentes de producción. Los datasets archivados tienen pruebas
propias, sin reactivarlos en el runtime.

En esta limpieza se comparó el HTML sin bloques de script con la versión anterior:
idéntico byte a byte. Todos los modelos anteriores también conservaron exactamente
sus valores; solo se añadió el modelo editorial extraído del HTML. La interfaz no
incorpora botones, textos ni gráficos nuevos por este cambio. El registro y sus
documentos viven en el repo; las notas de fuente y tablas de la página siguen igual.

Los controles generan nuevas series o filtran las cargadas; no mutan los ficheros.
La exportación PNG reutiliza esas mismas series. Cambios de tamaño, zoom o tema
redimensionan/refrescan sin perder las selecciones.

## Desarrollo y despliegue

`npm run dev` construye una vez y sirve. `serve.mjs` solo sirve `/` e `/index.html`,
con `Cache-Control: no-cache`. GitHub Pages gestiona sus propias cabeceras: este
servidor local no altera su caché. `npm run preview` no construye.

GitHub/GitLab ejecutan la misma validación antes de publicar `public/`. La página
funciona por `file://`, con subruta y sin acceso a las fuentes durante el uso.
Nix construye en `$TMPDIR/public` y añade un ejecutable local `websrv` en la salida
instalada; ese script sirve el directorio instalado con Python, sin afectar al HTML.
