/**
 * 日本の税・社会保険の計算ロジック
 *
 * 以下の計算を行います：
 * - 所得税（源泉徴収ベース）
 * - 住民税（前年所得ベースの概算）
 * - 健康保険料（協会けんぽ 東京都 2024年度）
 * - 厚生年金保険料
 * - 雇用保険料
 * - 扶養判定（年収103万円・130万円の壁）
 */

export interface IncomeParams {
  /** 月給（基本給）円 */
  monthlyBaseSalary: number;
  /** 賞与（年2回合計）円 */
  annualBonus: number;
  /** 週あたり勤務日数 */
  workDaysPerWeek: number;
  /** 1日あたり勤務時間 */
  workHoursPerDay: number;
}

export interface DeductionResult {
  /** 健康保険料（本人負担）月額 */
  healthInsurance: number;
  /** 厚生年金保険料（本人負担）月額 */
  welfarePension: number;
  /** 雇用保険料（本人負担）月額 */
  employmentInsurance: number;
  /** 所得税（月額概算） */
  incomeTax: number;
  /** 住民税（月額概算） */
  residenceTax: number;
  /** 合計控除額（月額） */
  totalDeduction: number;
}

export interface MonthlyIncome {
  /** 月給（総支給） */
  grossMonthly: number;
  /** 手取り月収 */
  netMonthly: number;
  /** 控除内訳 */
  deductions: DeductionResult;
  /** 扶養に入っているか */
  isDependentSpouse: boolean;
}

/**
 * 週の所定労働時間を計算する
 * フルタイム：月〜金 8時間/日 = 40時間/週
 */
export function weeklyWorkHours(daysPerWeek: number, hoursPerDay: number): number {
  return daysPerWeek * hoursPerDay;
}

/**
 * 年収を計算する（月給×12 + 賞与）
 */
export function calcAnnualIncome(monthlyBase: number, annualBonus: number): number {
  return monthlyBase * 12 + annualBonus;
}

/**
 * 健康保険料（協会けんぽ 東京都 2024年度）
 * 標準報酬月額×9.98%（労使折半 = 4.99%）
 * https://www.kyoukaikenpo.or.jp/
 */
export function calcHealthInsurance(monthlyBase: number): number {
  const rate = 0.0499; // 本人負担分
  // 標準報酬月額の決定（簡略化：月給をそのまま使用）
  return Math.floor(monthlyBase * rate);
}

/**
 * 厚生年金保険料
 * 標準報酬月額×18.3%（労使折半 = 9.15%）
 * 上限：650,000円（標準報酬月額）
 */
export function calcWelfarePension(monthlyBase: number): number {
  const rate = 0.0915;
  const cappedSalary = Math.min(monthlyBase, 650000);
  return Math.floor(cappedSalary * rate);
}

/**
 * 雇用保険料（一般の事業）
 * 月給×0.6%（労働者負担分）
 */
export function calcEmploymentInsurance(monthlyBase: number): number {
  const rate = 0.006;
  return Math.floor(monthlyBase * rate);
}

/** 配偶者控除額（所得税、38万円） */
export const SPOUSE_DEDUCTION_INCOME_TAX = 380000;
/** 配偶者控除額（住民税、33万円） */
export const SPOUSE_DEDUCTION_RESIDENCE_TAX = 330000;
/**
 * 扶養控除額（一般の控除対象扶養親族、所得税、38万円）
 *
 * 概算のため、特定扶養親族（19〜22歳、63万円）・老人扶養親族（70歳以上、48万円/58万円）・
 * 16歳未満（控除対象外）といった年齢区分は考慮せず、一律この金額を扶養親族の人数分適用する。
 */
export const DEPENDENT_DEDUCTION_INCOME_TAX = 380000;
/** 扶養控除額（一般の控除対象扶養親族、住民税、33万円） */
export const DEPENDENT_DEDUCTION_RESIDENCE_TAX = 330000;

/**
 * 所得税の月額概算
 * 給与所得控除・基礎控除を考慮した簡易計算
 *
 * @param additionalDeduction 配偶者控除・扶養控除など、社会保険料控除・基礎控除以外の追加控除額（年額）
 */
export function calcMonthlyIncomeTax(
  monthlyBase: number,
  healthInsurance: number,
  welfarePension: number,
  employmentInsurance: number,
  additionalDeduction: number,
): number {
  const annualBase = monthlyBase * 12;
  // 給与所得控除（2024年）
  const salaryDeduction = calcSalaryDeduction(annualBase);
  // 社会保険料控除（年額）
  const socialInsuranceDeduction = (healthInsurance + welfarePension + employmentInsurance) * 12;
  // 基礎控除
  const basicDeduction = 480000;

  const taxableIncome = Math.max(
    0,
    annualBase - salaryDeduction - socialInsuranceDeduction - basicDeduction - additionalDeduction,
  );

  const annualTax = calcIncomeTaxFromTaxable(taxableIncome);
  // 復興特別所得税 2.1%
  const annualTaxWithSurtax = Math.floor(annualTax * 1.021);
  return Math.floor(annualTaxWithSurtax / 12);
}

/**
 * 給与所得控除（2024年）
 */
export function calcSalaryDeduction(annualSalary: number): number {
  if (annualSalary <= 1625000) return 550000;
  if (annualSalary <= 1800000) return Math.floor(annualSalary * 0.4) - 100000;
  if (annualSalary <= 3600000) return Math.floor(annualSalary * 0.3) + 80000;
  if (annualSalary <= 6600000) return Math.floor(annualSalary * 0.2) + 440000;
  if (annualSalary <= 8500000) return Math.floor(annualSalary * 0.1) + 1100000;
  return 1950000;
}

/**
 * 課税所得から所得税を計算（累進課税）
 */
export function calcIncomeTaxFromTaxable(taxableIncome: number): number {
  if (taxableIncome <= 1950000) return Math.floor(taxableIncome * 0.05);
  if (taxableIncome <= 3300000) return Math.floor(taxableIncome * 0.1) - 97500;
  if (taxableIncome <= 6950000) return Math.floor(taxableIncome * 0.2) - 427500;
  if (taxableIncome <= 9000000) return Math.floor(taxableIncome * 0.23) - 636000;
  if (taxableIncome <= 18000000) return Math.floor(taxableIncome * 0.33) - 1536000;
  if (taxableIncome <= 40000000) return Math.floor(taxableIncome * 0.4) - 2796000;
  return Math.floor(taxableIncome * 0.45) - 4796000;
}

/**
 * 住民税の月額概算
 * 前年所得に課税（概算：翌年6月〜）
 * 所得割10%＋均等割5000円/年
 *
 * @param additionalDeduction 配偶者控除・扶養控除など、社会保険料控除・基礎控除以外の追加控除額（年額）
 */
export function calcMonthlyResidenceTax(
  monthlyBase: number,
  healthInsurance: number,
  welfarePension: number,
  employmentInsurance: number,
  additionalDeduction: number,
): number {
  const annualBase = monthlyBase * 12;
  const salaryDeduction = calcSalaryDeduction(annualBase);
  const socialInsuranceDeduction = (healthInsurance + welfarePension + employmentInsurance) * 12;
  // 住民税の基礎控除は43万円
  const basicDeduction = 430000;

  const taxableIncome = Math.max(
    0,
    annualBase - salaryDeduction - socialInsuranceDeduction - basicDeduction - additionalDeduction,
  );

  const annualResidenceTax = Math.floor(taxableIncome * 0.1) + 5000;
  return Math.floor(annualResidenceTax / 12);
}

/**
 * 扶養に入るかどうかの判定
 *
 * 妻の年収が130万円未満、かつ週の所定労働時間が20時間未満の場合に
 * 社会保険の扶養（第3号被保険者）に入れる。
 *
 * 注：2022年10月から従業員101人以上の企業では週20時間以上・月給8.8万円以上で
 * 社会保険加入義務があるが、本シミュレーターでは基本の130万円・20時間ルールを使用。
 *
 * 所得税・住民税の扶養（配偶者控除）は年収103万円以下が基準。
 * ただし配偶者特別控除は150万円まで段階的に適用。
 */
export function isDependentSpouse(
  wifeAnnualIncome: number,
  wifeWeeklyHours: number,
): {
  socialInsuranceDependent: boolean; // 社会保険の被扶養者（130万円の壁）
  taxDependent: boolean; // 配偶者控除の対象（103万円の壁）
  spouseSpecialDeductionApplicable: boolean; // 配偶者特別控除（〜150万円）
} {
  const socialInsuranceDependent = wifeAnnualIncome < 1300000 && wifeWeeklyHours < 20;
  const taxDependent = wifeAnnualIncome <= 1030000;
  const spouseSpecialDeductionApplicable = !taxDependent && wifeAnnualIncome <= 2015999;

  return { socialInsuranceDependent, taxDependent, spouseSpecialDeductionApplicable };
}

/**
 * 配偶者特別控除額の計算（夫側）
 * 妻の合計所得48万円超133万円以下の場合（年収150万円超2015999円以下）
 */
export function calcSpouseSpecialDeduction(wifeAnnualIncome: number, husbandAnnualIncome: number): number {
  const wifeIncome = Math.max(0, wifeAnnualIncome - calcSalaryDeduction(wifeAnnualIncome));

  // 夫の合計所得が1000万円超の場合は適用なし
  const husbandIncome = Math.max(0, husbandAnnualIncome - calcSalaryDeduction(husbandAnnualIncome));
  if (husbandIncome > 10000000) return 0;

  // 妻の合計所得に応じた控除額（夫の合計所得が900万円以下の場合）
  const husbandDeductionFactor = husbandIncome <= 9000000 ? 1.0 : husbandIncome <= 9500000 ? 2 / 3 : 1 / 3;

  let baseDeduction = 0;
  if (wifeIncome <= 480000) return 380000 * husbandDeductionFactor; // 配偶者控除
  if (wifeIncome <= 1050000) baseDeduction = 380000;
  else if (wifeIncome <= 1150000) baseDeduction = 360000;
  else if (wifeIncome <= 1250000) baseDeduction = 310000;
  else if (wifeIncome <= 1350000) baseDeduction = 260000;
  else if (wifeIncome <= 1450000) baseDeduction = 210000;
  else if (wifeIncome <= 1550000) baseDeduction = 160000;
  else if (wifeIncome <= 1650000) baseDeduction = 110000;
  else if (wifeIncome <= 1750000) baseDeduction = 60000;
  else if (wifeIncome <= 1850000) baseDeduction = 30000;
  else if (wifeIncome <= 1950000) baseDeduction = 30000;
  else if (wifeIncome <= 2000000) baseDeduction = 30000;
  else return 0;

  return Math.floor(baseDeduction * husbandDeductionFactor);
}

/**
 * 国民健康保険料（扶養から外れた場合の妻の自己負担）
 * 東京都23区内の概算（所得割＋均等割）
 */
export function calcNationalHealthInsurance(annualIncome: number): number {
  const salaryDeduction = calcSalaryDeduction(annualIncome);
  const income = Math.max(0, annualIncome - salaryDeduction - 430000); // 基礎控除43万円

  // 医療分
  const medicalIncome = income * 0.0752;
  const medicalFlat = 47100;
  // 支援分
  const supportIncome = income * 0.0234;
  const supportFlat = 14700;
  // 介護分（40歳未満は不要）
  const annualTotal = medicalIncome + medicalFlat + supportIncome + supportFlat;
  return Math.floor(annualTotal / 12);
}

/**
 * 国民年金保険料（月額固定 2024年度）
 * 第1号被保険者の場合
 */
export const NATIONAL_PENSION_MONTHLY = 16980;

/**
 * 社会保険の扶養（第3号被保険者）の場合は
 * 国民年金保険料不要（夫の厚生年金から拠出）
 */
export function calcWifePension(isDependentSocialInsurance: boolean): number {
  return isDependentSocialInsurance ? 0 : NATIONAL_PENSION_MONTHLY;
}

/**
 * 一人分の月間収入計算（社会保険・税金込み）
 *
 * 夫・妻のどちらであっても同じ計算式を通す。以前は「妻側は扶養になり得る」
 * 「夫側は常にフルタイム加入」という非対称な2関数に分かれていたが、
 * どちらが扶養に入るかは家庭ごとに任意なので、扶養判定の結果を
 * 呼び出し側から明示的に渡す形に統一した。
 *
 * @param isSocialInsuranceDependent この人が社会保険の扶養（第3号被保険者）に入っているか
 * @param incomeTaxDeduction 配偶者控除・扶養控除など、この人が受ける追加の所得税控除額（年額）
 * @param residenceTaxDeduction 配偶者控除・扶養控除など、この人が受ける追加の住民税控除額（年額）
 */
export function calcPersonMonthlyIncome(
  params: IncomeParams,
  isSocialInsuranceDependent: boolean,
  incomeTaxDeduction: number,
  residenceTaxDeduction: number,
): MonthlyIncome {
  const { monthlyBaseSalary, annualBonus, workDaysPerWeek, workHoursPerDay } = params;
  const weeklyHours = weeklyWorkHours(workDaysPerWeek, workHoursPerDay);

  let healthInsurance: number;
  let welfarePension: number;
  let employmentInsurance: number;

  if (isSocialInsuranceDependent) {
    // 社会保険の扶養に入っている場合：健康保険・年金は負担なし
    healthInsurance = 0;
    welfarePension = 0;
    employmentInsurance = 0;
  } else if (weeklyHours >= 20) {
    // 週20時間以上：雇用先の社会保険に加入（協会けんぽ）
    healthInsurance = calcHealthInsurance(monthlyBaseSalary);
    welfarePension = calcWelfarePension(monthlyBaseSalary);
    employmentInsurance = calcEmploymentInsurance(monthlyBaseSalary);
  } else {
    // 週20時間未満だが年収130万円以上 → 国民健康保険・国民年金
    const annualIncome = calcAnnualIncome(monthlyBaseSalary, annualBonus);
    healthInsurance = calcNationalHealthInsurance(annualIncome);
    welfarePension = calcWifePension(false);
    employmentInsurance = 0;
  }

  const incomeTax = calcMonthlyIncomeTax(
    monthlyBaseSalary,
    healthInsurance,
    welfarePension,
    employmentInsurance,
    incomeTaxDeduction,
  );

  const residenceTax = calcMonthlyResidenceTax(
    monthlyBaseSalary,
    healthInsurance,
    welfarePension,
    employmentInsurance,
    residenceTaxDeduction,
  );

  const totalDeduction = healthInsurance + welfarePension + employmentInsurance + incomeTax + residenceTax;
  const monthlyBonusNet = calcMonthlyBonusNet(annualBonus);
  const netMonthly = monthlyBaseSalary - totalDeduction + monthlyBonusNet;

  return {
    grossMonthly: monthlyBaseSalary + monthlyBonusNet,
    netMonthly,
    deductions: {
      healthInsurance,
      welfarePension,
      employmentInsurance,
      incomeTax,
      residenceTax,
      totalDeduction,
    },
    isDependentSpouse: isSocialInsuranceDependent,
  };
}

/**
 * 賞与の手取り月換算（年2回を12で割る）
 * 賞与の社会保険料・源泉所得税を簡易計算
 */
export function calcMonthlyBonusNet(annualBonus: number): number {
  if (annualBonus <= 0) return 0;
  // 賞与の社会保険料率は月給と同じ（標準賞与額に対して）
  const bonusHealthIns = Math.floor(annualBonus * 0.0499);
  const bonusPension = Math.floor(Math.min(annualBonus, 1500000 * 2) * 0.0915);
  // 賞与の源泉税：前月の社会保険料控除後給与に対応する税率（簡易計算：5%〜）
  const bonusTax = Math.floor(annualBonus * 0.05);
  const netBonus = annualBonus - bonusHealthIns - bonusPension - bonusTax;
  return Math.floor(netBonus / 12);
}
