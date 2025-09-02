import type { PriorityItemOut } from "../types/priorityTypes";
import { WEEKS, formatHHMM, parseNaiveISOString, pad2 } from "./priorityHelpers";

export function dueTextOf(it: Pick<PriorityItemOut,"due_weekday"|"due_hour"|"due_minute">) {
    return `${WEEKS[it.due_weekday]} ${formatHHMM(it.due_hour, it.due_minute)}`;
}

export function remainTextOf(mins: number) {
    return mins >= 0 ? `${mins}분 후` : `${Math.abs(mins)}분 지남`;
}

export function effectiveDisplayOf(iso: string) {
    const d = parseNaiveISOString(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function parseLinksInput(s: string) {
    return s.split(",").map(v => v.trim()).filter(Boolean);
}
