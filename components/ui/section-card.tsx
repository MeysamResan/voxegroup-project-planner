import {
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { SectionHeader } from "./panel";
import { cn } from "./utils";

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  headingLevel?: 1 | 2 | 3;
  as?: "section" | "article" | "div";
}

export function SectionCard({
  actions,
  as: Element = "section",
  children,
  className,
  description,
  eyebrow,
  headingLevel = 2,
  title,
  titleId,
  ...props
}: SectionCardProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;

  return (
    <Element
      {...props}
      className={cn("glass-panel", "ui-section-card", className)}
      aria-labelledby={props["aria-labelledby"] ?? resolvedTitleId}
    >
      <SectionHeader
        title={title}
        titleId={resolvedTitleId}
        description={description}
        eyebrow={eyebrow}
        actions={actions}
        headingLevel={headingLevel}
      />
      {children}
    </Element>
  );
}
