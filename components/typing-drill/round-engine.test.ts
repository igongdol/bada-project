import { describe, expect, test } from "vitest";

import {
  BASE_POINT,
  GOAL_FLOOR,
  KEYS,
  RANGES,
  applyKeyPress,
  bonusForStreak,
  finishRound,
  getRange,
  isTypingKeyCode,
  judgeRound,
  pickNextTarget,
  scoreCeiling,
  startRound,
} from "@/components/typing-drill/round-engine";

const REST_RANGE = getRange("rest");
const HOME_RANGE = getRange("home");
const UPPER_RANGE = getRange("upper");
const ALL_RANGE = getRange("all");

// REST_RANGE 안에서 인덱스 0(ㅁ)과 3(ㄹ)만 번갈아 나오게 해서 타깃 전환을 예측 가능하게 만든다.
const sequence = [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4];
function fakeRandom() {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("자판과 연습 범위", () => {
  test("연습 대상은 표준 두벌식 한글 낱자 스물여섯 개다", () => {
    expect(KEYS).toHaveLength(26);
    expect(KEYS.some((key) => key.code === "Semicolon")).toBe(false);
    expect(KEYS.find((key) => key.code === "KeyP")?.letter).toBe("ㅔ");
  });

  test("범위는 홈 자리 일곱, 가운뎃줄 아홉, 윗줄까지 열아홉, 전체 스물여섯이다", () => {
    expect(REST_RANGE.keys).toHaveLength(7);
    expect(HOME_RANGE.keys).toHaveLength(9);
    expect(UPPER_RANGE.keys).toHaveLength(19);
    expect(ALL_RANGE.keys).toHaveLength(26);
  });

  test("각 범위는 그 안의 키만 담는다", () => {
    expect(REST_RANGE.keys.every((key) => key.rest)).toBe(true);
    expect(HOME_RANGE.keys.every((key) => key.row === "home")).toBe(true);
    expect(UPPER_RANGE.keys.every((key) => key.row === "home" || key.row === "top")).toBe(true);
  });
});

describe("bonusForStreak", () => {
  test("3연속 미만은 보너스가 없다", () => {
    expect(bonusForStreak(1)).toBe(0);
    expect(bonusForStreak(2)).toBe(0);
  });

  test("3,5,7,9연속마다 +20,+40,+60,+80을 준다", () => {
    expect(bonusForStreak(3)).toBe(20);
    expect(bonusForStreak(5)).toBe(40);
    expect(bonusForStreak(7)).toBe(60);
    expect(bonusForStreak(9)).toBe(80);
  });

  test("11연속부터는 +100에서 더 커지지 않는다", () => {
    expect(bonusForStreak(11)).toBe(100);
    expect(bonusForStreak(21)).toBe(100);
  });

  test("짝수 연속에는 보너스가 없다", () => {
    expect(bonusForStreak(4)).toBe(0);
    expect(bonusForStreak(10)).toBe(0);
  });
});

describe("isTypingKeyCode", () => {
  test("글자 키는 판정 대상이다", () => {
    expect(isTypingKeyCode("KeyA")).toBe(true);
    expect(isTypingKeyCode("Semicolon")).toBe(true);
  });

  test("수정키·방향키는 판정 대상이 아니다", () => {
    expect(isTypingKeyCode("ShiftLeft")).toBe(false);
    expect(isTypingKeyCode("ArrowLeft")).toBe(false);
    expect(isTypingKeyCode("ControlLeft")).toBe(false);
  });
});

describe("scoreCeiling", () => {
  test("최고 기록이 바닥값보다 낮거나 없으면 바닥값에서 가득 찬다", () => {
    expect(scoreCeiling(0)).toBe(GOAL_FLOOR);
    expect(scoreCeiling(120)).toBe(GOAL_FLOOR);
  });

  test("최고 기록이 바닥값보다 높으면 그 기록에서 가득 찬다", () => {
    expect(scoreCeiling(450)).toBe(450);
  });
});

describe("pickNextTarget", () => {
  test("직전에 나온 것과 같은 낱자를 연달아 내지 않는다", () => {
    const random = fakeRandom();
    const first = pickNextTarget(REST_RANGE.keys, null, random);
    const second = pickNextTarget(REST_RANGE.keys, first, random);
    expect(second).not.toBe(first);
  });
});

describe("applyKeyPress", () => {
  test("맞는 키를 누르면 기본 점수를 주고 다음 낱자로 넘어간다", () => {
    const random = fakeRandom();
    const state = startRound(REST_RANGE, 0, random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyA", random);
    expect(next.score).toBe(BASE_POINT);
    expect(next.hits).toBe(1);
    expect(next.firstTry).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.lastOutcome).toBe("hit");
    expect(next.target).not.toBe(state.target);
  });

  test("범위 밖의 키를 눌러도 틀린 것으로 판정한다", () => {
    const random = fakeRandom();
    const state = startRound(REST_RANGE, 0, random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyG", random); // ㅎ, REST_RANGE 밖
    expect(next.lastOutcome).toBe("miss");
    expect(next.score).toBe(0);
    expect(next.dirty).toBe(true);
    expect(next.target).toBe(state.target); // 같은 낱자에 머문다
  });

  test("틀리면 넘어가지 않고 같은 낱자에 머문다", () => {
    const random = fakeRandom();
    const state = startRound(REST_RANGE, 0, random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyS", random); // ㄴ, 오답
    expect(next.target).toBe(state.target);
    expect(next.score).toBe(0);
  });

  test("틀렸다가 다시 맞혀도 10점을 주지만 연속에는 넣지 않는다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 0, random); // target: ㅁ
    state = applyKeyPress(state, "KeyS", random); // 오답
    state = applyKeyPress(state, "KeyA", random); // 정답(재시도)
    expect(state.score).toBe(BASE_POINT);
    expect(state.firstTry).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.hits).toBe(1);
  });

  test("틀리면 점수를 깎지 않고 연속만 0으로 되돌린다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 0, random);
    state = applyKeyPress(state, "KeyA", random); // 정답, streak 1
    const scoreBeforeMiss = state.score;
    state = applyKeyPress(state, "KeyS", random); // 오답 (다음 타깃은 ㄹ)
    expect(state.score).toBe(scoreBeforeMiss);
    expect(state.streak).toBe(0);
  });

  test("판정 대상이 아닌 키(수정키)는 상태를 바꾸지 않는다", () => {
    const random = fakeRandom();
    const state = startRound(REST_RANGE, 0, random);
    const next = applyKeyPress(state, "ShiftLeft", random);
    expect(next).toBe(state);
  });

  // REST_RANGE 안의 낱자마다 정답 코드를 찾아 준다. 어떤 낱자가 나와도 항상 맞힌다.
  const codeForTarget = (state: { target: { letter: string } }) =>
    REST_RANGE.keys.find((key) => key.letter === state.target.letter)!.code;

  test("3연속 첫 시도 성공에 +20 보너스가 붙는다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 0, random);
    state = applyKeyPress(state, codeForTarget(state), random); // 1
    state = applyKeyPress(state, codeForTarget(state), random); // 2
    const before = state.score;
    state = applyKeyPress(state, codeForTarget(state), random); // 3 -> +20 보너스
    expect(state.streak).toBe(3);
    expect(state.lastBonus).toBe(20);
    expect(state.score).toBe(before + BASE_POINT + 20);
  });

  test("최고 기록을 처음 넘기는 순간에만 justCrossedRecord가 켜진다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 25, random); // 최고 25점
    state = applyKeyPress(state, codeForTarget(state), random); // 10점, 아직 안 넘음
    expect(state.justCrossedRecord).toBe(false);
    state = applyKeyPress(state, codeForTarget(state), random); // 20점, 아직 안 넘음
    expect(state.justCrossedRecord).toBe(false);
    state = applyKeyPress(state, codeForTarget(state), random); // 3연속 보너스로 25 초과
    expect(state.score).toBeGreaterThan(25);
    expect(state.justCrossedRecord).toBe(true);
    expect(state.recordHit).toBe(true);
    state = applyKeyPress(state, codeForTarget(state), random); // 이미 넘긴 뒤
    expect(state.justCrossedRecord).toBe(false);
    expect(state.recordHit).toBe(true);
  });

  test("첫 판(최고 기록이 없음)에는 넘기는 사건이 없다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 0, random);
    for (let i = 0; i < 5; i++) {
      state = applyKeyPress(state, codeForTarget(state), random);
      expect(state.justCrossedRecord).toBe(false);
    }
  });
});

describe("finishRound", () => {
  test("정확도는 첫 시도에 맞힌 비율이다", () => {
    const random = fakeRandom();
    let state = startRound(REST_RANGE, 0, random); // shown: 1 (ㅁ)
    state = applyKeyPress(state, "KeyS", random); // 오답, shown 그대로
    state = applyKeyPress(state, "KeyA", random); // 정답(재시도), shown 2로 증가
    const result = finishRound(state);
    expect(result.shown).toBe(2);
    expect(result.firstTry).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  test("이 판을 시작한 범위와 그때의 최고 기록을 함께 돌려준다", () => {
    const random = fakeRandom();
    const state = startRound(HOME_RANGE, 150, random);
    const result = finishRound(state);
    expect(result.range).toBe(HOME_RANGE);
    expect(result.bestBefore).toBe(150);
  });
});

describe("judgeRound", () => {
  test("이 범위의 첫 판이면 first다", () => {
    expect(judgeRound(140, 0)).toBe("first");
  });

  test("최고 기록을 넘기면 record다", () => {
    expect(judgeRound(410, 340)).toBe("record");
  });

  test("최고 기록과 같으면 tie다", () => {
    expect(judgeRound(340, 340)).toBe("tie");
  });

  test("최고 기록의 90% 이상이면 close다", () => {
    expect(judgeRound(306, 340)).toBe("close"); // 340*0.9 = 306
  });

  test("90% 미만이면 more다", () => {
    expect(judgeRound(190, 340)).toBe("more");
  });
});

describe("RANGES", () => {
  test("범위는 넷이고 홈 자리가 기본값이다", () => {
    expect(RANGES.map((range) => range.id)).toEqual(["rest", "home", "upper", "all"]);
  });
});
