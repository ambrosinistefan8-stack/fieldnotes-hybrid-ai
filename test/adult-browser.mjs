import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile,writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { makeServer } from '../scripts/serve.mjs';

// No real project identifiers. Only the UI gate and network isolation are exercised.
const fixture='window.FIELDNOTES_SETTINGS={firebase:{apiKey:"fixture",projectId:"fixture",appId:"fixture"},appCheckSiteKey:"fixture"};';
const load=n=>n==='local-settings.js'?Promise.resolve(fixture):readFile(n,'utf8');
const {server}=makeServer({mode:'device',invite:'browser-test-only',load});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const ctx=await browser.newContext();const network=[];
  await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){network.push(r.request().url());return r.abort();}return r.continue();});
  const page=await ctx.newPage();await page.goto(origin);
  assert.equal(await page.getByRole('heading',{name:'Private adult test'}).isVisible(),true);
  await page.getByLabel('Invitation code').fill('browser-test-only');
  await page.getByRole('checkbox').check();
  const submitted=page.waitForResponse(r=>r.url()===origin+'/unlock');
  await page.getByRole('button',{name:'Open test session'}).click();
  assert.equal((await submitted).status(),303,'Local browser admission requires a same-origin form post.');
  await page.locator('#aiBox summary').click();
  assert.match(await page.locator('#aiCopy').innerText(),/Cloud model requests are blocked/);
  assert.equal(await page.locator('#ask').isDisabled(),true);
  const early=await page.evaluate(()=>document.querySelector('meta[http-equiv="Content-Security-Policy"]').content);
  assert.match(early,/connect-src 'none'/);
  const extras=await browser.newPage(); await extras.goto(origin);
  assert.equal(await extras.getByRole('heading',{name:'Private adult test'}).isVisible(),true);
  assert.equal(network.length,0);
  const result={browser:await browser.version(),namedAdultInvitation:'enforced at local server',separateBrowser:'access denied without invitation',cloudNetwork:'blocked by CSP',consent:'unchecked',modelInvocation:false,externalPageRequests:network.length};
  await writeFile('demo/adult-test-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally{await browser.close();server.close();await once(server,'close');}
