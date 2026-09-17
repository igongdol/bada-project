import { cn } from "@/lib/utils";

import styles from "./typing-drill.module.css";
import { KEYS, type PracticeRange } from "./round-engine";

const ROWS = ["top", "home", "bottom"] as const;

// 실제 자판처럼 아랫줄로 갈수록 오른쪽으로 밀린다.
const ROW_INDENT: Record<(typeof ROWS)[number], string> = {
  top: "",
  home: "ml-[clamp(10px,2vw,22px)]",
  bottom: "ml-[clamp(24px,5vw,56px)]",
};

type KeyboardRowProps = {
  /** 이번 판에 칠 수 있는 범위. 범위 밖의 키는 흐리게 남긴다. */
  range: PracticeRange;
  /** 지금 눌러야 할 키의 code. 빨간색으로 눈에 띄게 켜고 손가락도 알려 준다. */
  alertCode?: string | null;
  /** 방금 그 키를 눌렀다는 파란색 확인 표시. */
  pressedCode?: string | null;
};

// 준비 화면과 연습 화면이 같은 자판 그림을 공유한다. 세 줄을 항상 모두 보여줘
// 자판 전체의 모양이 늘 보이게 하고, 범위 밖의 키만 흐리게 처리한다.
export function KeyboardRow({ range, alertCode, pressedCode }: KeyboardRowProps) {
  const inRange = new Set(range.keys.map((key) => key.code));

  return (
    <div className="grid justify-items-center gap-[clamp(4px,0.8vw,7px)]">
      {ROWS.map((row) => (
        <div
          key={row}
          className={cn(
            "flex flex-nowrap justify-center gap-[clamp(4px,0.9vw,8px)]",
            ROW_INDENT[row]
          )}
        >
          {KEYS.filter((key) => key.row === row).map((key) => {
            const isAlert = key.code === alertCode;
            const isPressed = !isAlert && key.code === pressedCode;
            return (
              <div
                key={key.code}
                className={cn(
                  "flex aspect-[1/1.05] min-w-0 flex-[0_1_clamp(38px,7.2vw,62px)] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary text-[clamp(15px,2.2vw,21px)] font-bold text-secondary-foreground transition-[background,color,transform,border-color] duration-150",
                  !inRange.has(key.code) && "bg-transparent text-muted-foreground opacity-45",
                  isPressed &&
                    "-translate-y-1.5 scale-[1.06] border-primary bg-primary text-primary-foreground",
                  isAlert &&
                    cn(
                      "-translate-y-1.5 scale-[1.06] border-destructive bg-destructive text-primary-foreground",
                      styles.keyShow
                    )
                )}
              >
                <span>{key.letter}</span>
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-current opacity-35",
                    (isAlert || isPressed) && "opacity-100"
                  )}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
