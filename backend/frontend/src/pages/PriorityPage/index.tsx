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
import {
    WEEKS,
    pad2,
    formatHHMM,
    formatYM,
    parseNaiveISOString,
    badgeStyle,
    statusLabel,
    computeTotals,
} from "../../utils/priorityHelpers";
import { getAdminCode, setAdminCode, clearAdminCode } from "../../utils/adminHeaders";

export default function PriorityPage() {
    const now = new Date();

    const [items, setItems] = useState<PriorityItemOut[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [q, setQ] = useState("");

    const [admin, setAdmin] = useState<string | null>(getAdminCode());
    const [needAdmin, setNeedAdmin] = useState(false);

    // 추가 폼
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState<CreatePriorityPayload>({
        book: "",
        due_weekday: 0,
        due_hour: 18,
        due_minute: 0,
        flags: { answer: false, listening: false },
        links: [],
        memo: "",
    });
    const [linksInput, setLinksInput] = useState("");

    const totals = useMemo(() => computeTotals(items), [items]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const links = linksInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        try {
            await createPriorityItem({ ...form, links, memo: form.memo?.trim() || undefined });
            setShowAdd(false);
            setForm({
                book: "",
                due_weekday: 0,
                due_hour: 18,
                due_minute: 0,
                flags: { answer: false, listening: false },
                links: [],
                memo: "",
            });
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

    return (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 12 }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>ECY 채점 우선순위</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                        총합 <b>{totals.total}</b>개 · 오버듀{" "}
                        <b style={{ color: "#dc2626" }}>{totals.overdue}</b>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#f3f4f6", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>
            {formatYM(now)}
          </span>
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
                        }}
                    >
                        🔑 {admin ? "관리자" : "코드"}
                    </button>
                </div>
            </div>

            {/* 검색 + 버튼 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                    placeholder="책 이름 검색"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{
                        flex: 1,
                        height: 40,
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        padding: "0 12px",
                        fontSize: 14,
                    }}
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
                        width: 44, height: 44, borderRadius: 12,
                        border: "1px solid #d1d5db", background: "white", fontSize: 18
                    }}
                    aria-label="새로고침"
                >
                    ↻
                </button>
            </div>

            {/* 추가 폼 (바텀시트 느낌) */}
            {showAdd && (
                <div
                    style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                    }}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>책</span>
                            <input
                                value={form.book}
                                onChange={(e) => setForm({ ...form, book: e.target.value })}
                                placeholder="예: 천재 중3 듣기"
                                style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
                            />
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>요일</span>
                            <select
                                value={form.due_weekday}
                                onChange={(e) => setForm({ ...form, due_weekday: Number(e.target.value) })}
                                style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
                            >
                                {WEEKS.map((w, i) => (
                                    <option key={i} value={i}>
                                        {w}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>시간</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={form.due_hour}
                                    onChange={(e) => setForm({ ...form, due_hour: Number(e.target.value) })}
                                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
                                />
                                :
                                <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={form.due_minute}
                                    onChange={(e) => setForm({ ...form, due_minute: Number(e.target.value) })}
                                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
                                />
                            </div>
                        </label>

                        <label style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>링크(콤마로 구분)</span>
                            <input
                                placeholder="https://..., https://..."
                                value={linksInput}
                                onChange={(e) => setLinksInput(e.target.value)}
                                style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
                            />
                        </label>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
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

                        <label style={{ gridColumn: "1 / span 2", display: "flex", flexDirection: "column", fontSize: 13 }}>
                            <span style={{ marginBottom: 6, fontWeight: 600 }}>메모</span>
                            <textarea
                                value={form.memo || ""}
                                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                style={{ minHeight: 80, border: "1px solid #d1d5db", borderRadius: 10, padding: "10px 12px", fontSize: 14 }}
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

            {/* 목록 (카드형) */}
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
                        const eff = parseNaiveISOString(it.effective_due_at);
                        const dueText = `${WEEKS[it.due_weekday]} ${formatHHMM(it.due_hour, it.due_minute)}`;
                        const remain = it.minutes_until_due >= 0 ? `${it.minutes_until_due}분 후` : `${Math.abs(it.minutes_until_due)}분 지남`;

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
                                    <div>마감: <b>{dueText}</b></div>
                                    <div style={{ color: "#6b7280" }}>
                                        표시시각 {eff.getMonth() + 1}/{eff.getDate()} {pad2(eff.getHours())}:{pad2(eff.getMinutes())} · {remain}
                                    </div>
                                </div>

                                {it.memo && (
                                    <div style={{ fontSize: 13, color: "#374151", marginTop: 6, whiteSpace: "pre-wrap" }}>
                                        {it.memo}
                                    </div>
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
                <div style={{ marginTop: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 10, fontSize: 13 }}>
                    {err}
                </div>
            )}
        </div>
    );
}
