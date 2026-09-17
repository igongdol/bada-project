// 한 판(60초)의 점수·연속·판정 규칙. UI와 분리된 순수 로직이라 vitest로 직접 검증한다.
// 연속 보너스 구조의 근거는 docs/decisions/practice-scoring.md, 낱자·범위·값은
// docs/specs/round-records/spec.md.

export type DrillKey = {
  code: string;
  letter: string;
  finger: string;
  row: "top" | "home" | "bottom";
  /** 홈 자리(손을 얹어 두는 일곱 자리)인지. */
  rest: boolean;
};

// 표준 두벌식. 세미콜론 자리에는 한글 낱자가 없고, ㅔ는 윗줄 P다.
export const KEYS: DrillKey[] = [
  { code: "KeyQ", letter: "ㅂ", finger: "왼손 새끼", row: "top", rest: false },
  { code: "KeyW", letter: "ㅈ", finger: "왼손 약지", row: "top", rest: false },
  { code: "KeyE", letter: "ㄷ", finger: "왼손 중지", row: "top", rest: false },
  { code: "KeyR", letter: "ㄱ", finger: "왼손 검지", row: "top", rest: false },
  { code: "KeyT", letter: "ㅅ", finger: "왼손 검지", row: "top", rest: false },
  { code: "KeyY", letter: "ㅛ", finger: "오른손 검지", row: "top", rest: false },
  { code: "KeyU", letter: "ㅕ", finger: "오른손 검지", row: "top", rest: false },
  { code: "KeyI", letter: "ㅑ", finger: "오른손 중지", row: "top", rest: false },
  { code: "KeyO", letter: "ㅐ", finger: "오른손 약지", row: "top", rest: false },
  { code: "KeyP", letter: "ㅔ", finger: "오른손 새끼", row: "top", rest: false },
  { code: "KeyA", letter: "ㅁ", finger: "왼손 새끼", row: "home", rest: true },
  { code: "KeyS", letter: "ㄴ", finger: "왼손 약지", row: "home", rest: true },
  { code: "KeyD", letter: "ㅇ", finger: "왼손 중지", row: "home", rest: true },
  { code: "KeyF", letter: "ㄹ", finger: "왼손 검지", row: "home", rest: true },
  { code: "KeyG", letter: "ㅎ", finger: "왼손 검지", row: "home", rest: false },
  { code: "KeyH", letter: "ㅗ", finger: "오른손 검지", row: "home", rest: false },
  { code: "KeyJ", letter: "ㅓ", finger: "오른손 검지", row: "home", rest: true },
  { code: "KeyK", letter: "ㅏ", finger: "오른손 중지", row: "home", rest: true },
  { code: "KeyL", letter: "ㅣ", finger: "오른손 약지", row: "home", rest: true },
  { code: "KeyZ", letter: "ㅋ", finger: "왼손 새끼", row: "bottom", rest: false },
  { code: "KeyX", letter: "ㅌ", finger: "왼손 약지", row: "bottom", rest: false },
  { code: "KeyC", letter: "ㅊ", finger: "왼손 중지", row: "bottom", rest: false },
  { code: "KeyV", letter: "ㅍ", finger: "왼손 검지", row: "bottom", rest: false },
  { code: "KeyB", letter: "ㅠ", finger: "왼손 검지", row: "bottom", rest: false },
  { code: "KeyN", letter: "ㅜ", finger: "오른손 검지", row: "bottom", rest: false },
  { code: "KeyM", letter: "ㅡ", finger: "오른손 검지", row: "bottom", rest: false },
];

export type PracticeRange = {
  id: "rest" | "home" | "upper" | "all";
  label: string;
  keys: DrillKey[];
};

// 손이 놓인 자리에서 한 겹씩 넓어진다. 넷 중 아이가 고른 하나가 그 판의
// 낱자 묶음이자 기록이 쌓이는 자리다.
export const RANGES: PracticeRange[] = [
  { id: "rest", label: "홈 자리", keys: KEYS.filter((key) => key.rest) },
  { id: "home", label: "가운뎃줄", keys: KEYS.filter((key) => key.row === "home") },
  {
    id: "upper",
    label: "윗줄까지",
    keys: KEYS.filter((key) => key.row === "home" || key.row === "top"),
  },
  { id: "all", label: "자판 전체", keys: KEYS },
];

export type RangeId = PracticeRange["id"];

export const DEFAULT_RANGE_ID: RangeId = "rest";

export function getRange(rangeId: RangeId): PracticeRange {
  return RANGES.find((range) => range.id === rangeId) ?? RANGES[0];
}

export const ROUND_SECONDS = 60;
/** 게이지가 가득 차는 점수의 바닥값. 최고 기록이 이보다 낮거나 없으면 이 값에서 가득 찬다. */
export const GOAL_FLOOR = 300;
export const BASE_POINT = 10;

const BONUS_STEP = 20;
const BONUS_CAP_STEPS = 5; // 11연속부터 +100에서 상한

/** 첫 시도 연속 n회에 붙는 보너스. 3,5,7,9연속마다 +20,+40,+60,+80, 11연속부터 +100로 고정. */
export function bonusForStreak(streak: number): number {
  if (streak < 3 || streak % 2 === 0) return 0;
  const step = Math.min((streak - 1) / 2, BONUS_CAP_STEPS);
  return BONUS_STEP * step;
}

/** 게이지·목표가 향하는 점수. 최고 기록과 바닥값 중 큰 쪽이다. */
export function scoreCeiling(best: number): number {
  return Math.max(best, GOAL_FLOOR);
}

// 글자 키(및 자주 쓰는 구두점) 코드만 판정 대상으로 삼는다. 수정키·방향키 등은 제외.
const TYPING_KEY =
  /^(Key[A-Z]|Digit[0-9]|Semicolon|Quote|Comma|Period|Slash|Minus|Equal|BracketLeft|BracketRight|Backslash|Backquote|Space)$/;

export function isTypingKeyCode(code: string): boolean {
  return TYPING_KEY.test(code);
}

export function pickNextTarget(
  pool: DrillKey[],
  previous: DrillKey | null,
  random: () => number = Math.random
): DrillKey {
  if (pool.length <= 1) return pool[0];
  let next: DrillKey;
  do {
    next = pool[Math.floor(random() * pool.length)];
  } while (next === previous);
  return next;
}

export type RoundEngineState = {
  status: "running";
  range: PracticeRange;
  /** 판을 시작할 때의 이 범위 최고 기록. 신기록 판정과 게이지 상한의 기준이 된다. */
  bestAtStart: number;
  ceiling: number;
  target: DrillKey;
  score: number;
  hits: number;
  shown: number;
  firstTry: number;
  streak: number;
  /** 이번 낱자에서 이미 한 번 틀렸는지. 틀린 채로면 다시 맞혀도 연속에 넣지 않는다. */
  dirty: boolean;
  /** 이번 판에서 이미 최고 기록을 넘겼는지 (연출은 처음 넘기는 순간에만). */
  recordHit: boolean;
  /** 직전 입력으로 받은 보너스(연출용). */
  lastBonus: number;
  /** 직전 입력이 최고 기록을 처음 넘긴 입력이었는지(연출용). */
  justCrossedRecord: boolean;
  lastOutcome: "hit" | "miss" | null;
  /** 매 입력마다 증가. 같은 결과가 연달아 나와도 연출을 다시 트리거하는 용도. */
  pressSeq: number;
};

export function startRound(
  range: PracticeRange,
  best: number,
  random: () => number = Math.random
): RoundEngineState {
  return {
    status: "running",
    range,
    bestAtStart: best,
    ceiling: scoreCeiling(best),
    target: pickNextTarget(range.keys, null, random),
    score: 0,
    hits: 0,
    shown: 1,
    firstTry: 0,
    streak: 0,
    dirty: false,
    recordHit: false,
    lastBonus: 0,
    justCrossedRecord: false,
    lastOutcome: null,
    pressSeq: 0,
  };
}

/**
 * 물리 키 입력 하나를 반영한다. 판정 대상이 아닌 키(수정키·방향키 등)는 상태를 그대로 돌려준다.
 * 범위 밖의 키를 눌러도 틀린 것으로 판정한다.
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

    const justCrossedRecord =
      state.bestAtStart > 0 && !state.recordHit && score > state.bestAtStart;

    return {
      ...state,
      target: pickNextTarget(state.range.keys, state.target, random),
      score,
      hits: state.hits + 1,
      shown: state.shown + 1,
      firstTry,
      streak,
      dirty: false,
      recordHit: state.recordHit || justCrossedRecord,
      lastBonus,
      justCrossedRecord,
      lastOutcome: "hit",
      pressSeq: state.pressSeq + 1,
    };
  }

  return {
    ...state,
    dirty: true,
    streak: 0,
    lastBonus: 0,
    justCrossedRecord: false,
    lastOutcome: "miss",
    pressSeq: state.pressSeq + 1,
  };
}

export type RoundResult = {
  range: PracticeRange;
  score: number;
  hits: number;
  shown: number;
  firstTry: number;
  /** 0~100 정수 백분율. */
  accuracy: number;
  bestBefore: number;
};

export function finishRound(state: RoundEngineState): RoundResult {
  const accuracy =
    state.shown > 0 ? Math.round((state.firstTry / state.shown) * 100) : 0;
  return {
    range: state.range,
    score: state.score,
    hits: state.hits,
    shown: state.shown,
    firstTry: state.firstTry,
    accuracy,
    bestBefore: state.bestAtStart,
  };
}

/** 최고 기록의 이만큼을 넘기면 진 판이 아니라 "아깝다" 판으로 돌려준다. */
export const NEAR_BEST_RATIO = 0.9;

export type RoundVerdict = "record" | "tie" | "close" | "more" | "first";

/** 결과 화면의 다섯 갈래 판정. 목표 달성 여부가 아니라 최고 기록과의 비교로만 정한다. */
export function judgeRound(score: number, bestBefore: number): RoundVerdict {
  if (bestBefore <= 0) return "first";
  if (score > bestBefore) return "record";
  if (score === bestBefore) return "tie";
  if (score >= bestBefore * NEAR_BEST_RATIO) return "close";
  return "more";
}
