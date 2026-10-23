import { expect, test } from '@playwright/test';
test('browse categories and inspect real event details', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /找到你的下一场/ })).toBeVisible();
  await expect(page.locator('.event-card').nth(2)).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
      ),
    );
  });
  await page.screenshot({ path: testInfo.outputPath('discover.png'), fullPage: true });
  await page.getByRole('button', { name: '演出', exact: true }).click();
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.locator('.event-card').click();
  await expect(page.getByRole('heading', { name: '城市夜色 · 室内乐现场' })).toBeVisible();
  await expect(page.getByText('总席位 80 · 余量 80')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('organizer creates, edits and publishes a multi-slot event', async ({ page }, testInfo) => {
  const title = '端到端活动 ' + testInfo.project.name + ' ' + Date.now();
  await page.goto('/login');
  await page.getByRole('button', { name: '运营', exact: true }).click();
  await page.getByLabel('密码', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '活动管理', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '创建活动', exact: true }).first().click();
  await page.getByLabel('活动名称').fill(title);
  await page.getByLabel('举办地点').fill('上海 · 测试剧场');
  await page.getByLabel('活动介绍').fill('端到端验证创建、修改和发布流程。');
  await page.getByRole('button', { name: '添加场次' }).click();
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('heading', { name: '编辑活动', exact: true })).toBeVisible();
  await page.getByLabel('活动名称').fill(title + ' 已修改');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('button', { name: '发布活动' })).toBeEnabled();
  await page.getByRole('button', { name: '发布活动' }).click();
  await expect(page.getByText('活动已发布。', { exact: false })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('organizer-published.png'), fullPage: true });
  await page.getByRole('link', { name: '查看公开页面' }).click();
  await expect(page.getByRole('heading', { name: title + ' 已修改' })).toBeVisible();
  await expect(page.locator('.slot-option')).toHaveCount(2);
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page.getByRole('link', { name: '登录', exact: false })).toBeVisible();
});

test('account switching cannot reuse another organizers cached draft', async ({
  page,
}, testInfo) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '运营', exact: true }).click();
  await page.getByLabel('密码', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('link', { name: '创建活动', exact: true }).first().click();
  await page.getByLabel('活动名称').fill('账号隔离测试 ' + testInfo.project.name);
  await page.getByLabel('举办地点').fill('上海测试空间');
  await page.getByLabel('活动介绍').fill('另一位运营不应看到这份草稿。');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('heading', { name: '编辑活动', exact: true })).toBeVisible();
  const draftUrl = page.url();
  await page.getByRole('button', { name: '退出登录' }).click();
  await page.getByRole('link', { name: '登录', exact: false }).first().click();
  await page.getByLabel('邮箱', { exact: true }).fill('other@ticketflow.demo');
  await page.getByLabel('密码', { exact: true }).fill(process.env.DEMO_PASSWORD!);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '活动管理', exact: true })).toBeVisible();
  await page.goto(draftUrl);
  await expect(page.getByRole('heading', { name: '无法加载活动', exact: true })).toBeVisible();
  await expect(page.getByLabel('活动名称')).toHaveCount(0);
});
