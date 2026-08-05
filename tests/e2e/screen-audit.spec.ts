import { expect, test, type Page, type TestInfo } from "@playwright/test";

const demoPassword = process.env.DEMO_PASSWORD ?? process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
const runRealE2e = process.env.RUN_REAL_E2E === "1";
const viewports = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 900 },
  { name: "390", width: 390, height: 900 }
];

test.describe("full screen responsive audit", () => {
  test.skip(!runRealE2e, "Set RUN_REAL_E2E=1 with local Supabase env vars to run the screen audit.");
  test.describe.configure({ mode: "serial" });

  async function loginAs(page: Page, roleName: "管理者" | "担当者" | "閲覧者") {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.evaluate(() => window.localStorage.clear());
    await page.getByRole("button", { name: new RegExp(roleName) }).click();
    if (!demoPassword) throw new Error("DEMO_PASSWORD or NEXT_PUBLIC_DEMO_PASSWORD is required for real E2E.");
    await page.getByLabel("パスワード").fill(demoPassword);
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL("**/jobs");
    await expect(page.getByRole("heading", { name: "案件一覧" })).toBeVisible();
  }

  async function expectNoPageOverflow(page: Page) {
    const overflow = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const unmanaged = [...document.querySelectorAll("*")].filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.right <= clientWidth + 1) return false;
        return !element.closest(".overflow-x-auto, .overflow-hidden");
      });
      return { extraWidth: scrollWidth - clientWidth, unmanagedCount: unmanaged.length };
    });
    expect(overflow.extraWidth).toBeLessThanOrEqual(16);
  }

  async function expectNoSecretExposure(page: Page) {
    const html = await page.content();
    expect(html).not.toContain("SERVICE_ROLE_KEY");
    expect(html).not.toContain("sb_secret_");
    expect(html).not.toContain("service_role");
  }

  async function screenshot(page: Page, testInfo: TestInfo, name: string) {
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  }

  async function auditCurrentPage(page: Page) {
    await expectNoPageOverflow(page);
    await expectNoSecretExposure(page);
  }

  test("audits main screens across required widths", async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const serverErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => failedRequests.push(request.url()));
    page.on("response", (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    });

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "点検案件管理アプリ" })).toBeVisible();
      await expect(page.getByText("架空データを使った模擬納品")).toBeVisible();
      await expect(page.getByRole("button", { name: /担当者/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /閲覧者/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /管理者/ })).toHaveAttribute("aria-pressed", "false");
      await page.getByRole("button", { name: /管理者/ }).click();
      await expect(page.getByLabel("メールアドレス")).toHaveValue("admin@table-to-app.example");
      await expect(page.getByLabel("パスワード")).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `login-${viewport.name}`);

      await loginAs(page, "管理者");
      await expect(page.getByText("山本 管理 / 管理者")).toBeVisible();
      await expect(page.getByText("全案件数")).toBeVisible();
      await expect(page.getByText("期限超過").first()).toBeVisible();
      await expect(page.getByText("7日以内").first()).toBeVisible();
      await expect(page.getByText("未完了").first()).toBeVisible();
      await page.getByLabel("キーワード").fill("__NO_MATCH__");
      await page.getByRole("button", { name: "検索" }).click();
      await expect(page).toHaveURL(/q=__NO_MATCH__/);
      await expect(page.getByText("該当する案件がありません")).toBeVisible();
      await page.goto("/jobs?status=scheduled&billing=quoted");
      await expect(page.getByLabel("進捗")).toHaveValue("scheduled");
      await expect(page.getByLabel("請求")).toHaveValue("quoted");
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `jobs-filtered-${viewport.name}`);

      await page.goto("/jobs");
      const adminOwnedRow = page.locator("tbody tr").filter({ hasText: "山本 管理" }).first();
      await expect(adminOwnedRow).toBeVisible();
      const adminOwnedDetailUrl = await adminOwnedRow.locator("a").first().getAttribute("href");
      if (!adminOwnedDetailUrl) throw new Error("Admin-owned job detail URL was not found.");
      expect(adminOwnedDetailUrl).toMatch(/^\/jobs\//);
      await page.goto(adminOwnedDetailUrl);
      await expect(page.getByRole("heading", { name: "更新履歴" })).toBeVisible();
      await expect(page.getByRole("link", { name: "編集" })).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `detail-${viewport.name}`);

      await page.getByRole("link", { name: "編集" }).click();
      await expect(page.getByRole("heading", { name: "案件編集" })).toBeVisible();
      await expect(page.getByLabel("案件番号")).toBeVisible();
      await expect(page.getByRole("button", { name: /保存/ })).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `edit-${viewport.name}`);

      await page.goto("/jobs/new");
      await expect(page.getByRole("heading", { name: "案件登録" })).toBeVisible();
      const uniqueJobNo = `UI-${testInfo.project.name}-${viewport.name}-${Date.now()}`.replace(/[^A-Za-z0-9-]/g, "-");
      await page.getByLabel("案件番号").fill(uniqueJobNo);
      await page.getByLabel("点検種別").fill("レスポンシブ確認");
      await page.getByLabel("点検予定日").fill("2026-08-20");
      await page.getByLabel("報告書提出期限").fill("2026-08-19");
      await page.getByRole("button", { name: /保存/ }).click();
      await expect(page.getByText("保存できませんでした。入力内容を確認してください。")).toBeVisible();
      await page.getByLabel("報告書提出期限").fill("2026-08-22");
      await page.getByLabel("備考").fill("長い備考の確認用。現場入館ルール、報告書提出先、担当者への共有事項をまとめて記載します。".repeat(3));
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `new-${viewport.name}`);

      await page.goto("/csv-import");
      await expect(page.getByRole("heading", { name: "CSV移行" })).toBeVisible();
      const csvJobNo = `UI-CSV-${testInfo.project.name}-${viewport.name}-${Date.now()}`.replace(/[^A-Za-z0-9-]/g, "-");
      const csv = [
        "job_no,customer_code,customer_name,site_name,postal_code,address,inspection_type,assignee_email,scheduled_date,report_due_date,status,estimate_amount,billing_status,notes",
        `${csvJobNo},C901,画面確認用の長い顧客名サンプル株式会社,スマートフォン確認用の長い現場名,590-0901,大阪府南大阪市架空町90-1-1,消防設備点検,staff@table-to-app.example,2026-08-25,2026-08-28,scheduled,50000,quoted,CSV画面確認用`,
        `${csvJobNo},C901,画面確認用の長い顧客名サンプル株式会社,別現場,590-0902,大阪府南大阪市架空町90-2-1,消防設備点検,unknown@example.invalid,2026-08-25,2026-08-24,invalid,-1,bad,異常行`
      ].join("\n");
      await page.locator("input[type=file]").setInputFiles({ name: `${csvJobNo}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) });
      await expect(page.getByRole("heading", { name: "プレビューと検証" })).toBeVisible();
      await expect(page.getByText("総行数:")).toBeVisible();
      await expect(page.getByText("正常行:")).toBeVisible();
      await expect(page.getByText("失敗行:")).toBeVisible();
      await expect(page.getByText("エラー件数:")).toBeVisible();
      await expect(page.getByText("行番号")).toBeVisible();
      await expect(page.getByText("理由")).toBeVisible();
      await page.getByRole("button", { name: "取込確認へ" }).click();
      await expect(page.getByRole("heading", { name: "取込確認" })).toBeVisible();
      await page.getByRole("button", { name: "戻る" }).click();
      await expect(page.getByRole("heading", { name: "プレビューと検証" })).toBeVisible();
      await page.getByRole("button", { name: "取込確認へ" }).click();
      await page.getByRole("button", { name: "正常行を取り込む" }).click();
      await expect(page.getByRole("heading", { name: "取込結果" })).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `csv-${viewport.name}`);

      await page.goto("/users");
      await expect(page.getByRole("heading", { name: "利用者・権限管理" })).toBeVisible();
      await expect(page.getByText("admin@table-to-app.example")).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `users-${viewport.name}`);

      const notFoundResponse = await page.goto("/does-not-exist-for-audit");
      expect(notFoundResponse?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `not-found-${viewport.name}`);

      await loginAs(page, "担当者");
      await expect(page.getByText("田中 担当 / 担当者")).toBeVisible();
      await expect(page.getByRole("link", { name: "CSV", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "利用者", exact: true })).toHaveCount(0);
      await page.goto(adminOwnedDetailUrl);
      await expect(page.getByText("案件が見つからないか、閲覧権限がありません。")).toBeVisible();
      await page.goto(`${adminOwnedDetailUrl}/edit`);
      await expect(page.getByText("この案件を編集する権限がありません。")).toBeVisible();
      await page.goto("/csv-import");
      await page.waitForURL("**/jobs?error=forbidden");
      await expect(page.getByText("権限がありません。")).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `staff-forbidden-${viewport.name}`);

      await loginAs(page, "閲覧者");
      await expect(page.getByText("佐藤 閲覧 / 閲覧者")).toBeVisible();
      await expect(page.getByRole("link", { name: "新規登録" })).toHaveCount(0);
      await page.locator("tbody tr").first().locator("a").click();
      await expect(page.getByRole("heading", { name: "更新履歴" })).toBeVisible();
      await expect(page.getByRole("link", { name: "編集" })).toHaveCount(0);
      await page.goto("/jobs/new");
      await expect(page.getByText("閲覧者は案件を登録できません。")).toBeVisible();
      await auditCurrentPage(page);
      await screenshot(page, testInfo, `viewer-${viewport.name}`);
    }

    const expectedNotFoundMessage = "Failed to load resource: the server responded with a status of 404 (Not Found)";
    expect(consoleErrors.filter((message) => message !== expectedNotFoundMessage)).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(serverErrors).toEqual([]);
  });
});
