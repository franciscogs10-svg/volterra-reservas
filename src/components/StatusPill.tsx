import type { TableStatus } from '@/lib/types';
import { Icon, type IconName } from './Icon';

const ICON: Record<TableStatus, IconName> = { free: 'dot', part: 'half', held: 'clock', paid: 'check', in: 'users' };

/** Estado de mesa o reserva: borde, ícono y texto, nunca solo color. */
export function StatusPill({ status, label }: { status: TableStatus; label: string }) {
  return (
    <span className={`pill st-${status}`}>
      <Icon name={ICON[status]} />
      {label}
    </span>
  );
}
