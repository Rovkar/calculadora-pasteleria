import { useEffect, useRef, useState } from 'react';
import { useActions, useStore } from '../../store/store';
import { useInstallPrompt } from '../../lib/useInstallPrompt';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Notice from '../../components/Notice';
import PersistWarning from '../../components/PersistWarning';
import { downloadFile } from '../../lib/downloadFile';
import Segmented from '../../components/Segmented';
import { backupFileName, buildBackup, readBackup } from './backup';
import './AjustesScreen.css';

const MONEDAS: { value: string; ariaLabel: string }[] = [
  { value: '$', ariaLabel: 'Pesos o dólares ($)' },
  { value: '€', ariaLabel: 'Euros (€)' },
  { value: 'S/', ariaLabel: 'Soles (S/)' },
  { value: 'Q', ariaLabel: 'Quetzales (Q)' },
  { value: '₡', ariaLabel: 'Colones (₡)' },
  { value: 'Bs', ariaLabel: 'Bolivianos (Bs)' },
];

type Msg = { tone: 'success' | 'error' | 'info'; text: string } | null;

export default function AjustesScreen() {
  const moneda = useStore((s) => s.settings.moneda);
  const actions = useActions();
  const install = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [installMsg, setInstallMsg] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      const p = navigator.storage?.persisted?.();
      if (p) p.then((v) => alive && setPersisted(v)).catch(() => {});
    } catch {
      /* unsupported */
    }
    try {
      const f = new File(['{}'], 'x.json', { type: 'application/json' });
      setCanShare(Boolean(navigator.canShare?.({ files: [f] })));
    } catch {
      setCanShare(false);
    }
    return () => {
      alive = false;
    };
  }, []);

  const makeFile = () => new File([buildBackup(actions.exportData())], backupFileName(), { type: 'application/json' });

  const download = () => {
    try {
      const file = makeFile();
      downloadFile(file);
      setMsg({ tone: 'success', text: `Respaldo descargado: ${file.name}` });
    } catch {
      setMsg({ tone: 'error', text: 'No se pudo descargar el respaldo.' });
    }
  };

  const share = async () => {
    try {
      await navigator.share({ files: [makeFile()], title: 'Respaldo de precios' });
      setMsg({ tone: 'success', text: 'Respaldo compartido.' });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setMsg({ tone: 'error', text: 'No se pudo compartir el respaldo.' });
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = readBackup(await file.text());
      if (!r.ok) {
        setMsg({ tone: 'error', text: r.error });
        return;
      }
      if (
        !window.confirm(
          'Esto reemplazará tus datos actuales por los del respaldo. Antes se descargará un respaldo de tus datos actuales por si lo necesitas. ¿Continuar?',
        )
      ) {
        return;
      }
      try {
        downloadFile(new File([buildBackup(actions.exportData())], backupFileName(new Date(), 'respaldo-previo'), { type: 'application/json' }));
      } catch {
        setMsg({ tone: 'error', text: 'No se pudo guardar un respaldo de tus datos actuales, así que no se restauró nada.' });
        return;
      }
      if (actions.replaceAllData(r.data)) setMsg({ tone: 'success', text: 'Respaldo restaurado.' });
      else setMsg({ tone: 'error', text: 'No se pudo restaurar el respaldo.' });
    } catch {
      setMsg({ tone: 'error', text: 'No se pudo leer el archivo.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doInstall = async () => {
    const r = await install.install();
    setInstallMsg(r === 'accepted' ? 'Instalando la app...' : r === 'unavailable' ? 'La instalación no está disponible ahora.' : '');
  };

  return (
    <div className="ajustes">
      <h1>Ajustes</h1>

      <PersistWarning />

      <Card title="Moneda" helper="Se usa en toda la app.">
        <div className="ajustes__row">
          <Segmented legend="Moneda" value={moneda} onChange={(v) => actions.setSetting('moneda', v)} options={MONEDAS.map((m) => ({ value: m.value, label: m.value, ariaLabel: m.ariaLabel }))} />
        </div>
      </Card>

      <Card title="Instalar la app">
        {install.isStandalone ? (
          <p className="ajustes__text">La app ya está instalada en este dispositivo.</p>
        ) : install.canInstall ? (
          <div className="ajustes__row">
            <Button variant="primary" icon="download" onClick={doInstall}>
              Instalar en este dispositivo
            </Button>
          </div>
        ) : install.showIOSHelp ? (
          <ol className="ajustes__steps">
            <li>Toca el botón Compartir de Safari.</li>
            <li>Elige «Agregar a inicio».</li>
            <li>Toca «Agregar».</li>
          </ol>
        ) : (
          <p className="ajustes__text">Abre el menú del navegador (⋮) y elige «Instalar app» o «Agregar a la pantalla principal».</p>
        )}
        <p className="ajustes__text" aria-live="polite">
          {installMsg}
        </p>
      </Card>

      <Card title="Respaldo de tus datos">
        <p className="ajustes__text">
          Tus productos e insumos se guardan solo en este dispositivo. Descarga un respaldo de vez en cuando para no perderlos si borras los datos del navegador o cambias de teléfono.
        </p>
        {install.showIOSHelp ? (
          <p className="ajustes__text">
            En iPhone y iPad, Safari puede borrar los datos de una página que no abres durante varios días. Instala la app en tu pantalla de inicio (arriba) y descarga un respaldo con frecuencia.
          </p>
        ) : null}
        <div className="ajustes__row">
          <Button variant="primary" icon="download" onClick={download}>
            Descargar respaldo
          </Button>
          {canShare ? (
            <Button icon="share" onClick={share}>
              Compartir respaldo
            </Button>
          ) : null}
          <Button icon="upload" onClick={() => fileRef.current?.click()}>
            Restaurar respaldo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Archivo de respaldo"
            onChange={(e) => void restore(e.target.files?.[0])}
          />
        </div>
        {/* Always in the tree, so a screen reader announces the text that appears in it. */}
        <div className="ajustes__msg" role="status" aria-live="polite">
          {msg ? (
            <Notice tone={msg.tone} live={false}>
              {msg.text}
            </Notice>
          ) : null}
        </div>
      </Card>

      <Card title="Datos">
        <div className="ajustes__row">
          <Button
            onClick={() => {
              if (window.confirm('Esto reemplazará tus datos actuales por los de ejemplo. ¿Continuar?')) {
                actions.loadSampleData();
                setMsg({ tone: 'success', text: 'Datos de ejemplo cargados.' });
              }
            }}
          >
            Cargar datos de ejemplo
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => {
              if (window.confirm('¿Borrar todos tus productos, insumos y el cálculo actual? También se restablecen tus tarifas, ganancia y redondeo a los valores iniciales (la moneda se conserva). No se puede deshacer.')) {
                actions.clearAllData();
                setMsg({ tone: 'success', text: 'Datos borrados.' });
              }
            }}
          >
            Borrar todo
          </Button>
        </div>
        {persisted !== null ? <p className="ajustes__text">Almacenamiento protegido por el navegador: {persisted ? 'sí' : 'no'}</p> : null}
      </Card>

      <p className="ajustes__footer">Versión 1.0 · Funciona sin conexión</p>
    </div>
  );
}
