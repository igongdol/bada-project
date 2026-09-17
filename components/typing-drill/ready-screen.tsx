"use client";

import { useEffect, useState } from "react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { KeyboardRow } from "./keyboard-row";
import { withTopicMarker } from "./korean";
import type { RoundRecord } from "./records";
import {
  KEYS,
  RANGES,
  ROUND_SECONDS,
  scoreCeiling,
  type PracticeRange,
  type RangeId,
} from "./round-engine";

type ReadyScreenProps = {
  range: PracticeRange;
  best: number;
  recent: RoundRecord[];
  onSelectRange: (id: RangeId) => void;
  onStart: () => void;
};

// 준비 화면에서는 아직 판정하지 않는다. 손 위치를 확인해 보라고, 누른 물리
// 키에 해당하는 자판 그림만 파랗게 알려 준다.
function useKeyboardPreview() {
  const [pressedCode, setPressedCode] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!KEYS.some((key) => key.code === event.code)) return;
      event.preventDefault();
      setPressedCode(event.code);
    }

    function handleKeyUp(event: KeyboardEvent) {
      setPressedCode((current) => (current === event.code ? null : current));
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return pressedCode;
}

export function ReadyScreen({
  range,
  best,
  recent,
  onSelectRange,
  onStart,
}: ReadyScreenProps) {
  const pressedCode = useKeyboardPreview();
  const hasRecords = recent.length > 0;

  return (
    <div className="flex min-h-[clamp(360px,54vh,520px)] flex-col gap-[clamp(26px,3.6vw,44px)] rounded-2xl border border-border bg-card p-[clamp(18px,3vw,32px)] text-card-foreground">
      <div className="grid gap-2 text-center">
        <h1 className="m-0 text-[clamp(22px,3.4vw,30px)] font-bold tracking-tight">
          바다야, 타자 쳐볼까?
        </h1>
        <p className="m-0 text-[clamp(14px,1.7vw,17px)] leading-relaxed text-muted-foreground">
          칠 자리를 고르고 {ROUND_SECONDS}초 동안 쳐 봐요.
        </p>
      </div>

      <ToggleGroup
        value={[range.id]}
        onValueChange={(value) => {
          const next = value[0];
          if (next) onSelectRange(next as RangeId);
        }}
        variant="outline"
        className="mx-auto flex flex-wrap justify-center gap-2"
        aria-label="연습 범위"
      >
        {RANGES.map((option) => (
          <ToggleGroupItem key={option.id} value={option.id} className="gap-1.5 rounded-full px-4">
            <span>{option.label}</span>
            <span className="text-xs font-bold opacity-70">{option.keys.length}자</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {hasRecords ? (
        <BestRecord range={range} best={best} recent={recent} />
      ) : (
        <p
          data-testid="first-note"
          className="m-0 text-center text-[clamp(14px,1.8vw,17px)] font-semibold text-foreground"
        >
          {withTopicMarker(range.label)} 오늘이 첫 판이에요. 이번 점수가 이 범위의 첫 기록이 됩니다.
        </p>
      )}

      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto flex items-center gap-2.5 text-[15px] leading-relaxed">
          <span className="whitespace-nowrap rounded-md border border-border bg-secondary px-2.5 py-1 text-[13px] font-semibold text-secondary-foreground">
            점수
          </span>
          <span>한 글자에 10점. 한 번에 3개, 5개, 7개씩 이어서 맞히면 보너스!</span>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-[clamp(26px,4.6vw,50px)]">
        <KeyboardRow range={range} pressedCode={pressedCode} />
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button size="lg" onClick={onStart}>
            시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}

function BestRecord({
  range,
  best,
  recent,
}: {
  range: PracticeRange;
  best: number;
  recent: RoundRecord[];
}) {
  const top = scoreCeiling(best) * 1.1;

  return (
    <div className="flex flex-wrap items-end justify-center gap-x-[clamp(20px,3.4vw,38px)] gap-y-[clamp(16px,3vw,34px)]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] font-bold tracking-wide text-muted-foreground">
          내 최고
        </span>
        <span
          data-testid="best-value"
          className="font-mono text-[clamp(34px,6vw,54px)] font-extrabold tabular-nums tracking-tighter"
        >
          {best.toLocaleString("ko-KR")}
        </span>
        <span className="text-base font-bold text-muted-foreground">점</span>
      </div>

      <div className="relative flex h-[54px] items-end gap-1.5 pb-1">
        {recent.map((round, index) => {
          const isBest = round.score === best;
          const height = Math.max(4, (round.score / top) * 44);
          return (
            <div key={index} className="group relative">
              <span
                className={cn(
                  "block w-[clamp(14px,2.6vw,22px)] min-h-1 rounded-t-[4px] rounded-b-[2px] bg-muted transition-colors",
                  isBest && "bg-foreground group-hover:brightness-125",
                  !isBest && "group-hover:bg-muted-foreground"
                )}
                style={{ height }}
                tabIndex={0}
                data-testid="recent-bar"
                data-best={isBest}
              />
              <span className="pointer-events-none absolute bottom-[calc(100%+7px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-bold tabular-nums text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {round.score.toLocaleString("ko-KR")}점
              </span>
            </div>
          );
        })}
      </div>

      <p className="m-0 basis-full pt-1 text-center text-[13px] text-muted-foreground">
        지난번에 {range.label}에서 세운 기록이에요. 오늘 넘어 볼까요?
      </p>
    </div>
  );
}
