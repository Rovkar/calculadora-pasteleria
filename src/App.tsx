import AppShell from './app/AppShell';
import useHashRoute from './app/useHashRoute';
import CalcularScreen from './screens/Calcular/CalcularScreen';
import ProductosScreen from './screens/Productos/ProductosScreen';
import InsumosScreen from './screens/Insumos/InsumosScreen';
import RapidoScreen from './screens/Rapido/RapidoScreen';
import AjustesScreen from './screens/Ajustes/AjustesScreen';
import SwNotice from './components/SwNotice';

export default function App() {
  const { route } = useHashRoute();
  return (
    <AppShell route={route}>
      {route === 'calcular' && <CalcularScreen />}
      {route === 'productos' && <ProductosScreen />}
      {route === 'insumos' && <InsumosScreen />}
      {route === 'rapido' && <RapidoScreen />}
      {route === 'ajustes' && <AjustesScreen />}
      <SwNotice />
    </AppShell>
  );
}
