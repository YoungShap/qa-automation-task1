const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || '';
const API_TOKEN = process.env.API_TOKEN || '';
const API_PAYLOAD_MODE = (process.env.API_PAYLOAD || 'multipart').toLowerCase();

test.describe('createPaymentProcess API', () => {
  test.beforeAll(() => {
    if (!API_URL) {
      test.skip(true, 'Skipping API tests: missing API_URL env');
    }
  });

  async function post(request, payload, opts = {}) {
    const headers = {
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...(opts.headers || {})
    };

    const requestOpts = { headers, ...opts };
    if (API_PAYLOAD_MODE === 'json') {
      requestOpts.data = payload;
      requestOpts.headers = { 'content-type': 'application/json', ...headers };
    } else {
      requestOpts.multipart = payload;
    }

    const startedAt = Date.now();
    const res = await request.post(API_URL, requestOpts);
    const ms = Date.now() - startedAt;
    const ct = res.headers()['content-type'] || '';

    let bodyText = '';
    let bodyObj = {};
    try {
      if (/application\/json/i.test(ct)) {
        bodyObj = await res.json();
        bodyText = JSON.stringify(bodyObj);
      } else {
        bodyText = await res.text();
      }
    } catch { /* ignore */ }

    // לוג דיבאג קצר :
    console.log('[API]', { status: res.status(), ms, ct, bodyPreview: String(bodyText).slice(0, 300) });

    return { res, bodyObj, bodyText };
  }

  test('200 + link on valid payload', async ({ request }) => {
    const { res, bodyObj, bodyText } = await post(request, {
      sum: '100',
      currency: 'ILS',
      customerName: 'Test User',
      cardLast4: '4580'
    });
    expect(res.status(), `Bad status. Body: ${bodyText}`).toBe(200);
    const link = bodyObj.link || bodyObj.url;
    expect(link, `No link/url in response. Body: ${bodyText}`).toBeTruthy();
    expect(String(link)).toMatch(/^https?:\/\/\S+/);
  });

  test('missing required field returns error', async ({ request }) => {
    const { res, bodyObj, bodyText } = await post(request, {
      sum: '100',
      // currency חסר בכוונה
      customerName: 'Test User',
    });
    expect([400, 422], `Expected 400/422. Got ${res.status()}. Body: ${bodyText}`).toContain(res.status());
    expect((bodyText || JSON.stringify(bodyObj)).toLowerCase()).toMatch(/missing|required|חובה/);
  });

  test('invalid value (sum=0) returns error', async ({ request }) => {
    const { res, bodyObj, bodyText } = await post(request, {
      sum: '0',
      currency: 'ILS',
      customerName: 'Test User',
    });
    expect([400, 422], `Expected 400/422. Got ${res.status()}. Body: ${bodyText}`).toContain(res.status());
    expect((bodyText || JSON.stringify(bodyObj)).toLowerCase()).toMatch(/invalid|must be greater than 0|לא תקין/);
  });
});
