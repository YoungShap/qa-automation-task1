# QA Automation Task — Payment Page & API

This repository includes both **UI and API automated tests** for a payment system (sandbox).

---

## Setup

### 1. Install dependencies
```bash
npm i -D @playwright/test
npx playwright install --with-deps

##To run all tests: 

npx playwright test

##To run only UI tests: 

npx playwright test tests/UI/payment.spec.js

##To run only API tests: 

npx playwright test tests/API/payment.api.spec.js

##To open the HTML report: 

npx playwright show-report

