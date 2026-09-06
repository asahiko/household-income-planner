import type { ChildcareFeeBracket } from '../types';
import { NumInput } from './NumInput';

interface Props {
  brackets: ChildcareFeeBracket[];
  onChange: (brackets: ChildcareFeeBracket[]) => void;
}

/**
 * 保育料の税額連動ブラケット表を編集するUI。
 *
 * 自治体の保育料表は「所得割額○○円以上△△円未満 → 保育料□□円」の形式で書かれていることが多いため、
 * ここでは各行に「所得割額の下限」と「その場合の保育料」だけを持たせ、上限は次の行の下限（または青天井）
 * として扱う（simulate.ts の lookupChildcareFee 参照。判定は表の並び順に依存しないので、ここでは
 * 入力途中の並び替えを避けるため表示順を自動ソートしない＝行を編集しても他の行の位置がずれない）。
 */
export function ChildcareFeeBracketEditor({ brackets, onChange }: Props) {
  const updateRow = (index: number, patch: Partial<ChildcareFeeBracket>) => {
    onChange(brackets.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const removeRow = (index: number) => {
    onChange(brackets.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const last = brackets[brackets.length - 1];
    onChange([...brackets, { incomeLevyFrom: last ? last.incomeLevyFrom + 10000 : 0, fee: last ? last.fee : 0 }]);
  };

  return (
    <div className="bracket-editor">
      <p className="field-hint">
        お住まいの自治体の保育料表（例：「所得割額○○円以上△△円未満 → 保育料□□円」）を、
        各区分の下限額と保育料の組で入力してください。世帯（本人＋配偶者）の所得割額の概算合計が、
        下限額を超える行のうち最も下限額が大きい行が適用されます（行の並び順は計算結果に影響しません）。
      </p>
      <p className="field-hint">
        ※ ここでの「所得割額」は、住民税の課税所得に市町村民税所得割の税率（6%）だけをかけた概算値です
        （道府県民税分は含まず、調整控除も考慮していません）。実際の金額は住民税決定通知書でご確認ください。
      </p>
      <table className="bracket-table">
        <thead>
          <tr>
            <th>所得割額（円）以上</th>
            <th>保育料（月額・円）</th>
            <th aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((row, i) => (
            <tr key={i}>
              <td>
                <NumInput compact value={row.incomeLevyFrom} onChange={(v) => updateRow(i, { incomeLevyFrom: v })} />
              </td>
              <td>
                <NumInput compact value={row.fee} onChange={(v) => updateRow(i, { fee: v })} />
              </td>
              <td>
                <button type="button" onClick={() => removeRow(i)} aria-label="この行を削除">
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {brackets.length === 0 && <p className="field-hint">行がないため、保育料は常に0円として計算されます。</p>}
      <button type="button" onClick={addRow}>
        行を追加
      </button>
    </div>
  );
}
