import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE = process.env.PROMO_URL || 'https://exampulse.az';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || '';
const TEACHER_PASS = process.env.TEACHER_PASS || '';
const STUDENT_EMAIL = process.env.STUDENT_EMAIL || '';
const STUDENT_PASS = process.env.STUDENT_PASS || '';
const outDir = resolve('promo');
mkdirSync(outDir, { recursive: true });

const pause = (page, ms = 1600) => page.waitForTimeout(ms);

async function scrollShow(page) {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: 'smooth' }));
  await pause(page, 1400);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await pause(page, 1400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(page, 1000);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await pause(page, 1200);
  await page.getByLabel(/E-poçt/).fill(email);
  await pause(page, 400);
  await page.getByLabel('Şifrə').fill(password);
  await pause(page, 400);
  await page.getByRole('button', { name: 'Daxil ol' }).click();
  await page.waitForURL(/\/(teacher|student|admin)/, { timeout: 45000 });
  await pause(page, 2200);
}

async function clickNav(page, name) {
  const link = page.locator('aside nav').getByRole('link', { name, exact: true });
  if (await link.count()) {
    await link.first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await pause(page, 2000);
    return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true, slowMo: 180 });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1600, height: 900 } },
  locale: 'az-AZ',
});
context.setDefaultTimeout(25000);
const page = await context.newPage();
page.on('dialog', (d) => d.dismiss());

try {
  await login(page, TEACHER_EMAIL, TEACHER_PASS);
  await scrollShow(page);

  await page.getByRole('button', { name: /Yeni imtahan/ }).click();
  await pause(page, 1500);
  await page.getByLabel('İmtahan mövzusu').fill('Reklam demo — kvadrat tənliklər');
  await pause(page, 500);
  const note = page.getByLabel(/Əlavə qeyd/);
  if (await note.count()) await note.fill('Demo imtahan. Kartlar telefonda görünür.');
  await pause(page, 800);
  await page.getByRole('button', { name: 'İmtahanı yarat' }).click();
  await page.waitForURL(/\/teacher\/exams\//, { timeout: 45000 });
  await pause(page, 2500);
  await scrollShow(page);

  const qText = page.getByLabel('Sualın mətni');
  if (await qText.count()) {
    await qText.fill('Kvadrat tənliyin diskriminantı hansı düsturla tapılır?');
    const inputs = page.locator('form input[type="text"], form input:not([type])');
    const boxes = page.locator('label.flex input.min-w-0, label.flex input.flex-1');
    const optInputs = page.locator('form .space-y-2 input[type="text"], form .space-y-2 input:not([type="radio"])');
    if (await optInputs.count()) {
      const n = await optInputs.count();
      const texts = ['b² − 4ac', 'b² + 4ac', '2a', '−b/2a', 'c/a'];
      for (let i = 0; i < Math.min(n, texts.length); i += 1) {
        await optInputs.nth(i).fill(texts[i]);
      }
    }
    await page.getByRole('button', { name: 'Sualı əlavə et' }).click();
    await pause(page, 2500);
  }

  const paper = page.getByRole('button', { name: 'Vərəq görünüşü' });
  if (await paper.count()) {
    await paper.click();
    await pause(page, 2500);
    await page.getByRole('button', { name: 'Sualları idarə et' }).click();
    await pause(page, 1200);
  }

  if (await page.getByRole('button', { name: 'Statistika' }).count()) {
    await page.getByRole('button', { name: 'Statistika' }).click();
    await pause(page, 2800);
    await scrollShow(page);
  }

  await clickNav(page, 'İmtahanlar');
  await scrollShow(page);
  const examCard = page.locator('main div.cursor-pointer, main .rounded-2xl').filter({ hasText: /Mövzu|Aç/ }).first();
  if (await examCard.count()) {
    await examCard.click();
    await pause(page, 2500);
    await scrollShow(page);
  }

  await clickNav(page, 'Kabinet');
  await scrollShow(page);
  const groupCard = page.locator('main h3').first();
  if (await groupCard.count()) {
    await groupCard.click();
    await pause(page, 2500);
    await scrollShow(page);
    const invite = page.getByRole('button', { name: /dəvət|link|Paylaş/i });
    if (await invite.count()) {
      await invite.first().click();
      await pause(page, 2000);
    }
  }

  await clickNav(page, 'Yeni şagirdlər');
  await scrollShow(page);
  await clickNav(page, 'Giriş hüquqları');
  await scrollShow(page);
  await clickNav(page, 'İmtahanlar');
  await pause(page, 1500);

  await page.getByRole('button', { name: 'Çıxış' }).click();
  await page.waitForURL(/login/, { timeout: 20000 });
  await pause(page, 1500);

  await login(page, STUDENT_EMAIL, STUDENT_PASS);
  await scrollShow(page);

  const more = page.getByRole('button', { name: /daha|hamısı|Show/i });
  if (await more.count()) await more.first().click();

  const live = page.getByText('Live', { exact: true }).first();
  if (await live.count()) {
    await live.click({ timeout: 5000 }).catch(() => {});
  }
  const studentCard = page.locator('main .cursor-pointer').first();
  if (await studentCard.count()) {
    await studentCard.click();
    await pause(page, 3000);
    await scrollShow(page);
    const choice = page.locator('main button').filter({ hasText: /^A\b|A\)/ }).first();
    if (await choice.count()) {
      await choice.click();
      await pause(page, 1200);
    }
    const send = page.getByRole('button', { name: /Göndər|Təhvil|Bitir/i });
    if (await send.count()) {
      await send.first().click();
      await pause(page, 3500);
    }
  }

  await pause(page, 2500);
  await page.getByRole('button', { name: 'Çıxış' }).click().catch(() => {});
  await pause(page, 1500);
} finally {
  await context.close();
  await browser.close();
  console.log('Walkthrough video saved in', outDir);
}
