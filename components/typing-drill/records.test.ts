import { beforeEach, describe, expect, test } from "vitest";

import {
  MAX_RECORDS_PER_RANGE,
  appendRound,
  getBest,
  getRecent,
  getRounds,
  loadStore,
  saveStore,
} from "@/components/typing-drill/records";

beforeEach(() => {
  window.localStorage.clear();
});

describe("appendRound / getRounds", () => {
  test("범위마다 기록이 따로 쌓인다", () => {
    let store = appendRound({}, "rest", { score: 100, accuracy: 50, hits: 10 });
    store = appendRound(store, "home", { score: 200, accuracy: 60, hits: 20 });
    expect(getRounds(store, "rest")).toHaveLength(1);
    expect(getRounds(store, "home")).toHaveLength(1);
    expect(getRounds(store, "upper")).toHaveLength(0);
  });

  test("한 범위에 최근 40판만 남긴다", () => {
    let store = {};
    for (let i = 0; i < MAX_RECORDS_PER_RANGE + 5; i++) {
      store = appendRound(store, "rest", { score: i, accuracy: 50, hits: 1 });
    }
    const rounds = getRounds(store, "rest");
    expect(rounds).toHaveLength(MAX_RECORDS_PER_RANGE);
    expect(rounds[0].score).toBe(5); // 앞의 5개는 밀려났다
    expect(rounds[rounds.length - 1].score).toBe(MAX_RECORDS_PER_RANGE + 4);
  });
});

describe("getBest", () => {
  test("기록이 없으면 0이다", () => {
    expect(getBest({}, "rest")).toBe(0);
  });

  test("그 범위에 남은 기록 중 가장 높은 점수다", () => {
    let store = appendRound({}, "rest", { score: 150, accuracy: 50, hits: 10 });
    store = appendRound(store, "rest", { score: 340, accuracy: 66, hits: 30 });
    store = appendRound(store, "rest", { score: 200, accuracy: 55, hits: 20 });
    expect(getBest(store, "rest")).toBe(340);
  });
});

describe("getRecent", () => {
  test("최근 판만, 오래된 순서 그대로 돌려준다", () => {
    let store = {};
    for (let i = 1; i <= 7; i++) {
      store = appendRound(store, "rest", { score: i * 10, accuracy: 50, hits: 1 });
    }
    const recent = getRecent(store, "rest", 5);
    expect(recent.map((r) => r.score)).toEqual([30, 40, 50, 60, 70]);
  });
});

describe("loadStore / saveStore", () => {
  test("저장한 값을 그대로 읽어 온다", () => {
    const store = appendRound({}, "all", { score: 500, accuracy: 80, hits: 45 });
    saveStore(store);
    expect(loadStore()).toEqual(store);
  });

  test("저장된 값이 없으면 빈 저장소를 돌려준다", () => {
    expect(loadStore()).toEqual({});
  });

  test("깨진 값이 있어도 앱이 죽지 않고 빈 저장소를 돌려준다", () => {
    window.localStorage.setItem("bada.records.v1", "{ not json");
    expect(loadStore()).toEqual({});
  });
});
