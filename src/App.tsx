import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MenuPage } from '@/pages/MenuPage';
import { BurgerDetailPage } from '@/pages/BurgerDetailPage';
import { KitchenPage } from '@/pages/KitchenPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/burger/:id" element={<BurgerDetailPage />} />
        <Route path="/cocina" element={<KitchenPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
