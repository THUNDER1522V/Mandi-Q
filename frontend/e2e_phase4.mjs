import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\5e2895db-d9bf-4b80-a087-fed7bd6203c3';

async function runPhase4E2E() {
  console.log('🚀 Starting MANDIQ Phase 4 End-to-End Verification...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log('  ⚠️ Browser Console Error:', text);
    }
  });

  page.on('requestfailed', (req) => {
    networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
    console.log('  ⚠️ Request Failed:', req.url(), req.failure()?.errorText);
  });

  try {
    console.log('\n--- STEP 1: Load Live Operations Console ---');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase4_01_dashboard.png'), fullPage: false });
    console.log('✓ Captured screenshot: phase4_01_dashboard.png');

    // Verify Header
    const headerText = await page.evaluate(() => document.querySelector('header')?.innerText || '');
    console.log('Header status:', headerText.replace(/\n+/g, ' | '));

    // Verify Hero Section
    console.log('\n--- STEP 2: Verify Now Serving Hero & Weighbridge Bays ---');
    const heroInfo = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-label="Operations Hero"]');
      if (!hero) return 'Hero not found';
      return hero.innerText.replace(/\n+/g, ' | ');
    });
    console.log('Hero section info:', heroInfo.slice(0, 300));

    // Verify StatCards
    console.log('\n--- STEP 3: Verify Real Metrics in StatCards ---');
    const statCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.kpi-card'));
      return cards.map((c) => c.innerText.replace(/\n+/g, ' '));
    });
    statCards.forEach((c, idx) => console.log(`  StatCard ${idx + 1}: ${c}`));

    // Verify Queue Table
    console.log('\n--- STEP 4: Verify Live Queue Table ---');
    const queueRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      return rows.slice(0, 5).map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.innerText.replace(/\n+/g, ' ').trim()));
    });
    console.log(`Queue table first 5 rows:`);
    queueRows.forEach((r, i) => console.log(`  Row ${i + 1}: ${r.join(' | ')}`));

    // Test Live Operation: "Call to Bay" / "Call Next"
    console.log('\n--- STEP 5: Test Live Operation Call Next to Bay 1 ---');
    const callNextBtn = await page.$('button.btn-primary');
    if (callNextBtn) {
      const btnText = await page.evaluate((el) => el.innerText, callNextBtn);
      console.log(`Clicking primary action button: "${btnText}"...`);
      await callNextBtn.click();
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase4_02_after_call_next.png'), fullPage: false });
      console.log('✓ Captured screenshot: phase4_02_after_call_next.png');
    }

    // Switch to Audit Timeline tab
    console.log('\n--- STEP 6: Switch to Audit Timeline Tab ---');
    const tabButtons = await page.$$('.workspace-tab-btn');
    let auditTab = null;
    let rescheduleTab = null;
    let farmersTab = null;

    for (const btn of tabButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Audit Timeline')) auditTab = btn;
      if (text.includes('Reschedule & SMS')) rescheduleTab = btn;
      if (text.includes('Farmers Directory')) farmersTab = btn;
    }

    if (auditTab) {
      await auditTab.click();
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase4_03_audit_timeline.png'), fullPage: false });
      console.log('✓ Switched to Audit Timeline. Captured: phase4_03_audit_timeline.png');

      const activityItems = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.activity-timeline-item, .card'));
        return items.slice(0, 3).map((it) => it.innerText.replace(/\n+/g, ' | '));
      });
      console.log('Activity feed sample:', activityItems[0]?.slice(0, 200));
    }

    // Switch to Reschedule & SMS tab
    if (rescheduleTab) {
      console.log('\n--- STEP 7: Switch to Reschedule & SMS Tab ---');
      await rescheduleTab.click();
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase4_04_reschedule_sms.png'), fullPage: false });
      console.log('✓ Switched to Reschedule & SMS. Captured: phase4_04_reschedule_sms.png');
    }

    // Switch to Farmers Directory tab
    if (farmersTab) {
      console.log('\n--- STEP 8: Switch to Farmers Directory Tab ---');
      await farmersTab.click();
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase4_05_farmers_directory.png'), fullPage: false });
      console.log('✓ Switched to Farmers Directory. Captured: phase4_05_farmers_directory.png');

      const farmersCount = await page.evaluate(() => {
        const rows = document.querySelectorAll('.data-table tbody tr');
        return rows.length;
      });
      console.log(`Farmers Directory rows count: ${farmersCount}`);
    }

    console.log('\n==================================================');
    console.log('PHASE 4 E2E VERIFICATION COMPLETE');
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log('==================================================');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

runPhase4E2E();
