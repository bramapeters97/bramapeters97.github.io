// node scripts/check-pip.mjs --dom-module /absolute/path/to/jsdom/lib/api.js
// DOM regression tests; browser layout/focus checks are documented in pip/TESTING.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const flag=process.argv.indexOf('--dom-module');
if(flag<0) throw Error('Supply --dom-module pointing to jsdom/lib/api.js');
const {JSDOM}=require(process.argv[flag+1]);
const html=fs.readFileSync(new URL('../pip/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../pip/app.js',import.meta.url),'utf8');
let checks=0;
function boot(saved,blocked=false){
  const dom=new JSDOM(html,{url:'http://localhost/pip/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.matchMedia=()=>({matches:true});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
  if(saved!==undefined)w.localStorage.setItem('pip-desk-demo-v1',typeof saved==='string'?saved:JSON.stringify(saved));
  if(blocked)Object.defineProperty(w,'localStorage',{get(){throw Error('Storage blocked')}});
  w.eval(js);
  const $=s=>w.document.querySelector(s);
  const click=s=>{assert.ok($(s),s);$(s).click()};
  const time=t=>{click('[data-panel="weather"]');click('[data-hour="'+t+'"]')};
  return {dom,w,$,click,time};
}
{
  const {dom,w,$,click,time}=boot();
  assert.equal($('#answerTitle').textContent,'23 min');
  assert.match($('#memoTitle').textContent,/Shoes on in 23 minutes/);
  click('[data-mode="ov"]');assert.equal($('#answerTitle').textContent,'3 min');
  assert.match($('#answerDetail').textContent,/08:03.*70 minutes/);
  click('[data-mode="home"]');assert.equal($('#answerTitle').textContent,'90 min');
  click('#answerAction');assert.match($('#sheetBody').textContent,/no added setup allowance/);click('#dismiss');
  time('12:00');assert.equal($('#answerTitle').textContent,'23 min');
  click('[data-mode="ov"]');assert.equal($('#answerTitle').textContent,'3 min');
  assert.equal($('#leave').textContent,'12:10');
  click('#answerAction');assert.match($('#sheetBody').textContent,/12:03.*12:10.*13:20/s);click('#dismiss');
  for(const t of ['08:00','12:00','15:00','17:00','21:00']){
    time(t);
    for(const p of ['coffee','commute','forgetting']){
      click('[data-priority="'+p+'"]');
      assert.equal(w.document.querySelectorAll('.priority-choice[aria-pressed="true"]').length,1);
      assert.equal(w.document.querySelectorAll('.card:not([hidden])').length,1);
      const text=$('#answer').textContent;
      assert.doesNotMatch(text,/-\d+ min/);
      if(t>='15:00')assert.doesNotMatch(text,/book|13:30|09:30|08:10|08:30/);
      const before=$('#desk').innerHTML;click('[data-priority="'+p+'"]');assert.equal($('#desk').innerHTML,before);
      assert.equal($('#skyTime').textContent,t);
      assert.equal($('#weather [data-current="true"]').getAttribute('aria-label').slice(0,5),t);
      checks++;
    }
  }
  time('08:00');click('[data-priority="forgetting"]');
  for(const id of [0,1,4]){click('#tasks [data-task="'+id+'"]');assert.equal($('#tasks [data-task="'+id+'"]'),null)}
  assert.equal($('#answerTitle').textContent,'Your bases are covered.');
  click('[data-panel="reminders"]');click('#sheet [data-task="1"]');
  assert.match($('#sheetBody').textContent,/Mark/);click('#dismiss');
  assert.match($('#answerTitle').textContent,/Mark/);
  click('.rest-control [data-panel="notes"]');
  const note='  <img src=x onerror=alert(1)> & "coffee"\nLater.  ';
  $('#scratchNote').value=note;
  $('.note-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.match($('#sheetBody').textContent,/Find it in My note/);click('#noteDone');
  const state=w.localStorage.getItem('pip-desk-demo-v1');
  const loaded=boot(state);loaded.click('.rest-control [data-panel="notes"]');
  assert.equal(loaded.$('#scratchNote').value,note);assert.equal(loaded.$('#sheet img'),null);
  assert.equal(loaded.$('.priority-choice[aria-pressed="true"]').dataset.priority,'forgetting');
  assert.equal(loaded.$('[data-mode="home"]').getAttribute('aria-pressed'),'true');
  loaded.dom.window.close();dom.window.close();checks+=10;
}
for(const saved of ['{broken','null','[]',JSON.stringify({mode:'<bad>',done:[-1,99,'0'],note:42,priority:'bad'})]){
  const a=boot(saved);assert.equal(a.$('#answerTitle').textContent,'23 min');a.dom.window.close();checks++;
}
{
  const a=boot(undefined,true);a.click('.rest-control [data-panel="notes"]');a.$('#scratchNote').value='not persisted';
  a.$('.note-form').dispatchEvent(new a.w.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(a.$('#sheetBody').textContent,/storage is unavailable/);
  assert.doesNotMatch(a.$('#sheetBody').textContent,/saved on this device/i);a.dom.window.close();checks++;
}
for(const mode of ['bike','ov','home']){
  const a=boot({mode});
  for(const t of ['08:00','12:00','15:00','17:00','21:00']){
    a.time(t);
    for(const p of ['coffee','commute','forgetting']){
      a.click('[data-priority="'+p+'"]');
      assert.equal(a.$('.priority-choice[aria-pressed="true"]').dataset.priority,p);
      assert.equal(a.w.document.querySelectorAll('.card:not([hidden])').length,1);
      assert.doesNotMatch(a.$('#answer').textContent,/-\d+ min/);
      if(t>='15:00')assert.doesNotMatch(a.$('#answer').textContent,/13:30|09:30|08:30|08:10|book/);
      if(t==='21:00')assert.equal(a.$('#meetingCount').textContent,'0');
      checks++;
    }
  }
  a.dom.window.close();
}
console.log('PASS Pip: '+checks+' state, timing, completion, migration and note/storage checks');
