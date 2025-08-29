// src/lib/http.ts
export type Query = Record<string, string | number | boolean | undefined | null>;

// 배포 시 VITE_API_BASE 사용, 개발 프록시면 ''(빈 문자열)로 상대경로 사용
const RAW_BASE = (import.meta as any)?.env?.VITE_API_BASE ?? '';
const API_BASE = String(RAW_BASE).replace(/\/+$/, ''); // 끝 슬래시 제거

function qs(params?: Query) {
    if (!params) return '';
    const s = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) s.append(k, String(v));
    });
    const str = s.toString();
    return str ? `?${str}` : '';
}

function parseFastapiError(data: any): string | null {
    if (!data) return null;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
    return null;
}

async function asJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        try {
            const data = await res.json();
            throw new Error(parseFastapiError(data) ?? `HTTP ${res.status}`);
        } catch {
            throw new Error(`HTTP ${res.status}`);
        }
    }
    return res.json() as Promise<T>;
}

export async function request<T>(
    path: string,
    init?: RequestInit,
    params?: Query,
): Promise<T> {
    const url = `${API_BASE}${path}${qs(params)}`;
    const res = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        // 쿠키 인증을 쓸 때만 활성화
        // credentials: 'include',
    });
    return asJson<T>(res);
}

export const http = {
    get:  <T>(path: string, params?: Query) => request<T>(path, undefined, params),
    post: <T>(path: string, body?: any, headers?: HeadersInit) =>
        request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : '{}', headers }),
    put:  <T>(path: string, body?: any, headers?: HeadersInit) =>
        request<T>(path, { method: 'PUT',  body: JSON.stringify(body), headers }),
    del:  <T>(path: string, headers?: HeadersInit) =>
        request<T>(path, { method: 'DELETE', headers }),
};
