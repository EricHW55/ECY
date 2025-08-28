import type { WorkSession } from '../types/workSession'

const API_BASE = import.meta.env.VITE_API_BASE ?? '' // 프록시 쓰면 ''이면 됨.

type Query = Record<string, string | number | boolean | undefined | null>

function qs(params?: Query) {
    if (!params) return ''
    const s = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) s.append(k, String(v))
    })
    const str = s.toString()
    return str ? `?${str}` : ''
}

async function asJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
            const data = await res.json()
            if (data?.detail) msg = data.detail
        } catch {}
        throw new Error(msg)
    }
    return res.json() as Promise<T>
}

export async function startTimer(): Promise<WorkSession> {
    const res = await fetch(`${API_BASE}/timer/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // memo 안 쓰면 빈 바디
    })
    return asJson<WorkSession>(res)
}

export async function stopTimer(): Promise<WorkSession> {
    const res = await fetch(`${API_BASE}/timer/stop`, { method: 'POST' })
    return asJson<WorkSession>(res)
}

export async function listSessions(params?: { year?: number; month?: number }): Promise<WorkSession[]> {
    const res = await fetch(`${API_BASE}/timer${qs(params)}`)
    return asJson<WorkSession[]>(res)
}

export const listThisMonth = () => listSessions()

// (선택) 합계, 수정/삭제도 필요하면 같이 사용
export async function monthlySummary(year: number, month: number) {
    const res = await fetch(`${API_BASE}/timer/summary${qs({ year, month })}`)
    return asJson<{ year: number; month: number; total_minutes: number }>(res)
}

export async function updateSession(
    sid: number,
    body: { started_at: string; ended_at: string; memo?: string | null },
    adminCode?: string
) {
    const res = await fetch(`${API_BASE}/timer/${sid}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...(adminCode ? { 'X-ADMIN-CODE': adminCode } : {}),
        },
        body: JSON.stringify(body),
    })
    return asJson<WorkSession>(res)
}

export async function deleteSession(sid: number, adminCode?: string) {
    const res = await fetch(`${API_BASE}/timer/${sid}`, {
        method: 'DELETE',
        headers: adminCode ? { 'X-ADMIN-CODE': adminCode } : undefined,
    })
    return asJson<{ ok: true }>(res)
}
