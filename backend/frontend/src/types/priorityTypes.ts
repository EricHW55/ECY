// src/types/priorityTypes.ts
export type Flags = Record<string, boolean>;
export type PriorityStatus = "upcoming" | "overdue" | "next_week";

export interface PriorityItemOut {
    id: number;
    book: string;
    due_weekday: number;   // 0=월 ... 6=일
    due_hour: number;      // 0~23
    due_minute: number;    // 0~59
    flags: Flags;
    links: string[];
    memo?: string | null;
    completed_week_start?: string | null;

    effective_due_at: string; // KST naive ISO ("YYYY-MM-DDTHH:mm:ss")
    status: PriorityStatus;
    minutes_until_due: number;
}

export interface CreatePriorityPayload {
    book: string;
    due_weekday: number;
    due_hour: number;
    due_minute: number;
    flags: Flags;
    links: string[];
    memo?: string | null;
}
