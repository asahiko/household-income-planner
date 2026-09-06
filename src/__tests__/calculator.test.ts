import { describe, it, expect } from 'vitest';
import {
  calcSalaryDeduction,
  calcIncomeTaxFromTaxable,
  calcHealthInsurance,
  calcWelfarePension,
  calcEmploymentInsurance,
  isDependentSpouse,
  calcAnnualIncome,
  weeklyWorkHours,
} from '../calculator';
import { simulate } from '../simulate';
import { calcMunicipalIncomeLevy } from '../calculator';
import type { ChildcareFeeBracket, SimulatorParams } from '../types';

describe('給与所得控除', () => {
  it('年収162.5万円以下は55万円', () => {
    expect(calcSalaryDeduction(1000000)).toBe(550000);
    expect(calcSalaryDeduction(1625000)).toBe(550000);
  });

  it('年収360万円の場合', () => {
    // 3,600,000 * 0.3 + 80,000 = 1,160,000
    expect(calcSalaryDeduction(3600000)).toBe(1160000);
  });

  it('年収850万円超は195万円', () => {
    expect(calcSalaryDeduction(10000000)).toBe(1950000);
  });
});

describe('所得税（累進課税）', () => {
  it('課税所得0円は税額0', () => {
    expect(calcIncomeTaxFromTaxable(0)).toBe(0);
  });

  it('課税所得195万円は5%', () => {
    expect(calcIncomeTaxFromTaxable(1950000)).toBe(97500);
  });

  it('課税所得330万円は10%-97500', () => {
    expect(calcIncomeTaxFromTaxable(3300000)).toBe(232500);
  });
});

describe('社会保険料', () => {
  it('健康保険料（月30万円）', () => {
    // 300,000 * 0.0499 = 14,970
    expect(calcHealthInsurance(300000)).toBe(14970);
  });

  it('厚生年金（月30万円）', () => {
    // 300,000 * 0.0915 = 27,450
    expect(calcWelfarePension(300000)).toBe(27450);
  });

  it('厚生年金は上限65万円で計算', () => {
    // 650,000 * 0.0915 = 59,475
    expect(calcWelfarePension(1000000)).toBe(59475);
  });

  it('雇用保険（月30万円）', () => {
    // 300,000 * 0.006 = 1,800
    expect(calcEmploymentInsurance(300000)).toBe(1800);
  });
});

describe('扶養判定', () => {
  it('年収103万円以下かつ週20時間未満 → 税・社保ともに扶養', () => {
    const status = isDependentSpouse(1000000, 16); // 週2日×8h
    expect(status.taxDependent).toBe(true);
    expect(status.socialInsuranceDependent).toBe(true);
  });

  it('年収130万円未満かつ週20時間未満 → 社保扶養のみ', () => {
    const status = isDependentSpouse(1200000, 16);
    expect(status.socialInsuranceDependent).toBe(true);
    expect(status.taxDependent).toBe(false);
  });

  it('年収130万円以上 → 扶養外', () => {
    const status = isDependentSpouse(1500000, 16);
    expect(status.socialInsuranceDependent).toBe(false);
  });

  it('週20時間以上 → 社保扶養不可（年収関係なし）', () => {
    const status = isDependentSpouse(1000000, 24);
    expect(status.socialInsuranceDependent).toBe(false);
  });
});

describe('週あたり労働時間', () => {
  it('週2日×8時間 = 16時間', () => {
    expect(weeklyWorkHours(2, 8)).toBe(16);
  });

  it('週3日×8時間 = 24時間', () => {
    expect(weeklyWorkHours(3, 8)).toBe(24);
  });

  it('週5日×8時間 = 40時間', () => {
    expect(weeklyWorkHours(5, 8)).toBe(40);
  });
});

describe('年収計算', () => {
  it('月給35万×12 + 賞与70万', () => {
    expect(calcAnnualIncome(350000, 700000)).toBe(4900000);
  });
});

const BASE_PARAMS: SimulatorParams = {
  incomeInputMode: 'monthlyPlusBonus',

  primaryMonthlySalaryBefore: 175000,
  primaryAnnualBonusBefore: 0,
  primaryAnnualIncomeBefore: 2100000,
  primaryMonthlySalaryAfter: 116000,
  primaryAnnualBonusAfter: 0,
  primaryAnnualIncomeAfter: 1392000,

  primaryWorkDaysBefore: 3,
  primaryWorkDaysAfter: 2,
  primaryWorkHoursPerDay: 8,

  spouseMonthlySalary: 350000,
  spouseAnnualBonus: 700000,
  spouseAnnualIncome: 4900000,

  spouseWorkDaysPerWeek: 5,
  spouseWorkHoursPerDay: 8,

  dependentCandidate: 'primary',

  dependentsCount: 0,
  dependentsClaimedBy: 'spouse',

  rent: 120000,
  utilities: 20000,
  food: 60000,
  education: 50000,
  childcareFeeMode: 'fixed',
  childcareFeeFixed: 0,
  childcareFeeBrackets: [],
  communication: 15000,
  otherFixed: 30000,
  primaryPersonal: 20000,
  spousePersonal: 30000,

  sharingMethod: 'percentage',
  spouseSharePercent: 60,
  fixedTransferAmount: 100000,
  fixedTransferDirection: 'spouseToPrimary',
};

describe('シミュレーション', () => {
  it('変更前シナリオ：本人は社保扶養外（週24時間≥20時間）', () => {
    const result = simulate(BASE_PARAMS, 'before');
    expect(result.scenario).toBe('before');
    // 週3日×8時間=24時間 → 社保扶養外
    expect(result.socialInsuranceDependent).toBe(false);
  });

  it('変更後シナリオ：本人は社保扶養に入らない（年収139.2万 > 130万）', () => {
    const result = simulate(BASE_PARAMS, 'after');
    expect(result.scenario).toBe('after');
    // 週2日×8時間=16時間<20時間だが、月11.6万×12=139.2万 > 130万 → 扶養外
    expect(result.socialInsuranceDependent).toBe(false);
  });

  it('変更後・低年収シナリオ：本人は社保扶養に入る', () => {
    const params: SimulatorParams = {
      ...BASE_PARAMS,
      primaryMonthlySalaryAfter: 100000, // 年収120万 < 130万
    };
    const result = simulate(params, 'after');
    // 週2日×8時間=16時間<20時間 かつ 年収120万<130万 → 社保扶養
    expect(result.socialInsuranceDependent).toBe(true);
    // 社保扶養の場合、健康保険・年金は0
    expect(result.primaryDeductions.healthInsurance).toBe(0);
    expect(result.primaryDeductions.welfarePension).toBe(0);
  });

  it('変更後・超低年収シナリオ：税の扶養（配偶者控除）にも入る', () => {
    const params: SimulatorParams = {
      ...BASE_PARAMS,
      primaryMonthlySalaryAfter: 80000, // 年収96万 < 103万
    };
    const result = simulate(params, 'after');
    expect(result.taxDependent).toBe(true);
    expect(result.socialInsuranceDependent).toBe(true);
  });

  it('扶養候補を配偶者側にすると、配偶者の収入で判定される', () => {
    const params: SimulatorParams = {
      ...BASE_PARAMS,
      dependentCandidate: 'spouse',
      spouseMonthlySalary: 80000, // 年収96万 < 103万
      spouseAnnualBonus: 0,
      spouseWorkDaysPerWeek: 2,
      spouseWorkHoursPerDay: 8, // 週16時間<20時間
    };
    const result = simulate(params, 'before');
    expect(result.dependentCandidate).toBe('spouse');
    expect(result.taxDependent).toBe(true);
    expect(result.socialInsuranceDependent).toBe(true);
    // 配偶者側が扶養に入るので、配偶者の社会保険料は0
    expect(result.spouseDeductions.healthInsurance).toBe(0);
    expect(result.spouseDeductions.welfarePension).toBe(0);
    // 本人（扶養に入れる側）が配偶者控除を受ける
    expect(result.primaryDeductions.incomeTax).toBeGreaterThanOrEqual(0);
  });

  it('支出分担：パーセンテージ方式', () => {
    const result = simulate(BASE_PARAMS, 'before');
    const totalExpenses = 120000 + 20000 + 60000 + 50000 + 15000 + 30000; // 295000
    expect(result.totalSharedExpenses).toBe(totalExpenses);
    expect(result.spouseExpenseShare).toBe(Math.round(totalExpenses * 0.6));
    expect(result.primaryExpenseShare).toBe(totalExpenses - Math.round(totalExpenses * 0.6));
  });

  it('支出分担：固定送金方式（配偶者→本人）', () => {
    const params: SimulatorParams = {
      ...BASE_PARAMS,
      sharingMethod: 'fixedTransfer',
      fixedTransferAmount: 100000,
      fixedTransferDirection: 'spouseToPrimary',
    };
    const result = simulate(params, 'before');
    expect(result.spouseExpenseShare).toBe(100000);
    expect(result.primaryExpenseShare).toBe(result.totalSharedExpenses - 100000);
  });

  it('支出分担：固定送金方式（本人→配偶者）', () => {
    const params: SimulatorParams = {
      ...BASE_PARAMS,
      sharingMethod: 'fixedTransfer',
      fixedTransferAmount: 100000,
      fixedTransferDirection: 'primaryToSpouse',
    };
    const result = simulate(params, 'before');
    expect(result.primaryExpenseShare).toBe(100000);
    expect(result.spouseExpenseShare).toBe(result.totalSharedExpenses - 100000);
  });

  it('世帯手取りは本人+配偶者の手取り合計', () => {
    const result = simulate(BASE_PARAMS, 'before');
    expect(result.householdNetMonthly).toBe(result.primaryNetMonthly + result.spouseNetMonthly);
  });

  it('世帯年間収支は月間の12倍', () => {
    const result = simulate(BASE_PARAMS, 'before');
    expect(result.householdAnnualBalance).toBe(result.householdMonthlyBalance * 12);
  });
});

describe('収入の入力方法：年収一括入力', () => {
  it('年収一括入力（賞与0扱い）は、同額を月給×12・賞与0で入力した場合と一致する', () => {
    const monthlyParams: SimulatorParams = {
      ...BASE_PARAMS,
      incomeInputMode: 'monthlyPlusBonus',
      spouseMonthlySalary: Math.floor(4800000 / 12),
      spouseAnnualBonus: 0,
      primaryMonthlySalaryAfter: Math.floor(1200000 / 12),
      primaryAnnualBonusAfter: 0,
    };
    const annualParams: SimulatorParams = {
      ...BASE_PARAMS,
      incomeInputMode: 'annual',
      spouseAnnualIncome: 4800000,
      primaryAnnualIncomeAfter: 1200000,
    };

    const monthlyResult = simulate(monthlyParams, 'after');
    const annualResult = simulate(annualParams, 'after');

    expect(annualResult.householdNetMonthly).toBe(monthlyResult.householdNetMonthly);
    expect(annualResult.socialInsuranceDependent).toBe(monthlyResult.socialInsuranceDependent);
    expect(annualResult.taxDependent).toBe(monthlyResult.taxDependent);
  });

  it('130万円の壁：年収一括入力でも端数処理で境界がずれない', () => {
    const under130 = simulate(
      { ...BASE_PARAMS, incomeInputMode: 'annual', primaryAnnualIncomeAfter: 1299999 },
      'after',
    );
    const at130 = simulate(
      { ...BASE_PARAMS, incomeInputMode: 'annual', primaryAnnualIncomeAfter: 1300000 },
      'after',
    );

    // 週2日×8時間=16時間<20時間のため、年収のみが判定基準になる
    expect(under130.socialInsuranceDependent).toBe(true);
    expect(at130.socialInsuranceDependent).toBe(false);
  });

  it('103万円の壁：年収一括入力でも境界通りに配偶者控除が判定される', () => {
    const under103 = simulate(
      { ...BASE_PARAMS, incomeInputMode: 'annual', primaryAnnualIncomeAfter: 1030000 },
      'after',
    );
    const over103 = simulate(
      { ...BASE_PARAMS, incomeInputMode: 'annual', primaryAnnualIncomeAfter: 1030001 },
      'after',
    );

    expect(under103.taxDependent).toBe(true);
    expect(over103.taxDependent).toBe(false);
  });
});

describe('計算過程の内訳（説明パネル用）', () => {
  it('所得税・住民税の内訳から導かれる年税額は、実際の月額×12と整合する', () => {
    for (const scenario of ['before', 'after'] as const) {
      const result = simulate(BASE_PARAMS, scenario);
      for (const [calc, deductions] of [
        [result.primaryCalculation, result.primaryDeductions],
        [result.spouseCalculation, result.spouseDeductions],
      ] as const) {
        expect(Math.floor(calc.incomeTax.annualTaxWithSurtax / 12)).toBe(deductions.incomeTax);
        expect(Math.floor(calc.residenceTax.annualResidenceTax / 12)).toBe(deductions.residenceTax);
      }
    }
  });
});

describe('扶養控除（配偶者以外、主に子）', () => {
  it('扶養親族がいると、控除を受ける側の所得税・住民税が下がる', () => {
    const withoutDependents = simulate({ ...BASE_PARAMS, dependentsCount: 0 }, 'before');
    const withDependents = simulate(
      { ...BASE_PARAMS, dependentsCount: 2, dependentsClaimedBy: 'spouse' },
      'before',
    );

    // 扶養控除は配偶者側が受けるので、配偶者の税負担のみ下がる
    expect(withDependents.spouseDeductions.incomeTax).toBeLessThan(withoutDependents.spouseDeductions.incomeTax);
    expect(withDependents.spouseDeductions.residenceTax).toBeLessThan(
      withoutDependents.spouseDeductions.residenceTax,
    );
    // 本人側は影響を受けない
    expect(withDependents.primaryDeductions.incomeTax).toBe(withoutDependents.primaryDeductions.incomeTax);
    expect(withDependents.primaryDeductions.residenceTax).toBe(withoutDependents.primaryDeductions.residenceTax);
  });

  it('扶養控除を本人が受ける設定にすると、本人側の税負担が下がる', () => {
    const withoutDependents = simulate({ ...BASE_PARAMS, dependentsCount: 0 }, 'before');
    const withDependents = simulate(
      { ...BASE_PARAMS, dependentsCount: 1, dependentsClaimedBy: 'primary' },
      'before',
    );

    expect(withDependents.primaryDeductions.incomeTax).toBeLessThan(withoutDependents.primaryDeductions.incomeTax);
    expect(withDependents.spouseDeductions.incomeTax).toBe(withoutDependents.spouseDeductions.incomeTax);
  });

  it('人数0なら、扶養控除を受ける側を誰に設定しても結果は変わらない', () => {
    const claimedByPrimary = simulate({ ...BASE_PARAMS, dependentsCount: 0, dependentsClaimedBy: 'primary' }, 'before');
    const claimedBySpouse = simulate({ ...BASE_PARAMS, dependentsCount: 0, dependentsClaimedBy: 'spouse' }, 'before');

    expect(claimedByPrimary).toEqual(claimedBySpouse);
  });
});

describe('市町村民税所得割額の概算', () => {
  it('課税所得×6%（1円未満切り捨て）', () => {
    expect(calcMunicipalIncomeLevy(1000000)).toBe(60000);
    expect(calcMunicipalIncomeLevy(1000001)).toBe(60000); // 60000.06 → 切り捨て
  });
});

describe('保育料（税額連動ブラケットモード）', () => {
  const brackets: ChildcareFeeBracket[] = [
    { incomeLevyFrom: 0, fee: 30000 },
    { incomeLevyFrom: 200000, fee: 50000 },
  ];

  it('固定額モードでは params.childcareFeeFixed をそのまま使う', () => {
    const result = simulate({ ...BASE_PARAMS, childcareFeeMode: 'fixed', childcareFeeFixed: 12345 }, 'before');
    expect(result.childcareFee).toBe(12345);
  });

  it('ブラケットモードでは世帯の所得割額合計から該当行を選ぶ', () => {
    const result = simulate(
      { ...BASE_PARAMS, childcareFeeMode: 'bracket', childcareFeeBrackets: brackets },
      'before',
    );
    const expectedLevy =
      result.primaryCalculation.residenceTax.municipalIncomeLevy +
      result.spouseCalculation.residenceTax.municipalIncomeLevy;
    expect(result.householdMunicipalIncomeLevy).toBe(expectedLevy);

    const expectedFee = expectedLevy >= 200000 ? 50000 : 30000;
    expect(result.childcareFee).toBe(expectedFee);
  });

  it('境界値：所得割額がちょうど下限と等しい行が適用される（下限は含む）', () => {
    const result = simulate(
      {
        ...BASE_PARAMS,
        childcareFeeMode: 'bracket',
        childcareFeeBrackets: [
          { incomeLevyFrom: 0, fee: 10000 },
          { incomeLevyFrom: 100000, fee: 20000 },
        ],
      },
      'before',
    );
    const levy =
      result.primaryCalculation.residenceTax.municipalIncomeLevy +
      result.spouseCalculation.residenceTax.municipalIncomeLevy;
    const expectedFee = levy >= 100000 ? 20000 : 10000;
    expect(result.childcareFee).toBe(expectedFee);
  });

  it('表が空の場合は保育料0円になる', () => {
    const result = simulate({ ...BASE_PARAMS, childcareFeeMode: 'bracket', childcareFeeBrackets: [] }, 'before');
    expect(result.childcareFee).toBe(0);
  });

  it('表の並び順に依存しない（降順で渡しても結果は同じ）', () => {
    const ascending = simulate(
      { ...BASE_PARAMS, childcareFeeMode: 'bracket', childcareFeeBrackets: brackets },
      'before',
    );
    const descending = simulate(
      { ...BASE_PARAMS, childcareFeeMode: 'bracket', childcareFeeBrackets: [...brackets].reverse() },
      'before',
    );
    expect(descending.childcareFee).toBe(ascending.childcareFee);
  });
});
