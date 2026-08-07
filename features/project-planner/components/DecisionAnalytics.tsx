import {
  AlertTriangle,
  Check,
  CircleDollarSign,
  Clock3,
  Info,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  PanelHeader,
  SectionCard,
  SummaryCard,
  SummaryGrid,
} from "@/components/ui";
import { currencyFormat } from "@/lib/pricing/formatters.ts";
import {
  selectDecisionAnalytics,
  selectQuoteBreakdown,
} from "@/lib/pricing/selectors.ts";
import type { ProjectPlan, ScenarioCalculation } from "@/lib/pricing/types.ts";

export interface DecisionAnalyticsProps {
  project: ProjectPlan;
  calculation: ScenarioCalculation;
  planningMode: boolean;
}

export function DecisionAnalytics({
  project,
  calculation,
  planningMode,
}: DecisionAnalyticsProps) {
  if (planningMode) return null;

  const analytics = selectDecisionAnalytics(project, calculation);
  const quoteBreakdown = selectQuoteBreakdown(project, calculation);
  const {
    costCoverage,
    effortDeltaHours,
    effortDeltaPercent,
    expenseCostShare,
    grossMarginValue,
    laborCostPerHour,
    laborCostShare,
    markupOnCost,
    serviceRevenuePerHour,
    status,
    targetMarginQuotes,
  } = analytics;

  return (
    <SectionCard
      className="decision-card"
      title="Decision analytics"
      titleId="decision-analytics-title"
    >

      <SummaryGrid className="decision-kpi-grid" ariaLabel="Decision analytics summary">
        <SummaryCard
          className="decision-kpi"
          icon={<TrendingUp size={19} />}
          iconClassName="decision-kpi-icon green"
          label="Gross margin"
          value={grossMarginValue === null ? "—" : `${grossMarginValue.toFixed(1)}%`}
          valueClassName={calculation.grossProfit < 0 ? "negative" : "positive"}
          detail={`${currencyFormat(project.currency, calculation.grossProfit)} gross profit`}
        />
        <SummaryCard
          className="decision-kpi"
          icon={<WalletCards size={19} />}
          iconClassName="decision-kpi-icon violet"
          label="Cost coverage"
          value={costCoverage === null ? "—" : `${costCoverage.toFixed(1)}%`}
          detail={
            markupOnCost === null
              ? "Add modeled costs"
              : `${markupOnCost.toFixed(1)}% markup on cost`
          }
        />
        <SummaryCard
          className="decision-kpi"
          icon={<CircleDollarSign size={19} />}
          iconClassName="decision-kpi-icon"
          label="Service revenue / hour"
          value={
            serviceRevenuePerHour === null
              ? "—"
              : currencyFormat(project.currency, serviceRevenuePerHour)
          }
          detail={
            laborCostPerHour === null
              ? "Add delivery effort"
              : `${currencyFormat(project.currency, laborCostPerHour)} labor cost / hour`
          }
        />
        <SummaryCard
          className="decision-kpi"
          icon={<Clock3 size={19} />}
          iconClassName="decision-kpi-icon orange"
          label="Effort impact"
          value={
            effortDeltaPercent === null
              ? "—"
              : `${effortDeltaPercent >= 0 ? "+" : ""}${effortDeltaPercent.toFixed(1)}%`
          }
          detail={`${effortDeltaHours >= 0 ? "+" : ""}${Math.round(effortDeltaHours)}h from effort modifiers`}
        />
      </SummaryGrid>

      <div className="decision-layout">
        <section className="settings-column decision-panel" aria-labelledby="quote-reconciliation-title">
          <PanelHeader
            title="Quote reconciliation"
            titleId="quote-reconciliation-title"
            subtitle="Every component of the final client quote"
            icon={<CircleDollarSign size={18} />}
            iconTone="commercial"
          />
          <dl className="decision-breakdown">
            {quoteBreakdown.map((item) => (
              <div key={item.label}>
                <dt>
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </dt>
                <dd className={item.value < 0 ? "negative" : ""}>
                  <data value={item.value}>{currencyFormat(project.currency, item.value)}</data>
                </dd>
              </div>
            ))}
            <div className="total">
              <dt>Final quote</dt>
              <dd>
                <data value={calculation.quote}>
                  {currencyFormat(project.currency, calculation.quote)}
                </data>
              </dd>
            </div>
          </dl>
        </section>

        <section className="settings-column decision-panel" aria-labelledby="cost-guide-title">
          <PanelHeader
            title="Cost & pricing guide"
            titleId="cost-guide-title"
            subtitle="Cost mix, break-even and margin targets"
            icon={<TrendingUp size={18} />}
            iconTone="schedule"
            actions={(
              <output
                className={`decision-status ${status.tone}`}
                aria-live="polite"
                aria-atomic="true"
              >
                {status.tone === "safe" ? (
                  <Check size={14} aria-hidden="true" />
                ) : status.tone === "unsafe" ? (
                  <AlertTriangle size={14} aria-hidden="true" />
                ) : (
                  <Info size={14} aria-hidden="true" />
                )}
                {status.label}
              </output>
            )}
          />

          <div className="cost-mix">
            <div className="cost-mix-bar" aria-hidden="true">
              <span className="labor" style={{ width: `${laborCostShare}%` }} />
              <span className="expenses" style={{ width: `${expenseCostShare}%` }} />
            </div>
            <dl className="cost-mix-legend">
              <div>
                <dt>
                  <i className="labor" />
                  Labor cost <small>{laborCostShare.toFixed(1)}%</small>
                </dt>
                <dd>{currencyFormat(project.currency, calculation.laborCost)}</dd>
              </div>
              <div>
                <dt>
                  <i className="expenses" />
                  Expense cost <small>{expenseCostShare.toFixed(1)}%</small>
                </dt>
                <dd>{currencyFormat(project.currency, calculation.expenseCost)}</dd>
              </div>
            </dl>
          </div>

          <dl className="decision-facts">
            <div>
              <dt>Cost floor</dt>
              <dd>{currencyFormat(project.currency, calculation.estimatedCost)}</dd>
            </div>
            <div>
              <dt>{calculation.grossProfit >= 0 ? "Profit headroom" : "Quote shortfall"}</dt>
              <dd className={calculation.grossProfit < 0 ? "negative" : "positive"}>
                {currencyFormat(project.currency, Math.abs(calculation.grossProfit))}
              </dd>
            </div>
          </dl>

          <div className="target-guide">
            <div className="target-guide-heading">
              <strong>Target-margin quote</strong>
              <small>Minimum quote required for each gross margin</small>
            </div>
            <div className="target-guide-grid">
              {targetMarginQuotes.map((target) => (
                <div key={target.margin}>
                  <span>{target.margin}% margin</span>
                  <strong>
                    {target.quote === null
                      ? "—"
                      : currencyFormat(project.currency, target.quote)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </SectionCard>
  );
}
