---
name: "@octs/e2e"
description: "End-to-end testing of user journeys in real browsers"
depends_on: ["@octs/project-awareness"]
tools: ["Playwright", "Cypress"]
---

# @octs/e2e

## Objective

Execute end-to-end tests that simulate real user journeys through the entire application stack in a real browser. E2E tests verify that all layers (frontend, API, database, caching, external services) work together correctly from the user's perspective. These tests provide the highest confidence that the application works as intended.

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Dependencies

- `@octs/project-awareness` — required to understand the project stack, existing test framework, CI configuration, authentication mechanism, and routing structure before writing any E2E test.

---

## Tool Selection

### Playwright (preferred)
- **Multi-browser**: Chromium, Firefox, WebKit — all from a single API
- **Auto-waits**: actions automatically wait for elements to be actionable before interacting
- **Trace viewer**: record a full trace of each test (screenshots, DOM snapshots, network, console) for debugging failures
- **Parallel execution**: tests run in parallel by default with isolated browser contexts
- **Mobile emulation**: built-in device descriptors for iPhone, iPad, Pixel, Galaxy
- **API testing**: `page.request` for API-level assertions within E2E tests
- **Network interception**: `page.route()` to mock, modify, or block network requests
- **Visual comparisons**: `toHaveScreenshot()` with pixelmatch

### Cypress (alternative)
- **Real-time reload**: see test execution and application state side-by-side during development
- **Time travel**: hover over commands to see snapshots at each step
- **Chrome-family only**: Chromium, Edge, Electron — no Firefox or WebKit support
- **Simpler setup**: no browser binary management, single `cypress` package
- **Component testing**: built-in support for component-level testing (React, Vue, etc.)
- **Dashboard**: paid service for test recording, parallelization, flake detection

### Decision Matrix
| Criteria | Playwright | Cypress |
|----------|-----------|---------|
| Cross-browser | Yes (3 engines) | Chrome only |
| Speed | Faster (parallel by default) | Slower (sequential by default) |
| Debugging | Trace viewer | Time travel |
| Mobile testing | Built-in | Plugins |
| Learning curve | Moderate | Gentle |
| Recommendation | **Default choice** | Existing projects already on Cypress |

---

## Test Scenarios

### Must-Cover User Journeys

#### Authentication Flow
1. **Sign up** → fill registration form → submit → verify success message → check email (mock) → verify redirect to login
2. **Email verification** → click verification link → verify account activated → verify redirect to dashboard
3. **Login** → fill credentials → submit → verify redirect to dashboard → verify user name in header
4. **Password reset** → request reset → check email → click link → set new password → login with new password
5. **Logout** → click logout → verify redirect to login page → verify protected routes inaccessible
6. **Token expiry** → login → wait/force token expiry → attempt protected action → verify redirect to login

#### CRUD Operations
1. **Create** → navigate to list → click "Add" → fill form → submit → verify item appears in list → verify success toast
2. **Read** → navigate to list → verify items displayed → click item → verify detail page → verify all fields
3. **Update** → navigate to detail → click "Edit" → modify fields → save → verify detail page updates → verify list reflects changes
4. **Delete** → navigate to detail → click "Delete" → confirm dialog → verify item removed from list → verify success message

#### Permission Paths
1. **Admin user** → login as admin → verify admin-only menu items visible → access admin pages → verify data loads
2. **Regular user** → login as regular user → verify admin menu items hidden → attempt direct URL access to admin page → verify 403 or redirect
3. **Unauthenticated user** → attempt to access protected route → verify redirect to login → after login, verify redirect to original destination
4. **Role change** → admin changes user role → user refreshes → verify permissions update without re-login

#### Multi-Step Workflows
- **E-commerce checkout**: browse → add to cart → view cart → apply promo code → fill shipping → fill payment → confirm → verify order confirmation → verify order in history
- **Content publishing**: create draft → preview → submit for review → approve (as reviewer) → publish → verify live on public page
- **Onboarding wizard**: step 1 (profile) → step 2 (preferences) → step 3 (invite team) → step 4 (confirmation) → verify setup complete

#### Error Paths
- Form validation errors: submit empty form, verify all error messages, verify focus on first error field
- Server errors: simulate 500 response, verify user-friendly error message, verify retry button
- Network failures: simulate offline, verify offline indicator, verify actions disabled
- Session expiry: session times out mid-action, verify graceful handling
- Rate limiting: submit form too frequently, verify rate limit message

---

## Selector Strategy

### Priority Order (most stable to least stable)

#### 1. data-testid (MOST stable)
Explicit test identifiers that survive UI redesigns and refactoring:
```html
<button data-testid="submit-order">Place Order</button>
```
```typescript
await page.getByTestId("submit-order").click();
```

#### 2. Role selectors
Semantic HTML roles that are accessible and stable:
```typescript
await page.getByRole("button", { name: "Submit" }).click();
await page.getByRole("textbox", { name: "Email" }).fill("user@example.com");
await page.getByRole("heading", { name: "Dashboard" });
await page.getByRole("link", { name: "Settings" });
await page.getByRole("alert"); // toast/notification
```

#### 3. Text content
For unique, stable text that won't change frequently:
```typescript
await page.getByText("Welcome back, Alice");
await page.getByText(/order #\d+ confirmed/i);
```

#### 4. Label
For form inputs associated with labels:
```typescript
await page.getByLabel("Email address").fill("user@example.com");
```

### NEVER Use
- CSS classes (implementation detail, changes with styling)
- XPath selectors (fragile, hard to read)
- Complex CSS selector chains (`.container > div:nth-child(3) > span`)
- ID selectors unless guaranteed stable and unique

---

## Wait Strategy

### Prefer Auto-Waits (Playwright)
Playwright automatically waits for:
- Element to be attached to DOM
- Element to be visible
- Element to be stable (no animation)
- Element to receive events (not obscured)
- Element to be enabled

```typescript
// These all auto-wait — no manual waitFor needed
await page.getByRole("button", { name: "Submit" }).click();
await page.getByLabel("Email").fill("user@example.com");
await expect(page.getByText("Success")).toBeVisible();
```

### When Manual Waits Are Necessary

#### Wait for network response
```typescript
const responsePromise = page.waitForResponse(
  (resp) => resp.url().includes("/api/users") && resp.status() === 200
);
await page.getByRole("button", { name: "Save" }).click();
const response = await responsePromise;
```

#### Wait for specific text to appear
```typescript
await expect(page.getByText("Profile updated successfully")).toBeVisible();
```

#### Wait for loading state to disappear
```typescript
await expect(page.getByTestId("loading-spinner")).not.toBeVisible();
// or wait for it to disappear
await page.getByTestId("loading-spinner").waitFor({ state: "hidden" });
```

#### Wait for navigation
```typescript
await page.waitForURL("**/dashboard");
await page.waitForURL((url) => url.pathname === "/dashboard");
```

### AVOID: Hard Timeouts
```typescript
// BAD — flaky, makes test slow
await page.waitForTimeout(5000);

// GOOD — wait for a real condition
await expect(page.getByText("Data loaded")).toBeVisible({ timeout: 5000 });
```

---

## Multi-Platform Testing

### Desktop Viewport
```typescript
test.use({
  viewport: { width: 1440, height: 900 },
});
```

### Mobile Device Emulation
```typescript
import { devices } from "@playwright/test";

test.use({
  ...devices["iPhone 14"],
  // viewport: 390×844, deviceScaleFactor: 3, isMobile: true, hasTouch: true
});

// Or a custom mobile viewport
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: "mobile-user-agent-string",
});
```

### Cross-Browser Strategy
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /.*critical\.spec\.ts/,  // critical paths only
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /.*critical\.spec\.ts/,  // critical paths only
    },
  ],
});
```

**Rule**: Run **Chromium** for all tests. Run Firefox and WebKit for critical user journeys only (auth, checkout, core workflows).

---

## Special Cases

### Offline Testing
```typescript
test("should show offline message when network is unavailable", async ({ page }) => {
  await page.route("**/*", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText(/offline|no internet/i)).toBeVisible();
});
```

### File Uploads
```typescript
test("should upload a profile picture", async ({ page }) => {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("upload-avatar").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles("fixtures/avatar.png");
  await expect(page.getByTestId("avatar-preview")).toBeVisible();
});
```

### File Downloads
```typescript
test("should download the report as PDF", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  // Save to disk for further assertion
  await download.saveAs(`/tmp/${download.suggestedFilename()}`);
});
```

### iframes
```typescript
test("should interact with payment iframe", async ({ page }) => {
  const paymentFrame = page.frameLocator('[data-testid="payment-iframe"]');
  await paymentFrame.getByLabel("Card number").fill("4111111111111111");
  await paymentFrame.getByLabel("Expiry").fill("12/28");
  await paymentFrame.getByLabel("CVC").fill("123");
  await paymentFrame.getByRole("button", { name: "Pay" }).click();
});
```

### New Tabs / Popups
```typescript
test("should open terms in new tab", async ({ page, context }) => {
  const pagePromise = context.waitForEvent("page");
  await page.getByRole("link", { name: "Terms and Conditions" }).click();
  const newPage = await pagePromise;
  await expect(newPage).toHaveURL(/.*terms.*/);
  await expect(newPage.getByRole("heading", { name: "Terms" })).toBeVisible();
});
```

---

## Visual Regression Testing

### Screenshots
```typescript
// Full page screenshot comparison
await expect(page).toHaveScreenshot("homepage.png", { fullPage: true });

// Element-specific screenshot
await expect(page.getByTestId("pricing-card")).toHaveScreenshot("pricing-card.png");

// With custom options
await expect(page).toHaveScreenshot("page.png", {
  maxDiffPixels: 100,      // allow small differences
  threshold: 0.2,           // pixel difference threshold
  animations: "disabled",   // disable CSS animations
});
```

### Baseline Management
- Store baselines in the repository (`tests/e2e/screenshots/` or similar)
- Baselines are committed and reviewed in PRs
- When UI changes are intentional: update baselines with `--update-snapshots`
- Document visual changes in the PR description

### Best Practices
- Screenshot only stable UI areas (avoid dynamic content: dates, timestamps, random avatars)
- Use `mask` option to hide dynamic elements: `mask: [page.getByTestId("timestamp")]`
- Don't screenshot entire pages that change frequently — target specific components
- Run visual tests on a single browser (Chromium) to avoid cross-browser rendering noise
- Consider `maxDiffPixelRatio` for anti-aliasing differences across OS/browsers

---

## Test Reliability

### Principles for Non-Flaky Tests
1. **Every test is independent**: no shared state, no test ordering dependencies
2. **Reset state in beforeEach**: seed data, clear storage, navigate to starting URL
3. **Test isolation**: each test uses a unique user, unique email, unique data — never collide
4. **No test depends on another test's side effects**
5. **Clean up after each test**: delete created data, clear cookies/storage

```typescript
test.describe("User management", () => {
  let testUser: { email: string; password: string };

  test.beforeEach(async ({ page }) => {
    testUser = {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: "Test1234!",
    };
    await page.goto("/login");
  });

  test("should create a new user", async ({ page }) => {
    // uses unique testUser
  });

  test("should edit user profile", async ({ page }) => {
    // uses unique testUser
  });
});
```

### Handling Flakiness
- **CI retries**: configure `retries: 2` in CI (0 in local dev)
- **Investigate systematically**: never ignore a flaky test — it indicates a real problem
- **Reproduce locally**: use `--repeat-each` to run a test multiple times
- **Check the trace**: Playwright trace viewer shows exactly what happened
- **Common causes**: race conditions, leaky state between tests, hard-coded timeouts, network variability

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  // ...
});
```

---

## CI Integration

### Configuration
```yaml
# Example GitHub Actions
- name: Run E2E tests
  run: npx playwright test
  env:
    E2E_BASE_URL: ${{ steps.deploy.outputs.preview_url }}

- name: Upload test artifacts (on failure)
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-artifacts
    path: |
      playwright-report/
      test-results/
```

### Headless Mode
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    headless: true,   // always headless in CI
  },
});
```

### Parallel Execution (Sharding)
```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : undefined,  // 4 parallel workers in CI
  // Or use sharding:
  // npx playwright test --shard=1/3
  // npx playwright test --shard=2/3
  // npx playwright test --shard=3/3
});
```

### Artifacts on Failure
- **Screenshot**: capture page state at moment of failure
- **Video**: record full test execution (off by default, enable on failure)
- **Trace**: record DOM snapshots, network, console for debugging

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",  // or "on-first-retry"
  },
});
```

### Reports
- **HTML report**: `npx playwright show-report` — rich, interactive
- **JUnit XML**: for CI integration (GitHub Actions, GitLab, Jenkins)
- **JSON**: for custom tooling

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
});
```

### Docker Container
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx playwright test
```
