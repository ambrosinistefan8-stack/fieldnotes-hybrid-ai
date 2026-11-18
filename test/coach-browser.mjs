import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

// Only this in-memory bundle substitutes the Firebase AI endpoint. The app,
// response validation, fallback selection and DOM rendering run as shipped.
const aiFixture = {
  name: 'synthetic-model',
  setup(builder) {
    builder.onResolve({filter: /^firebase\/ai$/}, () => ({path: 'ai', namespace: 'fixture'}));
    builder.onLoad({filter: /^ai$/, namespace: 'fixture'}, () => ({contents: `
      export const InferenceMode = {ONLY_ON_DEVICE:'only_on_device', PREFER_ON_DEVICE:'prefer_on_device'};
      export const InferenceSource = {ON_DEVICE:'on_device', IN_CLOUD:'in_cloud'};
      export class GoogleAIBackend {}
      export function getAI() { return {}; }
      export function getGenerativeModel() {
        return {
          async initializeDeviceModel() {},
          async generateContent() {
            window.fixtureCalls++;
            if (new URLSearchParams(location.search).get('outcome') === 'error') throw new Error('synthetic failure');
            return {response: {inferenceSource: InferenceSource.ON_DEVICE, text: () => 'Minute 15 = 99 °C. FABRICATED'}};
          }
        };
      }`}));
  }
};

const [bundle, template, css] = await Promise.all([
  build({entryPoints:['src/app.js'], bundle:true, write:false, format:'iife', plugins:[aiFixture],
    define:{FIELDNOTES_BUILD_MODE:JSON.stringify('device')}}),
  readFile('index.template.html','utf8'), readFile('src/style.css','utf8')
]);
const html = template.replace('/* APP_STYLES */', () => css)
  .replace('/* APP_CONFIG */', 'window.fixtureCalls=0;window.FIELDNOTES_SETTINGS={firebase:{apiKey:"fixture",projectId:"fixture",appId:"fixture"}};')
  .replace('/* APP_CODE */', () => bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
const origin = 'http://127.0.0.1';
const expected = {
  en: {
    invalid:'AI · On device · The model returned no valid selection. Showing the standard handbook step.',
    error:'No usable model result. Showing the standard handbook step.',
    instruction:/log ends at minute 10.*minute 15 as awaiting a reading/s,
    rows:['0 min · Open jug 72 °C · Lidded jug 72 °C','5 min · Open jug 63 °C · Lidded jug 68 °C','10 min · Open jug 57 °C · Lidded jug 65 °C']
  },
  de: {
    invalid:'KI · Auf dem Gerät · Das Modell lieferte keine gültige Auswahl. Angezeigt wird der Standardschritt aus dem Lernheft.',
    error:'Kein verwertbares Modellergebnis. Angezeigt wird der Standardschritt aus dem Lernheft.',
    instruction:/Protokoll endet bei Minute 10.*Minute 15 als ausstehend/s,
    rows:['0 min · Offene Kanne 72 °C · Mit Deckel 72 °C','5 min · Offene Kanne 63 °C · Mit Deckel 68 °C','10 min · Offene Kanne 57 °C · Mit Deckel 65 °C']
  }
};

const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const outside = [], errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin && route.request().isNavigationRequest())
      return route.fulfill({contentType:'text/html;charset=utf-8', body:html});
    outside.push(route.request().url());
    return route.abort();
  });
  for (const [lang, copy] of Object.entries(expected)) {
    for (const outcome of ['invalid','error']) {
      await page.goto(origin + '/?lang=' + lang + '&outcome=' + outcome);
      await page.selectOption('#lesson','cups');
      for (const correct of [1,2]) {
        await page.locator('#answers button').nth(correct).click();
        await page.locator('#next').click();
      }
      await page.locator('#aiBox summary').click();
      const status = page.locator('#aiStatus');
      assert.equal(await status.isVisible(), true);
      await status.evaluate(el => {
        window.transientHintText = [];
        new MutationObserver(records => {
          for (const record of records) {
            for (const node of record.addedNodes) window.transientHintText.push(node.textContent);
            if (record.type === 'characterData') window.transientHintText.push(record.oldValue,record.target.data);
          }
        }).observe(el, {childList:true, subtree:true, characterData:true, characterDataOldValue:true});
      });
      await page.locator('#consent').check();
      await page.locator('#ask').click();
      await page.locator('#aiStatus[data-guide-kind="editorial-' + outcome + '"]').waitFor();
      assert.equal(await status.getAttribute('data-inference-source'), outcome === 'invalid' ? 'on_device' : null);
      assert.equal(await status.getAttribute('data-selection'), null);
      assert.equal(await status.locator('.coach-source').innerText(), copy[outcome]);
      assert.match(await status.locator('.coach-step').innerText(), copy.instruction);
      assert.deepEqual(await status.locator('li').allInnerTexts(), copy.rows);
      assert.doesNotMatch(await status.innerText(), /99 °C|FABRICATED|synthetic failure/);
      assert.doesNotMatch(await page.evaluate(() => window.transientHintText.join(' ')), /99 °C|FABRICATED|synthetic failure/);
      assert.equal(await page.evaluate(() => window.fixtureCalls), 1);
    }
  }
  assert.deepEqual(outside, []);
  assert.deepEqual(errors, []);
  console.log('Passed: English/German rendered invalid-response and unavailable-model fallbacks (4 synthetic cases, 0 external requests).');
} finally {
  await browser.close();
}
