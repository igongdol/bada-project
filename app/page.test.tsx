import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("첫 화면은 준비 화면이고 시작하기 버튼을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "바다야, 타자 쳐볼까?" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "시작하기" })
  ).toBeInTheDocument();
});
