import { expect, test, type Page } from "@playwright/test";

const demoPassword = process.env.DEMO_PASSWORD ?? process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
const runRealE2e = process.env.RUN_REAL_E2E === "1";

test.describe("real Supabase authenticated routes", () => {
  test.skip(!runRealE2e, "Set RUN_REAL_E2E=1 with local Supabase env vars to run real authenticated E2E.");

  async function loginAs(page: Page, roleName: "管理者" | "担当者" | "閲覧者") {
    await page.goto("/login");
    await page.getByRole("button", { name: new RegExp(roleName) }).click();
    if (!demoPassword) throw new Error("DEMO_PASSWORD or NEXT_PUBLIC_DEMO_PASSWORD is required for real E2E.");
    await page.getByLabel("パスワード").fill(demoPassword);
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL("**/jobs");
    await expect(page.getByRole("heading", { name: "案件一覧" })).toBeVisible();
  }

  test("admin can use management routes and inspect history", async ({ page }) => {
    await loginAs(page, "管理者");
    await expect(page.getByText("山本 管理 / 管理者")).toBeVisible();
    await expect(page.getByRole("link", { name: "CSV", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "利用者", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();

    await page.goto("/jobs?q=堺中央ビル管理");
    await expect(page.locator("tbody tr")).toHaveCount(6);
    await expect(page.locator("tbody tr").first()).toContainText("堺中央ビル管理");
    const csvResponse = await page.request.get("/api/jobs/export?q=%E5%A0%BA%E4%B8%AD%E5%A4%AE%E3%83%93%E3%83%AB%E7%AE%A1%E7%90%86");
    expect(csvResponse.ok()).toBe(true);
    const csv = await csvResponse.text();
    expect(csv).toContain("堺中央ビル管理");
    expect(csv.trim().split("\n")).toHaveLength(7);

    await page.goto("/csv-import");
    await expect(page.getByRole("heading", { name: "CSV移行" })).toBeVisible();

    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "利用者・権限管理" })).toBeVisible();

    await page.goto("/jobs");
    await page.locator("tbody tr").first().locator("a").click();
    await expect(page.getByRole("heading", { name: "更新履歴" })).toBeVisible();
    await expect(page.getByRole("link", { name: "編集" })).toBeVisible();
  });

  test("staff can open own work routes but cannot access admin routes", async ({ page }) => {
    await loginAs(page, "担当者");
    await expect(page.getByText("田中 担当 / 担当者")).toBeVisible();
    await expect(page.getByRole("link", { name: "CSV", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "利用者", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();

    await page.goto("/jobs/new");
    await expect(page.getByRole("heading", { name: "案件登録" })).toBeVisible();
    await expect(page.getByLabel("担当者")).toBeDisabled();
    await expect(page.getByLabel("担当者")).toContainText("田中 担当 / staff@table-to-app.example");

    await page.goto("/csv-import");
    await page.waitForURL("**/jobs?error=forbidden");
    await expect(page.getByText("権限がありません。")).toBeVisible();

    await page.goto("/users");
    await page.waitForURL("**/jobs?error=forbidden");
    await expect(page.getByText("権限がありません。")).toBeVisible();
  });

  test("viewer can read jobs and history but cannot edit or access restricted routes", async ({ page }) => {
    await loginAs(page, "閲覧者");
    await expect(page.getByText("佐藤 閲覧 / 閲覧者")).toBeVisible();
    await expect(page.getByRole("link", { name: "CSV", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "利用者", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "新規登録" })).toHaveCount(0);

    await page.locator("tbody tr").first().locator("a").click();
    await expect(page.getByRole("heading", { name: "更新履歴" })).toBeVisible();
    await expect(page.getByRole("link", { name: "編集" })).toHaveCount(0);

    await page.goto("/jobs/new");
    await expect(page.getByText("閲覧者は案件を登録できません。")).toBeVisible();

    await page.goto("/users");
    await page.waitForURL("**/jobs?error=forbidden");
    await expect(page.getByText("権限がありません。")).toBeVisible();
  });
});
