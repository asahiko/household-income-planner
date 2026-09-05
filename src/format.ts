/** 金額を「1,234,567円」の形式に整形する */
export function fmtYen(n: number): string {
  return Math.round(n).toLocaleString('ja-JP') + '円';
}

/** 符号付きの金額を「+1,234円」「-1,234円」の形式に整形する */
export function fmtYenDiff(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + Math.round(n).toLocaleString('ja-JP') + '円';
}

/** 割合を「4.99%」の形式に整形する（小数点以下は必要な桁数のみ表示） */
export function fmtPercent(rate: number): string {
  return (rate * 100).toLocaleString('ja-JP', { maximumFractionDigits: 4 }) + '%';
}
