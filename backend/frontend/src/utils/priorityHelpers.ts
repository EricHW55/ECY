// src/utils/priorityHelpers.ts
import type { PriorityItemOut, PriorityStatus } from "../types/priorityTypes.ts";

export const WEEKS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export const pad2 = (n: number) => n.toString().padStart(2, "0");
export const formatHHMM = (h: number, m: number) => `${pad2(h)}:${pad2(m)}`;
export const formatYM = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}`;

/** 'YYYY-MM-DDTHH:mm:ss' → Date (로컬) */
export const parseNaiveISOString = (iso: string) => new Date(iso.replace(" ", "T"));

export function statusLabel(s: PriorityStatus) {
    return s === "upcoming" ? "임박/예정" : s === "next_week" ? "다음주" : "지남";
}

/** 간단 통계 */
export function computeTotals(items: PriorityItemOut[]) {
    const total = items.length;
    const overdue = items.filter(i => i.status === "overdue").length;
    const nextWeek = items.filter(i => i.status === "next_week").length;
    return { total, overdue, nextWeek };
}

/** 상태 뱃지 style (인라인 스타일용) */
export function badgeStyle(s: PriorityStatus): React.CSSProperties {
    if (s === "upcoming") return { background: "#dbeafe", color: "#1d4ed8" };
    if (s === "next_week") return { background: "#f3f4f6", color: "#374151" };
    return { background: "#fee2e2", color: "#b91c1c" };
}
