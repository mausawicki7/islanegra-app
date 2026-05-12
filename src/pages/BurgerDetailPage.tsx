import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TablePrompt } from '@/components/layout/TablePrompt';
import { BurgerDetail } from '@/components/menu/BurgerDetail';
import { OrderSheet } from '@/components/order/OrderSheet';
import { getBurgerById } from '@/data/burgers';
import { useTable } from '@/hooks/useTable';
import type { Burger } from '@/types/burger';

export function BurgerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const burger = id ? getBurgerById(id) : undefined;
  const { table, setTable } = useTable();
  const [orderTarget, setOrderTarget] = useState<Burger | null>(null);
  const [tablePromptOpen, setTablePromptOpen] = useState(false);

  if (!burger) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <>
      <AppShell
        table={table}
        onChangeTable={() => setTablePromptOpen(true)}
      >
        <BurgerDetail burger={burger} onOrder={setOrderTarget} />
      </AppShell>

      <OrderSheet
        open={!!orderTarget}
        burger={orderTarget}
        tableNumber={table}
        onClose={() => setOrderTarget(null)}
        onRequestTable={() => setTablePromptOpen(true)}
      />

      <TablePrompt
        open={tablePromptOpen}
        initial={table ?? ''}
        onConfirm={(t) => {
          setTable(t);
          setTablePromptOpen(false);
        }}
        onClose={() => setTablePromptOpen(false)}
      />
    </>
  );
}
