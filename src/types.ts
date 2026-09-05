/**
 * アプリケーション全体で使用する型定義
 *
 * 「本人」＝働き方（勤務日数・収入）を変える人、「配偶者」＝勤務形態が変わらない人。
 * どちらが扶養に入る可能性があるかは家庭ごとに任意なので、性別や役割を
 * 夫・妻に固定せず、before/after の2シナリオ比較として一般化している。
 */

/** 支出分担方法 */
export type SharingMethod = 'percentage' | 'fixedTransfer';

/** 固定送金の方向 */
export type FixedTransferDirection = 'spouseToPrimary' | 'primaryToSpouse';

/** 収入の入力方法：月給＋賞与で入力するか、年収を一括で入力するか */
export type IncomeInputMode = 'monthlyPlusBonus' | 'annual';

/** 本人・配偶者のどちらを指すか（扶養候補や扶養控除の受け手の指定に使う） */
export type HouseholdMember = 'primary' | 'spouse';

/** 比較する2つのシナリオ */
export type Scenario = 'before' | 'after';

/** 社会保険の加入区分（説明パネルで、どのルールが適用されたかを判別するために使う） */
export type InsuranceBranch = 'socialInsuranceDependent' | 'employerInsurance' | 'nationalInsurance';

/** 所得税・住民税の計算過程の中間値（説明パネルで数式に実数を当てはめて表示するために使う） */
export interface TaxBreakdown {
  /** 年収（月給×12＋賞与） */
  annualBase: number;
  /** 給与所得控除（年額） */
  salaryDeduction: number;
  /** 社会保険料控除（年額、健康保険＋厚生年金＋雇用保険の月額×12） */
  socialInsuranceDeductionAnnual: number;
  /** 基礎控除（年額） */
  basicDeduction: number;
  /** 配偶者控除・扶養控除の合計（年額） */
  additionalDeduction: number;
  /** 課税所得（年額） */
  taxableIncome: number;
}

/** 所得税の計算過程（住民税と異なり復興特別所得税の上乗せがある） */
export interface IncomeTaxBreakdown extends TaxBreakdown {
  /** 課税所得に累進税率を適用した年税額（復興特別所得税を上乗せする前） */
  annualTaxBeforeSurtax: number;
  /** 復興特別所得税（2.1%）を上乗せした年税額 */
  annualTaxWithSurtax: number;
}

/** 住民税の計算過程（所得割＋均等割） */
export interface ResidenceTaxBreakdown extends TaxBreakdown {
  /** 所得割＋均等割の年税額 */
  annualResidenceTax: number;
}

/** 1人分の計算過程（説明パネル用） */
export interface PersonCalculationBreakdown {
  /** 月給（基本給） */
  monthlyBaseSalary: number;
  /** 年間賞与合計 */
  annualBonus: number;
  /** 年収（月給×12＋賞与、または年収一括入力の生値） */
  annualIncome: number;
  /** 週あたり所定労働時間 */
  weeklyHours: number;
  /** 社会保険（健康保険・厚生年金）の加入区分 */
  insuranceBranch: InsuranceBranch;
  incomeTax: IncomeTaxBreakdown;
  residenceTax: ResidenceTaxBreakdown;
}

/** アプリケーションの入力パラメーター */
export interface SimulatorParams {
  // ===== 収入の入力方法 =====
  /** 収入の入力方法（全員共通） */
  incomeInputMode: IncomeInputMode;

  // ===== 本人（働き方を変える人）の収入 =====
  /** 本人の月給（変更前）円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  primaryMonthlySalaryBefore: number;
  /** 本人の年間賞与合計（変更前）円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  primaryAnnualBonusBefore: number;
  /** 本人の年収（変更前、総額）円（incomeInputMode = 'annual' のとき使用） */
  primaryAnnualIncomeBefore: number;
  /** 本人の月給（変更後）円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  primaryMonthlySalaryAfter: number;
  /** 本人の年間賞与合計（変更後）円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  primaryAnnualBonusAfter: number;
  /** 本人の年収（変更後、総額）円（incomeInputMode = 'annual' のとき使用） */
  primaryAnnualIncomeAfter: number;

  // ===== 本人の勤務条件 =====
  /** 本人の週あたり勤務日数（変更前） */
  primaryWorkDaysBefore: number;
  /** 本人の週あたり勤務日数（変更後） */
  primaryWorkDaysAfter: number;
  /** 本人の1日あたり勤務時間 */
  primaryWorkHoursPerDay: number;

  // ===== 配偶者（勤務形態が変わらない人）の収入 =====
  /** 配偶者の月給（総支給）円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  spouseMonthlySalary: number;
  /** 配偶者の年間賞与合計円（incomeInputMode = 'monthlyPlusBonus' のとき使用） */
  spouseAnnualBonus: number;
  /** 配偶者の年収（総額）円（incomeInputMode = 'annual' のとき使用） */
  spouseAnnualIncome: number;

  // ===== 配偶者の勤務条件（before/afterで変化しない） =====
  /** 配偶者の週あたり勤務日数 */
  spouseWorkDaysPerWeek: number;
  /** 配偶者の1日あたり勤務時間 */
  spouseWorkHoursPerDay: number;

  // ===== 扶養の方向 =====
  /** どちらが扶養に入る可能性がある側か */
  dependentCandidate: HouseholdMember;

  // ===== 配偶者以外の扶養家族（主に子） =====
  /** 配偶者以外の扶養親族（主に子）の人数 */
  dependentsCount: number;
  /** 扶養親族（配偶者以外）の扶養控除をどちらが受けるか */
  dependentsClaimedBy: HouseholdMember;

  // ===== 支出 =====
  /** 家賃（月額）円 */
  rent: number;
  /** 光熱費（月額）円 */
  utilities: number;
  /** 食費（月額）円 */
  food: number;
  /** 学費・保育料（月額）円 */
  childcareEducation: number;
  /** 通信費（月額）円 */
  communication: number;
  /** その他の固定費（月額）円 */
  otherFixed: number;
  /** 本人の小遣い・個人支出（月額）円 */
  primaryPersonal: number;
  /** 配偶者の小遣い・個人支出（月額）円 */
  spousePersonal: number;

  // ===== 支出分担方法 =====
  /** 分担方法 */
  sharingMethod: SharingMethod;
  /** パーセンテージ分担：配偶者の負担割合（0〜100） */
  spouseSharePercent: number;
  /** 固定送金：送金額（月額）円 */
  fixedTransferAmount: number;
  /** 固定送金：送金の方向 */
  fixedTransferDirection: FixedTransferDirection;
}

/** シミュレーション結果（月額） */
export interface SimulationResult {
  /** 対象シナリオ */
  scenario: Scenario;

  // ===== 収入 =====
  /** 本人の月収（手取り） */
  primaryNetMonthly: number;
  /** 本人の月収（総支給、賞与月換算込み） */
  primaryGrossMonthly: number;
  /** 配偶者の月収（手取り） */
  spouseNetMonthly: number;
  /** 配偶者の月収（総支給） */
  spouseGrossMonthly: number;
  /** 世帯手取り月収 */
  householdNetMonthly: number;

  // ===== 控除内訳（本人） =====
  primaryDeductions: {
    healthInsurance: number;
    welfarePension: number;
    employmentInsurance: number;
    incomeTax: number;
    residenceTax: number;
    total: number;
  };

  // ===== 控除内訳（配偶者） =====
  spouseDeductions: {
    healthInsurance: number;
    welfarePension: number;
    employmentInsurance: number;
    incomeTax: number;
    residenceTax: number;
    total: number;
  };

  // ===== 扶養状態 =====
  /** どちらが扶養候補として判定されたか */
  dependentCandidate: HouseholdMember;
  /** 扶養候補者が社会保険の扶養（第3号）に入っているか */
  socialInsuranceDependent: boolean;
  /** 扶養候補者が税の扶養（配偶者控除）対象か */
  taxDependent: boolean;
  /** 扶養候補者の年収（扶養判定に使われた値） */
  dependentCandidateAnnualIncome: number;
  /** 扶養候補者の週あたり所定労働時間（扶養判定に使われた値） */
  dependentCandidateWeeklyHours: number;

  // ===== 計算過程（説明パネル用） =====
  primaryCalculation: PersonCalculationBreakdown;
  spouseCalculation: PersonCalculationBreakdown;

  // ===== 支出 =====
  /** 共通支出合計（月額） */
  totalSharedExpenses: number;
  /** 配偶者の負担額（共通支出） */
  spouseExpenseShare: number;
  /** 本人の負担額（共通支出） */
  primaryExpenseShare: number;
  /** 本人の個人支出 */
  primaryPersonalExpenses: number;
  /** 配偶者の個人支出 */
  spousePersonalExpenses: number;

  // ===== 収支 =====
  /** 本人の月間収支（手取り - 本人負担支出） */
  primaryMonthlyBalance: number;
  /** 配偶者の月間収支（手取り - 配偶者負担支出） */
  spouseMonthlyBalance: number;
  /** 世帯月間収支 */
  householdMonthlyBalance: number;
  /** 世帯年間収支 */
  householdAnnualBalance: number;
}
