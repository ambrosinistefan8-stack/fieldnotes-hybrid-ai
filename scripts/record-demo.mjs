import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:1152,height:926}});
  await context.route(/^https?:/,route=>route.abort());
  const app=await context.newPage();
  await app.goto(pathToFileURL(resolve('index.html')).href);
  const recorderPage=await context.newPage();
  const type=await recorderPage.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=1012;
    const ctx=canvas.getContext('2d');
    const stream=canvas.captureStream(12);
    const type=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8'].find(t=>MediaRecorder.isTypeSupported(t));
    const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:1600000});
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    window.finished=new Promise(ok=>{recorder.onstop=async()=>{
      const reader=new FileReader();reader.onload=()=>ok(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type}));};});
    window.drawFrame=async(data,caption)=>{
      const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
      ctx.drawImage(img,0,0);ctx.fillStyle='#133529';ctx.fillRect(0,926,1152,86);
      ctx.fillStyle='white';ctx.font='24px sans-serif';ctx.fillText(caption,30,975);
    };
    window.rec=recorder;window.stream=stream;recorder.start(500);return type;
  });
  async function show(caption,ms=2850){
    const shot=(await app.screenshot()).toString('base64');
    await recorderPage.evaluate(([img,line])=>window.drawFrame(img,line),[shot,caption]);
    const until=Date.now()+ms;
    while(Date.now()<until){
      await recorderPage.waitForTimeout(180);
      await recorderPage.evaluate(()=>window.stream.getVideoTracks()[0].requestFrame?.());
    }
  }
  await show('A maintenance worker reads two wall probes for a shift handover.');
  await app.locator('#answers button').first().click();
  await show('30 °C is the last south-wall reading. The work order asks for the rise.');
  await app.locator('#evidenceBtn').click();
  await show('The two marked rows show 18 °C at the start and 30 °C at minute 20.');
  await app.selectOption('#language','de');
  await show('Switching to German preserves the question and the evidence.');
  await app.selectOption('#language','en');
  for(const index of [1,2,0]) {await app.locator('#answers button').nth(index).click();await app.locator('#next').click();}
  await show('The shift review keeps the one missed question for another attempt.');
  await app.locator('#review').click();
  await show('A focused review returns directly to the misunderstood work order.');
  await app.selectOption('#lesson','cups');
  await app.locator('#evidenceBtn').click();
  await show('Kitchen handover: use only minutes 5 to 10 for the last cooling interval.',3400);
  for(const answer of [1,2]) {
    await app.locator('#answers button').nth(answer).click();
    await app.locator('#next').click();
  }
  await app.locator('#aiBox summary').click();
  await app.locator('#aiStatus').scrollIntoViewIfNeeded();
  await show('The handbook shows the last reading and asks for a new measurement at minute 15.',3600);
  const data=await recorderPage.evaluate(()=>{window.rec.stop();return window.finished;});
  const file='demo/fieldnotes-local.'+(type.includes('mp4')?'mp4':'webm');
  await writeFile(file,Buffer.from(data,'base64'));
  const checked=await recorderPage.evaluate(async({bytes,mime})=>{
    const v=document.createElement('video');v.muted=true;
    const meta=new Promise((ok,fail)=>{v.onloadedmetadata=ok;v.onerror=fail;});
    v.src='data:'+mime.split(';')[0]+';base64,'+bytes;await meta;
    const playing=new Promise((ok,fail)=>{v.onplaying=ok;v.onerror=fail;});await v.play();await playing;v.pause();
    return {width:v.videoWidth,height:v.videoHeight};
  },{bytes:(await readFile(file)).toString('base64'),mime:type});
  if(checked.width!==1152||checked.height!==1012)throw Error('Video validation failed.');
  console.log(file+' '+JSON.stringify(checked));
}finally{await browser.close();}
