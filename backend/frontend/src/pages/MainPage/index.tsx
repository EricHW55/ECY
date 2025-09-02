import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkSession } from '../../types/workSession';
import { startTimer, stopTimer, listSessions } from '../../services/timer';
import { fmtYM, fmtMD, fmtHMS } from '../../utils/datetime';
import { fmtMinutes, calcTotalMinutes, minutesBetween } from '../../utils/timecalc';

export default function MainPage() {
    // 선택된 연/월 상태
    const now = new Date();
    const [ym, setYM] = useState<{ year: number; month: number }>({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    });

    const [rows, setRows] = useState<WorkSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getErrorMessage = (e: unknown) =>
        e instanceof Error ? e.message : String(e);

    // 데이터 리로드
    const reload = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await listSessions({ year: ym.year, month: ym.month });
            setRows(data);
        } catch (e: unknown) {
            setError(getErrorMessage(e) ?? '목록 불러오기 실패');
        } finally {
            setLoading(false);
        }
    }, [ym.year, ym.month]); // ← ym에 의존
    useEffect(() => {
        void reload();
    }, [reload]);

    // 연 월 선택창 이전 정보 저장
    const prevYMRef = useRef<{ year: number; month: number }>(ym);
    useEffect(() => {
        prevYMRef.current = ym;
    }, [ym.year, ym.month]);


    // 진행 여부/총합
    const isRunning = useMemo(() => rows.some(r => !r.ended_at), [rows]);
    const totalMinutes = useMemo(() => calcTotalMinutes(rows), [rows]);

    // month 피커용
    const monthInputRef = useRef<HTMLInputElement>(null);
    const openMonthPicker = () => {
        const el = monthInputRef.current;
        if (!el) return;

        if (typeof el.showPicker === 'function') {
            el.showPicker();   // Chromium: 네이티브 month picker
        } else {
            el.focus();
            el.click();        // 기타 브라우저: 기본 동작
        }
    };
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthValue = `${ym.year}-${pad(ym.month)}`;

    const isOtherMonth = (ym: {year: number; month: number}) => {
        const now = new Date();
        return ym.year !== now.getFullYear() || ym.month !== now.getMonth() + 1;
    };

    const toThisMonth = (setYM: (v:{year:number; month:number}) => void) => {
        const now = new Date();
        setYM({ year: now.getFullYear(), month: now.getMonth() + 1 });
    };

    const onStart = async () => {
        try {
            setLoading(true);
            setError(null);

            await startTimer(); // 서버에 실제 시작 기록

            if (isOtherMonth(ym)) {
                // 다른 달을 보고 있었다면 → 이번 달로 이동
                toThisMonth(setYM); // <- ym 변경 → useEffect가 reload() 호출
            } else {
                // 이미 이번 달이면 바로 새로고침
                await reload();
            }
        } catch (e: unknown) {
            setError(getErrorMessage(e) ?? '시작 실패');
        } finally {
            setLoading(false);
        }
    };

    const onStop = async () => {
        try {
            setLoading(true);
            setError(null);
            await stopTimer();
            await reload();
        } catch (e: unknown) {
            setError(getErrorMessage(e) ?? '정지 실패');
        } finally {
            setLoading(false);
        }
    };

    const headerCells = ['날짜', '시작', '종료', '시간'];

    return (
        <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ marginBottom: 8, textAlign: 'center' }}>ECY 알바 타이머</h1>

            {/* 좌: YYYY.MM 버튼(월 선택), 우: 총합 */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    marginBottom: 12,
                    paddingLeft: 12,
                    paddingRight: 12,
                    gap: 8,
                }}
            >
                <button
                    onClick={openMonthPicker}
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#444',
                        border: '1px solid #ddd',
                        background: '#fff',
                        borderRadius: 8,
                        padding: '4px 10px',
                        cursor: 'pointer',
                    }}
                    aria-label="월 선택"
                    title="월 선택"
                >
                    {fmtYM(new Date(ym.year, ym.month - 1, 1))}
                </button>

                {/* 화면에 보이지 않는 month input (네이티브 피커) */}
                <input
                    ref={monthInputRef}
                    type="month"
                    value={monthValue}
                    onChange={(e) => {
                        const v = e.target.value;       // '' or 'YYYY-MM'
                        if (!v) {
                            // 지우기 방지: 이전 값으로 되돌림
                            const p = prevYMRef.current;
                            e.target.value = `${p.year}-${String(p.month).padStart(2,'0')}`;
                            return;
                        }
                        const [y, m] = e.target.value.split('-').map(Number);
                        setYM({ year: y, month: m });
                    }}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                />

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
                <button onClick={() => reload()} disabled={loading}>새로고침</button>
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
                        const running = !r.ended_at;
                        const minutes =
                            typeof r.minutes === 'number'
                                ? r.minutes
                                : minutesBetween(r.started_at, r.ended_at);

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
                        );
                    })
                    : (!loading && (
                        <tr>
                            <td colSpan={4} style={{ padding: 12, color: '#666' }}>
                                이번 달 기록이 없습니다.
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
