// src/utils/datetime.ts
const KST_TZ = 'Asia/Seoul';
const pad = (n: number) => String(n).padStart(2, '0');

export const toKST = (iso: string | Date) =>
    new Date(new Date(iso).toLocaleString('en-US', { timeZone: KST_TZ }));

export const fmtYM = (x: string | Date) => {
    const d = toKST(x);
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}`; // YYYY.MM
};

export const fmtMD = (x: string | Date) => {
    const d = toKST(x);
    return `${d.getMonth() + 1}/${d.getDate()}`; // M/D
};

export const fmtHMS = (x?: string | Date | null) => {
    if (!x) return '—';
    const d = toKST(x);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; // HH:MM:SS
};
