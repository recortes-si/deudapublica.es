# deudapublica.es

[deudapublica.es](https://deudapublica.es) hace visible la deuda pública española:
cuánto debemos, cuánto cuestan sus intereses, cómo evolucionan las cuentas públicas
y qué decisiones permitirían reducirla.


## Qué puedes explorar

- Deuda nominal, deuda sobre el PIB, euros constantes y deuda por habitante.
- Déficit y superávit anuales, intereses y ejemplos de rebajas fiscales equivalentes.
- Inflación, recaudación, gasto y poder de compra.
- Destino del gasto público y partidas del presupuesto estatal.
- Crecimiento, vivienda y costes locales asociados al aumento de población.
- Escenarios de gasto, ingresos y repago de la deuda.

La web está pensada para móviles y permite compartir gráficos y escenarios.
Los simuladores son ejemplos con supuestos explícitos, no predicciones ni propuestas
cuyo efecto económico se haya demostrado.

## Cómo aportar

Puedes contribuir con datos, correcciones, mejoras visuales, accesibilidad,
traducciones, pruebas en móviles o ideas que ayuden a explicar mejor las cifras.

Para avisar de un error o proponer una mejora, [abre una incidencia](https://github.com/recortes-si/deudapublica.es/issues).
Indica la sección, qué has observado y cómo reproducirlo. Si se trata de una cifra,
añade la fuente oficial, el periodo, la unidad y la tabla o página correspondiente.
Para problemas visuales, ayuda incluir navegador, tamaño de pantalla y una captura.

Para enviar cambios:

1. Haz un fork y trabaja en una rama con un cambio concreto.
2. Documenta qué problema resuelve y, cuando haya datos, de dónde proceden y cómo
   se han procesado.
3. Ejecuta `npm run check` y revisa el resultado en móvil y escritorio.
4. Abre una pull request explicando el cambio y las comprobaciones realizadas.

No hace falta compartir todas las opiniones del proyecto para mejorar su precisión.
Las correcciones con evidencia son bienvenidas, también cuando contradigan una
interpretación publicada.

## Datos y validación

Los gráficos se generan desde ficheros CSV o JSON, que pueden contener descargas
oficiales o extracciones procesadas. Cada visualización debe documentar su fuente,
periodo, ámbito, unidades, cálculo y límites de interpretación.

Las comprobaciones automáticas revisan dimensiones, cobertura temporal, sumas,
duplicados y coherencia de los modelos. **Que pasen las pruebas no demuestra por
sí solo que una transcripción sea correcta o que una relación sea causal.** Los
cambios de datos deben contrastarse con el documento oficial.

Al contribuir con datos:

- Prioriza fuentes oficiales e identifica la tabla, página o serie exacta.
- Explica selecciones, conversiones, redondeos y cualquier procesamiento.
- Distingue datos observados, provisionales, estimaciones y supuestos.
- No mezcles periodos, unidades, perfiles ni ámbitos contables incompatibles.
- Conserva los datos originales o una referencia que permita repetir la extracción.

Algunas cifras editoriales antiguas están marcadas como `legacy-unverified` porque
su cita no identificaba una tabla y fecha precisas. Esa limitación está documentada;
completar su procedencia es una forma útil de contribuir.

Consulta el [mapa de datos de cada gráfico](docs/charts.md) y la
[guía de datos y metodología](docs/data.md) para auditar o actualizar las cifras.

## Uso de inteligencia artificial

Las contribuciones asistidas por IA requieren la misma revisión que cualquier otra:
comprobar fuentes, entender los cálculos, revisar el código y probar el resultado.
No deben introducir cifras, citas o referencias inventadas. Indica en la pull request
qué tareas se han realizado con IA y qué has verificado.

La responsabilidad sobre los cambios corresponde a quien los propone y revisa;
no se delega en la herramienta.

## Probar el proyecto en local

Necesitas Node.js 22 o posterior; no hay dependencias npm que instalar.

```sh
npm run dev      # construir y abrir el servidor en http://localhost:8080
npm run check    # ejecutar pruebas, validar documentación y construir
npm run build    # generar la página estática
```

Abre la dirección del servidor en el navegador. Después de editar, vuelve a
construir y recarga. No edites directamente el HTML generado en `public/`.
Si cambias las fuentes o el registro de gráficos, ejecuta también `npm run docs:data`.
Las instrucciones técnicas están en la [guía de desarrollo](docs/architecture.md).

## Apoyar el proyecto

Puedes apoyar el mantenimiento y la mejora de deudapublica.es mediante
[GitHub Sponsors · recortes-si](https://github.com/sponsors/recortes-si).
El repositorio incluye la configuración de financiación para mostrar ese enlace
en el botón **Sponsor** de GitHub.

También puedes ayudar sin aportar dinero: comparte la web, comprueba una fuente,
comunica un error o envía una mejora. Las aportaciones económicas no sustituyen la
validación de los datos ni las razones necesarias para aceptar un cambio.

## Licencia

Consulta [LICENSE](LICENSE). Los datos y recursos de terceros conservan sus
condiciones de uso; Apache ECharts incluye su propia licencia en el proyecto.
