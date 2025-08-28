import type { WorkSession } from '../types/workSession'

export async function startTimer() {
    const res = await fetch('/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // memo 안 쓰면 빈 객체 보내기
    })
    if (!res.ok) throw new Error('start failed')
    return res.json() as Promise<WorkSession>
}

export async function stopTimer() {
    const res = await fetch('/timer/stop', { method: 'POST' })
    if (!res.ok) throw new Error('stop failed')
    return res.json() as Promise<WorkSession>
}

export async function listThisMonth() {
    const res = await fetch('/timer') // year/month 생략 → 현재 달
    if (!res.ok) throw new Error('list failed')
    return res.json() as Promise<WorkSession[]>
}
