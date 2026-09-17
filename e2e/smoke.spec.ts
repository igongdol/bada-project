import { expect, test } from "@playwright/test";

// 판정 대상 여덟 낱자와 물리 키(US 배열 기준)의 대응. round-engine.ts의 KEYS와 같다.
const LETTER_TO_KEY: Record<string, string> = {
  ㅁ: "a",
  ㄴ: "s",
  ㅇ: "d",
  ㄹ: "f",
  ㅓ: "j",
  ㅏ: "k",
  ㅣ: "l",
  ㅔ: ";",
};

test("준비 화면은 규칙과 손 올릴 자리를 보여준다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("바다타자");
  await expect(
    page.getByRole("heading", { level: 1, name: "바다야, 타자 쳐볼까?" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
});

test("맞는 키를 누르면 다음 낱자로 넘어가고 점수가 오른다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();

  await expect(page.getByTestId("score-count")).toHaveText("0 / 700");
  const letter = await page.getByTestId("letter").textContent();
  const key = LETTER_TO_KEY[letter!.trim()];

  await page.keyboard.press(key);

  await expect(page.getByTestId("score-count")).toHaveText("10 / 700");
});

test("연습 대상이 아닌 키를 누르면 틀린 것으로 판정하고 정답 손가락을 알려준다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();

  const letterBefore = await page.getByTestId("letter").textContent();
  // ㅎ(g 키)는 어느 낱자가 나오든 정답이 될 수 없는 연습 대상 밖 키다.
  await page.keyboard.press("g");

  await expect(page.getByTestId("hint")).toContainText("를 눌러요");
  await expect(page.getByTestId("score-count")).toHaveText("0 / 700");
  // 틀렸으니 같은 낱자에 머문다.
  await expect(page.getByTestId("letter")).toHaveText(letterBefore!);
});

test("멈추기를 누르면 판을 버리고 준비 화면으로 돌아간다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.getByTestId("letter")).toBeVisible();

  await page.getByRole("button", { name: "멈추기" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "바다야, 타자 쳐볼까?" })
  ).toBeVisible();
});

test("60초가 지나면 결과 화면에서 점수와 정확도, 목표 달성 여부를 본다", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();

  // 이번 판은 한 글자도 못 맞히고 시간만 끝난다 -> 목표 미달성.
  await page.clock.fastForward("01:01");

  await expect(page.getByTestId("verdict")).toHaveText("조금만 더!");
  await expect(page.getByTestId("result-score-value")).toHaveText("0");
  await expect(page.getByTestId("result-accuracy-value")).toHaveText("0%");
  await expect(page.getByTestId("result-hits-value")).toHaveText("0");

  await page.getByRole("button", { name: "한 번 더" }).click();
  await expect(page.getByTestId("letter")).toBeVisible();
});

test("700점을 넘기면 목표 달성 문구가 뜨고 결과 화면도 성공으로 표시한다", async ({
  page,
}) => {
  // 60초 타이머를 얼려 두고 키 입력만으로 점수를 올린다. 마지막에만 시간을 넘긴다.
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "시작하기" }).click();

  // 계속 맞혀서 점수를 목표(700점) 위로 올린다.
  let score = 0;
  for (let i = 0; i < 80 && score < 700; i++) {
    const letter = (await page.getByTestId("letter").textContent())!.trim();
    await page.keyboard.press(LETTER_TO_KEY[letter]);
    const text = await page.getByTestId("score-count").textContent();
    score = Number(text!.split("/")[0].trim());
  }
  expect(score).toBeGreaterThanOrEqual(700);

  // 목표를 넘긴 순간 화면에 한 번 표시된다.
  await expect(page.locator("body")).toContainText("목표 달성");

  await page.clock.fastForward("01:01");

  await expect(page.getByTestId("verdict")).toHaveText("목표 성공!");
  const resultScore = Number(
    await page.getByTestId("result-score-value").textContent()
  );
  expect(resultScore).toBeGreaterThanOrEqual(700);
});
