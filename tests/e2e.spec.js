import { test, expect } from '@playwright/test';

// These scenarios need a real browser (Canvas text measurement, real DOM
// layout, DeviceMotion events) — that's why they're separate from the
// Vitest unit tests in src/data/__tests__/.
//
// Not required to run this yourself — it documents exactly what was
// verified before each release. If you do want to run it locally, you'd
// need Node + `npx playwright install` first.

test('splash screen gives way to the main ball screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2300); // past the 1.5s minimum splash + fade
  await expect(page.locator('.eyebrow')).toBeVisible();
  await expect(page.locator('.ball-stage')).toBeVisible();
});

test('tapping the ball reveals an answer that stays inside the ball image bounds', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2300);

  const ball = page.locator('.ball-stage');
  const ballImg = page.locator('.ball-img');

  for (let i = 0; i < 15; i++) {
    await ball.click();
    await page.waitForTimeout(700);

    const answer = page.locator('.answer');
    const answerBox = await answer.boundingBox();
    const ballBox = await ballImg.boundingBox();

    expect(answerBox.x).toBeGreaterThanOrEqual(ballBox.x);
    expect(answerBox.y).toBeGreaterThanOrEqual(ballBox.y);
    expect(answerBox.x + answerBox.width).toBeLessThanOrEqual(ballBox.x + ballBox.width);
    expect(answerBox.y + answerBox.height).toBeLessThanOrEqual(ballBox.y + ballBox.height);

    const html = await answer.innerHTML();
    expect(html).not.toContain('&lt;br&gt;');
  }
});

test('disclaimer opens and shows the expected text', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2300);

  await page.locator('.disclaimer-link').click();
  const box = page.locator('.disclaimer-box');
  await expect(box).toContainText('entertainment purposes only');
  await expect(box).toContainText('findahelpline.com');
});

test('a single shake produces exactly one reveal, even with decaying residual motion after it', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2300);

  await page.evaluate(() => {
    window.__shakeCount = 0;
    const img = document.querySelector('.ball-img');
    new MutationObserver(() => {
      if (img.classList.contains('shaking')) window.__shakeCount++;
    }).observe(img, { attributes: true, attributeFilter: ['class'] });
  });

  // first tap both reveals once AND arms motion listening
  await page.locator('.ball-stage').click();
  await page.waitForTimeout(1000);

  // simulate one real shake followed by decaying "ringing" motion — this is
  // exactly the sequence that used to cause a false second reveal
  await page.evaluate(() => {
    function fire(x, y, z) {
      const ev = new Event('devicemotion');
      Object.defineProperty(ev, 'accelerationIncludingGravity', { value: { x, y, z } });
      window.dispatchEvent(ev);
    }
    [[40, 40, 40], [25, 25, 25], [15, 15, 15], [8, 8, 8], [1, 1, 1]].forEach((s, i) =>
      setTimeout(() => fire(...s), i * 150)
    );
  });
  await page.waitForTimeout(2000);

  const count = await page.evaluate(() => window.__shakeCount);
  expect(count).toBe(2); // 1 from the initial tap + exactly 1 from the shake, not 2
});
