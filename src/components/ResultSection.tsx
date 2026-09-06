import type { ReactNode } from 'react';
import type { SimulationResult, SimulatorParams } from '../types';
import { fmtYen as fmt, fmtYenDiff as fmtDiff } from '../format';
import { InfoTooltip } from './InfoTooltip';
import {
  explainChildcareFee,
  explainDependentStatus,
  explainDependentsDeduction,
  explainExpenseSharing,
  explainIncomeTax,
  explainResidenceTax,
  explainSocialInsurance,
} from './explanations';

interface Props {
  result: SimulationResult;
  title: string;
  params: SimulatorParams;
}

function Row({
  label,
  value,
  highlight,
  info,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  info?: ReactNode;
}) {
  return (
    <tr className={highlight ? 'row-highlight' : undefined}>
      <td className="row-label">
        {label}
        {info}
      </td>
      <td className="row-value">{value}</td>
    </tr>
  );
}

export function ResultSection({ result, title, params }: Props) {
  const balanceClass = result.householdMonthlyBalance >= 0 ? 'balance-positive' : 'balance-negative';
  const candidateLabel = result.dependentCandidate === 'primary' ? '本人' : '配偶者';
  const dependentStatusInfo = explainDependentStatus(result);

  return (
    <div className="result-section">
      <h2 className="result-title">{title}</h2>

      {/* 扶養状態バッジ */}
      <div className="badges">
        {result.socialInsuranceDependent && (
          <span className="badge badge-blue">
            {candidateLabel}：社保扶養（第3号）
            <InfoTooltip label="社保扶養の判定について">{dependentStatusInfo}</InfoTooltip>
          </span>
        )}
        {result.taxDependent && (
          <span className="badge badge-green">
            {candidateLabel}：配偶者控除対象（103万円以下）
            <InfoTooltip label="配偶者控除の判定について">{dependentStatusInfo}</InfoTooltip>
          </span>
        )}
        {!result.socialInsuranceDependent && !result.taxDependent && (
          <span className="badge badge-gray">
            {candidateLabel}：扶養外
            <InfoTooltip label="扶養判定について">{dependentStatusInfo}</InfoTooltip>
          </span>
        )}
      </div>

      {/* 収入テーブル */}
      <h3>収入</h3>
      <table className="result-table">
        <tbody>
          <Row label="配偶者 月給（総支給）" value={fmt(result.spouseGrossMonthly)} />
          <Row label="配偶者 控除合計" value={`-${fmt(result.spouseDeductions.total)}`} />
          <Row
            label="　健康保険料"
            value={`-${fmt(result.spouseDeductions.healthInsurance)}`}
            info={
              <InfoTooltip label="配偶者の健康保険料の計算式について">
                {explainSocialInsurance(result.spouseCalculation, 'health', result.spouseDeductions.healthInsurance)}
              </InfoTooltip>
            }
          />
          <Row
            label="　厚生年金"
            value={`-${fmt(result.spouseDeductions.welfarePension)}`}
            info={
              <InfoTooltip label="配偶者の年金保険料の計算式について">
                {explainSocialInsurance(result.spouseCalculation, 'pension', result.spouseDeductions.welfarePension)}
              </InfoTooltip>
            }
          />
          <Row
            label="　雇用保険"
            value={`-${fmt(result.spouseDeductions.employmentInsurance)}`}
            info={
              <InfoTooltip label="配偶者の雇用保険料の計算式について">
                {explainSocialInsurance(result.spouseCalculation, 'employment', result.spouseDeductions.employmentInsurance)}
              </InfoTooltip>
            }
          />
          <Row
            label="　所得税"
            value={`-${fmt(result.spouseDeductions.incomeTax)}`}
            info={
              <InfoTooltip label="配偶者の所得税の計算式について">
                {explainIncomeTax(result.spouseCalculation, result.spouseDeductions.incomeTax)}
              </InfoTooltip>
            }
          />
          <Row
            label="　住民税（概算）"
            value={`-${fmt(result.spouseDeductions.residenceTax)}`}
            info={
              <InfoTooltip label="配偶者の住民税の計算式について">
                {explainResidenceTax(result.spouseCalculation, result.spouseDeductions.residenceTax)}
              </InfoTooltip>
            }
          />
          <Row label="配偶者 手取り月収" value={fmt(result.spouseNetMonthly)} highlight />
          <tr><td colSpan={2} className="row-separator" /></tr>
          <Row label="本人 月給（総支給）" value={fmt(result.primaryGrossMonthly)} />
          <Row label="本人 控除合計" value={`-${fmt(result.primaryDeductions.total)}`} />
          <Row
            label="　健康保険料"
            value={`-${fmt(result.primaryDeductions.healthInsurance)}`}
            info={
              <InfoTooltip label="本人の健康保険料の計算式について">
                {explainSocialInsurance(result.primaryCalculation, 'health', result.primaryDeductions.healthInsurance)}
              </InfoTooltip>
            }
          />
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
            info={
              <InfoTooltip label="本人の年金保険料の計算式について">
                {explainSocialInsurance(result.primaryCalculation, 'pension', result.primaryDeductions.welfarePension)}
              </InfoTooltip>
            }
          />
          <Row
            label="　雇用保険"
            value={`-${fmt(result.primaryDeductions.employmentInsurance)}`}
            info={
              <InfoTooltip label="本人の雇用保険料の計算式について">
                {explainSocialInsurance(result.primaryCalculation, 'employment', result.primaryDeductions.employmentInsurance)}
              </InfoTooltip>
            }
          />
          <Row
            label="　所得税"
            value={`-${fmt(result.primaryDeductions.incomeTax)}`}
            info={
              <InfoTooltip label="本人の所得税の計算式について">
                {explainIncomeTax(result.primaryCalculation, result.primaryDeductions.incomeTax)}
              </InfoTooltip>
            }
          />
          <Row
            label="　住民税（概算）"
            value={`-${fmt(result.primaryDeductions.residenceTax)}`}
            info={
              <InfoTooltip label="本人の住民税の計算式について">
                {explainResidenceTax(result.primaryCalculation, result.primaryDeductions.residenceTax)}
              </InfoTooltip>
            }
          />
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
          <Row
            label="　うち保育料"
            value={fmt(result.childcareFee)}
            info={
              <InfoTooltip label="保育料の計算について">{explainChildcareFee(result, params)}</InfoTooltip>
            }
          />
          <Row
            label="　配偶者の負担"
            value={fmt(result.spouseExpenseShare)}
            info={
              <InfoTooltip label="支出分担の計算式について">{explainExpenseSharing(result, params)}</InfoTooltip>
            }
          />
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

      {params.dependentsCount > 0 && (
        <p className="section-note">
          扶養控除（{params.dependentsClaimedBy === 'primary' ? '本人' : '配偶者'}が受給、{params.dependentsCount}人）
          <InfoTooltip label="扶養控除（子など）の計算式について">{explainDependentsDeduction()}</InfoTooltip>
          は上記の所得税・住民税の内訳に含まれています。
        </p>
      )}

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
