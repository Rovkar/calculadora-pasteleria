import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { useStore } from './store/store';
import { createSeedData } from './store/seeds';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

async function show(route: string) {
  window.location.hash = `#/${route}`;
  await act(async () => {
    root.render(createElement(App));
  });
  await act(async () => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

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

beforeEach(() => {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  useStore.setState({ ...createSeedData(), lastSavedId: null });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Insumo picker in Calcular', () => {
  it('adds an insumo from the list as a new filled row', async () => {
    await show('calcular');
    const before = useStore.getState().draft.rows.length;
    await click(button('Agregar desde mis insumos'));
    const dialog = host.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    const item = Array.from(dialog.querySelectorAll<HTMLButtonElement>('.picker__item')).find((b) =>
      b.textContent?.includes('Azúcar'),
    )!;
    await click(item);
    const rows = useStore.getState().draft.rows;
    expect(rows).toHaveLength(before + 1);
    const added = rows[rows.length - 1];
    expect(added).toMatchObject({ name: 'Azúcar', pack: '1', packUnit: 'kg', price: '34', useUnit: 'g' });
    expect(dialog.textContent).toContain('Agregaste: Azúcar');
    await click(button('Listo'));
    expect(dialog.hasAttribute('open')).toBe(false);
    const li = host.querySelector(`[data-row-id="${added.id}"]`)!;
    expect(document.activeElement).toBe(li.querySelector('.ing-row__used input'));
  });

  it('shows the out-of-date notice and syncs from the list', async () => {
    const s = useStore.getState();
    s.actions.updateInsumo(s.insumos.find((i) => i.name === 'Azúcar')!.id, { price: '40' });
    await show('calcular');
    expect(host.textContent).toContain('1 ingrediente tiene otro precio en tu lista de insumos.');
    await click(button('Actualizar todos'));
    expect(useStore.getState().draft.rows.find((r) => r.name === 'Azúcar')!.price).toBe('40');
    expect(host.textContent).not.toContain('tiene otro precio');
  });
});
