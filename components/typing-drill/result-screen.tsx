import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GOAL_SCORE, type RoundResult } from "./round-engine";

type ResultScreenProps = {
  result: RoundResult;
  onAgain: () => void;
  onQuit: () => void;
};

export function ResultScreen({ result, onAgain, onQuit }: ResultScreenProps) {
  const { score, accuracy, hits, met } = result;
  const goalPercent = Math.min(100, (score / GOAL_SCORE) * 100);

  return (
    <div className="flex flex-col gap-[clamp(16px,2.4vw,24px)] rounded-2xl border border-border bg-card p-[clamp(18px,3vw,32px)] text-card-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-[clamp(52px,10vw,76px)] leading-none">
          {met ? "🐬" : "🐚"}
        </div>
        <h1
          data-testid="verdict"
          className="m-0 text-[clamp(24px,3.6vw,34px)] font-extrabold tracking-tight"
        >
          {met ? "목표 성공!" : "조금만 더!"}
        </h1>
        <p className="m-0 text-[clamp(14px,1.8vw,17px)] text-muted-foreground">
          {met
            ? "한 번도 안 보고 여기까지 왔어요. 바다 더 깊이 들어가 볼까요?"
            : `목표까지 ${GOAL_SCORE - score}점 남았어요. 이어서 맞히면 보너스가 붙어요.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-[clamp(10px,1.6vw,16px)]">
        <ScoreCard
          testId="result-score"
          label="점수"
          value={score}
          lead
          note="맞힌 글자 10점에 연속 보너스를 더한 점수예요."
        />
        <ScoreCard
          testId="result-accuracy"
          label="정확도"
          value={`${accuracy}%`}
          note="처음 누른 키가 맞은 비율"
        />
        <ScoreCard
          testId="result-hits"
          label="글자 수"
          value={hits}
          note="60초 동안 친 글자"
        />
      </div>

      <div className="grid gap-2">
        <div className="h-3.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${goalPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[13px] font-semibold text-muted-foreground">
          <span>내 점수 {score}점</span>
          <span>목표 {GOAL_SCORE}점</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        <Button onClick={onAgain}>한 번 더</Button>
        <Button variant="outline" onClick={onQuit}>
          오늘은 그만
        </Button>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  note,
  lead = false,
  testId,
}: {
  label: string;
  value: string | number;
  note: string;
  lead?: boolean;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-[clamp(14px,2.2vw,22px)] text-center",
        lead && "col-span-full"
      )}
    >
      <span className="text-[13px] font-bold tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        data-testid={`${testId}-value`}
        className={cn(
          "font-mono font-extrabold tracking-tighter tabular-nums leading-none",
          lead
            ? "text-[clamp(48px,9vw,76px)] text-foreground"
            : "text-[clamp(32px,6vw,52px)] text-muted-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[13px] text-muted-foreground">{note}</span>
    </div>
  );
}
