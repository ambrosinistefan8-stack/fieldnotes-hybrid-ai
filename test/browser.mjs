import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile,writeFile } from 'node:fs/promises';

async function checkHandbook(page, language, expectedStep, expectedRows) {
  const panel = page.locator('#aiBox');
  const status = panel.locator('#aiStatus');
  assert.equal(await panel.isVisible(), true);
  assert.equal(await status.isVisible(), false);
  await panel.locator('summary').click();
  assert.equal(await status.isVisible(), true);
  assert.match(await status.locator('.coach-step').innerText(), expectedStep);
  assert.deepEqual(await status.locator('li').allInnerTexts(), expectedRows);
  assert.equal(await status.locator('.coach-source').innerText(), language === 'en'
    ? 'Workplace handbook · No AI requested.'
    : 'Lernheft · Kein KI-Hinweis angefordert.');
  assert.equal(await status.getAttribute('data-guide-kind'), 'handbook');
  assert.equal(await status.getAttribute('data-inference-source'), null);
  assert.equal(await status.getAttribute('data-selection'), null);
  assert.equal(await panel.locator('#ask').isVisible(), false);
  return status;
}

const html=await readFile('index.html');
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:1200,height:940},deviceScaleFactor:1});
  const outside=[],errors=[];
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).origin!==origin){outside.push(route.request().url());return route.abort();}
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin);
  assert.equal(await page.title(),'Fieldnotes · Lernheft');
  assert.equal(await page.locator('#answers button').count(),3);
  assert.match(await page.locator('#title').innerText(),/Facade inspection/);
  assert.match(await page.locator('#question').innerText(),/work order/);
  await page.screenshot({path:'demo/01-observation.png'});
  await checkHandbook(page,'en',/south-wall column.*Subtract the starting reading from the final one/s,[
    '0 min · South wall 18 °C · Courtyard wall 18 °C',
    '20 min · South wall 30 °C · Courtyard wall 22 °C'
  ]);
  await page.locator('#answers button').nth(0).click();
  assert.equal(await page.locator('#aiStatus').isVisible(),false);
  assert.match(await page.locator('#feedback').innerText(),/Try again/);
  await page.locator('#evidenceBtn').click();
  assert.equal(await page.locator('tr.mark').count(),2);
  await page.screenshot({path:'demo/02-evidence.png'});
  await page.selectOption('#language','de');
  assert.match(await page.locator('#feedback').innerText(),/Prüfen Sie/);
  assert.match(await page.locator('#evidence').innerText(),/Südwand 30 °C/);
  await checkHandbook(page,'de',/Spalte «Südwand».*Anfangswert vom Endwert ab/s,[
    '0 min · Südwand 18 °C · Hofwand 18 °C',
    '20 min · Südwand 30 °C · Hofwand 22 °C'
  ]);
  assert.equal(await page.locator('#ask').isVisible() && await page.locator('#ask').isEnabled(),false);
  await page.screenshot({path:'demo/03-deutsch.png'});
  await page.selectOption('#language','en');
  await page.locator('#answers button').nth(1).click();
  assert.equal(await page.locator('#aiStatus').textContent(),'');
  await page.locator('#next').click();
  const secondQuestion = await checkHandbook(page,'en',/compare the two readings on the same row/i,[
    '0 min · South wall 18 °C · Courtyard wall 18 °C',
    '10 min · South wall 24 °C · Courtyard wall 20 °C',
    '20 min · South wall 30 °C · Courtyard wall 22 °C'
  ]);
  assert.doesNotMatch(await secondQuestion.innerText(),/Subtract the starting reading|Anfangswert vom Endwert/);
  for(const index of [2,0]){await page.locator('#answers button').nth(index).click();await page.locator('#next').click();}
  assert.match(await page.locator('#feedback').innerText(),/2 of 3/);
  await page.screenshot({path:'demo/04-review.png'});
  await page.locator('#review').click();assert.match(await page.locator('#progress').innerText(),/Revisit.*1 \/ 1/i);
  await page.locator('#answers button').nth(1).click();await page.locator('#next').click();
  assert.match(await page.locator('#question').innerText(),/Review complete/);
  await page.selectOption('#lesson','cups');await page.selectOption('#language','de');await page.setViewportSize({width:390,height:844});
  assert.match(await page.locator('#title').innerText(),/Gemeinschaftsküche/);
  await page.locator('#evidenceBtn').click();
  assert.deepEqual(await page.locator('#evidence li').allTextContents(),[
    '5 min · Offene Kanne 63 °C · Mit Deckel 68 °C',
    '10 min · Offene Kanne 57 °C · Mit Deckel 65 °C'
  ]);
  await page.screenshot({path:'demo/05-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const index of [1,2]){await page.locator('#answers button').nth(index).click();await page.locator('#next').click();}
  await checkHandbook(page,'de',/Protokoll endet bei Minute 10.*Minute 15 als ausstehend/s,[
    '0 min · Offene Kanne 72 °C · Mit Deckel 72 °C',
    '5 min · Offene Kanne 63 °C · Mit Deckel 68 °C',
    '10 min · Offene Kanne 57 °C · Mit Deckel 65 °C'
  ]);
  await page.selectOption('#language','en');
  const englishGap = await checkHandbook(page,'en',/log ends at minute 10.*minute 15 as awaiting a reading/s,[
    '0 min · Open jug 72 °C · Lidded jug 72 °C',
    '5 min · Open jug 63 °C · Lidded jug 68 °C',
    '10 min · Open jug 57 °C · Lidded jug 65 °C'
  ]);
  assert.doesNotMatch(await englishGap.innerText(),/ausstehend|Offene Kanne|Südwand/);
  await page.selectOption('#language','de');
  await page.locator('#answers button').nth(0).click();await page.locator('#next').click();
  assert.match(await page.locator('#feedback').innerText(),/3 von 3 Fragen/);
  const availability=await page.evaluate(async()=>{try{return {en:await globalThis.LanguageModel?.availability({expectedOutputs:[{type:'text',languages:['en']}]})??'API absent',de:await globalThis.LanguageModel?.availability({expectedOutputs:[{type:'text',languages:['de']}]})??'API absent'};}catch(err){return {error:err.name};}});
  assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
  const result={browser:await browser.version(),localPractice:'passed',checked:['maintenance handover and kitchen cooling log','both language interfaces','incorrect and correct answers','source rows for each job','review of missed question','mobile width 390','ordinary build has no available AI action','English and German handbook steps and matching rows without model attribution','minute 15 identified as unmeasured in both languages','previous step cleared on answer, question and language changes'],externalPageRequests:outside.length,scriptErrors:errors.length,isolatedChromeLanguageModel:availability,liveInference:'not exercised'};
  await writeFile('demo/browser-check.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); await new Promise(ok=>server.close(ok)); }
