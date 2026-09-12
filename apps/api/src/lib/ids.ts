import { randomUUID } from "node:crypto";
export const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
