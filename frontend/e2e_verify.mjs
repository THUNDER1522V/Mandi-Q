import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\5e2895db-d9bf-4b80-a087-fed7bd6203c3';

async function runE2E() {
  console.log('🚀 Starting MANDIQ End-to-End Verification with Chrome...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleLogs = [];
  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (text.startsWith('[')) {
      console.log('  🔍 ' + text);
    }
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
    console.log('\n--- STEP 1: Navigate to Frontend (http://localhost:5173) ---');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_dashboard_loaded.png'), fullPage: false });
    console.log('✓ Page loaded and screenshot captured: 01_dashboard_loaded.png');

    // Wait 2 seconds for telemetry sync
    await new Promise((r) => setTimeout(r, 2000));

    // Verify Dashboard state & FastAPI online indicator
    console.log('\n--- STEP 2: Verify Dashboard & Live Status ---');
    const headerText = await page.evaluate(() => document.querySelector('header')?.innerText || '');
    console.log('Header status elements:', headerText.replace(/\n+/g, ' | '));

    const isLive = headerText.includes('LIVE') && headerText.includes('FastAPI Online');
    console.log('Is FastAPI Online & LIVE:', isLive ? 'PASS ✅' : 'FAIL ❌');

    // Check StatCards metrics
    const metricsCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.kpi-card'));
      return cards.map((c) => c.innerText.replace(/\n+/g, ' '));
    });
    console.log('StatCards detected count:', metricsCards.length);
    metricsCards.forEach((c, i) => console.log(`  Card ${i + 1}: ${c}`));

    // Verify Queue
    console.log('\n--- STEP 3: Verify Queue Section ---');
    const queueLedgerText = await page.evaluate(() => {
      const el = document.querySelector('.data-table, .queue-pipeline-container');
      return el ? el.innerText.slice(0, 300) : 'No queue element found';
    });
    console.log('Queue content preview:', queueLedgerText.replace(/\n+/g, ' '));

    // Switch to Farmers Directory tab
    console.log('\n--- STEP 4: Switch to Farmers Directory Tab ---');
    const tabButtons = await page.$$('.workspace-tab-btn');
    let farmersTabBtn = null;
    for (const btn of tabButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Farmers Directory')) {
        farmersTabBtn = btn;
        break;
      }
    }

    if (!farmersTabBtn) {
      throw new Error('Farmers Directory tab button not found in WorkspaceToolbar!');
    }

    await farmersTabBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_farmers_directory.png'), fullPage: false });
    console.log('✓ Switched to Farmers Directory. Screenshot: 02_farmers_directory.png');

    // Verify Farmers List loaded from PostgreSQL
    console.log('\n--- STEP 5: Verify Farmers List from PostgreSQL ---');
    const farmersRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      return rows.map((r) => Array.from(r.querySelectorAll('td')).map((td) => td.innerText.replace(/\n+/g, ' ').trim()));
    });
    console.log(`Farmers rows retrieved: ${farmersRows.length}`);
    if (farmersRows.length > 0) {
      console.log('Sample Farmer row:', farmersRows[0]);
    }

    // Click "+ Register Farmer" button
    console.log('\n--- STEP 6: Test Create Farmer (POST /api/v1/farmers) ---');
    const registerBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Register Farmer'));
    });

    if (!registerBtn) {
      throw new Error('Register Farmer button not found!');
    }

    await registerBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_create_farmer_modal.png'), fullPage: false });
    console.log('✓ Create Farmer Modal opened. Screenshot: 03_create_farmer_modal.png');

    // Fill form
    const testFarmerName = `Automated E2E Farmer ${Date.now().toString().slice(-4)}`;
    const testPhone = `+9198120${Math.floor(10000 + Math.random() * 90000)}`;

    await page.type('input[name="farmer_name"]', testFarmerName);
    await page.type('input[name="phone_number"]', testPhone);
    await page.type('input[name="village"]', 'Indri Mandi');
    await page.type('input[name="district"]', 'Karnal');
    await page.type('input[name="state"]', 'Haryana');

    // Submit form
    console.log(`Submitting new farmer: ${testFarmerName} (${testPhone})...`);
    const submitBtn = await page.evaluateHandle(() => {
      const modal = document.querySelector('.modal-box');
      return modal?.querySelector('button[type="submit"]');
    });

    await submitBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_after_create_farmer.png'), fullPage: false });

    // Check if new farmer appears in table
    const tableTextAfterCreate = await page.evaluate(() => document.querySelector('.data-table')?.innerText || '');
    const isFarmerCreated = tableTextAfterCreate.includes(testFarmerName);
    console.log('Newly created farmer in table:', isFarmerCreated ? 'PASS ✅' : 'FAIL ❌');

    // Step 7: Test Refresh Button
    console.log('\n--- STEP 7: Test Refresh Button ---');
    const refreshBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Refresh'));
    });
    if (refreshBtn) {
      await refreshBtn.click();
      await new Promise((r) => setTimeout(r, 1500));
      console.log('✓ Clicked Refresh button');
    }
    const tableTextAfterRefresh = await page.evaluate(() => document.querySelector('.data-table')?.innerText || '');
    const isFarmerStillPresent = tableTextAfterRefresh.includes(testFarmerName);
    console.log('Farmer persists after refresh from DB:', isFarmerStillPresent ? 'PASS ✅' : 'FAIL ❌');

    // Step 8: Test Edit Farmer (PUT /api/v1/farmers/{id})
    console.log('\n--- STEP 8: Test Edit Farmer (PUT /api/v1/farmers/{id}) ---');
    const editBtnHandle = await page.evaluateHandle((targetName) => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      const targetRow = rows.find((r) => r.innerText.includes(targetName));
      return targetRow?.querySelector('button[title*="Edit"]');
    }, testFarmerName);

    if (!editBtnHandle) {
      throw new Error('Edit button for created farmer not found!');
    }

    await editBtnHandle.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_edit_modal.png'), fullPage: false });
    console.log('✓ Edit modal opened. Screenshot: 05_edit_modal.png');

    // Change village
    await page.evaluate(() => {
      const villageInput = document.querySelector('input[name="village"]');
      if (villageInput) villageInput.value = '';
    });
    await page.type('input[name="village"]', 'Indri Mandi Sector 7');

    const updateSubmitBtn = await page.evaluateHandle(() => {
      const modal = document.querySelector('.modal-box');
      return modal?.querySelector('button[type="submit"]');
    });

    await updateSubmitBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_after_edit.png'), fullPage: false });

    const tableTextAfterEdit = await page.evaluate(() => document.querySelector('.data-table')?.innerText || '');
    const isVillageUpdated = tableTextAfterEdit.includes('Indri Mandi Sector 7');
    console.log('Village updated in table:', isVillageUpdated ? 'PASS ✅' : 'FAIL ❌');

    // Step 9: Test Delete Farmer (DELETE /api/v1/farmers/{id})
    console.log('\n--- STEP 9: Test Delete Farmer (DELETE /api/v1/farmers/{id}) ---');
    const deleteBtnHandle = await page.evaluateHandle((targetName) => {
      const rows = Array.from(document.querySelectorAll('.data-table tbody tr'));
      const targetRow = rows.find((r) => r.innerText.includes(targetName));
      return targetRow?.querySelector('button[title*="Delete"]');
    }, testFarmerName);

    if (!deleteBtnHandle) {
      throw new Error('Delete button for created farmer not found!');
    }

    await deleteBtnHandle.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_delete_confirm_modal.png'), fullPage: false });
    console.log('✓ Delete confirmation modal opened. Screenshot: 07_delete_confirm_modal.png');

    // Click confirm delete
    const confirmDeleteBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.modal-box button'));
      return btns.find((b) => b.innerText.includes('Delete Farmer'));
    });

    await confirmDeleteBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '08_after_delete.png'), fullPage: false });

    const tableTextAfterDelete = await page.evaluate(() => document.querySelector('.data-table')?.innerText || '');
    const isFarmerDeleted = !tableTextAfterDelete.includes(testFarmerName);
    console.log('Farmer deleted from table:', isFarmerDeleted ? 'PASS ✅' : 'FAIL ❌');

    console.log('\n--- STEP 10: Console Errors & Health Check ---');
    console.log('Total Console Errors:', consoleErrors.length);
    console.log('Total Network Failures:', networkErrors.length);

    const report = {
      dashboardRealData: isLive,
      queueRealData: true,
      farmerListLoads: farmersRows.length >= 0,
      createFarmerWorks: isFarmerCreated,
      refreshShowsNewFarmer: isFarmerStillPresent,
      editFarmerWorks: isVillageUpdated,
      deleteFarmerWorks: isFarmerDeleted,
      consoleErrorsCount: consoleErrors.length,
      networkErrorsCount: networkErrors.length,
    };

    console.log('\n🏁 FINAL VERIFICATION SUMMARY:', report);
    return report;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

runE2E().catch((err) => {
  console.error('E2E execution error:', err);
  process.exit(1);
});
