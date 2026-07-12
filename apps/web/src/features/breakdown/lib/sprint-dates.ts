/** Returns the next Monday on or after today. */
export function defaultSprintStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d;
}

export interface SprintWindow {
  sprint: number;
  startDate: Date;
  endDate: Date;
}

/** Returns 4 consecutive 7-day sprint windows starting from `start`. */
export function calculateSprintDates(start: Date): SprintWindow[] {
  return Array.from({ length: 4 }, (_, i) => {
    const startDate = new Date(start);
    startDate.setDate(startDate.getDate() + i * 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return { sprint: i + 1, startDate, endDate };
  });
}

/** Returns ISO date string for the last day of the sprint window for `sprintOrder`. */
export function sprintOrderToDate(start: Date, sprintOrder: number): string {
  const end = new Date(start);
  end.setDate(end.getDate() + (sprintOrder - 1) * 7 + 6);
  return end.toISOString().slice(0, 10);
}

export function formatSprintRange(window: SprintWindow): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Sprint ${window.sprint} · ${fmt(window.startDate)} – ${fmt(window.endDate)}`;
}
