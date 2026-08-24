import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * The one card shape for the app. Every page that hand-rolled its own
 * bordered box should use this instead — see the shared-primitives audit.
 * `as` picks the rendered tag (e.g. "article" for a day of an itinerary)
 * without changing the shape.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode; as?: ElementType }) {
  return (
    <Tag className={`wg-card border border-[var(--gold-light)] bg-white p-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// A card whose whole point is to demand attention — a problem, not a place
// to browse. Keep this distinct from Card so "urgent" never blends into
// "informational": see AGENTS.md "Needs Attention design".
export function AlertCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-amber-300 bg-amber-50 p-5 ${className}`}>
      {children}
    </div>
  );
}
