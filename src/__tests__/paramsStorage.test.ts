import { describe, it, expect } from 'vitest';
import { sanitizeParams } from '../paramsStorage';
import { DEFAULT_PARAMS } from '../defaultParams';
import { simulate } from '../simulate';

describe('sanitizeParams', () => {
  it('古い形式（フィールド改名前）のデータをデフォルト値で補完する', () => {
    const oldShape = {
      husbandMonthlySalary: 400000,
      husbandAnnualBonus: 800000,
      wifeMonthlySalary3days: 180000,
      wifeAnnualBonus3days: 0,
      wifeMonthlySalary2days: 120000,
      wifeAnnualBonus2days: 0,
      wifeWorkHoursPerDay: 8,
      rent: 130000,
      // primary*/spouse* 系のフィールドは無い（改名前のスキーマ）
    };

    const sanitized = sanitizeParams(oldShape);
    // primary*/spouse* 系はすべて未知のキーとしてデフォルト値にフォールバックする。
    // rent は改名されていない共通フィールドなので、旧データの値がそのまま引き継がれる。
    expect(sanitized).toEqual({ ...DEFAULT_PARAMS, rent: 130000 });

    const result = simulate(sanitized, 'before');
    expect(Number.isFinite(result.householdNetMonthly)).toBe(true);
  });

  it('不正な値・未知のキーを持つデータをデフォルトにフォールバックする', () => {
    const broken = {
      ...DEFAULT_PARAMS,
      rent: '120000', // 数値ではなく文字列
      primaryMonthlySalaryBefore: NaN,
      sharingMethod: 'unknownMethod',
      dependentCandidate: 'unknownPerson',
      someUnknownField: 'should be ignored',
    };

    const sanitized = sanitizeParams(broken);
    expect(sanitized.rent).toBe(DEFAULT_PARAMS.rent);
    expect(sanitized.primaryMonthlySalaryBefore).toBe(DEFAULT_PARAMS.primaryMonthlySalaryBefore);
    expect(sanitized.sharingMethod).toBe(DEFAULT_PARAMS.sharingMethod);
    expect(sanitized.dependentCandidate).toBe(DEFAULT_PARAMS.dependentCandidate);
    expect('someUnknownField' in sanitized).toBe(false);
  });

  it('null・非オブジェクトの入力はデフォルト値をそのまま返す', () => {
    expect(sanitizeParams(null)).toEqual(DEFAULT_PARAMS);
    expect(sanitizeParams('not an object')).toEqual(DEFAULT_PARAMS);
    expect(sanitizeParams(42)).toEqual(DEFAULT_PARAMS);
  });

  it('正しい形式のデータはラウンドトリップで一致する', () => {
    const roundTripped = sanitizeParams(JSON.parse(JSON.stringify(DEFAULT_PARAMS)));
    expect(roundTripped).toEqual(DEFAULT_PARAMS);
  });

  it('dependentCandidate = spouse の値はそのまま保持される', () => {
    const sanitized = sanitizeParams({ ...DEFAULT_PARAMS, dependentCandidate: 'spouse' });
    expect(sanitized.dependentCandidate).toBe('spouse');
  });

  it('dependentsClaimedBy の不正値はデフォルトにフォールバックし、正しい値は保持される', () => {
    const invalid = sanitizeParams({ ...DEFAULT_PARAMS, dependentsClaimedBy: 'nobody' });
    expect(invalid.dependentsClaimedBy).toBe(DEFAULT_PARAMS.dependentsClaimedBy);

    const valid = sanitizeParams({ ...DEFAULT_PARAMS, dependentsClaimedBy: 'primary' });
    expect(valid.dependentsClaimedBy).toBe('primary');
  });

  it('dependentsCount の不正値（文字列・NaN）はデフォルトにフォールバックする', () => {
    const sanitized = sanitizeParams({ ...DEFAULT_PARAMS, dependentsCount: '2' });
    expect(sanitized.dependentsCount).toBe(DEFAULT_PARAMS.dependentsCount);
  });

  it('childcareFeeMode の不正値はデフォルトにフォールバックし、正しい値は保持される', () => {
    const invalid = sanitizeParams({ ...DEFAULT_PARAMS, childcareFeeMode: 'unknown' });
    expect(invalid.childcareFeeMode).toBe(DEFAULT_PARAMS.childcareFeeMode);

    const valid = sanitizeParams({ ...DEFAULT_PARAMS, childcareFeeMode: 'bracket' });
    expect(valid.childcareFeeMode).toBe('bracket');
  });

  it('childcareFeeBrackets：配列でない値はデフォルトの表にフォールバックする', () => {
    const sanitized = sanitizeParams({ ...DEFAULT_PARAMS, childcareFeeBrackets: 'not an array' });
    expect(sanitized.childcareFeeBrackets).toEqual(DEFAULT_PARAMS.childcareFeeBrackets);
  });

  it('childcareFeeBrackets：空配列（ユーザーが全行削除した状態）はそのまま保持する', () => {
    const sanitized = sanitizeParams({ ...DEFAULT_PARAMS, childcareFeeBrackets: [] });
    expect(sanitized.childcareFeeBrackets).toEqual([]);
  });

  it('childcareFeeBrackets：不正な行を取り除き、incomeLevyFrom昇順にソートする', () => {
    const sanitized = sanitizeParams({
      ...DEFAULT_PARAMS,
      childcareFeeBrackets: [
        { incomeLevyFrom: 200000, fee: 50000 },
        { incomeLevyFrom: 'bad', fee: 10000 }, // 数値でない → 除外
        { incomeLevyFrom: -1, fee: 10000 }, // 負の値 → 除外
        { incomeLevyFrom: 0, fee: 30000 },
      ],
    });
    expect(sanitized.childcareFeeBrackets).toEqual([
      { incomeLevyFrom: 0, fee: 30000 },
      { incomeLevyFrom: 200000, fee: 50000 },
    ]);
  });

  it('childcareFeeBrackets：行はあるが全て不正な場合はデフォルトにフォールバックする', () => {
    const sanitized = sanitizeParams({
      ...DEFAULT_PARAMS,
      childcareFeeBrackets: [{ incomeLevyFrom: 'bad', fee: 'also bad' }],
    });
    expect(sanitized.childcareFeeBrackets).toEqual(DEFAULT_PARAMS.childcareFeeBrackets);
  });
});
