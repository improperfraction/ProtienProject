const axios = require('axios');
const puppeteer = require('puppeteer');
require('dotenv').config();

const MB_TELEGRAM_TOKEN = process.env.MB_TELEGRAM_TOKEN 
const MB_CHAT_ID = process.env.MB_CHAT_ID;

const sendTelegramMessage = async (message) => {
    const url = `https://api.telegram.org/bot${MB_TELEGRAM_TOKEN}/sendMessage`;

    try {
        const res = await axios.post(url, {
            chat_id: MB_CHAT_ID,
            text: message,
        });

        console.log(' Telegram message sent:', res.status);
    } catch (error) {
        console.error(' Telegram error:', error.response?.data || error.message);
    }
};


(async () => {
    try {
        const  browser = await puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        const page = await browser.newPage();

        const url = 'https://www.muscleblaze.com/sv/muscleblaze-biozyme-whey-pr/SP-122029?navKey=VRNT-232197&itracker=w:home|in-high-demand|'; // ⬅️ Replace this
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        // 2. Go to product page

        // 3. Wait for the price element to appear on screen
        await page.waitForSelector(".offer-price");

        // 4. Extract price text
        const priceText = await page.$eval(".offer-price", el => el.textContent);

        // 5. Clean up the result (remove "Price:" and ₹)
        const cleanedPrice = priceText.replace(/[^0-9]/g, ""); // only numbers
        const logMsg = `${new Date().toLocaleString()} - Price: ${cleanedPrice} and Premium Price: ₹${(cleanedPrice * 0.97).toFixed(2)} Product link: ${url} `; // 3% discount for premium users
        console.log(logMsg);

        sendTelegramMessage(`🛒 MuscleBlaze Biozyme Whey PR price details: ${logMsg}`);

        await browser.close();
    } catch (err) {
        console.error('Scraper error:', err.message);
        sendTelegramMessage(` Error: ${err.message}`);
    }
})();
