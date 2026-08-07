import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import { SummaryCard, SummaryGrid } from "@/components/ui";
import { currencyFormat, friendlyDate } from "@/lib/pricing/formatters.ts";
import {
  selectAssignedPeopleCount,
  selectVisibleWarnings,
} from "@/lib/pricing/selectors.ts";
import type { Person, ProjectPlan, ScenarioCalculation } from "@/lib/pricing/types.ts";

export interface OverviewMetricsProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
}

export function OverviewMetrics({
  project,
  people,
  calculation,
  planningMode,
}: OverviewMetricsProps) {
  const assignedPeopleCount = selectAssignedPeopleCount(project, people);
  const visibleWarnings = selectVisibleWarnings(calculation, planningMode);

  return (
    <>
      <SummaryGrid
        as="section"
        ariaLabel="Project overview"
        className={`metric-grid ${planningMode ? "planning-metrics" : "pricing-metrics"}`}
      >
        {planningMode ? (
          <>
            <SummaryCard
              className="metric-card glass-panel"
              tone="featured"
              icon={<CalendarDays size={20} />}
              iconClassName="metric-icon green"
              label="Delivery plan"
              value={`${calculation.totalWorkingDays} days`}
              detail={(
                <>{project.phases.length} phases • ends {friendlyDate(calculation.projectEnd)}</>
              )}
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<Clock3 size={20} />}
              iconClassName="metric-icon violet"
              label="Calendar span"
              value={`${calculation.calendarDays} days`}
              detail={(
                <>{friendlyDate(calculation.projectStart)} → {friendlyDate(calculation.projectEnd)}</>
              )}
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<Sparkles size={20} />}
              iconClassName="metric-icon"
              label="Scheduled effort"
              value={`${Math.round(calculation.totalHours)}h`}
              detail="Across all delivery phases"
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<Users size={20} />}
              iconClassName="metric-icon orange"
              label="Assigned team"
              value={assignedPeopleCount}
              detail={`${people.length} people available`}
            />
          </>
        ) : (
          <>
            <SummaryCard
              className="metric-card glass-panel"
              tone="featured"
              icon={<CircleDollarSign size={20} />}
              iconClassName="metric-icon"
              label="Client quote"
              value={currencyFormat(project.currency, calculation.quote, true)}
              decoration={<TrendingUp size={18} className="metric-corner" />}
              detail={`${currencyFormat(project.currency, project.baseHourlyPrice)} base price / hour`}
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<WalletCards size={20} />}
              iconClassName="metric-icon violet"
              label="Estimated cost"
              value={currencyFormat(project.currency, calculation.estimatedCost, true)}
              detail="Labor and internal expenses"
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<TrendingUp size={20} />}
              iconClassName="metric-icon green"
              label="Gross profit"
              value={currencyFormat(project.currency, calculation.grossProfit, true)}
              valueClassName={calculation.grossProfit < 0 ? "negative" : "positive"}
              detail={`${calculation.grossMargin.toFixed(1)}% gross margin`}
            />
            <SummaryCard
              className="metric-card glass-panel"
              icon={<CalendarDays size={20} />}
              iconClassName="metric-icon orange"
              label="Delivery"
              value={`${calculation.totalWorkingDays} days`}
              detail={(
                <>{friendlyDate(calculation.projectEnd)} • {Math.round(calculation.totalHours)}h</>
              )}
            />
          </>
        )}
      </SummaryGrid>

      {visibleWarnings.length > 0 && (
        <section className="warning-strip glass-panel">
          <AlertTriangle size={18} />
          <div>
            <strong>{planningMode ? "Planning check" : "Pricing check"}</strong>
            <span>{visibleWarnings.join(" ")}</span>
          </div>
        </section>
      )}
    </>
  );
}
