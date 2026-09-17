"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { ReadyScreen } from "./ready-screen";
import { ResultScreen } from "./result-screen";
import { RoundScreen } from "./round-screen";
import {
  ROUND_SECONDS,
  applyKeyPress,
  finishRound,
  isTypingKeyCode,
  startRound,
  type RoundEngineState,
  type RoundResult,
} from "./round-engine";

type Screen = "ready" | "round" | "result";
type StreakMessage = { text: string; cheer: boolean } | null;

// 한 판의 흐름(준비 → 연습 → 결과)을 관리한다. 점수·판정 규칙은 round-engine이 갖고,
// 이 컴포넌트는 화면 전환, 타이머, 키보드 입력 배선만 맡는다.
export function TypingDrill() {
  const [screen, setScreen] = useState<Screen>("ready");
  const [engine, setEngine] = useState<RoundEngineState | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_SECONDS * 1000);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [message, setMessage] = useState<StreakMessage>(null);

  // 타이머 콜백에서 최신 엔진 상태를 읽기 위한 거울. 렌더 중에는 읽지 않는다.
  const engineRef = useRef<RoundEngineState | null>(null);
  const endsAtRef = useRef(0);
  const captureRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  function handleStart() {
    setEngine(startRound());
    endsAtRef.current = Date.now() + ROUND_SECONDS * 1000;
    setTimeLeftMs(ROUND_SECONDS * 1000);
    setMessage(null);
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
        if (finished) setResult(finishRound(finished));
        setScreen("result");
      }
    }, 200);
    return () => clearInterval(id);
  }, [screen]);

  function handleStop() {
    setEngine(null);
    setMessage(null);
    setScreen("ready");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!engine) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!isTypingKeyCode(event.code)) return;
    event.preventDefault();

    const prevGoalHit = engine.goalHit;
    const next = applyKeyPress(engine, event.code);
    setEngine(next);

    if (next.lastOutcome === "hit") {
      if (!prevGoalHit && next.goalHit) {
        setMessage({
          text: "목표 달성! 남은 시간 동안 더 가 볼까요?",
          cheer: true,
        });
      } else if (next.lastBonus > 0) {
        setMessage({ text: `${next.streak}개 연속 +${next.lastBonus}점!`, cheer: true });
      } else if (next.streak >= 2) {
        setMessage({ text: `${next.streak}개 연속`, cheer: false });
      } else {
        setMessage(null);
      }
    } else {
      setMessage(null);
    }
  }

  const hint =
    engine && engine.dirty
      ? { finger: engine.target.finger, letter: engine.target.letter }
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8">
      {screen === "ready" && <ReadyScreen onStart={handleStart} />}

      {screen === "round" && engine && (
        <RoundScreen
          captureRef={captureRef}
          target={engine.target}
          score={engine.score}
          timeLeftMs={timeLeftMs}
          streakMessage={message}
          hint={hint}
          lastOutcome={engine.lastOutcome}
          pressSeq={engine.pressSeq}
          onKeyDown={handleKeyDown}
          onStop={handleStop}
        />
      )}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          onAgain={handleStart}
          onQuit={() => setScreen("ready")}
        />
      )}
    </div>
  );
}
