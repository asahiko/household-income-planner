import type { SimulatorParams } from '../types';
import { ChildcareFeeBracketEditor } from './ChildcareFeeBracketEditor';
import { NumInput } from './NumInput';

interface Props {
  params: SimulatorParams;
  onChange: (params: SimulatorParams) => void;
}

export function InputSection({ params, onChange }: Props) {
  const set = <K extends keyof SimulatorParams>(key: K, value: SimulatorParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const setIncomeInputMode = (mode: SimulatorParams['incomeInputMode']) => {
    if (mode === params.incomeInputMode) return;

    if (mode === 'annual') {
      // 月給＋賞与 → 年収一括：現在値から年収を計算して引き継ぐ
      onChange({
        ...params,
        incomeInputMode: mode,
        primaryAnnualIncomeBefore: params.primaryMonthlySalaryBefore * 12 + params.primaryAnnualBonusBefore,
        primaryAnnualIncomeAfter: params.primaryMonthlySalaryAfter * 12 + params.primaryAnnualBonusAfter,
        spouseAnnualIncome: params.spouseMonthlySalary * 12 + params.spouseAnnualBonus,
      });
    } else {
      // 年収一括 → 月給＋賞与：年収を12等分し、賞与は0として引き継ぐ
      onChange({
        ...params,
        incomeInputMode: mode,
        primaryMonthlySalaryBefore: Math.floor(params.primaryAnnualIncomeBefore / 12),
        primaryAnnualBonusBefore: 0,
        primaryMonthlySalaryAfter: Math.floor(params.primaryAnnualIncomeAfter / 12),
        primaryAnnualBonusAfter: 0,
        spouseMonthlySalary: Math.floor(params.spouseAnnualIncome / 12),
        spouseAnnualBonus: 0,
      });
    }
  };

  return (
    <div className="input-section">
      <section className="input-group">
        <h2>収入の入力方法</h2>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="incomeInputMode"
              value="monthlyPlusBonus"
              checked={params.incomeInputMode === 'monthlyPlusBonus'}
              onChange={() => setIncomeInputMode('monthlyPlusBonus')}
            />
            <span>月給＋賞与で入力する</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="incomeInputMode"
              value="annual"
              checked={params.incomeInputMode === 'annual'}
              onChange={() => setIncomeInputMode('annual')}
            />
            <span>年収を一括で入力する</span>
          </label>
        </div>
      </section>

      <section className="input-group">
        <h2>本人（働き方を変える人）の勤務条件</h2>
        <NumInput
          label="週あたり勤務日数（変更前）"
          value={params.primaryWorkDaysBefore}
          onChange={(v) => set('primaryWorkDaysBefore', v)}
          unit="日"
          min={0}
          max={7}
        />
        <NumInput
          label="週あたり勤務日数（変更後）"
          value={params.primaryWorkDaysAfter}
          onChange={(v) => set('primaryWorkDaysAfter', v)}
          unit="日"
          min={0}
          max={7}
        />
        <NumInput
          label="1日あたり勤務時間"
          value={params.primaryWorkHoursPerDay}
          onChange={(v) => set('primaryWorkHoursPerDay', v)}
          unit="時間"
          min={1}
          hint="週の所定労働時間（20時間未満で社保扶養要件を満たす）"
        />
      </section>

      <section className="input-group">
        <h2>本人の収入</h2>
        {params.incomeInputMode === 'annual' ? (
          <>
            <NumInput
              label="年収 – 変更前"
              value={params.primaryAnnualIncomeBefore}
              onChange={(v) => set('primaryAnnualIncomeBefore', v)}
            />
            <NumInput
              label="年収 – 変更後"
              value={params.primaryAnnualIncomeAfter}
              onChange={(v) => set('primaryAnnualIncomeAfter', v)}
            />
          </>
        ) : (
          <>
            <NumInput
              label="月給 – 変更前"
              value={params.primaryMonthlySalaryBefore}
              onChange={(v) => set('primaryMonthlySalaryBefore', v)}
            />
            <NumInput
              label="年間賞与 – 変更前"
              value={params.primaryAnnualBonusBefore}
              onChange={(v) => set('primaryAnnualBonusBefore', v)}
            />
            <NumInput
              label="月給 – 変更後"
              value={params.primaryMonthlySalaryAfter}
              onChange={(v) => set('primaryMonthlySalaryAfter', v)}
            />
            <NumInput
              label="年間賞与 – 変更後"
              value={params.primaryAnnualBonusAfter}
              onChange={(v) => set('primaryAnnualBonusAfter', v)}
            />
          </>
        )}
      </section>

      <section className="input-group">
        <h2>配偶者（勤務形態が変わらない人）の勤務条件</h2>
        <NumInput
          label="週あたり勤務日数"
          value={params.spouseWorkDaysPerWeek}
          onChange={(v) => set('spouseWorkDaysPerWeek', v)}
          unit="日"
          min={0}
          max={7}
        />
        <NumInput
          label="1日あたり勤務時間"
          value={params.spouseWorkHoursPerDay}
          onChange={(v) => set('spouseWorkHoursPerDay', v)}
          unit="時間"
          min={1}
        />
      </section>

      <section className="input-group">
        <h2>配偶者の収入</h2>
        {params.incomeInputMode === 'annual' ? (
          <NumInput
            label="年収（総支給）"
            value={params.spouseAnnualIncome}
            onChange={(v) => set('spouseAnnualIncome', v)}
            hint="賞与込みの年間総支給額"
          />
        ) : (
          <>
            <NumInput
              label="月給（総支給）"
              value={params.spouseMonthlySalary}
              onChange={(v) => set('spouseMonthlySalary', v)}
            />
            <NumInput
              label="年間賞与（合計）"
              value={params.spouseAnnualBonus}
              onChange={(v) => set('spouseAnnualBonus', v)}
              hint="年2回分の合計"
            />
          </>
        )}
      </section>

      <section className="input-group">
        <h2>扶養に入る可能性がある側</h2>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="dependentCandidate"
              value="primary"
              checked={params.dependentCandidate === 'primary'}
              onChange={() => set('dependentCandidate', 'primary')}
            />
            <span>本人が配偶者の扶養に入る可能性がある</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="dependentCandidate"
              value="spouse"
              checked={params.dependentCandidate === 'spouse'}
              onChange={() => set('dependentCandidate', 'spouse')}
            />
            <span>配偶者が本人の扶養に入る可能性がある</span>
          </label>
        </div>
      </section>

      <section className="input-group">
        <h2>扶養家族（配偶者以外、主に子）</h2>
        <NumInput
          label="人数"
          value={params.dependentsCount}
          onChange={(v) => set('dependentsCount', v)}
          unit="人"
          min={0}
          hint="扶養控除（一般の控除対象扶養親族、38万円/人）を一律で適用する概算です。年齢区分（特定・老人扶養親族、16歳未満）は考慮していません"
        />
        {params.dependentsCount > 0 && (
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="dependentsClaimedBy"
                value="primary"
                checked={params.dependentsClaimedBy === 'primary'}
                onChange={() => set('dependentsClaimedBy', 'primary')}
              />
              <span>本人が扶養控除を受ける</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="dependentsClaimedBy"
                value="spouse"
                checked={params.dependentsClaimedBy === 'spouse'}
                onChange={() => set('dependentsClaimedBy', 'spouse')}
              />
              <span>配偶者が扶養控除を受ける</span>
            </label>
          </div>
        )}
      </section>

      <section className="input-group">
        <h2>支出（月額）</h2>
        <NumInput label="家賃" value={params.rent} onChange={(v) => set('rent', v)} />
        <NumInput label="光熱費" value={params.utilities} onChange={(v) => set('utilities', v)} />
        <NumInput label="食費" value={params.food} onChange={(v) => set('food', v)} />
        <NumInput label="学費" value={params.education} onChange={(v) => set('education', v)} />
        <div className="field">
          <label className="field-label">保育料</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="childcareFeeMode"
                value="fixed"
                checked={params.childcareFeeMode === 'fixed'}
                onChange={() => set('childcareFeeMode', 'fixed')}
              />
              <span>固定額を入力する</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="childcareFeeMode"
                value="bracket"
                checked={params.childcareFeeMode === 'bracket'}
                onChange={() => set('childcareFeeMode', 'bracket')}
              />
              <span>世帯の所得割額に応じたブラケット表で決める</span>
            </label>
          </div>
        </div>
        {params.childcareFeeMode === 'fixed' ? (
          <NumInput
            label="保育料（固定額）"
            value={params.childcareFeeFixed}
            onChange={(v) => set('childcareFeeFixed', v)}
          />
        ) : (
          <ChildcareFeeBracketEditor
            brackets={params.childcareFeeBrackets}
            onChange={(v) => set('childcareFeeBrackets', v)}
          />
        )}
        <NumInput
          label="通信費"
          value={params.communication}
          onChange={(v) => set('communication', v)}
        />
        <NumInput
          label="その他固定費"
          value={params.otherFixed}
          onChange={(v) => set('otherFixed', v)}
        />
        <NumInput
          label="本人の個人支出（小遣い等）"
          value={params.primaryPersonal}
          onChange={(v) => set('primaryPersonal', v)}
        />
        <NumInput
          label="配偶者の個人支出（小遣い等）"
          value={params.spousePersonal}
          onChange={(v) => set('spousePersonal', v)}
        />
      </section>

      <section className="input-group">
        <h2>生活費の分担方法</h2>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="sharingMethod"
              value="percentage"
              checked={params.sharingMethod === 'percentage'}
              onChange={() => set('sharingMethod', 'percentage')}
            />
            <span>割合で分担する</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sharingMethod"
              value="fixedTransfer"
              checked={params.sharingMethod === 'fixedTransfer'}
              onChange={() => set('sharingMethod', 'fixedTransfer')}
            />
            <span>固定額を送金し、受け取った側が残りを全負担</span>
          </label>
        </div>

        {params.sharingMethod === 'fixedTransfer' && (
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="fixedTransferDirection"
                value="spouseToPrimary"
                checked={params.fixedTransferDirection === 'spouseToPrimary'}
                onChange={() => set('fixedTransferDirection', 'spouseToPrimary')}
              />
              <span>配偶者 → 本人（本人が残りを全負担）</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="fixedTransferDirection"
                value="primaryToSpouse"
                checked={params.fixedTransferDirection === 'primaryToSpouse'}
                onChange={() => set('fixedTransferDirection', 'primaryToSpouse')}
              />
              <span>本人 → 配偶者（配偶者が残りを全負担）</span>
            </label>
          </div>
        )}

        {params.sharingMethod === 'percentage' ? (
          <div className="field">
            <label className="field-label">配偶者の負担割合</label>
            <div className="field-input-wrap">
              <input
                type="range"
                min={0}
                max={100}
                value={params.spouseSharePercent}
                onChange={(e) => set('spouseSharePercent', Number(e.target.value))}
                className="field-range"
              />
              <span className="field-unit">
                {params.spouseSharePercent}%（本人 {100 - params.spouseSharePercent}%）
              </span>
            </div>
          </div>
        ) : (
          <NumInput
            label={
              params.fixedTransferDirection === 'primaryToSpouse'
                ? '本人から配偶者への送金額（月額）'
                : '配偶者から本人への送金額（月額）'
            }
            value={params.fixedTransferAmount}
            onChange={(v) => set('fixedTransferAmount', v)}
            hint={
              params.fixedTransferDirection === 'primaryToSpouse'
                ? '配偶者がこの金額を受け取り、共通支出すべてを払う'
                : '本人がこの金額を受け取り、共通支出すべてを払う'
            }
          />
        )}
      </section>
    </div>
  );
}
