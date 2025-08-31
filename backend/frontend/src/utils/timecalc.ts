import type { WorkSession } from '../types/workSession';

export const fmtMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${mins}분`;
    if (m === 0) return `${h}시간`;
    return `${h}시간 ${m}분`;
};

export const minutesBetween = (startISO?: string | null, endISO?: string | null) => {
    if (!startISO || !endISO) return 0;
    const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
    return Math.max(0, Math.floor(ms / 60000));
};

export const calcTotalMinutes = (rows: WorkSession[]) =>
    rows.reduce((sum, r) => {
        if (typeof r.minutes === 'number') return sum + r.minutes;
        return sum + minutesBetween(r.started_at, r.ended_at);
    }, 0);
