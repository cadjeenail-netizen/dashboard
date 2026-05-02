/**
 * Audit visuel automatique — capture screenshots à 3 viewports
 * Usage: node screenshot.js [url] [suffix]
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL    = process.argv[2] || 'https://dashboard-five-tau-20.vercel.app/';
const SUFFIX = process.argv[3] || 'before';
const OUT    = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900,  deviceScaleFactor: 1, isMobile: false },
  { name: 'tablet',  width: 768,  height: 1024, deviceScaleFactor: 2, isMobile: true  },
  { name: 'iphone',  width: 390,  height: 844,  deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox'],
  });
  const errors = {};

  for (const v of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: v.width, height: v.height,
      deviceScaleFactor: v.deviceScaleFactor,
      isMobile: !!v.isMobile,
      hasTouch: !!v.hasTouch,
    });
    if (v.isMobile) {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    }

    /* Capture console errors */
    const consoleErrors = [];
    page.on('console', m => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', e => consoleErrors.push('PAGE ERROR: ' + e.message));
    page.on('requestfailed', r => consoleErrors.push('REQ FAILED: ' + r.url() + ' — ' + r.failure().errorText));

    console.log(`[${v.name}] loading ${URL}…`);
    try {
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.log(`[${v.name}] goto error: ${e.message}`);
    }
    /* Attendre que React/Babel se monte (4s safety) */
    await new Promise(r => setTimeout(r, 4500));

    const file = path.join(OUT, `${v.name}-${SUFFIX}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`[${v.name}] → ${file}`);

    /* Récupère le HTML rendu pour debug */
    const bodyText = await page.evaluate(() => {
      const root = document.getElementById('root');
      const visible = !!(root && root.children.length > 0);
      const html = root ? root.innerHTML.length : 0;
      return { visible, htmlLen: html, title: document.title };
    });
    errors[v.name] = { consoleErrors, bodyText };

    await page.close();
  }
  await browser.close();

  fs.writeFileSync(path.join(OUT, `errors-${SUFFIX}.json`), JSON.stringify(errors, null, 2));
  console.log('\n=== ERRORS / STATE ===');
  console.log(JSON.stringify(errors, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
