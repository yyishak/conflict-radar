const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log("Page loaded.");
    await new Promise(r => setTimeout(r, 5000));
  } catch (err) {
    console.log("Error loading page:", err);
  } finally {
    await browser.close();
  }
})();
