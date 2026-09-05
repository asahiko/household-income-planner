import type { SimulationResult } from '../types';

interface Props {
  result: SimulationResult;
  title: string;
}

function fmt(n: number): string {
  return n.toLocaleString('ja-JP') + '円';
}

function fmtDiff(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toLocaleString('ja-JP') + '円';
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr className={highlight ? 'row-highlight' : undefined}>
      <td className="row-label">{label}</td>
      <td className="row-value">{value}</td>
    </tr>
  );
}

export function ResultSection({ result, title }: Props) {
  const balanceClass = result.householdMonthlyBalance >= 0 ? 'balance-positive' : 'balance-negative';
  const candidateLabel = result.dependentCandidate === 'primary' ? '本人' : '配偶者';

  return (
    <div className="result-section">
      <h2 className="result-title">{title}</h2>

      {/* 扶養状態バッジ */}
      <div className="badges">
        {result.socialInsuranceDependent && (
          <span className="badge badge-blue">{candidateLabel}：社保扶養（第3号）</span>
        )}
        {result.taxDependent && (
          <span className="badge badge-green">{candidateLabel}：配偶者控除対象（103万円以下）</span>
        )}
        {!result.socialInsuranceDependent && !result.taxDependent && (
          <span className="badge badge-gray">{candidateLabel}：扶養外</span>
        )}
      </div>

      {/* 収入テーブル */}
      <h3>収入</h3>
      <table className="result-table">
        <tbody>
          <Row label="配偶者 月給（総支給）" value={fmt(result.spouseGrossMonthly)} />
          <Row label="配偶者 控除合計" value={`-${fmt(result.spouseDeductions.total)}`} />
          <Row label="　健康保険料" value={`-${fmt(result.spouseDeductions.healthInsurance)}`} />
          <Row label="　厚生年金" value={`-${fmt(result.spouseDeductions.welfarePension)}`} />
          <Row label="　雇用保険" value={`-${fmt(result.spouseDeductions.employmentInsurance)}`} />
          <Row label="　所得税" value={`-${fmt(result.spouseDeductions.incomeTax)}`} />
          <Row label="　住民税（概算）" value={`-${fmt(result.spouseDeductions.residenceTax)}`} />
          <Row label="配偶者 手取り月収" value={fmt(result.spouseNetMonthly)} highlight />
          <tr><td colSpan={2} className="row-separator" /></tr>
          <Row label="本人 月給（総支給）" value={fmt(result.primaryGrossMonthly)} />
          <Row label="本人 控除合計" value={`-${fmt(result.primaryDeductions.total)}`} />
          <Row label="　健康保険料" value={`-${fmt(result.primaryDeductions.healthInsurance)}`} />
          <Row
            label={
              result.dependentCandidate === 'primary' && result.socialInsuranceDependent
                ? '　年金（第3号 = 無料）'
                : '　年金'
            }
            value={
              result.dependentCandidate === 'primary' && result.socialInsuranceDependent
                ? '0円'
                : `-${fmt(result.primaryDeductions.welfarePension)}`
            }
          />
          <Row label="　雇用保険" value={`-${fmt(result.primaryDeductions.employmentInsurance)}`} />
          <Row label="　所得税" value={`-${fmt(result.primaryDeductions.incomeTax)}`} />
          <Row label="　住民税（概算）" value={`-${fmt(result.primaryDeductions.residenceTax)}`} />
          <Row label="本人 手取り月収" value={fmt(result.primaryNetMonthly)} highlight />
          <tr><td colSpan={2} className="row-separator" /></tr>
          <Row label="世帯手取り合計" value={fmt(result.householdNetMonthly)} highlight />
        </tbody>
      </table>

      {/* 支出テーブル */}
      <h3>支出</h3>
      <table className="result-table">
        <tbody>
          <Row label="共通支出合計" value={fmt(result.totalSharedExpenses)} />
          <Row label="　配偶者の負担" value={fmt(result.spouseExpenseShare)} />
          <Row label="　本人の負担" value={fmt(result.primaryExpenseShare)} />
          <Row label="本人の個人支出" value={fmt(result.primaryPersonalExpenses)} />
          <Row label="配偶者の個人支出" value={fmt(result.spousePersonalExpenses)} />
          <Row
            label="支出合計"
            value={fmt(result.totalSharedExpenses + result.primaryPersonalExpenses + result.spousePersonalExpenses)}
            highlight
          />
        </tbody>
      </table>

      {/* 収支サマリー */}
      <h3>収支</h3>
      <table className="result-table">
        <tbody>
          <Row label="本人の月間収支" value={fmtDiff(result.primaryMonthlyBalance)} />
          <Row label="配偶者の月間収支" value={fmtDiff(result.spouseMonthlyBalance)} />
          <Row label="世帯月間収支" value={fmtDiff(result.householdMonthlyBalance)} highlight />
          <Row label="世帯年間収支" value={fmtDiff(result.householdAnnualBalance)} highlight />
        </tbody>
      </table>

      <div className={`balance-summary ${balanceClass}`}>
        <span className="balance-label">月間貯蓄可能額</span>
        <span className="balance-amount">{fmtDiff(result.householdMonthlyBalance)}</span>
      </div>
    </div>
  );
}
