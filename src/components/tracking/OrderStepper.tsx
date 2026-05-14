import { TRACKING_STEPS } from '@/data/copy';
import type { OrderStatus } from '@/types/order';

const STEP_INDEX: Record<OrderStatus, number> = {
  new: 0,
  preparing: 1,
  ready: 2,
  delivered: 3,
  cancelled: 0,
};

interface OrderStepperProps {
  status: OrderStatus;
}

export function OrderStepper({ status }: OrderStepperProps) {
  const activeIndex = STEP_INDEX[status];
  const isCancelled = status === 'cancelled';

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111111] p-4">
      <div className="relative grid grid-cols-4 gap-2">
        <div className="absolute left-[12.5%] right-[12.5%] top-3 h-px bg-white/10" />
        <div
          className="absolute left-[12.5%] top-3 h-px bg-white transition-all duration-700"
          style={{
            width: `${isCancelled ? 0 : (activeIndex / (TRACKING_STEPS.length - 1)) * 75}%`,
          }}
        />
        {TRACKING_STEPS.map((step, index) => {
          const done = !isCancelled && index <= activeIndex;
          const active = !isCancelled && index === activeIndex;
          return (
            <div key={step.status} className="relative flex flex-col items-center gap-2">
              <span
                className={[
                  'h-6 w-6 rounded-full border transition',
                  done ? 'border-white bg-white' : 'border-white/15 bg-[#111111]',
                  active ? 'animate-pulse' : '',
                ].join(' ')}
              />
              <span className="text-center text-[10px] uppercase tracking-[0.16em] text-white/55">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
