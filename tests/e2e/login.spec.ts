import { expect, test } from "@playwright/test";

test("login screen lets users choose a demo role and fills credentials", async ({ page }) => {
  await page.route("**/auth/v1/token**", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" })
    });
  });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "点検案件管理アプリ" })).toBeVisible();
  await expect(page.getByText("複数人で安全に使えるWebアプリへ移行したデモです")).toBeVisible();
  await expect(page.getByText("架空データを使った模擬納品")).toBeVisible();
  await expect(page.getByText("表で管理", { exact: true })).toBeVisible();
  await expect(page.getByText("Excel・Googleスプレッドシート", { exact: true })).toBeVisible();
  await expect(page.getByText("点検案件管理アプリ", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("二重登録を防ぐ")).toBeVisible();
  await expect(page.getByText("期限を見える化")).toBeVisible();
  await expect(page.getByText("人ごとに操作権限を分ける")).toBeVisible();
  await expect(page.getByRole("button", { name: /管理者/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /担当者/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /閲覧者/ })).toBeVisible();

  const loginButton = page.getByRole("button", { name: "ログイン" });
  await expect(page.getByText("役割を選択してください。")).toHaveCount(0);
  await expect(loginButton).toBeDisabled();

  for (const account of [
    { role: "管理者", email: "admin@table-to-app.example", note: "すべての案件と利用者を管理できます。" },
    { role: "担当者", email: "staff@table-to-app.example", note: "自分が担当する案件を登録・更新できます。" },
    { role: "閲覧者", email: "viewer@table-to-app.example", note: "案件の内容を確認できます。編集はできません。" }
  ]) {
    await page.getByRole("button", { name: new RegExp(account.role) }).click();
    await expect(page.getByRole("button", { name: new RegExp(account.role) })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("メールアドレス")).toHaveValue(account.email);
    await expect(page.getByLabel("パスワード")).toHaveValue(process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "");
    await expect(page.getByText(account.note)).toBeVisible();
    await expect(page.getByText("公開デモ専用のアカウントです。")).toBeVisible();
    await expect(loginButton).toBeEnabled();
  }

  await page.getByLabel("メールアドレス").fill("manual@example.invalid");
  await page.getByLabel("パスワード").fill("");
  await expect(loginButton).toBeDisabled();
  await page.getByLabel("パスワード").fill("manual-password");
  await expect(loginButton).toBeEnabled();
  await expect(page.getByText("公開デモ専用のアカウントです。")).toHaveCount(0);

  await page.getByRole("button", { name: /管理者/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /管理者/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /担当者/ }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /担当者/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("メールアドレス")).toHaveValue("staff@table-to-app.example");

  await loginButton.click();
  await expect(page.getByText("メールアドレスまたはパスワードが正しくありません。")).toBeVisible();
});
