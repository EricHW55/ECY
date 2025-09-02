// src/pages/PriorityPage/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
    listPriorityItems,
    createPriorityItem,
    deletePriorityItem,
    completePriorityItem,
    uncompletePriorityItem,
} from "../../services/priorityApi";
import type { CreatePriorityPayload, PriorityItemOut } from "../../types/priorityTypes";

import { badgeStyle, statusLabel, computeTotals } from "../../utils/priorityHelpers";
import { getAdminCode, setAdminCode, clearAdminCode } from "../../utils/adminHeaders";
import { useIsNarrow } from "../../utils/responsive";
import { dueTextOf, remainTextOf, effectiveDisplayOf, parseLinksInput } from "../../utils/priorityUi";
import { DEFAULT_CREATE_PAYLOAD } from "../../types/priorityDefaults";
import { control } from "./styles";

export default function PriorityPage() {
    const narrow = useIsNarrow(420);

    const [items, setItems] = useState<PriorityItemOut[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [q, setQ] = useState("");

    const [admin, setAdmin] = useState<string | null>(getAdminCode());
    const [needAdmin, setNeedAdmin] = useState(false);

    // DEFAULT는 얕은 복사로 새 인스턴스 생성
    const freshPayload = (): CreatePriorityPayload => ({
        ...DEFAULT_CREATE_PAYLOAD,
        flags: { ...DEFAULT_CREATE_PAYLOAD.flags },
        links: [...DEFAULT_CREATE_PAYLOAD.links],
    });

    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState<CreatePriorityPayload>(freshPayload());
    const [linksInput, setLinksInput] = useState("");

    // 시/분: 지우기 가능하도록 문자열 상태로 별도 관리
    const [hourStr, setHourStr] = useState<string>(String(DEFAULT_CREATE_PAYLOAD.due_hour));
    const [minStr, setMinStr] = useState<string>(String(DEFAULT_CREATE_PAYLOAD.due_minute));

    const totals = useMemo(() => computeTotals(items), [items]);

    // 유틸: 숫자 보정
    const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
    const parseClamp = (s: string, lo: number, hi: number) => {
        const n = parseInt(s, 10);
        if (Number.isNaN(n)) return 0;
        return clamp(n, lo, hi);
    };

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const data = await listPriorityItems(q || undefined);
            setItems(data);
        } catch (e: any) {
            setErr(e?.message || "불러오기에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleToggleComplete(it: PriorityItemOut) {
        try {
            if (it.status === "next_week") await uncompletePriorityItem(it.id);
            else await completePriorityItem(it.id);
            await load();
        } catch {
            alert("완료 처리에 실패했습니다.");
        }
    }

    async function handleDelete(it: PriorityItemOut) {
        if (!confirm(`삭제할까요? [${it.book}]`)) return;
        try {
            await deletePriorityItem(it.id);
            await load();
        } catch (e: any) {
            if (String(e?.message).includes("401")) {
                setNeedAdmin(true);
                alert("관리자 코드가 필요합니다.");
            } else {
                alert("삭제 실패");
            }
        }
    }

    async function handleAdd() {
        if (!form.book.trim()) return alert("책 이름을 입력하세요.");

        // 사용자가 비워둔 경우 0으로, 범위 보정
        const due_hour = parseClamp(hourStr, 0, 23);
        const due_minute = parseClamp(minStr, 0, 59);

        const links = parseLinksInput(linksInput);
        try {
            await createPriorityItem({
                ...form,
                due_hour,
                due_minute,
                links,
                memo: form.memo?.trim() || undefined,
            });

            setShowAdd(false);
            const fresh = freshPayload();
            setForm(fresh);
            setHourStr(String(fresh.due_hour));
            setMinStr(String(fresh.due_minute));
            setLinksInput("");
            await load();
        } catch (e: any) {
            if (String(e?.message).includes("401")) {
                setNeedAdmin(true);
                alert("관리자 코드가 필요합니다.");
            } else {
                alert("추가 실패");
            }
        }
    }

    function openAdminPrompt() {
        const cur = getAdminCode() || "";
        const next = window.prompt("관리자 코드를 입력하세요.", cur);
        if (next === null) return;
        if (next.trim()) {
            setAdminCode(next.trim());
            setAdmin(next.trim());
            alert("저장되었습니다.");
        } else {
            clearAdminCode();
            setAdmin(null);
            alert("관리자 코드가 삭제되었습니다.");
        }
    }

    // 요일 셀렉트: 화살표/오른쪽 여백 커스텀
    const SELECT_BG =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='gray'%3E%3Cpath d='M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E";
    const selectStyle: React.CSSProperties = {
        ...control,
        paddingRight: 28,
        background: `white url(${SELECT_BG}) no-repeat right 10px center`,
        appearance: "none" as any,
        WebkitAppearance: "none",
        MozAppearance: "none",
    };

    return (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 12 }}>
            {/* 헤더: 제목 + 우측에 통계, 관리자 */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                }}
            >
                {/* 왼쪽: 제목 + 통계 (한 줄 고정) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        whiteSpace: "nowrap",      // 줄바꿈 방지
                        overflow: "hidden",        // 혹시 좁을 때 깔끔히
                        textOverflow: "ellipsis",
                        flex: "1 1 auto",
                        minWidth: 0,
                    }}
                >
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, flexShrink: 0 }}>
                        채점 우선순위
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", flexShrink: 0 }}>
                        총합 <b>{totals.total}</b>개 · 연체 <b style={{ color: "#dc2626" }}>{totals.overdue}</b>
                    </div>
                </div>

                {/* 오른쪽: 관리자 버튼만 (월 배지 제거) */}
                <button
                    onClick={openAdminPrompt}
                    title={admin ? "관리자 코드 설정됨" : "관리자 코드 입력"}
                    style={{
                        border: "1px solid #d1d5db",
                        borderRadius: 8,
                        background: admin ? "#eef2ff" : "white",
                        color: admin ? "#4338ca" : "#374151",
                        padding: "6px 10px",
                        fontSize: 12,
                        flex: "0 0 auto",
                    }}
                >
                    🔑 {admin ? "관리자" : "코드"}
                </button>
            </div>

            {/* 검색 + 버튼 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                    placeholder="책 이름 검색"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ ...control, height: 40 }}
                />
                <button
                    onClick={load}
                    style={{
                        height: 40,
                        minWidth: 72,
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background: "white",
                        fontSize: 14,
                    }}
                >
                    검색
                </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                    onClick={() => setShowAdd((v) => !v)}
                    style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "white",
                        fontSize: 15,
                        fontWeight: 700,
                    }}
                >
                    {showAdd ? "닫기" : "새 항목 추가"}
                </button>
                <button
                    onClick={load}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: "1px solid #d1d5db",
                        background: "white",
                        fontSize: 18,
                    }}
                    aria-label="새로고침"
                >
                    ↻
                </button>
            </div>

            {/* 추가 폼 */}
            {showAdd && (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)",
                            gap: 10,
                        }}
                    >
                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, minWidth: 0 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>책</span>
                            <input
                                value={form.book}
                                onChange={(e) => setForm({ ...form, book: e.target.value })}
                                placeholder="예: Let's go 4"
                                style={control}
                            />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, minWidth: 0 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>요일</span>
                            <select
                                value={form.due_weekday}
                                onChange={(e) => setForm({ ...form, due_weekday: Number(e.target.value) })}
                                style={selectStyle}
                            >
                                <option value={0}>월</option>
                                <option value={1}>화</option>
                                <option value={2}>수</option>
                                <option value={3}>목</option>
                                <option value={4}>금</option>
                                <option value={5}>토</option>
                                <option value={6}>일</option>
                            </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, minWidth: 0 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>시간</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {/* 지우기 가능한 시 입력 */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={hourStr}
                                    onChange={(e) => setHourStr(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                    onBlur={() => {
                                        const v = String(parseClamp(hourStr, 0, 23));
                                        setHourStr(v);
                                        setForm((f) => ({ ...f, due_hour: parseInt(v, 10) }));
                                    }}
                                    style={{ ...control, flex: 1 }}
                                />
                                <span>:</span>
                                {/* 지우기 가능한 분 입력 */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={minStr}
                                    onChange={(e) => setMinStr(e.target.value.replace(/\D/g, "").slice(0, 2))}
                                    onBlur={() => {
                                        const v = String(parseClamp(minStr, 0, 59));
                                        setMinStr(v);
                                        setForm((f) => ({ ...f, due_minute: parseInt(v, 10) }));
                                    }}
                                    style={{ ...control, flex: 1 }}
                                />
                            </div>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13, minWidth: 0 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>링크(콤마로 구분)</span>
                            <input
                                placeholder="https://..., https://..."
                                value={linksInput}
                                onChange={(e) => setLinksInput(e.target.value)}
                                style={control}
                            />
                        </label>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14, minWidth: 0 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={!!form.flags.answer}
                                    onChange={(e) => setForm({ ...form, flags: { ...form.flags, answer: e.target.checked } })}
                                />
                                <span>답지</span>
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={!!form.flags.listening}
                                    onChange={(e) => setForm({ ...form, flags: { ...form.flags, listening: e.target.checked } })}
                                />
                                <span>듣기</span>
                            </label>
                        </div>

                        <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", fontSize: 13, minWidth: 0 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>메모</span>
                            <textarea
                                value={form.memo || ""}
                                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                style={{ ...control, minHeight: 80, resize: "vertical" }}
                            />
                        </label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                        <button
                            onClick={() => setShowAdd(false)}
                            style={{ height: 40, borderRadius: 10, border: "1px solid #d1d5db", background: "white", padding: "0 14px", fontSize: 14 }}
                        >
                            취소
                        </button>
                        <button
                            onClick={handleAdd}
                            style={{ height: 40, borderRadius: 10, background: "#111827", color: "white", padding: "0 18px", fontSize: 15, fontWeight: 700 }}
                        >
                            추가
                        </button>
                    </div>

                    {needAdmin && (
                        <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c" }}>
                            생성/삭제에는 관리자 코드가 필요합니다. 우측 상단 🔑 버튼으로 설정하세요.
                        </div>
                    )}
                </div>
            )}

            {/* 목록 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {loading && (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, textAlign: "center", color: "#6b7280" }}>
                        불러오는 중…
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, textAlign: "center", color: "#6b7280" }}>
                        표시할 항목이 없습니다.
                    </div>
                )}

                {!loading &&
                    items.map((it) => {
                        const dueText = dueTextOf(it);
                        const remain = remainTextOf(it.minutes_until_due);
                        const effText = effectiveDisplayOf(it.effective_due_at);

                        return (
                            <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{it.book}</div>
                                    <span
                                        style={{
                                            ...badgeStyle(it.status),
                                            borderRadius: 999,
                                            padding: "2px 8px",
                                            fontWeight: 600,
                                            fontSize: 12,
                                        }}
                                    >
                    {statusLabel(it.status)}
                  </span>
                                </div>

                                <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
                                    <div>
                                        마감: <b>{dueText}</b>
                                    </div>
                                    <div style={{ color: "#6b7280" }}>표시시각 {effText} · {remain}</div>
                                </div>

                                {it.memo && (
                                    <div style={{ fontSize: 13, color: "#374151", marginTop: 6, whiteSpace: "pre-wrap" }}>{it.memo}</div>
                                )}

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                                    {it.links?.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: 8, fontSize: 12 }}
                                        >
                                            링크{idx + 1}
                                        </a>
                                    ))}
                                </div>

                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                    <button
                                        onClick={() => handleToggleComplete(it)}
                                        style={{
                                            flex: 1,
                                            height: 40,
                                            borderRadius: 10,
                                            border: "1px solid #d1d5db",
                                            background: "white",
                                            fontSize: 14,
                                        }}
                                    >
                                        {it.status === "next_week" ? "완료 취소" : "이번 주 완료"}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(it)}
                                        style={{
                                            width: 96,
                                            height: 40,
                                            borderRadius: 10,
                                            border: "1px solid #d1d5db",
                                            background: "white",
                                            fontSize: 14,
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {err && (
                <div
                    style={{
                        marginTop: 12,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        padding: 10,
                        borderRadius: 10,
                        fontSize: 13,
                    }}
                >
                    {err}
                </div>
            )}
        </div>
    );
}
