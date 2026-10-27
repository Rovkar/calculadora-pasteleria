import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { useStore } from './store/store';
import { createSeedData } from './store/seeds';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

async function show(route: string): Promise<string> {
  window.location.hash = `#/${route}`;
  await act(async () => {
    root.render(createElement(App));
  });
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  return host.textContent ?? '';
}

beforeEach(() => {
  useStore.setState({ ...createSeedData(), lastSavedId: null });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('App integration (default settings)', () => {
  it('Calcular shows the Pastel numbers', async () => {
    const t = await show('calcular');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    for (const s of ['$411.65', '$560.00', '$46.67', '$148.35', '$193.05', '$200.00', '$18.60']) {
      expect(t).toContain(s);
    }
    expect(t).toContain('555.73');
  });

  it('Productos lists the five samples with prices', async () => {
    const t = await show('productos');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    for (const s of ['Pastel de chocolate', 'Cheesecake de fresa', 'Pay de limón', 'Flan napolitano', '$280.00', '$340.00', '$250.00']) {
      expect(t).toContain(s);
    }
  });

  it('Insumos shows unit costs', async () => {
    const t = await show('insumos');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(t).toContain('$0.032 / g');
    expect(t).toContain('$32.00 / kg');
    expect(t).toContain('$0.028 / ml');
    expect(t).toContain('$3.17 / pza');
  });

  it('Rapido shows the quick-calc numbers', async () => {
    const t = await show('rapido');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    for (const s of ['$411.65', '$560.00', '$46.67', '$148.35']) expect(t).toContain(s);
  });

  it('Ajustes renders', async () => {
    await show('ajustes');
    expect(host.querySelectorAll('h1')).toHaveLength(1);
  });

  it('Productos with IVA 16 % shows the IVA prices', async () => {
    useStore.getState().actions.setSetting('ivaOn', true);
    const t = await show('productos');
    for (const s of ['$650.00', '$320.00', '$390.00', '$290.00']) expect(t).toContain(s);
  });
});

function button(text: string): HTMLButtonElement {
  const b = Array.from(host.querySelectorAll('button')).find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  return b as HTMLButtonElement;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('Calcular behaviour', () => {
  it('every ingredient field has a unique accessible label', async () => {
    await show('calcular');
    const labels = Array.from(host.querySelectorAll('.ing-row label')).map((l) => l.textContent ?? '');
    expect(labels.length).toBeGreaterThan(50);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain('Presentación de Harina de trigo');
  });

  it('asks before discarding unsaved work, and only discards when confirmed', async () => {
    await show('calcular');
    const confirm = vi.spyOn(window, 'confirm');
    // untouched draft: no question
    await click(button('Empezar de cero'));
    expect(confirm).not.toHaveBeenCalled();
    expect(useStore.getState().draft.name).toBe('');
    // typed work: refuse, then accept
    useStore.getState().actions.setDraftField('name', 'En proceso');
    confirm.mockReturnValueOnce(false);
    await click(button('Cargar ejemplo'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(useStore.getState().draft.name).toBe('En proceso');
    confirm.mockReturnValueOnce(true);
    await click(button('Cargar ejemplo'));
    expect(useStore.getState().draft.name).toBe('Pastel de chocolate');
    confirm.mockRestore();
  });

  it('adding an ingredient focuses its name field; removing keeps focus inside the list', async () => {
    await show('calcular');
    const before = useStore.getState().draft.rows.length;
    await click(button('Agregar ingrediente'));
    const rows = useStore.getState().draft.rows;
    expect(rows).toHaveLength(before + 1);
    const li = host.querySelector(`[data-row-id="${rows[rows.length - 1].id}"]`)!;
    expect(document.activeElement).toBe(li.querySelector('input'));
    await click(host.querySelector<HTMLButtonElement>(`[data-row-id="${rows[rows.length - 1].id}"] .ing-row__remove button`)!);
    expect(useStore.getState().draft.rows).toHaveLength(before);
    const prev = host.querySelector(`[data-row-id="${rows[rows.length - 2].id}"]`)!;
    expect(document.activeElement).toBe(prev.querySelector('input'));
  });

  it('the profit slider announces a value text', async () => {
    await show('calcular');
    expect(host.querySelector('input[type="range"]')!.getAttribute('aria-valuetext')).toBe('35 %');
  });
});
