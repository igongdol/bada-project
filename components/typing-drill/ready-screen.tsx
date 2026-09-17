"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { KeyboardRow } from "./keyboard-row";
import { GOAL_SCORE, KEYS, ROUND_SECONDS } from "./round-engine";

type ReadyScreenProps = {
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

export function ReadyScreen({ onStart }: ReadyScreenProps) {
  const pressedCode = useKeyboardPreview();

  return (
    <div className="flex min-h-[clamp(360px,54vh,520px)] flex-col gap-[clamp(10px,1.4vw,16px)] rounded-2xl border border-border bg-card p-[clamp(18px,3vw,32px)] text-card-foreground">
      <div className="grid gap-2 text-center">
        <h1 className="m-0 text-[clamp(22px,3.4vw,30px)] font-bold tracking-tight">
          바다야, 타자 쳐볼까?
        </h1>
        <p className="m-0 text-[clamp(14px,1.7vw,17px)] leading-relaxed text-muted-foreground">
          가운뎃줄 여덟 글자를 {ROUND_SECONDS}초 동안 쳐 봐요. {GOAL_SCORE}점을
          넘기면 오늘 목표 성공!
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto grid w-max max-w-full gap-3">
          <GuideRow chip="왼손" text="새끼는 ㅁ, 약지는 ㄴ, 중지는 ㅇ, 검지는 ㄹ 위에 올려 주세요." />
          <GuideRow chip="오른손" text="검지는 ㅓ, 중지는 ㅏ, 약지는 ㅣ, 새끼는 ㅔ 위에 올려 주세요." />
          <GuideRow chip="눈" text="손가락 말고 화면을 봐요. 틀리면 어느 키인지 아래에 켜집니다." />
          <GuideRow chip="점수" text="한 글자에 10점. 한 번에 3개, 5개, 7개씩 이어서 맞히면 보너스!" />
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-[clamp(26px,4.6vw,50px)]">
        <KeyboardRow pressedCode={pressedCode} />
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button size="lg" onClick={onStart}>
            시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuideRow({ chip, text }: { chip: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[15px] leading-relaxed">
      <span className="whitespace-nowrap rounded-md border border-border bg-secondary px-2.5 py-1 text-[13px] font-semibold text-secondary-foreground">
        {chip}
      </span>
      <span>{text}</span>
    </div>
  );
}
