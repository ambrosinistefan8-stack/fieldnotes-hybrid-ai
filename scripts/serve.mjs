import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const project = new URL('../', import.meta.url);
const getFile = name => readFile(new URL(name, project),'utf8');

function equal(a,b) {
  const first=Buffer.from(a), second=Buffer.from(b);
  return first.length===second.length && timingSafeEqual(first,second);
}
const screen = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fieldnotes · Private adult test</title><main style="max-width:35rem;margin:8vh auto;padding:1rem;font:18px/1.5 system-ui"><h1>Private adult test</h1><p>Only the named adult tester invited by the operator may open this local session. Enter the one-time code the operator gave you.</p><form action="/unlock" method="post"><label>Invitation code <input name="code" required autocomplete="off"></label><p><label><input type="checkbox" name="adult" value="yes" required> I am 18 or older and the invited tester.</label></p><button>Open test session</button></form></main></html>`;

export function makeServer({mode='offline',approvePaid=false,load=getFile,invite=randomBytes(18).toString('hex')}={}) {
  if(!['offline','device','hybrid'].includes(mode)) throw Error('Unsupported build.');
  if(mode==='hybrid' && !approvePaid) throw Error('Private cloud testing requires verified paid-service arrangements and explicit operator authorization.');
  const session = randomBytes(32).toString('hex');
  const server=createServer(async(req,res)=>{
    const host=req.headers.host;
    if(!/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(host||'')){res.writeHead(403);res.end();return;}
    const path=new URL(req.url,'http://'+host).pathname;
    const standard={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'};
    function reply(status,body='',extra={}){res.writeHead(status,{...standard,'Content-Type':'text/html; charset=utf-8',...extra});res.end(body);}
    if(path==='/unlock' && req.method==='POST' && mode!=='offline'){
      if(req.headers.origin!=='http://'+host){reply(403);return;}
      let body='';
      for await(const chunk of req){ body+=chunk; if(body.length>1024){reply(413);return;} }
      const form=new URLSearchParams(body);
      if(!invite||!equal(form.get('code')||'',invite)||form.get('adult')!=='yes'){reply(403,screen);return;}
      invite=null;
      reply(303,'',{Location:'/','Set-Cookie':'fieldnotes_session='+session+'; HttpOnly; SameSite=Strict; Path=/'});return;
    }
    if(req.method!=='GET' || !['/','/index.html'].includes(path)){reply(404);return;}
    if(mode==='offline'){
      try{reply(200,await load('index.html'));}catch{reply(503,'Run npm run build.');}
      return;
    }
    const allowed=(req.headers.cookie||'').split(';').some(c=>equal(c.trim(),'fieldnotes_session='+session));
    if(!allowed){reply(200,screen);return;}
    try{
      const [html,config]=await Promise.all([load('private-'+mode+'.html'),load('local-settings.js')]);
      const extra=mode==='device'?{'Content-Security-Policy':"connect-src 'none'; frame-src 'none'; object-src 'none'"}:{};
      reply(200,html.replace('/* SERVED_PRIVATE_CONFIG */',()=>config.replace(/<\/script/gi,'<\\/script')),extra);
    }catch{reply(503,'Build the private package and supply local-settings.js before running the test.');}
  });
  return { server, invitation:invite };
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const arg=process.argv[2], modes={'--device':'device','--hybrid':'hybrid'};
  if(arg&&!modes[arg])throw Error('Use --device, --hybrid or no flag.');
  const mode=modes[arg]||'offline';
  const {server,invitation}=makeServer({mode,approvePaid:process.env.FIELDNOTES_APPROVED_PAID_ADULT_TEST==='yes'});
  server.listen(Number(process.env.PORT||4178),'127.0.0.1',()=>{
    console.log('http://127.0.0.1:'+server.address().port);
    if(mode!=='offline') console.log('Give this single-use code only to the authorized adult tester: '+invitation);
  });
}
