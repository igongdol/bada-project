"use client";

import { type KeyboardEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KeyboardRow } from "./keyboard-row";
import { ROUND_SECONDS, type DrillKey, type PracticeRange } from "./round-engine";
import styles from "./typing-drill.module.css";

type StreakMessage = { text: string; cheer: boolean } | null;

type RoundScreenProps = {
  captureRef: RefObject<HTMLInputElement | null>;
  range: PracticeRange;
  target: DrillKey;
  score: number;
  ceiling: number;
  recordHit: boolean;
  timeLeftMs: number;
  streakMessage: StreakMessage;
  messageSeq: number;
  hint: { finger: string; letter: string } | null;
  lastOutcome: "hit" | "miss" | null;
  pressSeq: number;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStop: () => void;
};

export function RoundScreen({
  captureRef,
  range,
  target,
  score,
  ceiling,
  recordHit,
  timeLeftMs,
  streakMessage,
  messageSeq,
  hint,
  lastOutcome,
  pressSeq,
  onKeyDown,
  onStop,
}: RoundScreenProps) {
  const timePercent = Math.max(
    0,
    Math.min(100, (timeLeftMs / (ROUND_SECONDS * 1000)) * 100)
  );
  const gaugePercent = Math.min(100, (score / ceiling) * 100);

  return (
    <div
      className="relative flex min-h-[clamp(460px,70vh,660px)] flex-col gap-[clamp(16px,2.4vw,24px)] rounded-2xl border border-border bg-card p-[clamp(18px,3vw,32px)] text-card-foreground"
      onPointerDown={() => captureRef.current?.focus()}
    >
      <input
        ref={captureRef}
        className={styles.captureInput}
        aria-label="타자 입력"
        autoComplete="off"
        onKeyDown={onKeyDown}
      />

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2.5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          남은 시간
        </span>
        <div className="flex items-center justify-self-end gap-2.5">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            점수
          </span>
          <div className="relative h-3 w-[clamp(110px,20vw,220px)] overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-200 ease-out",
                recordHit ? "bg-foreground" : "bg-primary"
              )}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
          <span
            data-testid="score-count"
            className="font-mono text-[15px] font-bold tabular-nums"
          >
            {score} / {ceiling}
          </span>
        </div>
        <Button
          type="button"
          tabIndex={-1}
          variant="outline"
          size="sm"
          className="justify-self-end"
          onClick={onStop}
        >
          멈추기
        </Button>
        <div className="col-span-full h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground transition-[width] duration-200 ease-linear"
            style={{ width: `${timePercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div
          key={`streak-${messageSeq}`}
          className={cn(
            "flex min-h-8 items-center text-[15px] font-bold text-primary",
            !streakMessage && "opacity-0",
            streakMessage?.cheer &&
              cn(
                "rounded-full bg-primary px-3.5 py-1.5 text-primary-foreground",
                styles.cheer
              )
          )}
        >
          {streakMessage?.text}
        </div>

        <div
          key={`letter-${pressSeq}`}
          data-testid="letter"
          className={cn(
            "text-[clamp(120px,22vw,210px)] leading-none font-bold tracking-tighter text-foreground",
            lastOutcome === "hit" && styles.letterHit,
            lastOutcome === "miss" && styles.letterMiss
          )}
        >
          {target.letter}
        </div>

        <div
          data-testid="hint"
          className={cn(
            "flex min-h-6.5 items-center text-[clamp(14px,1.8vw,17px)] font-semibold text-destructive",
            !hint && "invisible"
          )}
        >
          {hint ? `${hint.finger}로 ${hint.letter} 를 눌러요` : " "}
        </div>
      </div>

      <KeyboardRow range={range} alertCode={hint ? target.code : null} />
    </div>
  );
}
