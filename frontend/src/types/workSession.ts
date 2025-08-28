export interface WorkSession {
    id: number;
    started_at: string;
    ended_at: string | null;
    minutes: number | null;
    memo: string | null;
}
