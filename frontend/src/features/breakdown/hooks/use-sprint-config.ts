"use client";

import { useState } from "react";

import { defaultSprintStart, calculateSprintDates, type SprintWindow } from "../lib/sprint-dates";

export interface SprintConfig {
  sprintStart: Date;
  setSprintStart: (d: Date) => void;
  sprintWindows: SprintWindow[];
}

export function useSprintConfig(): SprintConfig {
  const [sprintStart, setSprintStart] = useState<Date>(defaultSprintStart);
  const sprintWindows = calculateSprintDates(sprintStart);
  return { sprintStart, setSprintStart, sprintWindows };
}
