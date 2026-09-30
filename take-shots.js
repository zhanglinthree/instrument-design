const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  // thing model (existing)
  { hash: 'list', file: '01-category-list.png' },
  { hash: 'createCategory', file: '02-create-category.png' },
  { hash: 'points', file: '03-point-dictionary.png' },
  { hash: 'editPoint', file: '04-edit-point.png' },
  { hash: 'install', file: '05-install-params.png' },
  { hash: 'firmware', file: '06-firmware-baseline.png' },
  { hash: 'editCategory', file: '07-edit-category.png' },
  { hash: 'deleteConfirm', file: '08-delete-confirm.png' },
  { hash: 'editInstall', file: '09-edit-install.png' },
  { hash: 'editFirmware', file: '10-edit-firmware.png' },
  { hash: 'props', file: '11-report-props.png' },
  { hash: 'events', file: '12-exception-events.png' },
  // device ledger
  { hash: 'projects', file: 'ledger-01-projects.png' },
  { hash: 'createProject', file: 'ledger-02-create-project.png' },
  { hash: 'devices', file: 'ledger-03-devices.png' },
  { hash: 'deviceDetail', file: 'ledger-04-device-detail.png' },
  { hash: 'editDevice', file: 'ledger-05-edit-device.png' },
  { hash: 'aepReconcile', file: 'ledger-06-aep-reconcile.png' },
  { hash: 'importExport', file: 'ledger-07-import.png' },
  // online monitor
  { hash: 'monitor', file: 'monitor-01-list.png' },
  { hash: 'monitorDetail', file: 'monitor-02-detail.png' },
  { hash: 'monitorCurve', file: 'monitor-03-curve.png' },
  { hash: 'monitorOnlineRate', file: 'monitor-04-online-rate.png' },
  { hash: 'monitorCurveLong', file: 'monitor-05-curve-long-cycle.png' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  for (const s of shots) {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('PAGEERROR', s.hash, e.message));
    const url = `http://127.0.0.1:8877/index.html#${s.hash}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.shell', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 900));
    const out = path.join(OUT, s.file);
    await page.screenshot({ path: out, fullPage: false });
    console.log('saved', out);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
