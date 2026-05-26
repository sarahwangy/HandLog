import { kv } from "@vercel/kv";

const DRAFT_TTL = 60 * 60 * 24 * 7; // 7 days
const CACHE_TTL = 60 * 5;            // 5 minutes

// ── Draft (user input, pre-submit) ─────────────────
export async function getDraft(userId: string, date: string) {
  return kv.get<string>(`draft:${userId}:${date}`);
}

export async function setDraft(userId: string, date: string, content: string) {
  await kv.set(`draft:${userId}:${date}`, content, { ex: DRAFT_TTL });
}

export async function deleteDraft(userId: string, date: string) {
  await kv.del(`draft:${userId}:${date}`);
}

// ── Notion metadata cache ───────────────────────────
export async function getNotionCache<T>(userId: string): Promise<T | null> {
  return kv.get<T>(`cache:notion:${userId}`);
}

export async function setNotionCache<T>(userId: string, data: T) {
  await kv.set(`cache:notion:${userId}`, data, { ex: CACHE_TTL });
}

// ── Pending weekly summaries (completeness state machine) ──
export interface PendingSummary {
  weekId: string;
  missingDays: number[];
  retryCount: number;
  lastCheckedAt: number;
}

export async function getPendingSummary(userId: string, weekId: string) {
  return kv.get<PendingSummary>(`pending_summary:${userId}:${weekId}`);
}

export async function setPendingSummary(userId: string, weekId: string, data: PendingSummary) {
  await kv.set(`pending_summary:${userId}:${weekId}`, data, { ex: DRAFT_TTL * 4 });
}

export async function deletePendingSummary(userId: string, weekId: string) {
  await kv.del(`pending_summary:${userId}:${weekId}`);
}

// ── Generic get/set/del ─────────────────────────────
export { kv };
