import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MenuPage } from '@/pages/MenuPage';
import { BurgerDetailPage } from '@/pages/BurgerDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/burger/:id" element={<BurgerDetailPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
