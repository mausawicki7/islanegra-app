import type { MonthlySettlement, PartnerPayout } from '@/types/settlement';
import { formatMonthLabel } from '@/utils/monthHelpers';
import { formatPrice } from '@/utils/formatPrice';

interface PrintableSettlementProps {
  settlement: MonthlySettlement;
  /** Optional: print a partner-specific recibo. */
  payout?: PartnerPayout;
}

/**
 * Hidden by default; only rendered when @media print kicks in (see CSS class
 * `printable-only`). Triggered via window.print() from ExportPDF button.
 */
export function PrintableSettlement({ settlement, payout }: PrintableSettlementProps) {
  const total =
    payout?.amount ??
    settlement.payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <section className="printable">
      <div className="printable-doc">
        <header>
          <p className="kicker">Islanegra</p>
          <h1>Liquidación · {formatMonthLabel(settlement.month)}</h1>
          {settlement.confirmedAt && (
            <p className="confirmed">
              Confirmada {new Date(settlement.confirmedAt).toLocaleDateString('es-AR')}
            </p>
          )}
        </header>

        <dl>
          <div>
            <dt>Ingresos cobrados</dt>
            <dd>{formatPrice(settlement.grossRevenue)}</dd>
          </div>
        </dl>

        <h2>{payout ? 'Comprobante de pago' : 'Liquidación por socio'}</h2>
        <table>
          <thead>
            <tr>
              <th>Socio</th>
              <th>%</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {(payout ? [payout] : settlement.payouts).map((p) => (
              <tr key={p.id}>
                <td>{p.partnerName}</td>
                <td>{p.percentage}%</td>
                <td>{formatPrice(p.amount)}</td>
                <td>{p.paid ? `Pagado ${p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-AR') : ''}` : 'Pendiente'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td colSpan={2}>{formatPrice(total)}</td>
            </tr>
          </tfoot>
        </table>

        {settlement.notes && (
          <section className="notes">
            <h3>Notas</h3>
            <p>{settlement.notes}</p>
          </section>
        )}

        <footer>
          <p>
            Calculado sobre pedidos en estado <strong>delivered</strong>. Costos del local absorbidos por Juan Manzur (90%). Mauricio Sawicki y Sebastián Gutierrez perciben los porcentajes detallados sobre ingresos cobrados.
          </p>
          <p className="generated">
            Documento generado el {new Date().toLocaleDateString('es-AR')} desde islanegra.com.ar
          </p>
        </footer>
      </div>
    </section>
  );
}
