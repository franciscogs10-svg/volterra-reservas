import { formatMoney } from './logic';
import type { AreaCode } from './types';

const AREA_LABEL: Record<AreaCode, string> = { PB: 'Planta baja', VIP: 'Planta alta VIP' };

export function groupByArea<T extends { area: AreaCode }>(rows: T[]) {
  return (['PB', 'VIP'] as AreaCode[])
    .map((area) => ({ area, label: AREA_LABEL[area], rows: rows.filter((row) => row.area === area) }))
    .filter((group) => group.rows.length > 0);
}

export function saldoText(balance: number | null): string {
  if (balance === null) return '—';
  return balance > 0 ? formatMoney(balance) : 'Pagado';
}
