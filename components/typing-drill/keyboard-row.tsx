import { cn } from "@/lib/utils";

import styles from "./typing-drill.module.css";
import { KEYS } from "./round-engine";

type KeyboardRowProps = {
  /** 지금 눌러야 할 키의 code. 빨간색으로 눈에 띄게 켜고 손가락도 알려 준다. */
  alertCode?: string | null;
  /** 방금 그 키를 눌렀다는 파란색 확인 표시. */
  pressedCode?: string | null;
};

// 준비 화면과 연습 화면이 같은 자판 그림을 공유한다.
export function KeyboardRow({ alertCode, pressedCode }: KeyboardRowProps) {
  return (
    <div className="flex flex-nowrap justify-center gap-[clamp(4px,0.9vw,8px)]">
      {KEYS.map((key) => {
        const isAlert = key.code === alertCode;
        const isPressed = !isAlert && key.code === pressedCode;
        return (
          <div
            key={key.code}
            className={cn(
              "flex aspect-[1/1.05] flex-none basis-[clamp(38px,7.2vw,62px)] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary text-[clamp(15px,2.2vw,21px)] font-bold text-secondary-foreground transition-[background,color,transform,border-color] duration-150",
              !key.inRound && "bg-transparent text-muted-foreground opacity-45",
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
  );
}
