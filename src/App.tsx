import { useEffect, useRef, useState } from 'react';
import type { SimulatorParams } from './types';
import { simulate } from './simulate';
import { DEFAULT_PARAMS } from './defaultParams';
import { loadParams, saveParams, sanitizeParams } from './paramsStorage';
import { InputSection } from './components/InputSection';
import { ResultSection } from './components/ResultSection';
import { ComparisonSection } from './components/ComparisonSection';
import './App.css';

function App() {
  const [params, setParams] = useState<SimulatorParams>(loadParams);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveParams(params);
  }, [params]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-finance-simulator-params.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      setParams(sanitizeParams(JSON.parse(text)));
      setImportError(null);
    } catch {
      setImportError('ファイルの読み込みに失敗しました。正しいエクスポートファイルを選択してください。');
    }
  };

  const handleResetClick = () => {
    if (resetArmed) {
      setParams(DEFAULT_PARAMS);
      setResetArmed(false);
    } else {
      setResetArmed(true);
    }
  };

  const resultBefore = simulate(params, 'before');
  const resultAfter = simulate(params, 'after');

  return (
    <div className="app">
      <header className="app-header">
        <h1>家計シミュレーター</h1>
        <p className="app-subtitle">
          働き方（勤務日数・収入）を変えた場合の家計への影響をシミュレート
        </p>
        <details className="assumptions">
          <summary>このシミュレーターの前提条件</summary>
          <ul>
            <li>世帯主と配偶者のみが働いている世帯（他の世帯員の収入・扶養は考慮しません）</li>
            <li>本人・配偶者ともに会社員で、厚生年金・協会けんぽ（東京都2024年度の料率）に加入していること</li>
            <li>
              扶養（103万円・130万円の壁）に入れるのは本人・配偶者のどちらか一方のみで、両者が同時に扶養に入るケースは考慮しません
            </li>
            <li>
              扶養親族（配偶者以外、主に子）の扶養控除は、年齢区分（特定扶養親族・老人扶養親族・16歳未満）を考慮せず、一律38万円（所得税）・33万円（住民税）で概算します
            </li>
            <li>住民税は前年所得に基づく概算で、実際の課税開始タイミングのズレは反映していません</li>
          </ul>
        </details>
      </header>

      <main className="app-main">
        <div className="layout">
          <aside className="sidebar">
            <div className="params-toolbar">
              <span className="params-toolbar-hint">入力内容はブラウザに自動保存されます</span>
              <div className="params-toolbar-buttons">
                <button type="button" onClick={handleExport}>
                  エクスポート
                </button>
                <button type="button" onClick={handleImportClick}>
                  インポート
                </button>
                <button
                  type="button"
                  onClick={handleResetClick}
                  onBlur={() => setResetArmed(false)}
                  className={resetArmed ? 'button-danger-armed' : undefined}
                >
                  {resetArmed ? 'もう一度押すと初期化されます' : '初期値に戻す'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </div>
              {importError && <p className="params-toolbar-error">{importError}</p>}
            </div>
            <InputSection params={params} onChange={setParams} />
          </aside>
          <div className="results">
            <ComparisonSection resultBefore={resultBefore} resultAfter={resultAfter} />
            <div className="results-grid">
              <ResultSection result={resultBefore} params={params} title={`変更前（週${params.primaryWorkDaysBefore}日勤務）`} />
              <ResultSection result={resultAfter} params={params} title={`変更後（週${params.primaryWorkDaysAfter}日勤務）`} />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          ※ 本シミュレーターは概算計算です。実際の税額・保険料は勤務先・お住まいの自治体・家族構成等により異なります。
          正確な計算には税理士等の専門家にご相談ください。
        </p>
        <p>
          ※ 健康保険料は協会けんぽ東京都2024年度の保険料率を使用しています。
        </p>
      </footer>
    </div>
  );
}

export default App;
