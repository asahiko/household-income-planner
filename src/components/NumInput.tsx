import { useEffect, useState } from 'react';
import { formatWithCommas } from '../format';

interface Props {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  hint?: string;
  /** ラベル・単位・上下マージンを省き、表のセルなど狭い場所に埋め込むための最小表示 */
  compact?: boolean;
}

/**
 * 3桁コンマ区切り表示に対応した数値入力。
 *
 * ユーザーはコンマなしで数字を入力し、表示上は自動でコンマを補う（focus中は入力途中の
 * 生の文字列を保持し、blur時に確定値へ整形し直す）。InputSection のフィールドと
 * ChildcareFeeBracketEditor の表セルの両方で使う。
 */
export function NumInput({ label, value, onChange, unit = '円', min = 0, max, hint, compact = false }: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [text, setText] = useState(() => formatWithCommas(String(value)));

  useEffect(() => {
    if (!isFocused) {
      setText(formatWithCommas(String(value)));
    }
  }, [value, isFocused]);

  const input = (
    <input
      type="text"
      inputMode="decimal"
      className="field-input"
      value={text}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => {
        const sanitized = e.target.value.replace(/[^0-9.\-]/g, '');
        const formatted = formatWithCommas(sanitized);
        setText(formatted);
        const numeric = Number(sanitized.replace(/,/g, ''));
        if (sanitized !== '' && sanitized !== '-' && sanitized !== '.' && !Number.isNaN(numeric)) {
          onChange(numeric);
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        let clamped = value;
        if (min !== undefined && clamped < min) clamped = min;
        if (max !== undefined && clamped > max) clamped = max;
        if (clamped !== value) onChange(clamped);
        setText(formatWithCommas(String(clamped)));
      }}
    />
  );

  if (compact) {
    return input;
  }

  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {hint && <span className="field-hint">{hint}</span>}
      <div className="field-input-wrap">
        {input}
        <span className="field-unit">{unit}</span>
      </div>
    </div>
  );
}
