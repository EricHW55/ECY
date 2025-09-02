import type { CreatePriorityPayload } from "./priorityTypes";

export const DEFAULT_CREATE_PAYLOAD: CreatePriorityPayload = {
    book: "",
    due_weekday: 0,
    due_hour: 18,
    due_minute: 0,
    flags: { answer: false, listening: false },
    links: [],
    memo: "",
};
