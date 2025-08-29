import { useEffect, useMemo, useState } from 'react'
import type { WorkSession } from '../../types/workSession'
import { startTimer, stopTimer, listThisMonth } from '../../services/timer'
import { fmtYM, fmtMD, fmtHMS } from '../../utils/datetime'

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

    const isRunning = useMemo(() => rows.some(r => !r.ended_at), [rows])

    const headerYM = rows[0] ? fmtYM(rows[0].started_at) : fmtYM(new Date())

    const fmtMinutes = (mins: number) => {
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h === 0) return `${mins}분`
        if (m === 0) return `${h}시간`
        return `${h}시간 ${m}분`
    }

    const totalMinutes = useMemo(() => {
        return rows.reduce((sum, r) => {
            if (typeof r.minutes === 'number') return sum + r.minutes
            if (r.started_at && r.ended_at) {
                const ms = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()
                return sum + Math.max(0, Math.floor(ms / 60000))
            }
            return sum
        }, 0)
    }, [rows])

    const onStart = async () => {
        try {
            setLoading(true)
            setError(null)
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
            setError(null)
            await stopTimer()
            await reload()
        } catch (e: any) {
            setError(e?.message ?? '정지 실패')
        } finally {
            setLoading(false)
        }
    }

    const headerCells = ['날짜', '시작', '종료', '시간']

    return (
        <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ marginBottom: 8, textAlign: 'center' }}>ECY 알바 타이머</h1>

            {/* 좌: YYYY.MM(조금 오른쪽으로), 우: 총합(조금 왼쪽으로) */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    marginBottom: 12,
                    paddingLeft: 12,   // YYYY.MM 살짝 오른쪽
                    paddingRight: 12,  // 총합 살짝 왼쪽
                }}
            >
                <strong style={{ fontSize: 18, color: '#444' }}>{headerYM}</strong>
                <strong
                    style={{
                        marginLeft: 'auto',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#222',
                    }}
                >
                    총합: {fmtMinutes(totalMinutes)}
                </strong>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onStart} disabled={loading || isRunning}>시작</button>
                <button onClick={onStop} disabled={loading || !isRunning}>정지</button>
                <button onClick={reload} disabled={loading}>새로고침</button>
            </div>

            {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

            <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                    {headerCells.map((label) => (
                        <th key={label} style={{ padding: '8px 4px' }}>{label}</th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {rows.length > 0
                    ? rows.map((r) => {
                        const running = !r.ended_at
                        const minutes =
                            typeof r.minutes === 'number'
                                ? r.minutes
                                : (r.started_at && r.ended_at
                                    ? Math.max(
                                        0,
                                        Math.floor(
                                            (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000
                                        )
                                    )
                                    : 0)

                        return (
                            <tr
                                key={r.id}
                                style={{
                                    borderBottom: '1px solid #f0f0f0',
                                    background: running ? 'rgba(255, 215, 0, 0.08)' : undefined,
                                }}
                            >
                                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{fmtMD(r.started_at)}</td>
                                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{fmtHMS(r.started_at)}</td>
                                <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{fmtHMS(r.ended_at)}</td>
                                <td style={{ padding: '6px 4px' }}>
                                    {running ? '…' : fmtMinutes(minutes)}
                                </td>
                            </tr>
                        )
                    })
                    : (!loading && (
                        <tr>
                            <td colSpan={4} style={{ padding: 12, color: '#666' }}>
                                이번 달 기록이 없습니다.
                            </td>
                        </tr>
                    ))
                }
                </tbody>
            </table>
        </div>
    )
}
