// src/utils/adminHeaders.ts
const ADMIN_HEADER = "x-admin-code";
const LS_KEY = "ADMIN_CODE";

export function setAdminCode(code: string) {
    if (code) localStorage.setItem(LS_KEY, code);
}

export function clearAdminCode() {
    localStorage.removeItem(LS_KEY);
}

export function getAdminCode(): string | null {
    // .env에 넣었다면 기본값으로 활용
    const envCode = (import.meta as any)?.env?.VITE_ADMIN_CODE as string | undefined;
    return localStorage.getItem(LS_KEY) || envCode || null;
}

export function adminHeaders(): HeadersInit | undefined {
    const code = getAdminCode();
    return code ? { [ADMIN_HEADER]: code } : undefined;
}
