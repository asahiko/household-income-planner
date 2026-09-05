/**
 * シミュレーション計算メイン
 */
import {
  BASIC_DEDUCTION_INCOME_TAX,
  BASIC_DEDUCTION_RESIDENCE_TAX,
  calcAnnualIncome,
  calcIncomeTaxFromTaxable,
  calcPersonMonthlyIncome,
  calcSalaryDeduction,
  DEPENDENT_DEDUCTION_INCOME_TAX,
  DEPENDENT_DEDUCTION_RESIDENCE_TAX,
  isDependentSpouse,
  RECONSTRUCTION_SURTAX_RATE,
  RESIDENCE_TAX_INCOME_RATE,
  RESIDENCE_TAX_PER_CAPITA,
  SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD,
  SPOUSE_DEDUCTION_INCOME_TAX,
  SPOUSE_DEDUCTION_RESIDENCE_TAX,
  weeklyWorkHours,
} from './calculator';
import type { MonthlyIncome } from './calculator';
import type {
  IncomeTaxBreakdown,
  InsuranceBranch,
  PersonCalculationBreakdown,
  ResidenceTaxBreakdown,
  Scenario,
  SimulationResult,
  SimulatorParams,
} from './types';

/**
 * 所得税・住民税の中間値（課税所得など）を組み立てる。
 *
 * calcMonthlyIncomeTax/calcMonthlyResidenceTax と同じ定数・同じ関数
 * （calcSalaryDeduction, calcIncomeTaxFromTaxable）を使って再計算するため、
 * 最終的な月額（income.deductions.incomeTax/residenceTax）とは常に一致する。
 * 一致することは calculator.test.ts で検証している。
 */
function buildTaxBreakdown(
  monthlyBaseSalary: number,
  income: MonthlyIncome,
  additionalDeduction: { incomeTax: number; residenceTax: number },
): { incomeTax: IncomeTaxBreakdown; residenceTax: ResidenceTaxBreakdown } {
  const annualBase = monthlyBaseSalary * 12;
  const salaryDeduction = calcSalaryDeduction(annualBase);
  const { healthInsurance, welfarePension, employmentInsurance } = income.deductions;
  const socialInsuranceDeductionAnnual = (healthInsurance + welfarePension + employmentInsurance) * 12;

  const incomeTaxTaxableIncome = Math.max(
    0,
    annualBase -
      salaryDeduction -
      socialInsuranceDeductionAnnual -
      BASIC_DEDUCTION_INCOME_TAX -
      additionalDeduction.incomeTax,
  );
  const annualTaxBeforeSurtax = calcIncomeTaxFromTaxable(incomeTaxTaxableIncome);
  const annualTaxWithSurtax = Math.floor(annualTaxBeforeSurtax * (1 + RECONSTRUCTION_SURTAX_RATE));

  const residenceTaxTaxableIncome = Math.max(
    0,
    annualBase -
      salaryDeduction -
      socialInsuranceDeductionAnnual -
      BASIC_DEDUCTION_RESIDENCE_TAX -
      additionalDeduction.residenceTax,
  );
  const annualResidenceTax = Math.floor(residenceTaxTaxableIncome * RESIDENCE_TAX_INCOME_RATE) + RESIDENCE_TAX_PER_CAPITA;

  return {
    incomeTax: {
      annualBase,
      salaryDeduction,
      socialInsuranceDeductionAnnual,
      basicDeduction: BASIC_DEDUCTION_INCOME_TAX,
      additionalDeduction: additionalDeduction.incomeTax,
      taxableIncome: incomeTaxTaxableIncome,
      annualTaxBeforeSurtax,
      annualTaxWithSurtax,
    },
    residenceTax: {
      annualBase,
      salaryDeduction,
      socialInsuranceDeductionAnnual,
      basicDeduction: BASIC_DEDUCTION_RESIDENCE_TAX,
      additionalDeduction: additionalDeduction.residenceTax,
      taxableIncome: residenceTaxTaxableIncome,
      annualResidenceTax,
    },
  };
}

function insuranceBranchOf(isSocialInsuranceDependent: boolean, weeklyHours: number): InsuranceBranch {
  if (isSocialInsuranceDependent) return 'socialInsuranceDependent';
  if (weeklyHours >= SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD) return 'employerInsurance';
  return 'nationalInsurance';
}

function buildPersonCalculation(
  monthlyBaseSalary: number,
  annualBonus: number,
  annualIncome: number,
  weeklyHours: number,
  isSocialInsuranceDependent: boolean,
  income: MonthlyIncome,
  additionalDeduction: { incomeTax: number; residenceTax: number },
): PersonCalculationBreakdown {
  const { incomeTax, residenceTax } = buildTaxBreakdown(monthlyBaseSalary, income, additionalDeduction);
  return {
    monthlyBaseSalary,
    annualBonus,
    annualIncome,
    weeklyHours,
    insuranceBranch: insuranceBranchOf(isSocialInsuranceDependent, weeklyHours),
    incomeTax,
    residenceTax,
  };
}

/**
 * 収入の入力方法（月給＋賞与／年収一括）に応じて、計算に使う
 * 「月給・賞与・年収」を解決する。
 *
 * 年収一括入力の場合、年収を12等分した額を月給として扱い（賞与なし）、
 * 扶養判定（103万円・130万円の壁）には入力された年収の値をそのまま使う。
 * 月給×12という再計算にすると端数処理で壁の境界値がずれるため、
 * 必ずユーザーが入力した年収の生値を使うこと。
 */
function resolveIncome(
  monthlySalary: number,
  annualBonus: number,
  annualIncomeInput: number,
  mode: SimulatorParams['incomeInputMode'],
): { monthlySalary: number; annualBonus: number; annualIncome: number } {
  if (mode === 'annual') {
    return {
      monthlySalary: Math.floor(annualIncomeInput / 12),
      annualBonus: 0,
      annualIncome: annualIncomeInput,
    };
  }
  return {
    monthlySalary,
    annualBonus,
    annualIncome: calcAnnualIncome(monthlySalary, annualBonus),
  };
}

export function simulate(params: SimulatorParams, scenario: Scenario): SimulationResult {
  const primaryDays = scenario === 'before' ? params.primaryWorkDaysBefore : params.primaryWorkDaysAfter;

  const primary = resolveIncome(
    scenario === 'before' ? params.primaryMonthlySalaryBefore : params.primaryMonthlySalaryAfter,
    scenario === 'before' ? params.primaryAnnualBonusBefore : params.primaryAnnualBonusAfter,
    scenario === 'before' ? params.primaryAnnualIncomeBefore : params.primaryAnnualIncomeAfter,
    params.incomeInputMode,
  );
  const spouse = resolveIncome(
    params.spouseMonthlySalary,
    params.spouseAnnualBonus,
    params.spouseAnnualIncome,
    params.incomeInputMode,
  );

  const primaryWeeklyHours = weeklyWorkHours(primaryDays, params.primaryWorkHoursPerDay);
  const spouseWeeklyHours = weeklyWorkHours(params.spouseWorkDaysPerWeek, params.spouseWorkHoursPerDay);

  // 扶養候補（dependentCandidate）についてのみ判定する。
  // 両者を独立に判定すると、双方が低収入・低時間の場合に「互いに相手の扶養」という
  // 矛盾した結果になり得るため、判定対象を一方に固定する。
  const primaryIsCandidate = params.dependentCandidate === 'primary';
  const candidateAnnualIncome = primaryIsCandidate ? primary.annualIncome : spouse.annualIncome;
  const candidateWeeklyHours = primaryIsCandidate ? primaryWeeklyHours : spouseWeeklyHours;
  const dependentStatus = isDependentSpouse(candidateAnnualIncome, candidateWeeklyHours);

  const primarySocialInsuranceDependent = primaryIsCandidate && dependentStatus.socialInsuranceDependent;
  const spouseSocialInsuranceDependent = !primaryIsCandidate && dependentStatus.socialInsuranceDependent;
  // 配偶者控除は「扶養に入っている側」の反対側が受ける
  const primaryGetsSpouseDeduction = !primaryIsCandidate && dependentStatus.taxDependent;
  const spouseGetsSpouseDeduction = primaryIsCandidate && dependentStatus.taxDependent;

  // 扶養控除（配偶者以外、主に子）はどちらか一方のみが受ける
  const primaryGetsDependentsDeduction = params.dependentsClaimedBy === 'primary' && params.dependentsCount > 0;
  const spouseGetsDependentsDeduction = params.dependentsClaimedBy === 'spouse' && params.dependentsCount > 0;

  const primaryIncomeTaxDeduction =
    (primaryGetsSpouseDeduction ? SPOUSE_DEDUCTION_INCOME_TAX : 0) +
    (primaryGetsDependentsDeduction ? DEPENDENT_DEDUCTION_INCOME_TAX * params.dependentsCount : 0);
  const primaryResidenceTaxDeduction =
    (primaryGetsSpouseDeduction ? SPOUSE_DEDUCTION_RESIDENCE_TAX : 0) +
    (primaryGetsDependentsDeduction ? DEPENDENT_DEDUCTION_RESIDENCE_TAX * params.dependentsCount : 0);
  const spouseIncomeTaxDeduction =
    (spouseGetsSpouseDeduction ? SPOUSE_DEDUCTION_INCOME_TAX : 0) +
    (spouseGetsDependentsDeduction ? DEPENDENT_DEDUCTION_INCOME_TAX * params.dependentsCount : 0);
  const spouseResidenceTaxDeduction =
    (spouseGetsSpouseDeduction ? SPOUSE_DEDUCTION_RESIDENCE_TAX : 0) +
    (spouseGetsDependentsDeduction ? DEPENDENT_DEDUCTION_RESIDENCE_TAX * params.dependentsCount : 0);

  const primaryIncome = calcPersonMonthlyIncome(
    {
      monthlyBaseSalary: primary.monthlySalary,
      annualBonus: primary.annualBonus,
      workDaysPerWeek: primaryDays,
      workHoursPerDay: params.primaryWorkHoursPerDay,
    },
    primarySocialInsuranceDependent,
    primaryIncomeTaxDeduction,
    primaryResidenceTaxDeduction,
  );

  const spouseIncome = calcPersonMonthlyIncome(
    {
      monthlyBaseSalary: spouse.monthlySalary,
      annualBonus: spouse.annualBonus,
      workDaysPerWeek: params.spouseWorkDaysPerWeek,
      workHoursPerDay: params.spouseWorkHoursPerDay,
    },
    spouseSocialInsuranceDependent,
    spouseIncomeTaxDeduction,
    spouseResidenceTaxDeduction,
  );

  // 共通支出の計算
  const totalSharedExpenses =
    params.rent +
    params.utilities +
    params.food +
    params.childcareEducation +
    params.communication +
    params.otherFixed;

  // 支出分担
  let spouseExpenseShare: number;
  let primaryExpenseShare: number;

  if (params.sharingMethod === 'percentage') {
    spouseExpenseShare = Math.round(totalSharedExpenses * (params.spouseSharePercent / 100));
    primaryExpenseShare = totalSharedExpenses - spouseExpenseShare;
  } else if (params.fixedTransferDirection === 'primaryToSpouse') {
    // 固定送金：本人から配偶者に送金し、配偶者が全支出を払う
    primaryExpenseShare = params.fixedTransferAmount;
    spouseExpenseShare = totalSharedExpenses - params.fixedTransferAmount;
  } else {
    // 固定送金：配偶者から本人に送金し、本人が全支出を払う
    spouseExpenseShare = params.fixedTransferAmount;
    primaryExpenseShare = totalSharedExpenses - params.fixedTransferAmount;
  }

  const primaryPersonalExpenses = params.primaryPersonal;
  const spousePersonalExpenses = params.spousePersonal;

  const primaryCalculation = buildPersonCalculation(
    primary.monthlySalary,
    primary.annualBonus,
    primary.annualIncome,
    primaryWeeklyHours,
    primarySocialInsuranceDependent,
    primaryIncome,
    { incomeTax: primaryIncomeTaxDeduction, residenceTax: primaryResidenceTaxDeduction },
  );
  const spouseCalculation = buildPersonCalculation(
    spouse.monthlySalary,
    spouse.annualBonus,
    spouse.annualIncome,
    spouseWeeklyHours,
    spouseSocialInsuranceDependent,
    spouseIncome,
    { incomeTax: spouseIncomeTaxDeduction, residenceTax: spouseResidenceTaxDeduction },
  );

  const primaryMonthlyBalance = primaryIncome.netMonthly - primaryExpenseShare - primaryPersonalExpenses;
  const spouseMonthlyBalance = spouseIncome.netMonthly - spouseExpenseShare - spousePersonalExpenses;
  const householdNetMonthly = primaryIncome.netMonthly + spouseIncome.netMonthly;
  const householdMonthlyBalance =
    householdNetMonthly - totalSharedExpenses - primaryPersonalExpenses - spousePersonalExpenses;

  return {
    scenario,
    primaryNetMonthly: primaryIncome.netMonthly,
    primaryGrossMonthly: primaryIncome.grossMonthly,
    spouseNetMonthly: spouseIncome.netMonthly,
    spouseGrossMonthly: spouseIncome.grossMonthly,
    householdNetMonthly,
    primaryDeductions: {
      healthInsurance: primaryIncome.deductions.healthInsurance,
      welfarePension: primaryIncome.deductions.welfarePension,
      employmentInsurance: primaryIncome.deductions.employmentInsurance,
      incomeTax: primaryIncome.deductions.incomeTax,
      residenceTax: primaryIncome.deductions.residenceTax,
      total: primaryIncome.deductions.totalDeduction,
    },
    spouseDeductions: {
      healthInsurance: spouseIncome.deductions.healthInsurance,
      welfarePension: spouseIncome.deductions.welfarePension,
      employmentInsurance: spouseIncome.deductions.employmentInsurance,
      incomeTax: spouseIncome.deductions.incomeTax,
      residenceTax: spouseIncome.deductions.residenceTax,
      total: spouseIncome.deductions.totalDeduction,
    },
    dependentCandidate: params.dependentCandidate,
    socialInsuranceDependent: dependentStatus.socialInsuranceDependent,
    taxDependent: dependentStatus.taxDependent,
    dependentCandidateAnnualIncome: candidateAnnualIncome,
    dependentCandidateWeeklyHours: candidateWeeklyHours,
    primaryCalculation,
    spouseCalculation,
    totalSharedExpenses,
    spouseExpenseShare,
    primaryExpenseShare,
    primaryPersonalExpenses,
    spousePersonalExpenses,
    primaryMonthlyBalance,
    spouseMonthlyBalance,
    householdMonthlyBalance,
    householdAnnualBalance: householdMonthlyBalance * 12,
  };
}
