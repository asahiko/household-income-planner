/**
 * SimulatorParams の永続化（localStorage / JSON エクスポート・インポート）
 */
import type {
  FixedTransferDirection,
  HouseholdMember,
  IncomeInputMode,
  SharingMethod,
  SimulatorParams,
} from './types';
import { DEFAULT_PARAMS } from './defaultParams';

const STORAGE_KEY = 'family-finance-simulator:params';

const SHARING_METHODS: SharingMethod[] = ['percentage', 'fixedTransfer'];
const FIXED_TRANSFER_DIRECTIONS: FixedTransferDirection[] = ['spouseToPrimary', 'primaryToSpouse'];
const INCOME_INPUT_MODES: IncomeInputMode[] = ['monthlyPlusBonus', 'annual'];
const HOUSEHOLD_MEMBERS: HouseholdMember[] = ['primary', 'spouse'];

type NumericKey = Exclude<
  keyof SimulatorParams,
  'sharingMethod' | 'fixedTransferDirection' | 'incomeInputMode' | 'dependentCandidate' | 'dependentsClaimedBy'
>;

const NUMERIC_KEYS: NumericKey[] = [
  'primaryMonthlySalaryBefore',
  'primaryAnnualBonusBefore',
  'primaryAnnualIncomeBefore',
  'primaryMonthlySalaryAfter',
  'primaryAnnualBonusAfter',
  'primaryAnnualIncomeAfter',
  'primaryWorkDaysBefore',
  'primaryWorkDaysAfter',
  'primaryWorkHoursPerDay',
  'spouseMonthlySalary',
  'spouseAnnualBonus',
  'spouseAnnualIncome',
  'spouseWorkDaysPerWeek',
  'spouseWorkHoursPerDay',
  'dependentsCount',
  'rent',
  'utilities',
  'food',
  'childcareEducation',
  'communication',
  'otherFixed',
  'primaryPersonal',
  'spousePersonal',
  'spouseSharePercent',
  'fixedTransferAmount',
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 任意の値を安全に SimulatorParams へ変換する。
 *
 * 型が古い（フィールド追加・改名前に保存された）、壊れている、あるいは
 * 手で編集されたJSONであっても、フィールドごとに型を検証し、
 * 不正な値はデフォルト値にフォールバックする。
 * これにより NaN が計算結果に混入することを防ぐ。
 *
 * 注：フィールド名を変更・追加した場合は NUMERIC_KEYS 等もあわせて更新すること。
 * 更新を忘れると、古い保存データからは新フィールドがすべてデフォルト値に
 * フォールバックするだけで気づきにくい。
 */
export function sanitizeParams(input: unknown): SimulatorParams {
  const raw: Record<string, unknown> =
    input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const result: SimulatorParams = { ...DEFAULT_PARAMS };

  for (const key of NUMERIC_KEYS) {
    const value = raw[key];
    if (isFiniteNumber(value)) {
      result[key] = value;
    }
  }

  if (SHARING_METHODS.includes(raw.sharingMethod as SharingMethod)) {
    result.sharingMethod = raw.sharingMethod as SharingMethod;
  }
  if (FIXED_TRANSFER_DIRECTIONS.includes(raw.fixedTransferDirection as FixedTransferDirection)) {
    result.fixedTransferDirection = raw.fixedTransferDirection as FixedTransferDirection;
  }
  if (INCOME_INPUT_MODES.includes(raw.incomeInputMode as IncomeInputMode)) {
    result.incomeInputMode = raw.incomeInputMode as IncomeInputMode;
  }
  if (HOUSEHOLD_MEMBERS.includes(raw.dependentCandidate as HouseholdMember)) {
    result.dependentCandidate = raw.dependentCandidate as HouseholdMember;
  }
  if (HOUSEHOLD_MEMBERS.includes(raw.dependentsClaimedBy as HouseholdMember)) {
    result.dependentsClaimedBy = raw.dependentsClaimedBy as HouseholdMember;
  }

  return result;
}

export function loadParams(): SimulatorParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PARAMS;
    return sanitizeParams(JSON.parse(raw));
  } catch {
    return DEFAULT_PARAMS;
  }
}

export function saveParams(params: SimulatorParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // localStorageが使えない環境（Safariプライベートモード等）では無視する
  }
}
