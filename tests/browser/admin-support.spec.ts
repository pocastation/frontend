import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`FAQ 순서와 본문은 예를 선택한 뒤 함께 저장된다 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    let writes = 0;
    let faq = { revision: 1, categories: [{ id: "start", title: "시작하기", lead: "", items: [
      { id: "a", q: "첫 질문", a: ["첫 답변"] }, { id: "b", q: "둘째 질문", a: ["둘째 답변"] },
    ] }] };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = {};
      if (path === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
      if (path === "/api/members/me") data = { id: "staff", nickname: "담당자", role: "ADMIN", emailVerified: true };
      if (path === "/api/admin/support/faq") {
        if (route.request().method() === "PUT") {
          faq = { ...route.request().postDataJSON(), revision: faq.revision + 1 }; writes++;
        }
        data = faq;
      }
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto("/admin/faq");
    const question = page.getByRole("button", { name: "첫 질문", exact: true });
    await question.click();
    const answer = page.getByRole("textbox", { name: "답변" });
    await answer.fill("새 답변");
    await question.click();
    const first = page.getByRole("button", { name: "첫 질문 순서 이동" });
    const second = page.getByRole("button", { name: "둘째 질문 순서 이동" });
    await first.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await first.hover();
    const start = (await first.boundingBox())!;
    const end = (await second.boundingBox())!;
    await page.mouse.move(start.x + 10, start.y + 10);
    await page.mouse.down();
    await page.mouse.move(start.x + 18, start.y + 12, { steps: 3 });
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(end.x + 10, end.y + end.height - 2, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByRole("region", { name: "분류 편집" }).getByRole("listitem").first()).toContainText("둘째 질문");
    const publish = page.getByRole("button", { name: "변경사항 게시" });
    // 드롭에서 발생한 합성 클릭과 별도로 게시 버튼을 누른다.
    await publish.click({ delay: 150 });
    await page.getByRole("button", { name: "아니오", exact: true }).click();
    expect(writes).toBe(0);
    await question.click();
    await expect(answer).toHaveValue("새 답변");
    await publish.click();
    await page.getByRole("button", { name: "예", exact: true }).click();
    await expect(publish).toBeDisabled();
    expect(faq.categories[0].items).toEqual([
      { id: "b", q: "둘째 질문", a: ["둘째 답변"] }, { id: "a", q: "첫 질문", a: ["새 답변"] },
    ]);
  });
}

test("공지 사진과 예약 설정은 확인 후 전송된다", async ({ page }) => {
  const requests: string[] = [];
  let deletions = 0;
  const notice = { slug: "test", revision: 1, title: "점검 안내", summary: "", category: "service", body: "본문",
    hidden: true, pinned: true, publishAt: "2099-12-31T00:30:00Z", photoIds: [] };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === "/api/auth/refresh") data = { accessToken: "staff-test", expiresInSeconds: 900 };
    if (path === "/api/members/me") data = { id: "staff", nickname: "담당자", role: "ADMIN", emailVerified: true };
    if (path === "/api/admin/support/notices") {
      if (route.request().method() === "POST") { requests.push(route.request().postDataBuffer()!.toString()); data = notice; }
      else data = [];
    }
    if (path === "/api/admin/support/notices/test") {
      if (route.request().method() === "DELETE") deletions++;
      else {
        requests.push(route.request().postDataBuffer()!.toString());
        data = { ...notice, revision: 2, title: "수정된 안내" };
      }
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/notices");
  await page.getByRole("button", { name: "공지 작성" }).click();
  await page.getByLabel("제목", { exact: true }).fill(notice.title);
  await page.getByLabel("본문").fill(notice.body);
  await page.getByLabel("상단 고정").check();
  await page.getByLabel("비공개").check();
  await page.getByLabel("예약 게시").check();
  await page.getByLabel("게시 일시").fill("2099-12-31T09:30");
  await page.getByLabel("사진 추가").setInputFiles({
    name: "notice.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/T42/JwAAAABJRU5ErkJggg==", "base64"),
  });
  const submit = page.getByRole("button", { name: "공지 등록" });
  await submit.click();
  await page.getByRole("button", { name: "아니오" }).click();
  expect(requests).toHaveLength(0);
  await submit.click();
  await page.getByRole("button", { name: "예", exact: true }).click();
  await expect(page.getByRole("heading", { name: notice.title })).toBeVisible();
  expect(requests).toHaveLength(1);
  for (const part of ['"hidden":true', '"pinned":true', '2099-12-31T00:30:00.000Z', 'name="photos"']) {
    expect(requests[0]).toContain(part);
  }
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill("수정된 안내");
  const update = page.getByRole("button", { name: "수정 저장" });
  await update.click();
  await page.getByRole("button", { name: "아니오" }).click();
  expect(requests).toHaveLength(1);
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("수정된 안내");
  await update.click();
  await page.getByRole("button", { name: "예", exact: true }).click();
  await expect(page.getByRole("heading", { name: "수정된 안내" })).toBeVisible();
  expect(requests[1]).toContain('"revision":1');
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("button", { name: "예", exact: true }).click();
  await expect(page.getByText("등록된 공지가 없습니다.")).toBeVisible();
  expect(deletions).toBe(1);
});
