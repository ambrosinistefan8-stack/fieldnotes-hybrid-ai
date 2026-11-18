import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { makeServer } from '../scripts/serve.mjs';

test('private cloud cannot start without explicit operator approval',()=>{
  assert.throws(()=>makeServer({mode:'hybrid'}),/paid-service/);
});
test('adult device lab requires a one-time invitation and adult confirmation, blocks all external connections',async()=>{
  const {server}=makeServer({mode:'device',invite:'test-only',load:async n=>n==='local-settings.js'?'/*fixture*/':'Private lab /* SERVED_PRIVATE_CONFIG */'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url='http://127.0.0.1:'+server.address().port;
  const unlock=(code,adult,origin=url)=>fetch(url+'/unlock',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,adult}),redirect:'manual'});
  try{
    const first=await fetch(url);assert.match(await first.text(),/Private adult test/);
    assert.equal((await fetch(url+'/private-device.html')).status,404);
    assert.equal((await unlock('invalid','yes')).status,403);
    assert.equal((await unlock('test-only','no')).status,403);
    assert.equal((await unlock('test-only','yes','https://other.invalid')).status,403);
    const admitted=await unlock('test-only','yes');assert.equal(admitted.status,303);
    const cookie=admitted.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);
    const view=await fetch(url,{headers:{Cookie:cookie.split(';')[0]}});
    assert.match(await view.text(),/Private lab/);assert.match(view.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.equal((await unlock('test-only','yes')).status,403);
  }finally {server.close();await once(server,'close');}
});
