/**
 * Screenshot viewport-only (pas full page) + diagnostic dimensions
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL = process.argv[2] || 'https://dashboard-five-tau-20.vercel.app/';
const SUFFIX = process.argv[3] || 'viewport';
const OUT = path.join(__dirname, 'screenshots');

const VIEWPORTS = [
  { name: 'iphone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  for (const v of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport(v);
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    /* Diagnostic : dimensions des éléments clés */
    const diag = await page.evaluate(() => {
      const get = sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          w: Math.round(r.width), h: Math.round(r.height),
          top: Math.round(r.top), left: Math.round(r.left),
          display: s.display, position: s.position,
          overflow: s.overflow, minHeight: s.minHeight,
          flex: s.flex, gridTemplateRows: s.gridTemplateRows,
        };
      };
      return {
        body: { scrollHeight: document.body.scrollHeight, clientHeight: document.body.clientHeight },
        html: { scrollHeight: document.documentElement.scrollHeight },
        '#root': get('#root'),
        '.app': get('.app'),
        '.main': get('.main'),
        '.topbar': get('.topbar'),
        '.grid': get('.grid'),
        '.sidebar': get('.sidebar'),
        '.intro-overlay': get('.intro-overlay'),
        '.m-app': get('.m-app'),
        '.m-header': get('.m-header'),
        '.m-feed': get('.m-feed'),
        '.m-section': get('.m-section'),
        '.welcome': get('.welcome'),
        '.weather': get('.weather'),
        '.health': get('.health'),
        '.productivity': get('.productivity'),
        '.finances': get('.finances'),
        '.agenda': get('.agenda'),
        '.charts-row': get('.charts-row'),
        '.chart-canvas': get('.chart-canvas'),
        '.prod-body': get('.prod-body'),
      };
    });

    console.log(JSON.stringify(diag, null, 2));
    fs.writeFileSync(path.join(OUT, `diag-${v.name}-${SUFFIX}.json`), JSON.stringify(diag, null, 2));

    await page.screenshot({ path: path.join(OUT, `${v.name}-${SUFFIX}.png`), fullPage: false });
    await page.close();
  }
  await browser.close();
})();
