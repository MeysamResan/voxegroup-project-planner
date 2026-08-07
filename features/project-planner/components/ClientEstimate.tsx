import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { currencyFormat, friendlyDate, initials } from "@/lib/pricing/formatters.ts";
import type { Person, ProjectPlan, ScenarioCalculation } from "@/lib/pricing/types.ts";

export interface ClientEstimateProps {
  project: ProjectPlan;
  people: Person[];
  calculation: ScenarioCalculation;
  planningMode: boolean;
}

export function ClientEstimate({
  project,
  people,
  calculation,
  planningMode,
}: ClientEstimateProps) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const phaseResultsById = new Map(
    calculation.phaseResults.map((result) => [result.id, result]),
  );

  return (
    <section className={`client-sheet glass-panel ${planningMode ? "planning-sheet" : ""}`}>
      <div className={`client-hero ${planningMode ? "planning" : ""}`}>
        <div>
          <p className="eyebrow">{planningMode ? "Team planning brief" : "Project estimate"}</p>
          <h1>{project.projectName || "Untitled project"}</h1>
          <p>
            A structured delivery {planningMode ? "plan" : "estimate"} covering{" "}
            {project.phases.length} phases, from kickoff through launch.
          </p>
        </div>
        {!planningMode && (
          <div className="client-price">
            <span>Estimated investment</span>
            <strong>{currencyFormat(project.currency, calculation.quote)}</strong>
            <small>Prepared by Voxe Group</small>
          </div>
        )}
      </div>

      {planningMode && (
        <div className="planning-print-note">
          <EyeOff size={16} />
          <span>Pricing intentionally omitted for team planning.</span>
        </div>
      )}

      <div className="client-metrics">
        <div>
          <CalendarDays size={18} />
          <span>{calculation.totalWorkingDays} working days</span>
        </div>
        <div>
          <Clock3 size={18} />
          <span>{calculation.calendarDays} calendar days</span>
        </div>
        <div>
          <Sparkles size={18} />
          <span>{Math.round(calculation.totalHours)} delivery hours</span>
        </div>
        <div>
          <BriefcaseBusiness size={18} />
          <span>
            {friendlyDate(calculation.projectStart)} – {friendlyDate(calculation.projectEnd)}
          </span>
        </div>
      </div>

      <div className="client-phase-list">
        <div className="client-phase-head">
          <span>Delivery phase</span>
          <span>Timeline</span>
          <span>Team</span>
        </div>
        {project.phases.map((phase, index) => {
          const result = phaseResultsById.get(phase.id);

          return (
            <div className="client-phase" key={phase.id}>
              <div>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <strong>{phase.name}</strong>
              </div>
              <span>
                {phase.days} workdays
                <br />
                <small>
                  {friendlyDate(result?.start ?? "")} – {friendlyDate(result?.end ?? "")}
                </small>
              </span>
              <div className="mini-avatar-stack">
                {phase.assignments.map((assignment) => {
                  const person = peopleById.get(assignment.personId);
                  return person ? (
                    <i key={person.id} style={{ background: person.color }} title={person.role}>
                      {initials(person.name)}
                    </i>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="client-footer">
        <span>
          {planningMode
            ? "Generated locally • Private team planning brief"
            : "Generated locally • Confidential estimate"}
        </span>
        <strong>Voxe Group</strong>
      </footer>
    </section>
  );
}
