// src/services/priorityApi.ts
import { http } from "../lib/http";
import type { CreatePriorityPayload, PriorityItemOut } from "../types/priorityTypes.ts";
import { adminHeaders } from "../utils/adminHeaders";

/** 목록 조회 (q는 책 이름 검색) */
export function listPriorityItems(q?: string) {
    return http.get<PriorityItemOut[]>("/priority", q ? { q } : undefined);
}

/** 생성 */
export function createPriorityItem(payload: CreatePriorityPayload) {
    return http.post<PriorityItemOut>("/priority", payload, adminHeaders());
}

/** 삭제 */
export function deletePriorityItem(id: number) {
    return http.del<{ ok: true }>(`/priority/${id}`, adminHeaders());
}

/** 완료/취소 (주차 기준) */

export function completePriorityItem(id: number) {
    return http.post<PriorityItemOut>(`/priority/${id}/complete`);
}

export function uncompletePriorityItem(id: number) {
    return http.post<PriorityItemOut>(`/priority/${id}/uncomplete`);
}