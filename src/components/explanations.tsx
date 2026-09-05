/**
 * 各計算項目の用語解説・計算式・参考リンクをまとめたモジュール。
 *
 * ここで表示する数値は、可能な限り SimulationResult / PersonCalculationBreakdown が
 * 保持している実際の計算結果・中間値をそのまま使う（このファイル側で独自に再計算しない）。
 * こうすることで、テーブルに表示されている金額と説明パネルに表示される金額が
 * 常に一致することを保証する（simulate.ts の buildTaxBreakdown も参照）。
 */
import type { ReactNode } from 'react';
import {
  calcSalaryDeduction,
  DEPENDENT_DEDUCTION_INCOME_TAX,
  DEPENDENT_DEDUCTION_RESIDENCE_TAX,
  EMPLOYMENT_INSURANCE_RATE,
  HEALTH_INSURANCE_RATE,
  NATIONAL_HEALTH_INSURANCE_MEDICAL_FLAT,
  NATIONAL_HEALTH_INSURANCE_MEDICAL_RATE,
  NATIONAL_HEALTH_INSURANCE_SUPPORT_FLAT,
  NATIONAL_HEALTH_INSURANCE_SUPPORT_RATE,
  NATIONAL_PENSION_MONTHLY,
  RECONSTRUCTION_SURTAX_RATE,
  RESIDENCE_TAX_INCOME_RATE,
  RESIDENCE_TAX_PER_CAPITA,
  SOCIAL_INSURANCE_DEPENDENT_INCOME_THRESHOLD,
  SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD,
  SPOUSE_DEDUCTION_INCOME_TAX,
  SPOUSE_DEDUCTION_RESIDENCE_TAX,
  TAX_DEPENDENT_INCOME_THRESHOLD,
  WELFARE_PENSION_CAP,
  WELFARE_PENSION_RATE,
} from '../calculator';
import { fmtPercent, fmtYen } from '../format';
import type { PersonCalculationBreakdown, SimulationResult, SimulatorParams } from '../types';

/** 参考リンク1件 */
interface RefLink {
  label: string;
  url: string;
}

const REF = {
  kyoukaikenpo: { label: '協会けんぽ（東京都の保険料額表）', url: 'https://www.kyoukaikenpo.or.jp/' },
  kouseiNenkin: {
    label: '日本年金機構：厚生年金保険料額表',
    url: 'https://www.nenkin.go.jp/service/kounen/hokenryo/ryogaku/ryogakuhyo/index.html',
  },
  koyouHoken: {
    label: '厚生労働省：令和6年度の雇用保険料率（PDF）',
    url: 'https://www.mhlw.go.jp/content/001211914.pdf',
  },
  kyuyoShotokuKoujo: {
    label: '国税庁タックスアンサー No.1410 給与所得控除',
    url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm',
  },
  shotokuzeiRate: {
    label: '国税庁タックスアンサー No.2260 所得税の税率',
    url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm',
  },
  fukkoTokubetsu: {
    label: '国税庁：個人の方に係る復興特別所得税のあらまし',
    url: 'https://www.nta.go.jp/publication/pamph/shotoku/fukko_tokubetsu/index.htm',
  },
  juuminzei: {
    label: '総務省：個人住民税（所得割・均等割）',
    url: 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/150790_06.html',
  },
  haigushaKoujo: {
    label: '国税庁タックスアンサー No.1191 配偶者控除',
    url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1191.htm',
  },
  fuyouKoujo: {
    label: '国税庁タックスアンサー No.1180 扶養控除',
    url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1180.htm',
  },
  hifuyoushaNintei: {
    label: '日本年金機構：被扶養者になれる人の範囲・収入要件',
    url: 'https://www.nenkin.go.jp/service/kounen/tekiyo/hihokensha1/20141202.html',
  },
  kokuminNenkin: {
    label: '日本年金機構：国民年金保険料',
    url: 'https://www.nenkin.go.jp/service/kokunen/hokenryo/hokenryo.html',
  },
  kokuminKenkoHoken: {
    label: '東京都：特別区国民健康保険料の算定',
    url: 'https://www.hokeniryo.metro.tokyo.lg.jp/documents/d/hokeniryo/r06hokenryoutokubetuku',
  },
} as const satisfies Record<string, RefLink>;

function RefLinks({ links }: { links: RefLink[] }) {
  return (
    <ul className="explain-refs">
      {links.map((l) => (
        <li key={l.url}>
          <a href={l.url} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Explanation({ children, links }: { children: ReactNode; links?: RefLink[] }) {
  return (
    <div className="explain">
      {children}
      {links && links.length > 0 && (
        <>
          <p className="explain-heading">参考リンク</p>
          <RefLinks links={links} />
        </>
      )}
    </div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="explain-formula">{children}</p>;
}

function describeSalaryDeductionBracket(annualBase: number): string {
  if (annualBase <= 1625000) return '年収162.5万円以下 → 一律55万円';
  if (annualBase <= 1800000) return '年収180万円以下 → 年収×40%－10万円';
  if (annualBase <= 3600000) return '年収360万円以下 → 年収×30%＋8万円';
  if (annualBase <= 6600000) return '年収660万円以下 → 年収×20%＋44万円';
  if (annualBase <= 8500000) return '年収850万円以下 → 年収×10%＋110万円';
  return '年収850万円超 → 一律195万円';
}

function describeIncomeTaxBracket(taxableIncome: number): string {
  if (taxableIncome <= 1950000) return '課税所得195万円以下 → ×5%';
  if (taxableIncome <= 3300000) return '課税所得330万円以下 → ×10%－97,500円';
  if (taxableIncome <= 6950000) return '課税所得695万円以下 → ×20%－427,500円';
  if (taxableIncome <= 9000000) return '課税所得900万円以下 → ×23%－636,000円';
  if (taxableIncome <= 18000000) return '課税所得1,800万円以下 → ×33%－1,536,000円';
  if (taxableIncome <= 40000000) return '課税所得4,000万円以下 → ×40%－2,796,000円';
  return '課税所得4,000万円超 → ×45%－4,796,000円';
}

/** 健康保険料・厚生年金・雇用保険（本人負担分）の説明 */
export function explainSocialInsurance(
  calc: PersonCalculationBreakdown,
  kind: 'health' | 'pension' | 'employment',
  amount: number,
): ReactNode {
  if (calc.insuranceBranch === 'socialInsuranceDependent') {
    return (
      <Explanation links={[REF.hifuyoushaNintei]}>
        <p>
          社会保険の扶養（第3号被保険者）に入っているため、この人自身の健康保険料・厚生年金保険料の負担はありません（配偶者が加入する健康保険・厚生年金の制度でまかなわれます）。
        </p>
      </Explanation>
    );
  }

  if (calc.insuranceBranch === 'employerInsurance') {
    if (kind === 'health') {
      return (
        <Explanation links={[REF.kyoukaikenpo]}>
          <p>協会けんぽ（東京都、2024年度）の健康保険料。標準報酬月額に保険料率をかけ、労使折半した本人負担分。</p>
          <Formula>標準報酬月額 × {fmtPercent(HEALTH_INSURANCE_RATE)}（本人負担分）</Formula>
          <Formula>
            {fmtYen(calc.monthlyBaseSalary)} × {fmtPercent(HEALTH_INSURANCE_RATE)} = {fmtYen(amount)}
          </Formula>
          <p className="explain-note">
            ※ 標準報酬月額は本来、報酬月額を等級表に当てはめて決まりますが、この試算では月給をそのまま使用しています。
          </p>
        </Explanation>
      );
    }
    if (kind === 'pension') {
      const cappedSalary = Math.min(calc.monthlyBaseSalary, WELFARE_PENSION_CAP);
      return (
        <Explanation links={[REF.kouseiNenkin]}>
          <p>厚生年金保険料。標準報酬月額（上限{fmtYen(WELFARE_PENSION_CAP)}）に保険料率をかけ、労使折半した本人負担分。</p>
          <Formula>min(標準報酬月額, {fmtYen(WELFARE_PENSION_CAP)}) × {fmtPercent(WELFARE_PENSION_RATE)}</Formula>
          <Formula>
            {fmtYen(cappedSalary)} × {fmtPercent(WELFARE_PENSION_RATE)} = {fmtYen(amount)}
          </Formula>
        </Explanation>
      );
    }
    return (
      <Explanation links={[REF.koyouHoken]}>
        <p>雇用保険料（一般の事業、労働者負担分）。</p>
        <Formula>月給 × {fmtPercent(EMPLOYMENT_INSURANCE_RATE)}</Formula>
        <Formula>
          {fmtYen(calc.monthlyBaseSalary)} × {fmtPercent(EMPLOYMENT_INSURANCE_RATE)} = {fmtYen(amount)}
        </Formula>
      </Explanation>
    );
  }

  // nationalInsurance: 週20時間未満だが年収が高く、扶養にも入れない場合
  if (kind === 'health') {
    // calcNationalHealthInsurance と同じ計算（年収には賞与を含む点が所得税・住民税の annualBase と異なる）
    const salaryDeduction = calcSalaryDeduction(calc.annualIncome);
    const income = Math.max(0, calc.annualIncome - salaryDeduction - calc.residenceTax.basicDeduction);
    return (
      <Explanation links={[REF.kokuminKenkoHoken]}>
        <p>
          週の所定労働時間が{SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD}時間未満のため勤務先の社会保険には加入できず、社会保険の扶養にも入れない年収のため、国民健康保険に加入します（東京都23区内の概算）。
        </p>
        <Formula>
          賦課標準額 = 年収（賞与込み） － 給与所得控除 － 住民税基礎控除43万円 = max(0, {fmtYen(calc.annualIncome)} － {fmtYen(salaryDeduction)} － {fmtYen(calc.residenceTax.basicDeduction)}) = {fmtYen(income)}
        </Formula>
        <Formula>
          医療分 = 賦課標準額 × {fmtPercent(NATIONAL_HEALTH_INSURANCE_MEDICAL_RATE)}（所得割）＋ {fmtYen(NATIONAL_HEALTH_INSURANCE_MEDICAL_FLAT)}（均等割）
        </Formula>
        <Formula>
          支援分 = 賦課標準額 × {fmtPercent(NATIONAL_HEALTH_INSURANCE_SUPPORT_RATE)}（所得割）＋ {fmtYen(NATIONAL_HEALTH_INSURANCE_SUPPORT_FLAT)}（均等割）
        </Formula>
        <Formula>月額 = (医療分＋支援分) ÷ 12 = {fmtYen(amount)}</Formula>
        <p className="explain-note">介護分（40歳以上）は考慮していません。</p>
      </Explanation>
    );
  }
  if (kind === 'pension') {
    return (
      <Explanation links={[REF.kokuminNenkin]}>
        <p>社会保険の扶養に入れないため、国民年金（第1号被保険者）の保険料が発生します。2024年度は月額一律です。</p>
        <Formula>{fmtYen(NATIONAL_PENSION_MONTHLY)}（定額） = {fmtYen(amount)}</Formula>
      </Explanation>
    );
  }
  return (
    <Explanation>
      <p>週の所定労働時間が{SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD}時間未満のため、雇用保険には加入していません。</p>
    </Explanation>
  );
}

/** 所得税の説明（課税所得の組み立てから月額まで） */
export function explainIncomeTax(calc: PersonCalculationBreakdown, monthlyDisplayed: number): ReactNode {
  const t = calc.incomeTax;
  return (
    <Explanation links={[REF.kyuyoShotokuKoujo, REF.shotokuzeiRate, REF.fukkoTokubetsu, REF.haigushaKoujo, REF.fuyouKoujo]}>
      <p>
        給与所得控除・社会保険料控除・基礎控除（・配偶者控除や扶養控除があればそれも）を年収から差し引いた課税所得に、累進税率をかけて年税額を求め、復興特別所得税2.1%を上乗せしたものを12等分した源泉徴収ベースの概算です。
      </p>
      <Formula>① 給与所得控除：{describeSalaryDeductionBracket(t.annualBase)} = {fmtYen(t.salaryDeduction)}</Formula>
      <Formula>② 社会保険料控除（年額）：{fmtYen(t.socialInsuranceDeductionAnnual)}</Formula>
      <Formula>③ 基礎控除：{fmtYen(t.basicDeduction)}</Formula>
      <Formula>④ 配偶者控除・扶養控除の合計：{fmtYen(t.additionalDeduction)}</Formula>
      <Formula>
        ⑤ 課税所得 = max(0, {fmtYen(t.annualBase)} － {fmtYen(t.salaryDeduction)} － {fmtYen(t.socialInsuranceDeductionAnnual)} － {fmtYen(t.basicDeduction)} － {fmtYen(t.additionalDeduction)}) = {fmtYen(t.taxableIncome)}
      </Formula>
      <Formula>
        ⑥ 年税額（復興特別所得税上乗せ前）：{describeIncomeTaxBracket(t.taxableIncome)} = {fmtYen(t.annualTaxBeforeSurtax)}
      </Formula>
      <Formula>
        ⑦ 復興特別所得税を上乗せ：{fmtYen(t.annualTaxBeforeSurtax)} × {(1 + RECONSTRUCTION_SURTAX_RATE).toLocaleString('ja-JP')} = {fmtYen(t.annualTaxWithSurtax)}
      </Formula>
      <Formula>
        ⑧ 月額 = {fmtYen(t.annualTaxWithSurtax)} ÷ 12 = {fmtYen(monthlyDisplayed)}
      </Formula>
      <p className="explain-note">
        ※ 賞与にかかる所得税は別枠（賞与額の一律5%概算）で計算しており、上記の年収には含めていません。実際の源泉徴収税額表とは異なる簡易計算です。
      </p>
    </Explanation>
  );
}

/** 住民税の説明 */
export function explainResidenceTax(calc: PersonCalculationBreakdown, monthlyDisplayed: number): ReactNode {
  const t = calc.residenceTax;
  return (
    <Explanation links={[REF.kyuyoShotokuKoujo, REF.juuminzei, REF.haigushaKoujo, REF.fuyouKoujo]}>
      <p>
        給与所得控除・社会保険料控除・基礎控除等を差し引いた課税所得に、所得割10%をかけ、均等割（年額）を足したものを12等分した概算です。
      </p>
      <Formula>① 給与所得控除：{describeSalaryDeductionBracket(t.annualBase)} = {fmtYen(t.salaryDeduction)}</Formula>
      <Formula>② 社会保険料控除（年額）：{fmtYen(t.socialInsuranceDeductionAnnual)}</Formula>
      <Formula>③ 基礎控除（住民税）：{fmtYen(t.basicDeduction)}</Formula>
      <Formula>④ 配偶者控除・扶養控除の合計：{fmtYen(t.additionalDeduction)}</Formula>
      <Formula>
        ⑤ 課税所得 = max(0, {fmtYen(t.annualBase)} － {fmtYen(t.salaryDeduction)} － {fmtYen(t.socialInsuranceDeductionAnnual)} － {fmtYen(t.basicDeduction)} － {fmtYen(t.additionalDeduction)}) = {fmtYen(t.taxableIncome)}
      </Formula>
      <Formula>
        ⑥ 所得割＋均等割 = {fmtYen(t.taxableIncome)} × {fmtPercent(RESIDENCE_TAX_INCOME_RATE)} ＋ {fmtYen(RESIDENCE_TAX_PER_CAPITA)} = {fmtYen(t.annualResidenceTax)}
      </Formula>
      <Formula>
        ⑦ 月額 = {fmtYen(t.annualResidenceTax)} ÷ 12 = {fmtYen(monthlyDisplayed)}
      </Formula>
      <p className="explain-note">
        ※ 本来、住民税は前年の所得をもとに翌年度課税されますが、この試算では同一年の所得にそのまま課税したものとして概算しています。
      </p>
    </Explanation>
  );
}

/** 扶養状態バッジ（103万円・130万円の壁）の説明 */
export function explainDependentStatus(result: SimulationResult): ReactNode {
  const income = result.dependentCandidateAnnualIncome;
  const hours = result.dependentCandidateWeeklyHours;
  return (
    <Explanation links={[REF.hifuyoushaNintei, REF.haigushaKoujo]}>
      <p>扶養判定の対象者の年収・週労働時間と、2つの基準を比較しています。</p>
      <Formula>
        社会保険の扶養（130万円の壁）：年収 &lt; {fmtYen(SOCIAL_INSURANCE_DEPENDENT_INCOME_THRESHOLD)} かつ 週労働時間 &lt; {SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD}時間
        <br />
        → {fmtYen(income)} {income < SOCIAL_INSURANCE_DEPENDENT_INCOME_THRESHOLD ? '＜' : '≥'} {fmtYen(SOCIAL_INSURANCE_DEPENDENT_INCOME_THRESHOLD)}、{hours}時間 {hours < SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD ? '＜' : '≥'} {SOCIAL_INSURANCE_WEEKLY_HOURS_THRESHOLD}時間 → 判定：
        {result.socialInsuranceDependent ? '扶養に入る' : '扶養に入らない'}
      </Formula>
      <Formula>
        配偶者控除（103万円の壁）：年収 ≤ {fmtYen(TAX_DEPENDENT_INCOME_THRESHOLD)}
        <br />
        → {fmtYen(income)} {income <= TAX_DEPENDENT_INCOME_THRESHOLD ? '≤' : '＞'} {fmtYen(TAX_DEPENDENT_INCOME_THRESHOLD)} → 判定：{result.taxDependent ? '対象' : '対象外'}
      </Formula>
      <p className="explain-note">
        ※ この試算では配偶者特別控除（103万円超〜150万円台での段階的な控除）や、106万円の壁（勤務先の従業員数要件に基づく社会保険加入義務）は考慮していません。
      </p>
    </Explanation>
  );
}

/** 配偶者以外の扶養控除（主に子）の説明 */
export function explainDependentsDeduction(): ReactNode {
  return (
    <Explanation links={[REF.fuyouKoujo]}>
      <p>配偶者以外の扶養親族（主に子）がいる場合、1人あたり定額の扶養控除が所得税・住民税それぞれの課税所得から差し引かれます。</p>
      <Formula>
        所得税：{fmtYen(DEPENDENT_DEDUCTION_INCOME_TAX)} × 人数、住民税：{fmtYen(DEPENDENT_DEDUCTION_RESIDENCE_TAX)} × 人数
      </Formula>
      <p className="explain-note">
        ※ 実際の税法には特定扶養親族（19〜22歳、63万円）・老人扶養親族（70歳以上、48万/58万円）・16歳未満（控除なし）といった年齢区分がありますが、この試算では考慮せず一律の金額で概算しています。配偶者控除（{fmtYen(SPOUSE_DEDUCTION_INCOME_TAX)}／{fmtYen(SPOUSE_DEDUCTION_RESIDENCE_TAX)}）とは別枠で、両方同時に適用され得ます。
      </p>
    </Explanation>
  );
}

/** 支出分担方法の説明 */
export function explainExpenseSharing(result: SimulationResult, params: SimulatorParams): ReactNode {
  if (params.sharingMethod === 'percentage') {
    return (
      <Explanation>
        <p>共通支出を、指定した割合で配偶者・本人の間で分担します。</p>
        <Formula>
          配偶者の負担 = 共通支出合計 × {params.spouseSharePercent}% = {fmtYen(result.totalSharedExpenses)} × {params.spouseSharePercent}% = {fmtYen(result.spouseExpenseShare)}
        </Formula>
        <Formula>本人の負担 = 共通支出合計 － 配偶者の負担 = {fmtYen(result.totalSharedExpenses)} － {fmtYen(result.spouseExpenseShare)} = {fmtYen(result.primaryExpenseShare)}</Formula>
      </Explanation>
    );
  }
  const senderLabel = params.fixedTransferDirection === 'primaryToSpouse' ? '本人 → 配偶者' : '配偶者 → 本人';
  const payerLabel = params.fixedTransferDirection === 'primaryToSpouse' ? '配偶者' : '本人';
  return (
    <Explanation>
      <p>一方が固定額を相手に送金し、送金を受け取った側が共通支出をすべて支払う想定で分担します。</p>
      <Formula>送金額（固定） = {fmtYen(params.fixedTransferAmount)}（{senderLabel}）</Formula>
      <Formula>
        {payerLabel}の負担 = 共通支出合計 － 送金額 = {fmtYen(result.totalSharedExpenses)} － {fmtYen(params.fixedTransferAmount)} = {fmtYen(
          params.fixedTransferDirection === 'primaryToSpouse' ? result.spouseExpenseShare : result.primaryExpenseShare,
        )}
      </Formula>
    </Explanation>
  );
}
