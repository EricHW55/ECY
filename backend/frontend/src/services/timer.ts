// src/services/timer.ts
import type { WorkSession } from '../types/workSession';
import { http } from '../lib/http';

// ===== API =====
export const startTimer = () =>
    http.post<WorkSession>('/timer/start');

export const stopTimer = () =>
    http.post<WorkSession>('/timer/stop');

export const listSessions = (p?: { year?: number; month?: number }) =>
    http.get<WorkSession[]>('/timer', p);

export const listThisMonth = () => listSessions();

export const monthlySummary = (year: number, month: number) =>
    http.get<{ year: number; month: number; total_minutes: number }>(
        '/timer/summary',
        { year, month },
    );

export const updateSession = (
    sid: number,
    body: { started_at: string; ended_at: string | null; memo?: string | null },
    adminCode?: string,
) =>
    http.put<WorkSession>(`/timer/${sid}`, body, adminCode ? { 'X-ADMIN-CODE': adminCode } : undefined);

export const deleteSession = (sid: number, adminCode?: string) =>
    http.del<{ ok: true }>(`/timer/${sid}`, adminCode ? { 'X-ADMIN-CODE': adminCode } : undefined);
