"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ReadyScreen } from "./ready-screen";
import { ResultScreen } from "./result-screen";
import { RoundScreen } from "./round-screen";
import { appendRound, getBest, getRecent, loadStore, saveStore, type RecordStore } from "./records";
import {
  DEFAULT_RANGE_ID,
  ROUND_SECONDS,
  applyKeyPress,
  finishRound,
  getRange,
  isTypingKeyCode,
  startRound,
  type RangeId,
  type RoundEngineState,
  type RoundResult,
} from "./round-engine";

type Screen = "ready" | "round" | "result";
type StreakMessage = { text: string; cheer: boolean } | null;

// 겹친 알림 하나가 자리를 지키는 시간. 그동안 다음 알림은 줄을 선다.
const EVENT_HOLD_MS = 1400;

// 한 판의 흐름(준비 → 연습 → 결과)을 관리한다. 점수·판정 규칙은 round-engine이,
// 기록의 저장·조회는 records가 갖는다. 이 컴포넌트는 화면 전환, 타이머, 알림
// 줄서기, 키보드 입력 배선만 맡는다.
export function TypingDrill() {
  const [screen, setScreen] = useState<Screen>("ready");
  const [rangeId, setRangeId] = useState<RangeId>(DEFAULT_RANGE_ID);
  const [store, setStore] = useState<RecordStore>({});
  const [engine, setEngine] = useState<RoundEngineState | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_SECONDS * 1000);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [message, setMessage] = useState<StreakMessage>(null);
  const [messageSeq, setMessageSeq] = useState(0);

  // 타이머 콜백에서 최신 엔진 상태를 읽기 위한 거울. 렌더 중에는 읽지 않는다.
  const engineRef = useRef<RoundEngineState | null>(null);
  const endsAtRef = useRef(0);
  const captureRef = useRef<HTMLInputElement | null>(null);
  const eventUntilRef = useRef(0);
  const eventQueueRef = useRef<string[]>([]);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // 기록은 노트북 한 대의 localStorage에 있다. 서버 렌더에는 없으므로 마운트 후 한 번만 읽는다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage를 처음 한 번 읽어 들이는 것으로, 구독이 필요한 외부 상태가 아니다.
    setStore(loadStore());
  }, []);

  const range = getRange(rangeId);
  const best = getBest(store, rangeId);
  const recent = getRecent(store, rangeId);

  function paintMessage(text: string, cheer: boolean) {
    setMessage(text ? { text, cheer } : null);
    setMessageSeq((seq) => seq + 1);
  }

  function runQueue() {
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    eventTimerRef.current = setTimeout(() => {
      const next = eventQueueRef.current.shift();
      if (next === undefined) {
        eventUntilRef.current = 0;
        return;
      }
      paintMessage(next, true);
      eventUntilRef.current = Date.now() + EVENT_HOLD_MS;
      runQueue();
    }, EVENT_HOLD_MS);
  }

  // 신기록처럼 자기 시간을 지켜야 하는 "사건". 사건이 자리를 지키는 동안 들어온
  // 다음 사건은 줄을 선다.
  function showEvent(text: string) {
    if (Date.now() < eventUntilRef.current) {
      eventQueueRef.current.push(text);
      return;
    }
    paintMessage(text, true);
    eventUntilRef.current = Date.now() + EVENT_HOLD_MS;
    runQueue();
  }

  // 연속·보너스 같은 일상 표시. 사건이 자리를 지키는 동안에는 끼어들지 않는다.
  function showRoutine(text: string, cheer: boolean) {
    if (Date.now() < eventUntilRef.current) return;
    paintMessage(text, cheer);
  }

  function resetMessages() {
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    eventTimerRef.current = null;
    eventUntilRef.current = 0;
    eventQueueRef.current = [];
    setMessage(null);
    setMessageSeq((seq) => seq + 1);
  }

  function handleSelectRange(next: RangeId) {
    if (screen !== "ready" || next === rangeId) return;
    setRangeId(next);
  }

  function handleStart() {
    setEngine(startRound(range, best));
    endsAtRef.current = Date.now() + ROUND_SECONDS * 1000;
    setTimeLeftMs(ROUND_SECONDS * 1000);
    resetMessages();
    setResult(null);
    setScreen("round");
  }

  useEffect(() => {
    if (screen !== "round") return;
    captureRef.current?.focus();
    const id = setInterval(() => {
      const left = Math.max(0, endsAtRef.current - Date.now());
      setTimeLeftMs(left);
      if (left <= 0) {
        const finished = engineRef.current;
        setEngine(null);
        resetMessages();
        if (finished) {
          const finishedResult = finishRound(finished);
          setResult(finishedResult);
          // 60초를 끝까지 채운 판만 기록으로 남는다.
          setStore((current) => {
            const updated = appendRound(current, rangeId, {
              score: finishedResult.score,
              accuracy: finishedResult.accuracy,
              hits: finishedResult.hits,
            });
            saveStore(updated);
            return updated;
          });
        }
        setScreen("result");
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function handleStop() {
    // 연습 중 멈추기로 버린 판은 기록에 남기지 않는다.
    setEngine(null);
    resetMessages();
    setScreen("ready");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!engine) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!isTypingKeyCode(event.code)) return;
    event.preventDefault();

    const next = applyKeyPress(engine, event.code);
    setEngine(next);

    if (next.lastOutcome === "hit") {
      if (next.justCrossedRecord) {
        showEvent("신기록! 내 최고를 넘었어요");
      } else if (next.lastBonus > 0) {
        showRoutine(`${next.streak}개 연속 +${next.lastBonus}점!`, true);
      } else if (next.streak >= 2) {
        showRoutine(`${next.streak}개 연속`, false);
      } else {
        showRoutine("", false);
      }
    } else {
      showRoutine("", false);
    }
  }

  const hint =
    engine && engine.dirty
      ? { finger: engine.target.finger, letter: engine.target.letter }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8">
      {screen === "ready" && (
        <ReadyScreen
          range={range}
          best={best}
          recent={recent}
          onSelectRange={handleSelectRange}
          onStart={handleStart}
        />
      )}

      {screen === "round" && engine && (
        <RoundScreen
          captureRef={captureRef}
          range={engine.range}
          target={engine.target}
          score={engine.score}
          ceiling={engine.ceiling}
          recordHit={engine.recordHit}
          timeLeftMs={timeLeftMs}
          streakMessage={message}
          messageSeq={messageSeq}
          hint={hint}
          lastOutcome={engine.lastOutcome}
          pressSeq={engine.pressSeq}
          onKeyDown={handleKeyDown}
          onStop={handleStop}
        />
      )}

      {screen === "result" && result && (
        <ResultScreen result={result} onAgain={handleStart} onQuit={() => setScreen("ready")} />
      )}
    </div>
  );
}
