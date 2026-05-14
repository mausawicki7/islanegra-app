import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MenuPage } from '@/pages/MenuPage';
import { BurgerDetailPage } from '@/pages/BurgerDetailPage';
import { KitchenPage } from '@/pages/KitchenPage';
import { BusinessPage } from '@/pages/BusinessPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import { SalonPage } from '@/pages/SalonPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/burger/:id" element={<BurgerDetailPage />} />
        <Route path="/checkout/:orderId" element={<CheckoutPage />} />
        <Route path="/pedido/:orderId" element={<OrderTrackingPage />} />
        <Route path="/cocina" element={<KitchenPage />} />
        <Route path="/salon" element={<SalonPage />} />
        <Route path="/negocio/*" element={<BusinessPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
