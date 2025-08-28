import { useEffect, useState } from 'react'
import type { WorkSession } from '../../types/workSession'
import { startTimer, stopTimer, listThisMonth } from '../../services/timer'

export default function MainPage() {
    const [rows, setRows] = useState<WorkSession[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const reload = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await listThisMonth()
            setRows(data)
        } catch (e: any) {
            setError(e?.message ?? '목록 불러오기 실패')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void reload()
    }, [])

    const onStart = async () => {
        try {
            setLoading(true)
            await startTimer()
            await reload()
        } catch (e: any) {
            setError(e?.message ?? '시작 실패')
        } finally {
            setLoading(false)
        }
    }

    const onStop = async () => {
        try {
            setLoading(true)
            await stopTimer()
            await reload()
        } catch (e: any) {
            setError(e?.message ?? '정지 실패')
        } finally {
            setLoading(false)
        }
    }

    const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('ko-KR') : '-')

    return (
        <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h1>ECY 타이머</h1>

            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onStart} disabled={loading}>시작</button>
                <button onClick={onStop} disabled={loading}>정지</button>
                <button onClick={reload} disabled={loading}>새로고침</button>
            </div>

            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
                <thead>
                <tr><th>ID</th><th>시작</th><th>종료</th><th>분</th><th>메모</th></tr>
                </thead>
                <tbody>
                {rows.map(r => (
                    <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{fmt(r.started_at)}</td>
                        <td>{fmt(r.ended_at)}</td>
                        <td>{r.minutes ?? '-'}</td>
                        <td>{r.memo ?? ''}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}
