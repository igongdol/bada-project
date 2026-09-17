// 한 판(60초)의 점수·연속·판정 규칙. UI와 분리된 순수 로직이라 vitest로 직접 검증한다.
// 규칙의 근거는 docs/decisions/practice-scoring.md, 값은 docs/specs/typing-drill-round/spec.md.

export type DrillKey = {
  code: string;
  letter: string;
  finger: string;
  /** 이번 판의 연습 대상(가운뎃줄 홈 포지션 여덟 개)인지 */
  inRound: boolean;
};

export const KEYS: DrillKey[] = [
  { code: "KeyA", letter: "ㅁ", finger: "왼손 새끼", inRound: true },
  { code: "KeyS", letter: "ㄴ", finger: "왼손 약지", inRound: true },
  { code: "KeyD", letter: "ㅇ", finger: "왼손 중지", inRound: true },
  { code: "KeyF", letter: "ㄹ", finger: "왼손 검지", inRound: true },
  { code: "KeyG", letter: "ㅎ", finger: "왼손 검지", inRound: false },
  { code: "KeyH", letter: "ㅗ", finger: "오른손 검지", inRound: false },
  { code: "KeyJ", letter: "ㅓ", finger: "오른손 검지", inRound: true },
  { code: "KeyK", letter: "ㅏ", finger: "오른손 중지", inRound: true },
  { code: "KeyL", letter: "ㅣ", finger: "오른손 약지", inRound: true },
  { code: "Semicolon", letter: "ㅔ", finger: "오른손 새끼", inRound: true },
];

export const DRILL_KEYS = KEYS.filter((key) => key.inRound);

export const ROUND_SECONDS = 60;
export const GOAL_SCORE = 300;
export const BASE_POINT = 10;

const BONUS_STEP = 20;
const BONUS_CAP_STEPS = 5; // 11연속부터 +100에서 상한

/** 첫 시도 연속 n회에 붙는 보너스. 3,5,7,9연속마다 +20,+40,+60,+80, 11연속부터 +100로 고정. */
export function bonusForStreak(streak: number): number {
  if (streak < 3 || streak % 2 === 0) return 0;
  const step = Math.min((streak - 1) / 2, BONUS_CAP_STEPS);
  return BONUS_STEP * step;
}

// 글자 키(및 자주 쓰는 구두점) 코드만 판정 대상으로 삼는다. 수정키·방향키 등은 제외.
const TYPING_KEY =
  /^(Key[A-Z]|Digit[0-9]|Semicolon|Quote|Comma|Period|Slash|Minus|Equal|BracketLeft|BracketRight|Backslash|Backquote|Space)$/;

export function isTypingKeyCode(code: string): boolean {
  return TYPING_KEY.test(code);
}

export function pickNextTarget(
  previous: DrillKey | null,
  random: () => number = Math.random
): DrillKey {
  if (DRILL_KEYS.length <= 1) return DRILL_KEYS[0];
  let next: DrillKey;
  do {
    next = DRILL_KEYS[Math.floor(random() * DRILL_KEYS.length)];
  } while (next === previous);
  return next;
}

export type RoundEngineState = {
  status: "running";
  target: DrillKey;
  score: number;
  hits: number;
  shown: number;
  firstTry: number;
  streak: number;
  /** 이번 낱자에서 이미 한 번 틀렸는지. 틀린 채로면 다시 맞혀도 연속에 넣지 않는다. */
  dirty: boolean;
  /** 목표 점수를 이미 한 번 넘겼는지 (연출은 처음 넘기는 순간에만). */
  goalHit: boolean;
  /** 직전 입력으로 받은 보너스(연출용). */
  lastBonus: number;
  lastOutcome: "hit" | "miss" | null;
  /** 매 입력마다 증가. 같은 결과가 연달아 나와도 연출을 다시 트리거하는 용도. */
  pressSeq: number;
};

export function startRound(
  random: () => number = Math.random
): RoundEngineState {
  return {
    status: "running",
    target: pickNextTarget(null, random),
    score: 0,
    hits: 0,
    shown: 1,
    firstTry: 0,
    streak: 0,
    dirty: false,
    goalHit: false,
    lastBonus: 0,
    lastOutcome: null,
    pressSeq: 0,
  };
}

/**
 * 물리 키 입력 하나를 반영한다. 판정 대상이 아닌 키(수정키·방향키 등)는 상태를 그대로 돌려준다.
 */
export function applyKeyPress(
  state: RoundEngineState,
  code: string,
  random: () => number = Math.random
): RoundEngineState {
  if (!isTypingKeyCode(code)) return state;

  const pressed = KEYS.find((key) => key.code === code);
  const isHit = pressed !== undefined && pressed.letter === state.target.letter;

  if (isHit) {
    let score = state.score + BASE_POINT;
    let firstTry = state.firstTry;
    let streak = state.streak;
    let lastBonus = 0;

    if (!state.dirty) {
      firstTry += 1;
      streak += 1;
      lastBonus = bonusForStreak(streak);
      score += lastBonus;
    } else {
      streak = 0;
    }

    return {
      ...state,
      target: pickNextTarget(state.target, random),
      score,
      hits: state.hits + 1,
      shown: state.shown + 1,
      firstTry,
      streak,
      dirty: false,
      goalHit: state.goalHit || score >= GOAL_SCORE,
      lastBonus,
      lastOutcome: "hit",
      pressSeq: state.pressSeq + 1,
    };
  }

  return {
    ...state,
    dirty: true,
    streak: 0,
    lastBonus: 0,
    lastOutcome: "miss",
    pressSeq: state.pressSeq + 1,
  };
}

export type RoundResult = {
  score: number;
  hits: number;
  shown: number;
  firstTry: number;
  /** 0~100 정수 백분율. */
  accuracy: number;
  met: boolean;
};

export function finishRound(state: RoundEngineState): RoundResult {
  const accuracy =
    state.shown > 0 ? Math.round((state.firstTry / state.shown) * 100) : 0;
  return {
    score: state.score,
    hits: state.hits,
    shown: state.shown,
    firstTry: state.firstTry,
    accuracy,
    met: state.score >= GOAL_SCORE,
  };
}
