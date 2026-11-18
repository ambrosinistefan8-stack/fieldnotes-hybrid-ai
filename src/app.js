import { lessons } from './lessons.js';
import { newRound, questionFor, choose, advance, reviewMisses, coachGuide } from './recall.js';
import { configured, generateHint } from './hybrid.js';

const labels = {
  en: {language:'Language',lesson:'Work setting',field:'Professional development · Shift handover',data:'Shift log',table:'Temperature readings',minutes:'Minutes',synth:'Simulated readings for workplace training.',round:'Handover question',revisit:'Revisit',correct:'Yes. ',wrong:'Try again. ',show:'Show evidence',hide:'Hide evidence',next:'Next question',finish:'Finish round',again:'Start again',review:'Practise missed questions',done:'Round complete',reviewDone:'Review complete',score:(n,m)=>n+' of '+m+' correct on your first attempt.',retryEnd:'You have revisited each question you missed.',none:'Every question was correct on the first attempt.',miss:n=>n+' to revisit.',hint:'Optional AI coaching',unconfigured:'Firebase is not configured in this local copy. The evidence and practice rounds work on this device.',aiCopy:'Send this example, the question and your selected option to a device-first AI coach. Firebase can use the cloud if the device model is unavailable.',consent:'Allow cloud fallback for this question.',ask:'Generate a coaching question',wait:'Preparing the model…',aiError:'No AI hint was returned. Use Show evidence or try again.',device:'AI · On device',cloud:'AI · Cloud fallback',evidence:'Look at these readings',ready:'Ready',source:'No AI was called for this guidance.'},
  de: {language:'Sprache',lesson:'Arbeitsbereich',field:'Berufliche Weiterbildung · Schichtübergabe',data:'Schichtprotokoll',table:'Temperaturmessungen',minutes:'Minuten',synth:'Fiktive Messwerte für die berufliche Weiterbildung.',round:'Übergabefrage',revisit:'Wiederholung',correct:'Richtig. ',wrong:'Prüfen Sie die Messwerte noch einmal. ',show:'Messwerte zeigen',hide:'Messwerte ausblenden',next:'Nächste Frage',finish:'Runde beenden',again:'Neu beginnen',review:'Schwierige Fragen wiederholen',done:'Runde abgeschlossen',reviewDone:'Wiederholung abgeschlossen',score:(n,m)=>n+' von '+m+' Fragen beim ersten Versuch richtig.',retryEnd:'Sie haben alle schwierigen Fragen noch einmal bearbeitet.',none:'Alle Antworten waren beim ersten Versuch richtig.',miss:n=>n+' zum Wiederholen.',hint:'Optionaler KI-Lernhinweis',unconfigured:'Firebase ist in dieser lokalen Kopie nicht eingerichtet. Messwerte und Lernrunden funktionieren auf diesem Gerät.',aiCopy:'Der KI-Lernhelfer erhält das Beispiel, die Frage und die gewählte Antwort. Firebase bevorzugt das Gerät und kann bei fehlendem Gerätemodell die Cloud verwenden.',consent:'Cloud-Ausweichweg für diese Frage erlauben.',ask:'KI-Lernfrage erzeugen',wait:'Modell wird vorbereitet …',aiError:'Kein KI-Hinweis verfügbar. Öffne die Messwerte oder versuche es erneut.',device:'KI · Auf dem Gerät',cloud:'KI · Cloud-Ausweichweg',evidence:'Diese Messwerte belegen den Eintrag',ready:'Bereit',source:'Dieser Hinweis stammt aus dem Lernheft.'}
};
const $ = id => document.getElementById(id);
const coachLabels = {
  en: {
    title: 'Coach for this question', ask: 'Ask AI to choose a coaching step',
    handbook: 'Workplace handbook · No AI requested.',
    selected: 'The model selected this handbook step.',
    invalid: 'The model returned no valid selection. Showing the standard handbook step.',
    unavailable: 'No usable model result. Showing the standard handbook step.',
    step: 'Next step', rows: 'Evidence from the shift log'
  },
  de: {
    title: 'Lernhilfe zu dieser Frage', ask: 'KI einen Lernschritt auswählen lassen',
    handbook: 'Lernheft · Kein KI-Hinweis angefordert.',
    selected: 'Das Modell hat diesen Lernschritt aus dem Lernheft ausgewählt.',
    invalid: 'Das Modell lieferte keine gültige Auswahl. Angezeigt wird der Standardschritt aus dem Lernheft.',
    unavailable: 'Kein verwertbares Modellergebnis. Angezeigt wird der Standardschritt aus dem Lernheft.',
    step: 'Nächster Schritt', rows: 'Beleg aus dem Schichtprotokoll'
  }
};
const params = new URLSearchParams(location.search);
let language = params.get('lang') === 'de' ? 'de' : 'en';
let round = newRound(lessons[0]);
let evidence = false;
let request;
let generated;
const settings = window.FIELDNOTES_SETTINGS;
const testMode = ['127.0.0.1','localhost','[::1]'].includes(location.hostname) ? FIELDNOTES_BUILD_MODE : 'offline';
const available = testMode !== 'offline' && configured(settings, testMode);
const el = (tag,text) => { const node = document.createElement(tag); node.textContent = text; return node; };
function clearHint() {
  request?.abort(); request = null; generated = null;
  $('consent').checked = false; $('aiBox').open = false;
}
function guideElements(guide, labels) {
  const step = el('p', guide.text);
  step.className = 'coach-step';
  const list = el('ul', '');
  for (const row of guide.rows) list.append(el('li', row));
  return [el('strong', labels.step), step, el('strong', labels.rows), list];
}
function renderCoach(question, t) {
  const box = $('aiStatus'), c = coachLabels[language];
  box.replaceChildren();
  delete box.dataset.inferenceSource;
  delete box.dataset.guideKind;
  delete box.dataset.selection;
  if (!question || round.solved) return;
  const guide = generated?.rows ? generated : coachGuide(round, language);
  const kind = generated?.kind || 'handbook';
  const route = generated?.source;
  const origin = route === 'on_device' ? t.device : route === 'in_cloud' ? t.cloud : '';
  const explanation = request ? t.wait : kind === 'model-selected' ? c.selected :
    kind === 'editorial-invalid' ? c.invalid : kind === 'editorial-error' ? c.unavailable : c.handbook;
  if (route) box.dataset.inferenceSource = route;
  if (generated?.selection) box.dataset.selection = generated.selection;
  box.dataset.guideKind = request ? 'pending' : kind;
  const status = el('p', [origin, explanation].filter(Boolean).join(' · '));
  status.className = 'coach-source';
  box.append(status, ...guideElements(guide, c));
}
function render() {
  const t=labels[language], lesson=round.lesson, q=questionFor(round);
  document.documentElement.lang=language;
  $('language').value=language;
  for (const [id,key] of Object.entries({langLabel:'language',lessonLabel:'lesson',field:'field',dataLabel:'data',tableTitle:'table',caption:'table',synthetic:'synth',aiTitle:'hint',consentLabel:'consent',ask:'ask',review:'review',restart:'again'})) $(id).textContent=t[key];
  $('lesson').replaceChildren(...lessons.map(l=>{const o=el('option',l.title[language]);o.value=l.id;o.selected=l===lesson;return o;}));
  $('title').textContent=lesson.title[language];
  $('intro').textContent=lesson.intro[language];
  const head=el('tr','');
  for(const name of [t.minutes,...lesson.series.map(s=>s[language]+' (°C)')]) { const th=el('th',name);th.scope='col';head.append(th); }
  $('head').replaceChildren(head);
  $('rows').replaceChildren(...lesson.rows.map((values,i)=>{const row=el('tr','');if(evidence&&q?.rows.includes(i))row.className='mark';for(const val of values)row.append(el('td',val));return row;}));
  const max=Math.max(...lesson.rows.flatMap(row=>row.slice(1)));
  $('chart').replaceChildren(...lesson.rows.map(row=>{
    const group=el('div',''), pair=el('div','');pair.className='barPair';
    for(const val of row.slice(1)){const bar=el('i','');bar.style.height=(val/max*96)+'%';pair.append(bar);}
    group.append(pair,el('small',row[0]+' min'));return group;
  }));
  const legend=el('div','');legend.className='legend';
  for(const s of lesson.series)legend.append(el('span',s[language]));
  $('chart').append(legend);
  $('progress').textContent=(round.review?t.revisit:t.round)+' · '+(q?(round.position+1)+' / '+round.order.length:round.order.length+' / '+round.order.length);
  $('question').textContent=q?q.ask[language]:round.review?t.reviewDone:t.done;
  $('answers').replaceChildren();
  if(q) q.options.forEach((value,i)=>{
    const button=el('button',''), symbol=el('span',String.fromCharCode(65+i));
    symbol.setAttribute('aria-hidden','true');button.append(symbol,document.createTextNode(value[language]));
    if(round.selected===i)button.className=round.solved?'correct':'chosen';
    button.disabled=round.solved;
    button.addEventListener('click',()=>{
      choose(round,i); clearHint(); render();
      if(round.solved) $('next').focus(); else $('answers').children[i]?.focus();
    }); $('answers').append(button);
  });
  $('feedback').textContent=q?(round.selected===null?'':round.solved?t.correct+q.why[language]:t.wrong+q.hint[language]):round.review?t.retryEnd:t.score(round.firstTry,lesson.questions.length)+' '+(round.needsReview.length?t.miss(round.needsReview.length):t.none);
  $('evidence').hidden=!q||!evidence; $('evidence').replaceChildren();
  if(q&&evidence) $('evidence').append(...guideElements(coachGuide(round,language),coachLabels[language]));
  $('evidenceBtn').hidden=!q;$('evidenceBtn').textContent=evidence?t.hide:t.show;$('evidenceBtn').setAttribute('aria-expanded',String(Boolean(evidence&&q)));
  $('next').hidden=!q||!round.solved;$('next').textContent=round.position+1===round.order.length?t.finish:t.next;
  $('review').hidden=!!q||round.review||!round.needsReview.length;$('restart').hidden=!!q;
  $('aiBox').hidden=!q||round.solved;
  const testCopy = language==='de'
    ? {offline:'Die Übungen laufen offline. Im getrennten, privaten Testmodus können eingeladene Erwachsene einen KI-Hinweis erproben.', device:'Privater Gerätetest für eingeladene Erwachsene. Modellanfragen an die Cloud sind gesperrt.',confirm:'Für diese Frage einen Hinweis auf diesem Gerät anfordern.'}
    : {offline:'The exercises run offline. Invited adults can try AI hints in a separate private test program.', device:'Private on-device test for invited adults. Cloud model requests are blocked.',confirm:'Request a hint on this device for this question.'};
  $('aiCopy').textContent=testMode==='offline'?testCopy.offline:!available?t.unconfigured:testMode==='device'?testCopy.device:t.aiCopy;
  $('aiTitle').textContent=coachLabels[language].title;
  $('ask').textContent=coachLabels[language].ask;
  $('consentLabel').textContent=testMode==='device'?testCopy.confirm:t.consent;
  $('consentLine').hidden=!available;$('ask').hidden=!available;$('ask').disabled=!$('consent').checked||!!request;
  renderCoach(q,t);
}
$('language').addEventListener('change',e=>{language=e.target.value;clearHint();render();});
$('lesson').addEventListener('change',e=>{round=newRound(lessons.find(l=>l.id===e.target.value));evidence=false;clearHint();render();});
$('next').onclick=()=>{advance(round);evidence=false;clearHint();render();$('question').focus();};
$('review').onclick=()=>{reviewMisses(round);evidence=false;clearHint();render();$('question').focus();};
$('restart').onclick=()=>{round=newRound(round.lesson);evidence=false;clearHint();render();$('question').focus();};
$('evidenceBtn').onclick=()=>{evidence=!evidence;render();};
$('consent').onchange=()=>{if(!$('consent').checked){request?.abort();request=null;generated=null;}render();};
$('ask').onclick=async()=>{
  const consent=$('consent').checked;
  if(!consent||!available||request)return;
  const controller=new AbortController();request=controller;generated=null;render();
  try {
    const result=await generateHint({round,language,settings,mode:testMode,consent,signal:controller.signal});
    if(request===controller)generated=result;
  } catch { if(request===controller)generated={kind:'editorial-error'}; }
  if(request===controller){request=null;render();}
};
render();
