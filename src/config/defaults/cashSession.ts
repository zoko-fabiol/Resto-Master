import { CashRegisterSession } from '../../types/restaurant';

export const DEFAULT_CASH_SESSION: CashRegisterSession = {
  id: '',
  openedAt: '',
  openedBy: '',
  initialFloat: 0,
  totalCashIn: 0,
  totalCashOut: 0,
  expectedTotal: 0,
  status: 'fermee',
  notes: '',
};
