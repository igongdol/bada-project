// 범위별 기록 저장소. 노트북의 localStorage 하나에 남기고, 범위끼리는 섞이지 않는다.
// 근거는 docs/specs/round-records/spec.md의 "기록으로 남는 것".

import type { RangeId } from "./round-engine";

export type RoundRecord = {
  score: number;
  accuracy: number;
  hits: number;
};

export type RecordStore = Partial<Record<RangeId, RoundRecord[]>>;

const STORAGE_KEY = "bada.records.v1";
/** 범위마다 보관하는 최근 기록 수. */
export const MAX_RECORDS_PER_RANGE = 40;
/** 준비 화면에 막대로 보여주는 최근 판 수. */
export const RECENT_COUNT = 5;

export function loadStore(): RecordStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStore(store: RecordStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // 저장 공간이 없거나 브라우저가 막아도 연습 자체는 계속된다.
  }
}

export function getRounds(store: RecordStore, rangeId: RangeId): RoundRecord[] {
  return store[rangeId] ?? [];
}

export function getBest(store: RecordStore, rangeId: RangeId): number {
  return getRounds(store, rangeId).reduce((max, round) => Math.max(max, round.score), 0);
}

export function getRecent(
  store: RecordStore,
  rangeId: RangeId,
  count: number = RECENT_COUNT
): RoundRecord[] {
  const rounds = getRounds(store, rangeId);
  return rounds.slice(Math.max(0, rounds.length - count));
}

/** 새 판을 그 범위 기록 끝에 붙이고, 범위마다 최근 40판만 남긴다. */
export function appendRound(
  store: RecordStore,
  rangeId: RangeId,
  round: RoundRecord
): RecordStore {
  const updated = [...getRounds(store, rangeId), round].slice(-MAX_RECORDS_PER_RANGE);
  return { ...store, [rangeId]: updated };
}
