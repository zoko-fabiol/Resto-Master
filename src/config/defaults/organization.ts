import { Organization } from '../../types/restaurant';

export const DEFAULT_ORGANIZATION: Organization = {
  id: '',
  name: '',
  legalName: '',
  taxId: '',
  rccm: '',
  headquartersAddress: '',
  city: '',
  phone: '',
  email: '',
  currency: 'FCFA',
  active: true,
  createdAt: new Date().toISOString(),
};
