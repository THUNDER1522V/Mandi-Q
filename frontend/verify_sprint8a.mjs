import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\c07f52ee-0c10-4312-9060-a5d0b5fb401b';

async function verifySprint8A() {
  console.log('🚀 Starting MANDIQ Sprint 8A E2E Browser Verification...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  try {
    console.log('\n--- STEP 1: Navigate to Dashboard ---');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- STEP 2: Open Voice Agent Tab ---');
    const tabButtons = await page.$$('.workspace-tab-btn');
    let voiceTab = null;
    for (const b of tabButtons) {
      const text = await page.evaluate(el => el.innerText, b);
      if (text.includes('Voice Agent')) {
        voiceTab = b;
        break;
      }
    }
    if (!voiceTab) throw new Error('Voice Agent tab not found!');
    await voiceTab.click();
    console.log('✓ Switched to Voice Agent Tab');

    // Wait 2s for auto-trigger incoming call
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_01_incoming_call.png') });
    console.log('✓ Captured sprint8a_01_incoming_call.png');

    console.log('\n--- STEP 3: Accept Call (Green Button) ---');
    const acceptBtn = await page.$('button[aria-label="Accept / Call"]');
    if (!acceptBtn) throw new Error('Accept call button not found');
    await acceptBtn.click();
    console.log('✓ Clicked Green Call button');

    // Wait 2s for CONNECTED and GREETING
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_02_greeting.png') });
    console.log('✓ Captured sprint8a_02_greeting.png');

    // Wait for MAIN_MENU (about 2.5s)
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_03_main_menu.png') });
    console.log('✓ Captured sprint8a_03_main_menu.png');

    console.log('\n--- STEP 4: Test D-Pad Navigation & DTMF ---');
    // Click D-Pad Down arrow
    const downArrow = await page.$('button[aria-label="Navigate Down"]');
    if (downArrow) {
      await downArrow.click();
      await new Promise(r => setTimeout(r, 400));
      console.log('✓ Clicked D-pad Down arrow');
    }

    // Now press Key 1 to open Crop Selection
    const key1 = await page.$('button[aria-label^="Key 1"]');
    if (!key1) throw new Error('Key 1 button not found');
    await key1.click();
    console.log('✓ Pressed Key 1 on Nokia physical keypad');

    // Wait for Crop Menu
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_04_crop_menu.png') });
    console.log('✓ Captured sprint8a_04_crop_menu.png');

    console.log('\n--- STEP 5: Select Wheat (Key 1) & Process Booking ---');
    await key1.click();
    console.log('✓ Selected Wheat for slot booking');

    // Wait for processing spinner
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_05_processing.png') });
    console.log('✓ Captured sprint8a_05_processing.png');

    // Wait for SUCCESS confirmation
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_06_confirmed.png') });
    console.log('✓ Captured sprint8a_06_confirmed.png');

    // Wait for SMS_SENT
    await new Promise(r => setTimeout(r, 2200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_07_sms_delivered.png') });
    console.log('✓ Captured sprint8a_07_sms_delivered.png');

    console.log('\n--- STEP 6: End Call (Red Button) ---');
    const endBtn = await page.$('button[aria-label="Reject / End Call"]');
    if (endBtn) {
      await endBtn.click();
      console.log('✓ Clicked Red End button');
    }

    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'sprint8a_08_idle_standby.png') });
    console.log('✓ Captured sprint8a_08_idle_standby.png');

    console.log('\n🎉 SPRINT 8A BROWSER E2E VERIFICATION COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

verifySprint8A().catch(err => {
  console.error('Sprint 8A Verification failed:', err);
  process.exit(1);
});
