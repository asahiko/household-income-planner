import type { ReactNode } from 'react';

interface Props {
  /** アイコンのaria-label（スクリーンリーダー向け） */
  label: string;
  children: ReactNode;
}

/**
 * 用語解説・計算式・参考リンクを表示するインフォメーションボタン。
 *
 * ネイティブの <details>/<summary> を使うことで、開閉状態を独自のstateや
 * 外側クリック検知なしで管理できる（App.tsx の「このシミュレーターの前提条件」と同じ仕組み）。
 */
export function InfoTooltip({ label, children }: Props) {
  return (
    <details className="info-tooltip">
      <summary className="info-tooltip-trigger" aria-label={label}>
        ⓘ
      </summary>
      <div className="info-tooltip-content">{children}</div>
    </details>
  );
}
