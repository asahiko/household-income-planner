import type { SimulationResult } from '../types';

interface Props {
  resultBefore: SimulationResult;
  resultAfter: SimulationResult;
}

function fmt(n: number): string {
  return n.toLocaleString('ja-JP') + '円';
}

function DiffCell({ value }: { value: number }) {
  const cls = value > 0 ? 'diff-positive' : value < 0 ? 'diff-negative' : 'diff-zero';
  const sign = value > 0 ? '+' : '';
  return <td className={`diff-cell ${cls}`}>{sign}{value.toLocaleString('ja-JP')}円</td>;
}

export function ComparisonSection({ resultBefore, resultAfter }: Props) {
  const candidateLabel = resultBefore.dependentCandidate === 'primary' ? '本人' : '配偶者';

  const items: Array<{ label: string; before: number; after: number }> = [
    {
      label: '本人の手取り月収',
      before: resultBefore.primaryNetMonthly,
      after: resultAfter.primaryNetMonthly,
    },
    {
      label: '配偶者の手取り月収',
      before: resultBefore.spouseNetMonthly,
      after: resultAfter.spouseNetMonthly,
    },
    {
      label: '世帯手取り月収',
      before: resultBefore.householdNetMonthly,
      after: resultAfter.householdNetMonthly,
    },
    {
      label: '世帯月間収支（貯蓄可能額）',
      before: resultBefore.householdMonthlyBalance,
      after: resultAfter.householdMonthlyBalance,
    },
    {
      label: '世帯年間収支',
      before: resultBefore.householdAnnualBalance,
      after: resultAfter.householdAnnualBalance,
    },
  ];

  return (
    <div className="comparison-section">
      <h2>変更前 vs 変更後 比較</h2>
      <div className="comparison-badges">
        <div className="scenario-badge scenario-before">
          <span>変更前</span>
          <span className={resultBefore.socialInsuranceDependent ? 'dep-yes' : 'dep-no'}>
            {candidateLabel}：{resultBefore.socialInsuranceDependent ? '社保扶養あり' : '社保扶養なし'}
          </span>
        </div>
        <div className="scenario-arrow">→</div>
        <div className="scenario-badge scenario-after">
          <span>変更後</span>
          <span className={resultAfter.socialInsuranceDependent ? 'dep-yes' : 'dep-no'}>
            {candidateLabel}：{resultAfter.socialInsuranceDependent ? '社保扶養あり' : '社保扶養なし'}
          </span>
        </div>
      </div>

      <table className="comparison-table">
        <thead>
          <tr>
            <th>項目</th>
            <th>変更前</th>
            <th>変更後</th>
            <th>差（変更後 - 変更前）</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ label, before, after }) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="val-cell">{fmt(before)}</td>
              <td className="val-cell">{fmt(after)}</td>
              <DiffCell value={after - before} />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="impact-summary">
        <div className="impact-item">
          <span className="impact-label">月間の影響</span>
          <span
            className={
              resultAfter.householdMonthlyBalance - resultBefore.householdMonthlyBalance >= 0
                ? 'impact-positive'
                : 'impact-negative'
            }
          >
            {resultAfter.householdMonthlyBalance - resultBefore.householdMonthlyBalance >= 0 ? '+' : ''}
            {(resultAfter.householdMonthlyBalance - resultBefore.householdMonthlyBalance).toLocaleString('ja-JP')}円
          </span>
        </div>
        <div className="impact-item">
          <span className="impact-label">年間の影響</span>
          <span
            className={
              resultAfter.householdAnnualBalance - resultBefore.householdAnnualBalance >= 0
                ? 'impact-positive'
                : 'impact-negative'
            }
          >
            {resultAfter.householdAnnualBalance - resultBefore.householdAnnualBalance >= 0 ? '+' : ''}
            {(resultAfter.householdAnnualBalance - resultBefore.householdAnnualBalance).toLocaleString('ja-JP')}円
          </span>
        </div>
      </div>
    </div>
  );
}
