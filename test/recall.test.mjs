import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/lessons.js';
import { newRound, questionFor, choose, advance, reviewMisses, evidenceRow, buildHintPrompt, coachGuide } from '../src/recall.js';
import { configured, generateHint } from '../src/hybrid.js';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';
const cfg={firebase:{apiKey:'fixture',appId:'local-fixture',projectId:'local-fixture'},appCheckSiteKey:'fixture'};
test('both handovers have three bilingual questions tied to the measurements for that job',()=>{
  const [walls,jugs]=lessons;
  assert.equal(walls.questions.length,3);
  assert.equal(jugs.questions.length,3);
  const rise=walls.rows[2][1]-walls.rows[0][1];
  const firstGap=walls.rows.find(row=>row[1]-row[2]===8);
  const lastFiveDrop=jugs.rows[1][1]-jugs.rows[2][1];
  const jugGap=jugs.rows[2][2]-jugs.rows[2][1];
  const correct=q=>q.options[q.answer].en;
  assert.equal(correct(walls.questions[0]),rise+' °C');
  assert.equal(correct(walls.questions[1]),'After '+firstGap[0]+' minutes');
  assert.equal(correct(jugs.questions[0]),lastFiveDrop+' °C');
  assert.match(correct(jugs.questions[1]),new RegExp(jugGap+' °C warmer'));
  assert.ok(jugs.rows.every(row=>row[0]<15));
  assert.match(correct(jugs.questions[2]),/new reading at minute 15/);
  for(const lesson of lessons) for(const q of lesson.questions){
    assert.ok(q.rows.length);
    for(const language of ['de','en']){
      assert.ok(q.ask[language] && q.hint[language] && q.why[language]);
      assert.ok(q.options.every(option=>option[language]));
      for(const i of q.rows)assert.match(evidenceRow(lesson,i,language),/°C/);
    }
  }
});
test('only first attempts count and a missed question is scheduled once',()=>{
  const r=newRound(lessons[0]); advance(r);assert.equal(r.position,0);
  choose(r,-1);assert.equal(r.selected,null); choose(r,0);choose(r,0);choose(r,1);choose(r,2);advance(r);
  choose(r,2);advance(r);choose(r,0);advance(r);
  assert.equal(r.firstTry,2);assert.deepEqual(r.needsReview,[0]);reviewMisses(r);assert.equal(r.review,true);
  assert.equal(questionFor(r),lessons[0].questions[0]);choose(r,1);advance(r);assert.equal(questionFor(r),undefined);assert.equal(r.firstTry,2);
});
test('coach sees only the current example, measurements and last chosen response',()=>{
  const r=newRound(lessons[0]);choose(r,0);
  const prompt=buildHintPrompt(r,'de');
  assert.match(prompt,/30 °C/);
  assert.ok(prompt.includes('A: ' + questionFor(r).hint.de));
  assert.ok(prompt.includes('B: ' + questionFor(r).alternateHint.de));
  assert.match(prompt,/20 min · Südwand 30 °C · Hofwand 22 °C/);
  assert.doesNotMatch(prompt,/Kanne|Gemeinschaftsküche/);
  assert.throws(()=>buildHintPrompt(r,'other'));
});
test('missing config, consent and cancellation stop before model setup',async()=>{
  const round=newRound(lessons[0]);let calls=0;const makeModel=()=>{calls++;};
  assert.equal(configured({}),false);assert.equal(configured(cfg),true);
  assert.equal(configured({firebase:cfg.firebase},'device'),true);
  assert.equal(configured({firebase:cfg.firebase},'hybrid'),false);
  for(const opts of [{mode:'device',settings:cfg,consent:false},{mode:'hybrid',settings:null,consent:true},{mode:'device',settings:cfg,consent:true,signal:AbortSignal.abort()},{mode:'offline',settings:cfg,consent:true}]){
    await assert.rejects(generateHint({round,language:'en',makeModel,...opts}));}
  assert.equal(calls,0);
});
test('device session never intentionally falls back and rejects a claimed cloud result',async()=>{
  const options={round:newRound(lessons[0]),language:'en',mode:'device',settings:cfg,consent:true};
  let generated=false;
  await assert.rejects(generateHint({...options,makeModel:()=>({
    initializeDeviceModel:async()=>{throw Error('device unavailable');},generateContent:async()=>{generated=true;}
  })}),/device unavailable/);
  assert.equal(generated,false);
  await assert.rejects(generateHint({...options,makeModel:()=>({initializeDeviceModel:async()=>{},
    generateContent:async()=>({response:{inferenceSource:'in_cloud',text:()=> 'Unexpected'}})
  })}),/source/);
});
test('routing evidence comes from SDK response, including a fallback after unavailable device',async()=>{
  const round=newRound(lessons[0]); const base={round,language:'en',settings:cfg,consent:true,mode:'hybrid'};
  for(const source of ['on_device','in_cloud','unrecognized']){
    const makeModel=()=>({initializeDeviceModel:async()=>{if(source==='in_cloud')throw Error('unavailable');},generateContent:async(prompt)=>{assert.match(prompt,/adult in vocational training/);return {response:{inferenceSource:source,text:()=> 'Which two times will you compare?'}};}});
    const call=generateHint({...base,makeModel});
    if(source==='unrecognized')await assert.rejects(call,/source/);else assert.equal((await call).source,source);
  }
});
test('revoking permission during setup prevents prompt submission',async()=>{
  const controller=new AbortController();let ran=false;
  await assert.rejects(generateHint({round:newRound(lessons[0]),language:'en',settings:cfg,mode:'device',consent:true,signal:controller.signal,
    makeModel:()=>({initializeDeviceModel:async()=>controller.abort(),generateContent:async()=>{ran=true;}})}),/cancelled/);assert.equal(ran,false);
});
test('real installed SDK constructs the actual hybrid model without a network call',async()=>{
  const app=initializeApp(cfg.firebase,'test-real-model');
  try {const model=getGenerativeModel(getAI(app,{backend:new GoogleAIBackend()}),{mode:InferenceMode.PREFER_ON_DEVICE});
    assert.equal(typeof model.initializeDeviceModel,'function');assert.equal(typeof model.generateContent,'function');
  }finally{ await deleteApp(app); }
});

test('both allowed strategies always use the current question and its real log rows in either language',async()=>{
  for (const lesson of lessons) for (const language of ['en', 'de']) {
    const round = newRound(lesson);
    for (const q of lesson.questions) {
      for (const selection of ['A','B']) {
        const makeModel = () => ({
          initializeDeviceModel: async () => {},
          generateContent: async () => ({response:{inferenceSource:'on_device',text:() => selection}})
        });
        const guide = await generateHint({round,language,settings:{firebase:cfg.firebase},mode:'device',consent:true,makeModel});
        assert.equal(guide.kind,'model-selected');
        assert.equal(guide.selection,selection);
        assert.equal(guide.source,'on_device');
        assert.equal(guide.text,(selection === 'A' ? q.hint : q.alternateHint)[language]);
        assert.deepEqual(guide.rows,q.rows.map(i=>evidenceRow(lesson,i,language)));
      }
      choose(round,q.answer); advance(round);
    }
  }
});

test('generic coaching, invented readings, extra prose, missing text and unknown IDs use the written fallback',async()=>{
  const round = newRound(lessons[1]);
  for (const q of lessons[1].questions.slice(0,2)) { choose(round,q.answer); advance(round); }
  for (const language of ['de','en']) for (const source of ['on_device','in_cloud']) {
    for (const candidate of ['The south wall was 42 °C.', 'Was sehen Sie?', '15 min · 62 °C', 'B. Consider this.', '{"choice":"A"}', 'C', '', null, new Error('blocked')]) {
      const makeModel = () => ({
        initializeDeviceModel: async () => {},
        generateContent: async () => ({response:{inferenceSource:source,text:() => {
          if (candidate instanceof Error) throw candidate;
          return candidate;
        }}})
      });
      const result = await generateHint({round,language,settings:cfg,mode:'hybrid',consent:true,makeModel});
      const standard = coachGuide(round,language);
      assert.deepEqual(result,{...standard,source,kind:'editorial-invalid',selection:null});
      assert.match(result.text,language === 'en' ? /awaiting a reading/ : /ausstehend/);
      assert.ok(result.rows.every(row=>!row.startsWith('15 min')));
      assert.doesNotMatch(JSON.stringify(result),/Südwand|south wall|62 °C/i);
    }
  }
});
