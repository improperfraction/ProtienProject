//writ emthod to scrape availability-- done 
//write method to senf telgram meeage
/// schedule cron job

const axios = require('axios');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
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
  }
  catch (error) {
    console.error(' Telegram error:', error.response?.data || error.message);
  }
}

const prtnupdate = async () => {
  let browser;

  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.waitForSelector('#search');
    await page.type('#search', '411044');

    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.waitForSelector('p.item-name');

    const selectedText = await page.$eval('p.item-name', el => el.textContent.trim());

    if (selectedText !== '411044') {
      console.log(" Something went wrong: Pincode mismatch");
      return;
    }

    await page.click('p.item-name');

    // Wait for potential alert, but don't throw error if it doesn't appear
    try {
      await page.waitForSelector('.alert-danger', { timeout: 2000 });
      const alertElement = await page.$('.alert-danger');
      if (alertElement) {
        const alertText = await page.evaluate(el => el.textContent.trim(), alertElement);
        if (alertText === 'Sold Out') {
          console.log(" Product is not available");
          return;
        }
      }
    } catch (innerErr) {
      // No alert-danger found, which is fine
    }

    const logMsg = `${new Date().toLocaleString()} - ✅ Product is available at: ${URL}`;
    return logMsg;

  } catch (error) {
    console.error(" Error occurred in prtnupdate:", error.message);
    return null;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

cron.schedule('0 */1 * * *', async () => {

  try {
    const message = await prtnupdate();
    if (message) {
      console.log(message);
      await sendTlgmMsg(message);
    }
  }
  catch (error) {
    console.error('Error in cron job:', error.message);
    await sendTlgmMsg(`Cron job error: ${error.message}`);
  }
})

// (async () => {
//     console.log(" Starting Amul product availability check...");
//     const message = await prtnupdate();
//     console.log(message || "ℹ No update.");
// })();