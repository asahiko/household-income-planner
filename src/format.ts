// ユーザーはコンマなしで数字を入力し、表示上は自動で3桁コンマ区切りにする
export function formatWithCommas(raw: string): string {
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart, ...decParts] = unsigned.split('.');
  const formattedInt = intPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = decParts.length > 0 ? '.' + decParts.join('').replace(/\D/g, '') : '';
  return (negative ? '-' : '') + formattedInt + decPart;
}

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
