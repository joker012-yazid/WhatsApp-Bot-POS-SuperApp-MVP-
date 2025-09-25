import { expect, test } from '@playwright/test';

test('end-to-end operations happy path', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h2')).toHaveText('Sign in');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'supersecure');
  await page.click('button[type="submit"]');

  await page.goto('/chat');
  await page.click('[data-testid="chat-add-dummy"]');
  await expect(page.locator('[data-testid="chat-table"] tbody tr')).toHaveCount(3);

  await page.goto('/tickets');
  await page.fill('[data-testid="ticket-subject"]', 'Playwright follow-up');
  await page.fill('[data-testid="ticket-assignee"]', 'Automation');
  await page.selectOption('[data-testid="ticket-status"]', 'IN_PROGRESS');
  await page.click('[data-testid="ticket-submit"]');
  await expect(page.locator('[data-testid="tickets-table"] tbody tr')).toHaveCount(4);
  await expect(page.locator('text=Ticket TCK-004 created.')).toBeVisible();

  await page.goto('/pos');
  await page.fill('[data-testid="pos-customer"]', 'Playwright Customer');
  await page.fill('[data-testid="pos-subtotal"]', '150.50');
  await page.fill('[data-testid="pos-discount"]', '10.50');
  await page.selectOption('[data-testid="pos-payment"]', 'CARD');
  await page.click('[data-testid="pos-submit"]');
  await expect(page.locator('[data-testid="pos-table"] tbody tr')).toHaveCount(3);

  const receiptCell = page.locator('[data-testid="pos-table"] tbody tr').first().locator('td').first();
  const receipt = await receiptCell.innerText();
  await page.click(`[data-testid="print-${receipt}"]`);
  await expect(page.locator('[data-testid="pos-print-status"]')).toHaveText(
    `PDF print queued for ${receipt}.`
  );
});
