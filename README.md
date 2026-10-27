# Calculadora de precios · Pasteles y postres

**App publicada:** https://rovkar.github.io/calculadora-pasteleria/

Aplicación web instalable (PWA) para calcular en cuánto vender pasteles y postres. Funciona sin internet una vez instalada, se usa igual en el celular y en la computadora, y guarda todo en el propio dispositivo.

## Para la dueña de la pastelería

### Qué hace

La app tiene cinco secciones (barra inferior en el celular, pestañas arriba en la computadora):

- **Calcular**: armas un producto con sus ingredientes (cuánto cuesta el paquete y cuánto usas), horas de trabajo, gas, luz y agua. Te dice el costo total, el precio de venta, el precio por porción y cuánto ganas realmente. Con **Guardar** el producto pasa a "Mis productos".
- **Mis productos**: lista de todo lo que has guardado, con su precio. Aquí también están los **Ajustes de precio**: tarifa por hora, precio del gas, luz y agua, porcentaje de ganancia, redondeo del precio e IVA. Al cambiarlos, todos los precios se recalculan solos.
- **Insumos**: tu lista de ingredientes con precio del paquete. Muestra el costo por gramo, mililitro, pieza, kilo o litro.
- **Cálculo rápido**: para cuando ya sabes el costo de los ingredientes y solo quieres el precio de venta.
- **Ajustes**: moneda, instalar la app, respaldo de datos y borrar o cargar los datos de ejemplo.

La primera vez que abres la app aparecen productos e insumos de ejemplo (Pastel de chocolate, Cheesecake de fresa, etc.). Puedes editarlos, borrarlos o usar **Ajustes › Borrar todo** para empezar de cero.

### Dónde se guardan los datos

Los datos se guardan **en el navegador de tu dispositivo** (localStorage, con la clave `calc-pasteleria`). No se envían a ningún servidor ni a terceros: no hay cuentas ni internet de por medio.

Esto significa que:

- Los datos de tu celular y los de tu computadora son **independientes**. Para pasar datos de uno a otro usa el respaldo.
- Si borras los datos del sitio o la app en la configuración del navegador, o desinstalas el navegador, **se pierden los datos**. Haz respaldos de vez en cuando.
- Instalar la app en la pantalla de inicio ayuda a que el navegador no borre los datos por falta de espacio.

### Cómo hacer respaldo y restaurarlo

En **Ajustes › Respaldo de tus datos**:

1. **Descargar respaldo** genera el archivo `respaldo-precios-AAAA-MM-DD.json`. En el celular también puedes **Compartir** el archivo (por WhatsApp, correo, Drive, etc.) para guardarlo fuera del teléfono.
2. **Restaurar desde un archivo** te deja elegir un respaldo descargado antes. Reemplaza los datos actuales por los del archivo.

Se recomienda descargar un respaldo después de cambios importantes y guardarlo en un lugar seguro (por ejemplo, enviártelo por correo).

### Cómo instalarla en el celular

La app debe abrirse desde su dirección web (HTTPS). Una vez abierta:

- **Android (Chrome)**: menú de tres puntos (⋮) › **Instalar app** (o **Agregar a la pantalla principal**). También puedes usar el botón **Instalar** en Ajustes cuando aparezca.
- **iPhone (Safari)**: botón **Compartir** › **Agregar a inicio** › **Agregar**. En iPhone debe hacerse desde Safari, no desde Chrome.

Después aparece un ícono "Precios" en la pantalla de inicio y la app abre a pantalla completa, aun sin internet.

### Cómo se calcula el precio

- Costo de un ingrediente = precio del paquete ÷ cantidad del paquete × cantidad usada (convirtiendo unidades: g, kg, ml, l, galón, piezas). No se pueden mezclar masa con volumen en un mismo ingrediente; la fila se marca como incompatible.
- Materia prima (MP) = suma de ingredientes. Mano de obra (MO) = horas × tarifa. Gastos indirectos (GI) = gas + luz + agua. Costo total (CT) = MP + MO + GI.
- Precio base: modo **margen sobre el costo** = CT × (1 + ganancia %); modo **margen sobre el precio** = CT ÷ (1 − ganancia %).
- Si activas el IVA se suma al precio, y el precio final se redondea hacia arriba al múltiplo elegido ($0, $1, $5 o $10).
- La ganancia real se calcula sobre el precio sin IVA, ya con el redondeo.

## Para quien desarrolle

### Stack

Vite + React 18 + TypeScript (estricto) + zustand (persist en localStorage) + vite-plugin-pwa (`generateSW`, `registerType: 'autoUpdate'`) + vitest. Fuentes autohospedadas con `@fontsource-variable` (sin Google Fonts ni CDN: no hay peticiones de red a terceros). CSS plano, un archivo por componente o pantalla, con variables en `src/styles/tokens.css`. Enrutamiento por hash (`#/productos`), sin librería de rutas.

La estructura de carpetas, el contrato del store y las reglas de código están en [ARCHITECTURE.md](ARCHITECTURE.md). Los prototipos de diseño originales están en `design/` y son solo referencia visual (usan una sintaxis de plantillas propia que no se debe copiar).

Toda la matemática de precios vive en `src/lib/pricing.ts` y `src/lib/units.ts`; las pantallas no la reimplementan. Los precios nunca se guardan, se derivan al renderizar.

### Desarrollo local

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # pruebas (vitest)
npm run build    # tsc -b + vite build -> dist/
npm run preview  # sirve dist/ para probar la PWA
npm run icons    # regenera los PNG a partir de public/icon.svg
```

Nota: el service worker solo se genera en `npm run build`; para probar la instalación y el modo sin conexión usa `npm run build && npm run preview`.

### Datos y versiones

- Clave de localStorage: `calc-pasteleria`, versión 1 (hay un `migrate` en `src/store/store.ts` para futuros cambios de formato).
- Los datos leídos se sanean en `src/store/normalize.ts`, así que un valor corrupto no tumba la app.
- El archivo de respaldo es JSON con la forma `{ app: 'calculadora-pasteleria', version: 1, exportedAt, data }`.

### Publicar

La app es solo archivos estáticos (`dist/`). **Debe servirse por HTTPS** (o `localhost`) para que el navegador permita instalarla y registrar el service worker. GitHub Pages y Netlify ya dan HTTPS.

**GitHub Pages** (la app queda en una subcarpeta `/<repo>/`, por eso hay que indicar `BASE_PATH`):

```powershell
# PowerShell (Windows)
$env:BASE_PATH='/<repo>/'; npm run build
```

```bash
# bash / macOS / Linux
BASE_PATH=/<repo>/ npm run build
# Git Bash en Windows: anteponer MSYS_NO_PATHCONV=1
MSYS_NO_PATHCONV=1 BASE_PATH=/<repo>/ npm run build
```

Después sube el contenido de `dist/` a la rama o carpeta que sirva GitHub Pages (por ejemplo la rama `gh-pages`) y actívalo en Settings › Pages. La dirección será `https://<usuario>.github.io/<repo>/`. Si `BASE_PATH` queda mal escrito por Git Bash, el build falla con un mensaje en vez de generar una app rota.

**Netlify Drop**: `npm run build` (sin `BASE_PATH`) y arrastra la carpeta `dist/` a https://app.netlify.com/drop. Obtienes una dirección HTTPS al instante.

**Publicación automática:** cada push a la rama `main` vuelve a publicar la app en GitHub Pages mediante GitHub Actions (`.github/workflows/deploy.yml`), que corre las pruebas, construye con `BASE_PATH=/calculadora-pasteleria/` y despliega. En Settings › Pages debe estar elegido *GitHub Actions* como origen. No hace falta subir `dist/` a mano.

Para actualizar manualmente, vuelve a construir y publica de nuevo `dist/`. Con `registerType: 'autoUpdate'` los dispositivos toman la versión nueva en cuanto tienen internet y reabren la app. Los datos guardados no se tocan.

### Pendientes conocidos

- Revisión visual en navegador real y en celular (las pruebas automáticas cubren la lógica y los números, no el diseño).
- El botón "Instalar" de Ajustes depende de que el navegador dispare `beforeinstallprompt` (Chrome/Android); en iPhone se usan las instrucciones manuales.
