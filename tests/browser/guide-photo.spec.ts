import { expect, test } from "@playwright/test";

const labels = ["앞면", "뒷면", "모서리 근접", "하자 부위"];

test.beforeEach(async ({ page }) => {
  // 공개 가이드만 검증하므로 로그인 복구 요청은 익명 사용자로 응답한다.
  await page.route("**/api/**", route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/guide/photo");
});

test("모든 예시를 해당 사진으로 열고 닫으면 원래 버튼으로 돌아간다", async ({ page }, testInfo) => {
  const examples = page.getByRole("region", { name: "필수 4컷 예시" });
  await expect(examples.getByRole("button")).toHaveCount(4);
  await expect(examples.getByText("촬영 방법 설명을 위한 AI 생성 예시입니다.")).toBeVisible();
  for (let index = 0; index < labels.length; index++) {
    const trigger = page.getByRole("button", { name: `${labels[index]} 사진 확대`, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: labels[index], exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`${index + 1} / 4`, { exact: true })).toBeVisible();
    const image = dialog.getByRole("img");
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const bounds = await image.boundingBox();
    expect(bounds!.width / bounds!.height).toBeCloseTo(5 / 7, 2);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await dialog.getByRole("button", { name: "확대 사진 닫기" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  }
  await page.screenshot({ path: testInfo.outputPath("guide-desktop.png"), fullPage: true });
});

test("확대·드래그·사진 전환·키보드와 포커스 순환을 지원한다", async ({ page }, testInfo) => {
  const trigger = page.getByRole("button", { name: "하자 부위 사진 확대", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const image = dialog.getByRole("img");
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await dialog.getByRole("button", { name: "2배 확대", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "전체 보기", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(image).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  const box = await image.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 50, box!.y + box!.height / 2 + 90, { steps: 5 });
  await page.mouse.up();
  await expect(image).not.toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  await dialog.getByRole("button", { name: "다음 사진", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("앞면");
  await expect(dialog.getByRole("button", { name: "2배 확대", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toHaveAccessibleName("하자 부위");
  await dialog.getByRole("button", { name: "모서리 근접 보기", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("모서리 근접");
  await expect(dialog.getByRole("button", { name: "모서리 근접 보기", exact: true })).toHaveAttribute("aria-current", "true");
  await dialog.getByRole("button", { name: "하자 부위 보기", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "2배 확대", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "하자 부위 보기", exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("guide-viewer.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("작은 모바일 화면에서도 네 사진과 확대 컨트롤이 잘리지 않는다", async ({ page }, testInfo) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const label of labels) {
      const bounds = await page.getByRole("button", { name: `${label} 사진 확대`, exact: true }).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.getByRole("button", { name: "모서리 근접 사진 확대", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const name of ["2배 확대", "확대 사진 닫기", "이전 사진", "다음 사진"]) {
      const control = dialog.getByRole("button", { name, exact: true });
      await expect(control).toBeVisible();
      const bounds = await control.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    }
    const image = dialog.getByRole("img");
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const bounds = await image.boundingBox();
    const cx = bounds!.x + bounds!.width / 2, cy = bounds!.y + bounds!.height / 2;
    await page.mouse.move(cx + 60, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 60, cy, { steps: 5 });
    await page.mouse.up();
    await expect(dialog).toHaveAccessibleName("하자 부위");
    await dialog.getByRole("button", { name: "확대 사진 닫기" }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("guide-mobile.png"), fullPage: true });
});

test("다른 가이드에는 사진 영역을 추가하지 않는다", async ({ page }) => {
  await page.goto("/guide/sell");
  await expect(page.getByRole("heading", { name: "판매 등록", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "필수 4컷 예시" })).toHaveCount(0);
});
