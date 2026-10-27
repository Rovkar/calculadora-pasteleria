import { newId } from '../lib/ids';
import type { Unit } from '../lib/units';
import type {
  AppData,
  Draft,
  IngredientRow,
  Insumo,
  Product,
  ProductInput,
  QuickCalc,
  Settings,
} from './types';

/** Stable id of the bundled "Pastel de chocolate" example (so "Cargar ejemplo" can find it again). */
export const SEED_PASTEL_ID = 'seed-pastel-de-chocolate';

export function defaultSettings(): Settings {
  return {
    moneda: '$',
    tarifa: '80',
    gasPrecio: '14',
    luzPrecio: '3',
    aguaPrecio: '0.05',
    ganancia: '35',
    modo: 'costo',
    redondeo: 10,
    ivaOn: false,
    ivaTasa: '16',
  };
}

export function defaultQuick(): QuickCalc {
  return {
    mp: '193.05',
    horas: '2.5',
    tarifa: '80',
    gas: '14',
    luz: '3.60',
    agua: '1',
    porciones: '12',
    ganancia: '35',
    redondeo: 10,
    ivaOn: false,
    ivaTasa: '16',
  };
}

export function blankRow(): IngredientRow {
  return { id: newId(), name: '', pack: '', packUnit: 'g', price: '', used: '', useUnit: 'g' };
}

export function blankDraft(): Draft {
  return {
    name: '',
    porciones: '1',
    rows: [blankRow()],
    horas: '',
    gasHoras: '',
    luzKwh: '',
    aguaLitros: '',
    editingId: null,
  };
}

function row(
  name: string,
  pack: string,
  packUnit: Unit,
  price: string,
  used: string,
  useUnit: Unit,
): IngredientRow {
  return { id: newId(), name, pack, packUnit, price, used, useUnit };
}

function totalRow(price: string): IngredientRow[] {
  return [row('Ingredientes (total del ejemplo)', '1', 'pza', price, '1', 'pza')];
}

function sample(
  id: string,
  name: string,
  porciones: string,
  horas: string,
  gasHoras: string,
  luzKwh: string,
  aguaLitros: string,
  rows: IngredientRow[],
): Product {
  return { id, name, porciones, horas, gasHoras, luzKwh, aguaLitros, rows, sample: true, updatedAt: Date.now() };
}

export function createSeedProducts(): Product[] {
  return [
    sample(SEED_PASTEL_ID, 'Pastel de chocolate', '12', '2.5', '1', '1.2', '20', [
      row('Harina de trigo', '1', 'kg', '32', '300', 'g'),
      row('Azúcar', '1', 'kg', '34', '350', 'g'),
      row('Cocoa en polvo', '250', 'g', '68', '80', 'g'),
      row('Huevo', '30', 'pza', '95', '4', 'pza'),
      row('Mantequilla', '450', 'g', '98', '150', 'g'),
      row('Leche entera', '1', 'gal', '106', '250', 'ml'),
      row('Polvo para hornear', '220', 'g', '32', '10', 'g'),
      row('Chocolate semiamargo', '1', 'kg', '260', '200', 'g'),
      row('Crema para batir', '1', 'l', '95', '200', 'ml'),
      row('Caja y base para pastel', '1', 'pza', '25', '1', 'pza'),
    ]),
    sample('seed-cheesecake-de-fresa', 'Cheesecake de fresa', '10', '2', '1.25', '1', '15', totalRow('228.50')),
    sample('seed-pay-de-limon', 'Pay de limón', '8', '1.25', '0.25', '0.6', '10', totalRow('96.80')),
    sample('seed-cupcakes-de-vainilla', 'Cupcakes de vainilla (docena)', '12', '1.5', '0.5', '0.8', '12', totalRow('118.20')),
    sample('seed-flan-napolitano', 'Flan napolitano', '10', '1', '1', '0.4', '10', totalRow('84.60')),
  ];
}

export function createSeedInsumos(): Insumo[] {
  const list: [string, string, Unit, string][] = [
    ['Harina de trigo', '1', 'kg', '32'],
    ['Azúcar', '1', 'kg', '34'],
    ['Cocoa en polvo', '250', 'g', '68'],
    ['Huevo', '30', 'pza', '95'],
    ['Mantequilla', '450', 'g', '98'],
    ['Leche entera', '1', 'gal', '106'],
    ['Polvo para hornear', '220', 'g', '32'],
    ['Chocolate semiamargo', '1', 'kg', '260'],
    ['Crema para batir', '1', 'l', '95'],
    ['Caja y base para pastel', '1', 'pza', '25'],
    ['Queso crema', '190', 'g', '38'],
    ['Fresa', '1', 'kg', '70'],
    ['Limón', '1', 'kg', '40'],
    ['Leche condensada', '387', 'g', '34'],
    ['Vainilla', '250', 'ml', '45'],
  ];
  return list.map(([name, pack, unit, price]) => ({ id: newId(), name, pack, unit, price }));
}

/** Deep copy of a product's input fields (fresh row ids are NOT generated: ids are kept). */
export function copyInput(p: ProductInput): ProductInput {
  return {
    name: p.name,
    porciones: p.porciones,
    horas: p.horas,
    gasHoras: p.gasHoras,
    luzKwh: p.luzKwh,
    aguaLitros: p.aguaLitros,
    rows: p.rows.map((r) => ({ ...r })),
  };
}

export function draftFromProduct(p: ProductInput, editingId: string | null): Draft {
  return { ...copyInput(p), editingId };
}

/** Everything fresh: sample settings, products, insumos, draft (= Pastel example), quick calc. */
export function createSeedData(): AppData {
  const products = createSeedProducts();
  return {
    settings: defaultSettings(),
    products,
    insumos: createSeedInsumos(),
    draft: draftFromProduct(products[0], products[0].id),
    quick: defaultQuick(),
  };
}
