import type { SimulatorParams } from './types';

export const DEFAULT_PARAMS: SimulatorParams = {
  incomeInputMode: 'annual',

  primaryMonthlySalaryBefore: 175000,
  primaryAnnualBonusBefore: 0,
  primaryAnnualIncomeBefore: 175000 * 12,
  primaryMonthlySalaryAfter: 116000,
  primaryAnnualBonusAfter: 0,
  primaryAnnualIncomeAfter: 116000 * 12,

  primaryWorkDaysBefore: 3,
  primaryWorkDaysAfter: 2,
  primaryWorkHoursPerDay: 8,

  spouseMonthlySalary: 350000,
  spouseAnnualBonus: 700000,
  spouseAnnualIncome: 350000 * 12 + 700000,

  spouseWorkDaysPerWeek: 5,
  spouseWorkHoursPerDay: 8,

  dependentCandidate: 'primary',

  dependentsCount: 1,
  dependentsClaimedBy: 'spouse',

  rent: 120000,
  utilities: 20000,
  food: 60000,
  education: 30000,
  childcareFeeMode: 'fixed',
  childcareFeeFixed: 20000,
  childcareFeeBrackets: [
    { incomeLevyFrom: 0, fee: 30000 },
    { incomeLevyFrom: 97000, fee: 40000 },
    { incomeLevyFrom: 169000, fee: 50000 },
    { incomeLevyFrom: 301000, fee: 60000 },
  ],
  communication: 15000,
  otherFixed: 30000,
  primaryPersonal: 20000,
  spousePersonal: 30000,

  sharingMethod: 'percentage',
  spouseSharePercent: 60,
  fixedTransferAmount: 100000,
  fixedTransferDirection: 'spouseToPrimary',
};
