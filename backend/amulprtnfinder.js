const axios = require('axios');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const URL = "https://shop.amul.com/en/product/amul-high-protein-plain-lassi-200-ml-or-pack-of-30";
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const sendTlgmMsg = async (message) => {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
    });
    console.log('Telegram message sent:', res.status);
  } catch (error) {
    console.error('Telegram error:', error.response?.data || error.message);
  }
}

const takeScreenshot = async (page, label) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${label}-${timestamp}.png`;
  await page.screenshot({ path: filename });
  console.log(`📸 Screenshot saved: ${filename}`);
};

const prtnupdate = async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('#search');
    await page.type('#search', '411044');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.waitForSelector('a.searchitem-name', { timeout: 10000 });

    await takeScreenshot(page, 'after-pincode-entry');

    const selectedText = await page.$eval('p.item-name', el => el.textContent.trim());
    if (selectedText !== '411044') {
      console.log("❌ Pincode mismatch or result not correct.");
      await takeScreenshot(page, 'pincode-mismatch');
      return;
    }

    await page.click('a.searchitem-name');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await takeScreenshot(page, 'after-click');

    // Wait for alert-danger if any
    try {
      await page.waitForSelector('.alert-danger', { timeout: 3000 });
      const alertElement = await page.$('.alert-danger');
      if (alertElement) {
        const alertText = await page.evaluate(el => el.textContent.trim(), alertElement);
        if (alertText === 'Sold Out') {
          console.log("❌ Product is not available.");
          return;
        }
      }
    } catch (innerErr) {
      // No alert-danger found
    }

    const logMsg = `${new Date().toLocaleString()} - ✅ Product is available at: ${URL}`;
    return logMsg;

  } catch (error) {
    console.error("❌ Error occurred in prtnupdate:", error.message);
    if (browser) {
      const page = (await browser.pages())[0];
      await takeScreenshot(page, 'error');
    }
    return null;

  } finally {
    if (browser) await browser.close();
  }
};

// Run the script once (for GitHub Actions)
(async () => {
  console.log("🔍 Starting Amul product availability check...");
  const message = await prtnupdate();
  if (message) {
    console.log(message);
    await sendTlgmMsg(message);
  } else {
    console.log("ℹ️ No availability update.");
  }
})();
