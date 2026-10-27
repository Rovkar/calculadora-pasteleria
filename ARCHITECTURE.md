# Architecture

Installable offline PWA for a bakery: "Calculadora de precios · Pasteles y postres".
Vite 6 + React 18 + TypeScript (strict) + zustand (persist -> localStorage) + vite-plugin-pwa + vitest.
UI language: Spanish (Mexico). Numbers: `Intl` `es-MX`. No network calls to third parties (fonts are self-hosted).

Commands: `npm test` (vitest), `npx tsc -b`, `npm run build` (tsc + vite build -> `dist/`), `npm run icons` (regenerate PNG icons from `public/icon.svg`). Do not start dev/preview servers unless told to.
`BASE_PATH=/sub/` env var sets the base URL when hosted in a sub-folder (default `/`).

## Folders

```
index.html                 meta tags, icons, theme-color
public/                    icon.svg (source) + generated pwa-*.png, maskable, apple-touch, favicon.ico
design/                    reference prototypes (custom template syntax: NEVER copy it)
src/main.tsx               fonts, styles, initInstallPrompt(), render <App/>
src/App.tsx                <AppShell> + current screen
src/styles/tokens.css      CSS custom properties (colors, spacing, radii, fonts)
src/styles/base.css        reset, body, headings, :focus-visible, .visually-hidden, .num
src/lib/                   pure logic (no React): units, format, ids, pricing, installPrompt
src/store/                 zustand store, types, seeds, normalize (loose validation), backup (export/import JSON)
src/components/            shared UI kit (each with its own .css)
src/app/                   AppShell + hash routing
src/screens/<Name>/        one folder per screen: <Name>Screen.tsx (default export) + own .css and sub-components
```

## Rules for screen agents

1. Work ONLY inside your own `src/screens/<Name>/` folder. Do not edit `src/lib`, `src/store`, `src/components`, `src/app`, `src/styles`. If you need a shared change, report it instead.
2. Your entry file keeps its name and `export default function XScreen()`.
3. Plain CSS, one file per component/screen, imported by that component. Use the tokens in `tokens.css` (`var(--accent)` ...). No inline hex colors, no gradients, no emoji, no left-border accent boxes.
4. Read/write app state ONLY through `useStore` and `useActions` (never touch `localStorage` yourself). Select narrowly: `useStore((s) => s.settings)`, not the whole state.
5. Prices are ALWAYS computed with `priceProduct` / `quickPrice` / `insumoUnitCosts` from `src/lib/pricing.ts`. Never re-implement the math. Never store computed prices: derive them on render.
6. Format with `formatMoney(n, settings.moneda)`, `formatPct`, `formatNum`. Parse with `parseNum`. Number inputs hold raw strings.
7. Accessibility: real `<button type="button">`, every input has a visible `<label>` (use `TextField` / `NumberField` / `Select`; `hideLabel` only in dense table rows), icon-only buttons need `aria-label`, decorative SVG `aria-hidden` (the `Icon` component already is), status messages in `<Notice>` (role=status, aria-live=polite), touch targets >= 44px, never remove `:focus-visible`.
8. Layout: the shell already provides the page container (max 1200px, padding 24px / 16px on phones) and a fixed bottom nav on phones (< 900px). If you add your own sticky/fixed bar on phones, place it above the nav: `bottom: var(--bottom-nav-height)`. Breakpoint for phone vs desktop is `max-width: 899px`.
9. Each screen starts with exactly one `<h1>`.
10. Add tests next to your code (`*.test.ts(x)`) when you add logic; `npm test`, `npx tsc -b` and `npm run build` must stay green.

## Routes (hash routing, `src/app/useHashRoute.ts`)

Names: `'calcular'` (default), `'productos'`, `'insumos'`, `'rapido'`, `'ajustes'`. URLs look like `#/productos`.
```ts
type Route = 'calcular' | 'productos' | 'insumos' | 'rapido' | 'ajustes'
useHashRoute(): { route: Route; navigate(route: Route): void }
navigate(route): void            // standalone, usable outside React
hrefFor(route): string           // "#/productos" for <a href>
parseHash(hash): Route
```
Navigation links in content should be `<a href={hrefFor('productos')}>` (or a Button calling `navigate`). The shell scrolls to top and focuses `<main>` on every route change and sets `document.title`.

## Store (`src/store/store.ts`, zustand + persist)

localStorage key `calc-pasteleria`, version 1 (`migrate` placeholder in the file). Persisted: `settings, products, insumos, draft, quick, lastSavedId`. Persisted data is sanitised on load (`normalize.ts`), so a corrupt value can never crash the app. After the first write `navigator.storage.persist()` is requested once.

```ts
const settings = useStore((s) => s.settings)
const { saveDraft } = useActions()        // useActions() === useStore((s) => s.actions), stable reference
useStore.getState().actions.xxx()         // outside React
```

State (`AppData & { lastSavedId: string | null }`):
- `settings: Settings` `{ moneda, tarifa, gasPrecio, luzPrecio, aguaPrecio, ganancia, ivaTasa: string; modo: 'costo'|'precio'; redondeo: 0|1|5|10; ivaOn: boolean }`
- `products: Product[]` = `ProductInput & { id: string; sample: boolean; updatedAt: number }` (newest first)
- `insumos: Insumo[]` `{ id, name, pack, unit: Unit, price }`
- `draft: Draft` = `ProductInput & { editingId: string | null }`; `ProductInput = { name, porciones, rows: IngredientRow[], horas, gasHoras, luzKwh, aguaLitros }`; `IngredientRow = { id, name, pack, packUnit: Unit, price, used, useUnit: Unit }`
- `quick: QuickCalc` `{ mp, horas, tarifa, gas, luz, agua, porciones, ganancia, ivaTasa: string; redondeo: 0|1|5|10; ivaOn: boolean }`
- `lastSavedId` (drives the "Guardado: X" notice)

Actions (`useActions()`):
```ts
setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void

setDraftField(key: 'name'|'porciones'|'horas'|'gasHoras'|'luzKwh'|'aguaLitros', value: string): void
addRow(): string                                   // appends blank row (g/g), returns its id
updateRow(id: string, patch: Partial<Omit<IngredientRow,'id'>>): void
   // if only packUnit changes to another dimension than useUnit, useUnit becomes that dimension's base unit
removeRow(id: string): void
resetDraft(): void                                 // "Empezar de cero": blank draft, editingId null, settings untouched
loadExample(): void                                // draft = sample Pastel; editingId = it only if the sample product still exists
loadProductIntoDraft(id: string): void             // deep copy, editingId = id
saveDraft(mode: 'update' | 'new'): { ok: true; id: string } | { ok: false; error: string }
   // errors: 'Ponle un nombre al producto para guardarlo.' | 'Agrega al menos un costo antes de guardar.'
   // 'update' replaces in place (sample -> false, updatedAt = now); 'new' (or update with missing editingId)
   // inserts a new product with a fresh id at the TOP. Rows are always deep-copied.
   // Afterwards draft.editingId = lastSavedId = saved id.
deleteProduct(id: string): void                    // clears draft.editingId / lastSavedId if they pointed to it
clearLastSaved(): void

addInsumo(): string                                // blank insumo at the TOP of the list, returns id
updateInsumo(id: string, patch: Partial<Omit<Insumo,'id'>>): void
removeInsumo(id: string): void

setQuickField<K extends keyof QuickCalc>(key: K, value: QuickCalc[K]): void

replaceAllData(data: AppData): boolean             // restore; loose validation; missing sections filled from seeds; false if not an object
loadSampleData(): void                             // everything = fresh seeds
clearAllData(): void                               // products [], insumos [], blank draft, quick + settings defaults (keeps moneda)
exportData(): AppData                              // detached deep copy
```
Backup helpers (`src/store/backup.ts`): `serializeBackup(data: AppData): string` (JSON text for a downloadable file) and `parseBackup(text): { ok: true; data: AppData } | { ok: false; error: string }` (accepts the wrapped file or a bare AppData; never throws). Typical restore: `const r = parseBackup(text); if (r.ok) actions.replaceAllData(r.data)`.
Other exports: `STORAGE_KEY`, `ERR_NAME`, `ERR_COST`, `SEED_PASTEL_ID`, `createSeedData()`, `defaultSettings()`, `defaultQuick()`, `blankRow()`, `blankDraft()` (in `seeds.ts`), `normalizeAppData(raw)`.

## Pricing (`src/lib/pricing.ts`, pure)

```ts
rowCost(row): { cost: number; incompatible: boolean }   // incompatible only when pack/use dimensions differ
materiaPrima(rows): number
priceProduct(input: ProductInput, settings: Settings): Breakdown
quickPrice(q: QuickCalc): Breakdown                      // typed MP and gas/luz/agua amounts, modo always 'costo'
insumoUnitCosts(insumo): { perBase: number|null; baseUnit: 'g'|'ml'|'pza'; perKgL: number|null; kgLUnit: 'kg'|'l'|null }
   // null when pack is empty/0; perKgL null for pieces. Show perBase with 3 decimals (pza: 2) and perKgL with 2.
Breakdown = {
  mp, mo, gas, luz, agua, gi, ct, p0, pbruto, P, base, iva, gananciaReal,
  porPorcion, costoPorcion, porciones, equivalencia, equivalenciaKind: 'sobrePrecio'|'sobreCosto',
  rounded: boolean,   // show "Redondeado desde {formatMoney(pbruto)}" when true
  t: number, ivaOn: boolean,
  shares: { mp, mo, gi, ganancia, iva }   // % of P, 0 when P is 0, iva 0 unless ivaOn
}
```
`equivalencia`: in modo 'costo' it is the margin over the sale price ("equivale a X % sobre el precio"); in modo 'precio' it is the markup over cost.
Product list rows: `priceProduct(product, settings)` -> `P`, `porPorcion`, `ct`, `gananciaReal` (and `base`, `iva` when `ivaOn`).

Other lib modules:
- `units.ts`: `Unit` (`'g'|'kg'|'ml'|'l'|'gal'|'pza'`), `UNIT_INFO[unit] = { label, name, dim, factor }`, `UNITS` (`[{ value, label, name }]`, for selects), `isUnit`, `sameDimension(a, b)`, `baseUnit(dim)`, `factorOf(unit)`.
- `format.ts`: `parseNum(string|number)` (comma or dot, invalid -> 0), `formatMoney(n, moneda, decimals = 2)`, `formatPct(n)` ("34.5 %"), `formatNum(n, maxDecimals = 2, minDecimals = 0)`, `normalizeText(s)` (lowercase, accent-insensitive: use for search on both sides).
- `ids.ts`: `newId()`.
- `installPrompt.ts`: `initInstallPrompt()` (called in main.tsx), `subscribe`, `getDeferredPrompt()`, `promptInstall(): Promise<'accepted'|'dismissed'|'unavailable'>`, `isStandalone()`, `isIOS()`. React hook `useInstallPrompt()` (in `useInstallPrompt.ts`) returns `{ canInstall, isStandalone, showIOSHelp, install }`: show an "Instalar app" button when `canInstall`, and the manual instructions ("Compartir" -> "Agregar a pantalla de inicio") when `showIOSHelp`.

## Components (`src/components/*`, import the default export from the file)

- `Icon` `{ name, size = 20, className?, strokeWidth? }` names: cake calc list box bolt gear plus trash check chevronLeft chevronRight search edit download upload share info x. Always aria-hidden.
- `Button` `{ variant?: 'primary'|'secondary'(default)|'ghost'|'danger'|'icon'; size?: 'md'|'lg'; fullWidth?; icon?: IconName; ...button attrs }`. `type="button"` unless given. `variant="icon"` REQUIRES `aria-label` and `icon`, no children.
- `Card` `{ title?, helper?, headerRight?, headingLevel?: 2|3, className?, children }` (section labelled by its title).
- `TextField` / `NumberField` `{ label, value: string, onChange(value: string), hideLabel?, prefix?, suffix?, helper?, error?, placeholder?, size?: 'md'|'lg', disabled?, name?, id?, className?, inputRef?, autoFocus?, maxLength?, onBlur? }`. NumberField = `type="text" inputMode="decimal" autoComplete="off"`. prefix/suffix are aria-hidden: put units in the label when they matter.
- `Select<V>` `{ label, value: V, onChange(v: V), options: { value, label }[], hideLabel?, helper?, error?, size?, disabled?, id?, className?, selectRef? }` (native select).
- `Segmented<V>` `{ legend, options: { value, label, ariaLabel? }[], value, onChange, fullWidth?, className? }` (value may be string, number or boolean).
- `Chips<V>` `{ legend, options, value | null, onChange, className? }` (pill toggles, aria-pressed).
- `BreakdownBar` `{ segments: { key, label, amount: string, share: number, color, swatchBorder? }[], showLegend = true, compact?, className? }`. Build segments with `breakdownSegments(breakdown, moneda)` from `components/breakdownSegments.ts` (standard labels/colors, IVA only when on).
- `Notice` `{ tone?: 'info'|'success'|'error', icon?, action?, className?, children }` role=status aria-live=polite. Keep it mounted (change children) when the message must be announced later.
- `EmptyState` `{ icon?, title, children?, action?, className? }`.
- Utility classes from base.css: `.visually-hidden`, `.num` (tabular-nums).

## App shell (`src/app/AppShell.tsx`)

`<AppShell route>`: >= 900px a white header with brand + tab links (active = accent bg, `aria-current="page"`); < 900px a compact top bar + fixed bottom nav (5 items, icon + short label, `padding-bottom: env(safe-area-inset-bottom)`). Content container max 1200px. CSS variable `--bottom-nav-height` (0 on desktop, `60px + safe-area` on phones; tokens.css) is already applied as padding at the bottom of the content. A "Saltar al contenido" skip link is included.

## PWA

`vite-plugin-pwa` generateSW, `registerType: 'autoUpdate'`, precache of js/css/html/svg/png/ico/woff2, `navigateFallback: index.html`. Manifest: `Precios`, standalone, portrait, theme `#B0245A`, icons 192/512/maskable-512 (`public/`). Regenerate icons after changing `public/icon.svg` with `npm run icons`. The app works fully offline after the first load; data lives in `localStorage` on the device (use the backup export in Ajustes to move it).
