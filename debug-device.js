const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  page.on('console', m => console.log(`[${m.type()}]`, m.text()));
  page.on('pageerror', e => console.log('[ERROR]', e.message));

  await page.goto('https://dashboard-five-tau-20.vercel.app/?intro=done', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const info = await page.evaluate(() => ({
    ua: navigator.userAgent,
    nebulaDevice: window.__NEBULA_DEVICE__,
    htmlDataset: document.documentElement.dataset.device,
    pointerCoarse: matchMedia('(pointer: coarse)').matches,
    smallVw: matchMedia('(max-width: 768px)').matches,
    rootHtml: document.getElementById('root')?.children[0]?.className || 'NO ROOT CHILDREN',
    appExists: !!document.querySelector('.app'),
    mAppExists: !!document.querySelector('.m-app'),
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
