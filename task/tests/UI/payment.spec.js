const { test, expect } = require('@playwright/test');

const PAYMENT_URL = process.env.PAYMENT_URL || '';

test.describe('Payment UI', () => {
  test.beforeAll(() => {
    if (!PAYMENT_URL) {
      test.skip(true, 'Skipping UI tests: missing PAYMENT_URL env');
    }
  });

  async function fillPaymentForm(page, {
    name = 'Test User',
    card = '4580458045804580',
    expMonth = '03',
    expYear = '30',
    cvv = '123',
    sum = '100'
  } = {}) {
    // שדות "חיצוניים" (שם/סכום) :
    await page.getByLabel(/name|full name|שם/i).fill(name).catch(() => {
      return page.locator('[data-testid="full-name"]').fill(name).catch(() => {});
    });
    await page.getByLabel(/amount|sum|סכום/i).fill(sum).catch(() => {
      return page.locator('[data-testid="amount"]').fill(sum).catch(() => {});
    });

    // קודם ננסה למלא ללא iframe:
    const tryPlain = (async () => {
      await page.getByLabel(/card( number)?|מספר כרטיס/i).fill(card);
      await page.getByLabel(/month|exp.*month|חודש/i).fill(expMonth);
      await page.getByLabel(/year|exp.*year|שנה/i).fill(expYear);
      await page.getByLabel(/cvv|cvc/i).fill(cvv);
    })();

    try {
      await tryPlain;
    } catch {
      // אם נכשל – ננסה בתוך iframe:
      const frame = page.frameLocator('iframe[title*="card"], iframe[src*="pay"], iframe');
      await frame.getByLabel(/card( number)?|מספר כרטיס/i).fill(card).catch(() => {});
      await frame.getByLabel(/month|exp.*month|חודש/i).fill(expMonth).catch(() => {});
      await frame.getByLabel(/year|exp.*year|שנה/i).fill(expYear).catch(() => {});
      await frame.getByLabel(/cvv|cvc/i).fill(cvv).catch(() => {});
    }
  }

  test('Positive: successful payment with valid details', async ({ page }) => {
    await page.goto(PAYMENT_URL, { waitUntil: 'domcontentloaded' });

    await fillPaymentForm(page);

    const payBtn = page.getByRole('button', { name: /pay|שלם|תשלום/i });
    await expect(payBtn).toBeEnabled({ timeout: 10000 });

    const nav = page.waitForURL(/thank|success|status=success/i, { timeout: 15000 }).catch(() => {});
    await payBtn.click();
    await nav;

    const successById = page.locator('[data-testid="payment-success"]').first();
    if (await successById.count()) {
      await expect(successById).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.getByText(/success|paid|התשלום בוצע בהצלחה/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('Error: amount=0 shows validation error', async ({ page }) => {
    await page.goto(PAYMENT_URL, { waitUntil: 'domcontentloaded' });
    await fillPaymentForm(page, { sum: '0' });

    await page.getByRole('button', { name: /pay|שלם|תשלום/i }).click();

    await expect(page.getByText(/amount.*invalid|סכום.*לא תקין|must be greater than 0|invalid amount/i))
      .toBeVisible({ timeout: 8000 });

    expect(page.url()).not.toMatch(/thank|success|status=success/i);
  });
});
