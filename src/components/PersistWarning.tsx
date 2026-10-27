import { downloadFile } from '../lib/downloadFile';
import { backupFileName, buildBackup } from '../screens/Ajustes/backup';
import { useActions, useStore } from '../store/store';
import Button from './Button';
import Notice from './Notice';

/** Shown only when the browser refused to save (storage full or blocked): the data is living in memory only. */
export default function PersistWarning() {
  const persistOk = useStore((s) => s.persistOk);
  const { exportData } = useActions();
  if (persistOk) return null;
  const download = () => {
    try {
      downloadFile(new File([buildBackup(exportData())], backupFileName(), { type: 'application/json' }));
    } catch {
      // nothing else we can do here; Ajustes shows the error path
    }
  };
  return (
    <Notice
      tone="error"
      icon="info"
      action={
        <Button icon="download" onClick={download}>
          Descargar respaldo
        </Button>
      }
    >
      <strong>Este dispositivo no está guardando tus cambios.</strong> El almacenamiento está lleno o bloqueado, así que lo que
      captures se perderá al cerrar la app. Descarga un respaldo para no perderlo.
    </Notice>
  );
}
