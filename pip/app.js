const icons = {
  coffee:'<path d="M3 9h13v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zm13 1h2a3 3 0 0 1 0 6h-2M3 21h16M7 6c2-2-1-2 1-4m4 4c2-2-1-2 1-4"/>',
  bag:'<rect x="4" y="7" width="16" height="14" rx="4"/><path d="M8 8V6a4 4 0 0 1 8 0v2m-8 7h8"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  bell:'<path d="M5 16c2-2 2-5 2-7a5 5 0 0 1 10 0c0 2 0 5 2 7l1 1H4zm5 4q2 2 4 0"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  moon:'<path d="M19 16A8 8 0 0 1 9 5a8 8 0 1 0 10 11z"/>',
  pen:'<path d="m4 16 11-11 4 4L8 20l-5 1zM13 7l4 4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m3 0h3"/>',
  route:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 14v-3a3 3 0 0 1 3-3h2m7 1v3a3 3 0 0 1-3 3h-2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  cloud:'<path d="M6 18a4 4 0 1 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 1 1 1 9z"/>',
  rain:'<path d="M6 14a3.5 3.5 0 1 1 0-7 5 5 0 0 1 9-1 4 4 0 1 1 3 8H6zm2 3-1 2m6-2-1 3m6-3-1 2"/>',
  clip:'<path d="m9 14 7-7a2 2 0 0 1 3 3l-9 9a4 4 0 0 1-6-6L14 3"/>',
  home:'<path d="m2 11 10-8 10 8m-17-1v10h14V10m-9 10v-6h4v6"/>',
  bike:'<circle cx="5" cy="16" r="4"/><circle cx="19" cy="16" r="4"/><path d="m5 16 4-8 5 8H5m5-7h6l3 7m-4-12h2l1 5M7 6h4"/>',
  train:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 18l-3 4m11-4 3 4M8 15h1m6 0h1"/>'
};
function icon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const byId=id=>document.getElementById(id);
const plans={
  bike:{
    depart:'08:30',duration:'50 min',transport:'By bike',arrival:'09:20',ride:'Cycle to the office',note:'I’ve kept ten minutes between arrival and your first meeting.',
    route:'A 50-minute ride from Amsterdam West. Seven minutes to get ready, then wheels rolling at 08:30. The train works at Centraal won’t affect your ride.',
    coat:'Dry on the way in. Rain starts around 15:00, just in time for the ride home. Pop your raincoat in the pannier.',
    path:'M327 55 L305 68 277 65 250 81 228 84 211 78 190 90 165 93 149 110 127 105 106 111'
  },
  ov:{
    depart:'08:10',duration:'1 hr 10',transport:'Public transport',arrival:'09:20',ride:'Travel to the office',note:'The extra travel time is already in your diary preview.',
    route:'Walk to the stop (10 min), ride and change services (50 min, including the works), then walk to the office (10 min).',
    coat:'Your morning walk to the stop looks dry. Keep the umbrella handy for the walk back from the station after work.',
    path:'M327 55 L342 44 318 34 274 43 250 55 218 54 192 75 171 88 146 88 127 103 106 111'
  },
  home:{
    depart:'12:30',duration:'50 min',transport:'Midday cycle',arrival:'13:20',ride:'Cycle to the workshop',note:'Lunch fits at 12:00. Your first room booking is at 13:30.',
    route:'Start from home after lunch. A 50-minute cycle gets you to the office at 13:20, with ten minutes to park and find Room 2.',
    coat:'Leave the coat by the door for later. Your 12:30 ride looks dry, but you’ll want it when you cycle home after 15:00.',
    path:'M327 55 L305 68 277 65 250 81 228 84 211 78 190 90 165 93 149 110 127 105 106 111'
  }
};
const hours=[
  {time:'08:00',sky:'morning',type:'sun',temp:8,condition:'Sunny',greeting:'Morning'},
  {time:'12:00',sky:'cloudy',type:'cloud',temp:11,condition:'Cloudy',greeting:'Afternoon'},
  {time:'15:00',sky:'rain',type:'rain',temp:9,condition:'Light rain',greeting:'Afternoon'},
  {time:'17:00',sky:'dusk',type:'rain',temp:8,condition:'Evening drizzle',greeting:'Evening'},
  {time:'21:00',sky:'night',type:'moon',temp:6,condition:'Clear night',greeting:'Evening'}
];
const reminders = [
  {name:'Pack your work badge', when:'For the office door'},
  {name:'Bring the book for Mark', when:'Planning workshop · 13:30'},
  {name:'Reply to the team lunch poll', when:'By the end of the day'},
  {name:'Put the recycling out', when:'This evening · at home'},
  {name:'Pack your raincoat', when:'Rain on the return trip'}
];
const priorityViews = {coffee:'agenda', commute:'route', forgetting:'reminders'};
const panelTitles = {
  weather:'Out the window', reminders:'The little things', meetings:'Your meetings',
  timing:'Here’s my thinking', journey:'Your journey', notes:'Leave it with me', pip:'I’m listening, Bram.'
};
function readSaved() {
  try {
    const data = JSON.parse(localStorage.getItem('pip-desk-demo-v1'));
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}
const saved = readSaved();
let mode = Object.hasOwn(plans, saved.mode) ? saved.mode : 'bike';
// A fresh visit always starts at 08:00; the time preview is not a live clock.
let hour = hours[0];
let priority = Object.hasOwn(priorityViews, saved.priority) ? saved.priority : 'coffee';
let note = typeof saved.note === 'string' ? saved.note.slice(0,280) : '';
const completed = new Set(Array.isArray(saved.done) ? saved.done.filter(i => Number.isInteger(i) && i >= 0 && i < reminders.length) : []);
let middayMode = saved.middayMode === 'ov' ? 'ov' : 'bike';
let returnMode = ['bike','ov'].includes(saved.returnMode) ? saved.returnMode : null;
let expanded = false;
let panel = '';
let focusAfterClose = null;
const sheet = byId('sheet');
const desk = byId('desk');
const cards = Object.fromEntries(Array.from(desk.children, card => [card.classList[1],card]));
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function save() {
  try {
    localStorage.setItem('pip-desk-demo-v1', JSON.stringify({mode,middayMode,returnMode,time:hour.time,priority,done:[...completed],note}));
    return true;
  } catch { return false; }
}
function persist(){
  const stored=save();
  byId('storageStatus').textContent=stored?'':'Changes are kept for this visit only. Device storage is unavailable.';
  return stored;
}
function minutes(time) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RangeError('Invalid local time');
  const [h,m] = time.split(':').map(Number);
  return h*60 + m;
}
function clock(n) {
  return [Math.floor(n/60),n%60].map(value => String(value).padStart(2,'0')).join(':');
}
const fixture = {checkIn:570, checkInEnd:600, workshop:810, workshopEnd:900, returnAt:1020, ready:7, arrivalBuffer:10};
function outwardPlan() {
  const home=mode==='home', travelMode=home?middayMode:mode;
  const travel=travelMode==='ov'?70:50;
  const meeting=home?fixture.workshop:fixture.checkIn;
  const arrival=meeting-fixture.arrivalBuffer, departure=arrival-travel;
  const p={...plans[mode],travel,meeting,depart:clock(departure),arrival:clock(arrival),readyAt:departure-fixture.ready,duration:travel+' min'};
  if(home && travelMode==='ov') Object.assign(p,{transport:'Public transport',ride:'Travel to the workshop',route:'Leave home at '+p.depart+'. The 70-minute OV trip includes the Centraal works; arrive at '+p.arrival+' for Room 2 at 13:30.'});
  return p;
}
function coffeeWindow(){
  const p=outwardPlan(), now=minutes(hour.time);
  if(mode==='home' && now<fixture.checkIn) return {until:fixture.checkIn,label:'Teams at 09:30',detail:'Join from home. No setup allowance added; leave at '+p.depart+' for the workshop.'};
  if(now<=p.readyAt) return {until:p.readyAt,label:'shoes on at '+clock(p.readyAt),detail:'Seven minutes to get ready, '+p.travel+' minutes travelling, then ten minutes before '+clock(p.meeting)+'.'};
  if(now<minutes(p.depart)) return {until:now,label:'get ready now',detail:'Leave home at '+p.depart+' for '+clock(p.meeting)+'.'};
  if(now<minutes(p.arrival)) return {until:now,label:'your planned journey',detail:'Your planned departure was '+p.depart+'. Arrival is '+p.arrival+'; this preview does not track your location.'};
  if(now<fixture.checkInEnd) return {until:Math.max(now,fixture.checkIn),label:now<fixture.checkIn?'Teams at 09:30':'the check-in in progress',detail:'Team check-in ends at 10:00.'};
  if(now<720)return {until:720,label:'lunch at 12:00',detail:'Focus time is reserved until noon.'};
  if(now<fixture.workshop)return {until:fixture.workshop-fixture.arrivalBuffer,label:'workshop preparation at 13:20',detail:'Planning with Mark starts at 13:30 in Room 2.'};
  if(now<fixture.workshopEnd)return {until:now,label:'the workshop in progress',detail:'Planning with Mark ends at 15:00.'};
  if(now<fixture.returnAt)return {until:fixture.returnAt,label:'your planned trip home at 17:00',detail:'The workshop is finished. Rain is in the return forecast.'};
  return null;
}

function returnTransport(){return returnMode || (mode==='home'?middayMode:mode);}
function journey() {
  const p = outwardPlan();
  const travelBack=returnTransport();
  const outward = hour.time <= p.depart;
  const ended = hour.sky === 'night';
  if (outward) return {title:'Getting to work',travelMode:mode==='home'?middayMode:mode,duration:p.duration,depart:p.depart,arrival:p.arrival,from:'Home',to:'Office',reason:p.route,outward:true,ended:false};
  const duration = travelBack === 'ov' ? 70 : 50;
  const reason = ended ? 'Today’s planned route home is filed here. Tomorrow starts with a fresh look at your diary.' : travelBack === 'ov'
    ? 'Allow 70 minutes from door to door, including the change and the walk from your stop. Keep your umbrella within reach.'
    : 'Allow 50 minutes for the ride from the office to Amsterdam West. Your homeward ride is in the rainy part of the forecast.';
  return {title:ended?'Today’s journey':'Getting home',travelMode:travelBack,duration:plans[travelBack].duration,depart:'17:00',arrival:clock(17*60+duration),from:'Office',to:'Home',reason,outward:false,ended};
}
function dayEntries(){
  const p=outwardPlan(), home=mode==='home';
  const entries=[
    [p.depart,p.arrival,p.ride,p.transport+' · arrive '+p.arrival,'commute',p.route],
    ['09:30','10:00','Team check-in',home?'Teams · from home':'Teams · at the office','','Bring one update and one decision you need from the team. Your invitation includes Teams.'],
    ['10:00','12:00','Focus time',home?'Reporting draft · at home':'Reporting draft · at the office','focus','Two hours reserved for the reporting draft. Lunch follows at noon.'],
    ['12:00',home?p.depart:'13:00','Take lunch',home?'Before your journey':'Before the workshop','focus',home?'Lunch fits before you set off at '+p.depart+'.':'Your next room booking is at 13:30.'],
    ['13:30','15:00','Planning workshop','Room 2 · with Mark','room','Bring your reporting draft.'+(completed.has(1)?' Mark’s book is taken care of.':' Mark will be there if you have his book.')],
    ['17:00',returnTransport()==='ov'?'18:10':'17:50','Head home',returnTransport()==='ov'?'OV · 70 minutes':'By bike · 50 minutes','commute','Rain is in the forecast for this planned journey.']
  ];
  return entries.sort((a,b) => a[0].localeCompare(b[0]));
}
function weatherAdvice() {
  const travel=returnTransport()==='ov'?'walk from the stop':'ride home';
  if(hour.sky==='night')return 'Clear skies and six degrees. A coat for any late errands.';
  if(hour.type==='rain')return 'Rain for the '+travel+'. Your coat has earned its keep.';
  if(hour.sky==='cloudy')return 'Dry at lunch. Rain clocks in at 15:00, before your '+travel+'.';
  return mode==='ov'?'Dry walk to the stop. Pack an umbrella for the way back.':'Sunny ride in. Rainy ride home. Pannier, meet raincoat.';
}
function taskOrder() {
  if (hour.time >= '17:00') return [2,3,4,1,0];
  if (hour.time >= '15:00') return [4,2,3,1,0];
  if (hour.time >= outwardPlan().depart) return [1,2,4,3,0];
  return [0,1,4,2,3];
}
function relevantTasks(){
  if(hour.time>='17:00')return [2,3];
  if(hour.time>='15:00')return [4,2];
  if(hour.time>=outwardPlan().arrival)return [1,2];
  return [0,4,1];
}
function currentTasks() {
  const all=taskOrder().filter(i=>!completed.has(i));
  const relevant=relevantTasks();
  return all.filter(i=>relevant.includes(i));
}
function reminderAdvice(){
  const [first]=currentTasks();
  if (first===0) return 'Badge by the door. The office is oddly particular about introductions.';
  if (first===1) return 'You’ll see Mark at 13:30. Good day to return his book.';
  if (first===2) return 'The team lunch poll is due by the end of this sample day.';
  if (first===4) return hour.time>='15:00'?'Rain has arrived for your 17:00 trip home.':'Rain is due at 15:00, ahead of your trip home.';
  if (first===3) return 'Recycling tonight. A good one to pair with taking off your shoes.';
  return completed.size === reminders.length ? 'Everything ticked. The list has left the building.' : 'You’ve covered what matters for this part of the day.';
}
function priorityLabels() {
  if(hour.sky==='morning') return {coffee:'Finish my coffee',commute:'Get me to work',forgetting:'What am I forgetting?'};
  if(hour.sky==='cloudy')return {coffee:'Take a lunch break',commute:mode==='home'?'Get me to work':'Plan my ride home',forgetting:'What am I forgetting?'};
  if(hour.sky==='night')return {coffee:'Wind down',commute:'Review my journey',forgetting:'Anything for tonight?'};
  return {coffee:'Take a breather',commute:'Get me home',forgetting:'What am I forgetting?'};
}
function briefing() {
  const p=outwardPlan(), trip=journey();
  if(priority==='commute') {
    if(trip.ended) return ['Your travelling day is done.','Today’s route is here if you want to look back.','See journey','journey'];
    const title=trip.outward ? (trip.travelMode==='ov'?'Out the door at '+trip.depart+'.':'Wheels rolling at '+trip.depart+'.') : (trip.travelMode==='ov'?'Take the 17:00 trip home.':'Ride home at 17:00.');
    const detail=trip.outward && trip.travelMode==='ov' ? '70 minutes with the works at Centraal. You’ll still have ten minutes to settle in.' : trip.duration+' from '+trip.from.toLowerCase()+' to '+trip.to.toLowerCase()+'. '+(trip.outward?'Ten minutes spare when you arrive.':weatherAdvice());
    return [title,detail,'See journey','journey'];
  }
  if(priority==='forgetting') {
    const [first]=currentTasks();
    const title= first===undefined?'Your bases are covered.':({0:'Badge first. Coffee second is negotiable.',1:'Mark’s book wants a lift.',2:'One tiny lunch decision.',3:'The recycling has plans tonight.',4:returnTransport()==='ov'?'Give the umbrella a lift.':'Pannier, meet raincoat.'})[first];
    const detail= first===0 ? 'You need it for the office door before your '+outwardPlan().depart+' departure.' : first===1?'He’s in Room 2 at 13:30. Save yourself another round trip.': first===2?'The team lunch poll is due by the end of today.':first===4?(hour.time>='15:00'?'Rain is here for your 17:00 trip home.': 'It’s dry now, but rain is due at 15:00 for the trip home.'): first===3?'Take it out when you get home. The rest of the evening can be yours.':note?'You’ve also left me a note. I’ve kept it here.':'I’ll keep the rest of the list here for later.';
    return [title,detail,'See all reminders','reminders'];
  }
  const window=coffeeWindow();
  if(window){
    const spare=Math.max(0,window.until-minutes(hour.time));
    return [spare?spare+' min': 'Time to move.', (spare?'Until '+window.label+'. ': '')+window.detail,'Show my timing','timing'];
  }

  return hour.sky==='night'
    ? ['Your evening is yours.','The diary is clear. Park a stray thought with me if one turns up.','Leave a note','notes']
    : ['A dry seat sounds lovely.','Your planned trip home starts at 17:00 and takes '+trip.duration+'. Keep your coat handy.','Show my timing','timing'];
}
function taskCopy(i) {
  if(hour.time>='15:00' && i===1)return {name:'Mark’s book',when:'Workshop finished at 15:00 · review for another day'};
  if(hour.time>='15:00' && i===0)return {name:'Work badge',when:'Earlier office arrival · review'};
  if(hour.time>='21:00' && i===4)return {name:'Rain gear',when:'Earlier trip home · review'};
  if(i!==4)return reminders[i];
  return returnTransport()==='ov'?{name:'Pack an umbrella',when:'15:00 rain · evening walk from the stop'}:{name:'Pack your raincoat',when:'15:00 rain · evening ride home'};
}
function taskMarkup(indices) {
  return indices.map(i=>'<label class="task"><input type="checkbox" data-task="'+i+'" '+(completed.has(i)?'checked':'')+'><span>'+taskCopy(i).name+'<small>'+taskCopy(i).when+'</small></span></label>').join('');
}
function updateTasks() {
  byId('reminderHeading').textContent=hour.time>='17:00'?'For tonight':hour.time>='15:00'?'Before heading home':hour.time>=outwardPlan().arrival?'On your desk':'Before you go';
  byId('openCount').textContent=(reminders.length-completed.size)+' open';
  byId('badgeCount').textContent=reminders.length-completed.size;
  byId('reminderNote').textContent=reminderAdvice();
  const group = currentTasks();
  byId('tasks').innerHTML=taskMarkup(group) || '<p class="inner">Nothing else to pack for this part of the day. Completed items are in All reminders.</p>';
  byId('noteShortcut').textContent=note?'Read my note':'Leave Pip a note';
}
function updateScroll(node) {
  node.dataset.fadeTop=String(node.scrollTop>2);
  node.dataset.fadeBottom=String(node.scrollHeight-node.clientHeight-node.scrollTop>2);
}
const scrollers=[byId('diary'),byId('sheetBody')];
scrollers.forEach(node=>node.addEventListener('scroll',()=>updateScroll(node),{passive:true}));
if('ResizeObserver' in window){
  const observer=new ResizeObserver(entries=>entries.forEach(entry=>updateScroll(entry.target)));
  scrollers.forEach(el=>observer.observe(el));
}
function refreshFades(){requestAnimationFrame(()=>scrollers.forEach(updateScroll))}
function updateDiary(){
  const all=dayEntries(),upcoming=all.filter(item=>item[1]>hour.time);
  const visible=expanded?all:upcoming.length?upcoming.slice(0,3):all.slice(-2);
  byId('diary').innerHTML=visible.map(([time,end,title,sub,cls,note])=>'<div class="row"><span class="time">'+time+'</span><details class="event '+cls+'"><summary><b>'+title+'</b><small>'+(end<=hour.time?'Finished · ':'')+sub+'</small></summary><p>'+time+'–'+end+' · '+(end<=hour.time?'Earlier in this sample day.':note)+'</p></details></div>').join('');
  byId('diaryNote').textContent=upcoming.length ? (hour.time==='08:00'?outwardPlan().note:'Your next few hours, in order.') : 'All filed away for today.';
}
function updateRoute(){
  const p=outwardPlan(),trip=journey();
  byId('routeHeading').textContent=trip.title;
  byId('routeTitle').textContent=trip.outward?p.transport:trip.travelMode==='ov'?'Public transport':'By bike';
  byId('duration').textContent=trip.duration;
  byId('leaveLabel').textContent='Leave '+trip.from.toLowerCase();
  byId('leave').textContent=trip.depart;
  byId('routeNote').textContent=trip.reason;
  for (const id of ['track','trackHalo'])byId(id).setAttribute('d',plans[trip.travelMode].path);
  byId('track').setAttribute('stroke',trip.travelMode==='ov'?'#826387':'#477659');
  byId('track').setAttribute('stroke-dasharray',trip.travelMode==='ov'?'7 4':'none');
  document.querySelectorAll('[data-mode]').forEach(el=>{
    el.setAttribute('aria-pressed',String(el.dataset.mode===(hour.sky==='morning'?mode:trip.travelMode)));
    el.hidden=el.dataset.mode==='home' && hour.sky!=='morning';
    if(el.dataset.mode==='bike')el.lastChild.textContent=trip.outward?'Cycle in':'Cycle home';
  });
}
function updateDesk() {
  const primary=priorityViews[priority];
  const order=[primary,...Object.keys(cards).filter(key=>key!==primary)];
  for (const key of order) {
    const card=cards[key];
    card.hidden=!expanded && key!==primary;
    card.dataset.primary=String(key===primary);
    if(desk.children[order.indexOf(key)]!==card) desk.insertBefore(card,desk.children[order.indexOf(key)] || null);
  }
  desk.dataset.expanded=String(expanded);
  byId('restToggle').setAttribute('aria-expanded',String(expanded));
  byId('restToggle').textContent=expanded?'Back to my priority':'Show the rest of my day';
}
function setAnswer(){
  const [title,detail,label,target]=briefing();
  byId('answerTitle').textContent=title;
  byId('answerTitle').classList.toggle('time-value',priority==='coffee' && /^\d+ min$/.test(title));
  byId('answerDetail').textContent=detail;
  byId('answerAction').textContent=label;
  byId('answerAction').dataset.panel=target;
}
function render() {
  document.body.dataset.sky=hour.sky;
  document.body.dataset.priority=priority;
  byId('greeting').textContent=hour.greeting+', Bram.';
  byId('skyTime').textContent=hour.time;
  byId('headerWeather').innerHTML=icon(hour.type);
  byId('badgeTemp').textContent=hour.temp+'°';
  const remaining=dayEntries().filter(row=>(row[2]==='Team check-in'||row[2]==='Planning workshop') && row[1]>hour.time).length;
  byId('meetingCount').textContent=remaining;
  byId('meetingCount').parentElement.setAttribute('aria-label','Meetings, '+remaining+' remaining today');
  byId('memoTitle').textContent=priority==='forgetting'?reminderAdvice():priority==='commute'?briefing()[0]:hour.sky==='morning'?(mode==='home'?'Kettle on. Your '+clock(fixture.checkIn)+' is on Teams.':(mode==='ov'?'Travel mug today.':'Finish your coffee.')+' Shoes on in '+Math.max(0,outwardPlan().readyAt-minutes(hour.time))+' minutes.'):({morning:'First up, team check-in at 09:30.',cloudy:'Room 2 is yours at 13:30.',rain:'The workshop’s wrapped. Rain’s moved in.',dusk:'Your 17:00 trip home looks drizzly.',night:'The diary’s clear for the evening.'})[hour.sky];
  const labels=priorityLabels();
  document.querySelectorAll('[data-priority].priority-choice').forEach(button=>{
    button.querySelector('.choice-label').textContent=labels[button.dataset.priority];
    button.setAttribute('aria-pressed',String(button.dataset.priority===priority));
  });
  updateDiary();updateRoute();updateTasks();setAnswer();updateDesk();
  byId('weatherNote').textContent=weatherAdvice();
  byId('weather').innerHTML=hours.map(item=>'<div class="'+(item.type==='rain'?'wet':'')+'" data-current="'+(hour===item)+'" aria-label="'+item.time+', '+item.condition+', '+item.temp+' degrees Celsius"><small>'+item.time+'</small><i>'+icon(item.type)+'</i><b>'+item.temp+'°</b></div>').join('');
  refreshFades();
}
function sheetItem(title,sub,body='') {
  return '<div class="sheetitem"><b>'+title+'</b><small>'+sub+'</small>'+(body?'<p>'+body+'</p>':'')+'</div>';
}
function renderPanel() {
  const body=byId('sheetBody'), p=outwardPlan(), trip=journey();
  byId('sheetTitle').textContent=panelTitles[panel];
  if(panel==='weather'){
    body.innerHTML='<div class="weatherread">'+hour.temp+'° · '+hour.condition+'</div><p class="sheetnote">'+weatherAdvice()+'</p><div class="tiny">Try a time in this sample day</div><div class="times" role="group" aria-label="Preview time">'+hours.map(item=>'<button data-hour="'+item.time+'" aria-pressed="'+(hour===item)+'">'+item.time+'</button>').join('')+'</div>';
  }else if(panel==='meetings'){
    const meetings=dayEntries().filter(row=>row[2]==='Team check-in'||row[2]==='Planning workshop');
    const upcoming=meetings.filter(row=>row[1]>hour.time);
    const finished=meetings.filter(row=>row[1]<=hour.time);
    const lead=upcoming.length===2?'Two ahead. Only the workshop needs your actual shoes.':upcoming.length===1?'One to go. Your workshop is in Room 2.':'All done. You may retire your meeting face.';
    body.innerHTML='<p class="sheetnote">'+lead+'</p>'+[...upcoming,...finished].map(([time,end,title,where,,why])=>{
      const status=end<=hour.time?'Finished':time<=hour.time?'In progress':time===upcoming[0]?.[0]?'Next up':'Later';
      return sheetItem(time+'–'+end+' · '+title,status+' · '+where,end<=hour.time?'':why);
    }).join('');
  }else if(panel==='reminders'){
    const relevant=relevantTasks(), earlier=taskOrder().filter(i=>!relevant.includes(i));
    body.innerHTML='<p class="sheetnote">'+reminderAdvice()+'</p>'+taskMarkup(relevant)+'<details class="reminder-history"><summary>Other &amp; completed reminders</summary>'+taskMarkup(earlier)+'</details>'+'<button class="text-action" data-panel="notes">'+(note?'Read my note':'Leave a note')+'</button>';
  }else if(panel==='notes'){
    body.innerHTML='<p class="sheetnote">One thought for later. I’ll keep it on this device.</p><form class="note-form"><label for="scratchNote">My note</label><textarea id="scratchNote" name="note" maxlength="280" rows="3" placeholder="e.g. Ask Mark about Friday’s workshop"></textarea><button class="answer-action" type="submit">Save note</button></form>';
    byId('scratchNote').value=note;
  }else if(panel==='timing'){
    if(minutes(hour.time)<=outwardPlan().readyAt && !(mode==='home' && hour.sky==='morning')){
      const shoes=minutes(p.depart)-7;
      body.innerHTML='<p class="sheetnote">I worked backwards from your '+clock(p.meeting)+' meeting.</p>'+
        sheetItem(clock(shoes)+' · Shoes on','Seven minutes to get out the door')+
        sheetItem(p.depart+' · Leave home',p.duration+' of travel')+
        sheetItem(p.arrival+' · Arrive at the office','Ten minutes to settle in before '+clock(p.meeting)+'');
    }else{
      const explanation=hour.sky==='morning'?'Teams starts at 09:30 from home, with no added setup allowance. Get ready at '+clock(p.readyAt)+' for your '+p.depart+' departure to Room 2.':hour.sky==='night'?'Your last appointment ended at 15:00. Nothing else in the diary tonight.':byId('answerDetail').textContent;
      const upcoming=dayEntries().filter(row=>row[1]>hour.time).slice(0,3);
      body.innerHTML='<p class="sheetnote">'+explanation+'</p>'+upcoming.map(([start,end,title,where])=>sheetItem(start+'–'+end+' · '+title,where)).join('');
    }
  }else if(panel==='journey'){
    body.innerHTML='<p class="sheetnote">'+trip.reason+'</p>'+sheetItem(trip.depart+' · Leave '+trip.from.toLowerCase(),trip.duration+' door to door')+sheetItem(trip.arrival+' · Arrive '+(trip.outward?'at the office':'home'),trip.outward?'Ten minutes before the meeting':hour.sky==='night'?'Planned arrival':'Forecast at departure · drizzle')+
      '<button type="button" class="text-action" data-jump="route">Compare travel plans</button>';
  }else{
    body.innerHTML='<p class="sheetnote">What would help right now?</p><div class="pip-menu">'+Object.entries(priorityLabels()).map(([key,label])=>'<button type="button" class="text-action" data-pick="'+key+'">'+icon(key==='coffee'?'coffee':key==='commute'?'route':'bag')+label+'</button>').join('')+'<button class="text-action" data-panel="notes">'+icon('pen')+'Leave a note</button></div>';
  }
  body.scrollTop=0;
  refreshFades();
}
let motionTimer;
function acknowledge(){
  if(prefersReducedMotion.matches)return;
  clearTimeout(motionTimer);
  const elements=[desk,byId('answer'),document.querySelector('.orbwrap')];
  elements.forEach(el=>el.classList.remove('is-changing'));
  void desk.offsetWidth;
  elements.forEach(el=>el.classList.add('is-changing'));
  motionTimer=setTimeout(()=>elements.forEach(el=>el.classList.remove('is-changing')),520);
}
function selectPriority(next){
  if(!Object.hasOwn(priorityViews,next))return;
  if(priority===next)return;
  priority=next;
  expanded=false;
  persist();render();acknowledge();
}
function showPanel(target,trigger) {
  if(!Object.hasOwn(panelTitles,target) || sheet.classList.contains('closing'))return;
  const wasOpen=sheet.open;
  if(!wasOpen)focusAfterClose=trigger;
  panel=target;renderPanel();
  if(!wasOpen)sheet.showModal();
  else byId('dismiss').focus({preventScroll:true});
  refreshFades();
}
let exitTimer;
function closePanel(){
  if(!sheet.open || sheet.classList.contains('closing'))return;
  if(prefersReducedMotion.matches){sheet.close();return;}
  sheet.classList.add('closing');
  exitTimer=setTimeout(()=>{if(sheet.open)sheet.close()},185);
}
sheet.addEventListener('animationend',event=>{
  if(event.target===sheet && sheet.classList.contains('closing'))sheet.close();
});
sheet.addEventListener('cancel',event=>{event.preventDefault();closePanel()});
// Keep keyboard navigation inside the sheet, including reverse Tab at its edge.
sheet.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...sheet.querySelectorAll('button,input,textarea,summary,[tabindex="0"]')]
    .filter(el=>!el.disabled && el.getClientRects().length);
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
});
sheet.addEventListener('close',()=>{
  clearTimeout(exitTimer);
  panel='';
  sheet.classList.remove('closing');
  if(focusAfterClose?.isConnected && !focusAfterClose.closest('[hidden]'))focusAfterClose.focus({preventScroll:true});
  focusAfterClose=null;
});
byId('dismiss').addEventListener('click',closePanel);
document.addEventListener('click',event=>{
  if(event.target===sheet){
    const r=sheet.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();
    return;
  }
  const button=event.target.closest('button');
  if(!button)return;
  if(button.dataset.priority){selectPriority(button.dataset.priority);return;}
  if(button.dataset.mode){
    if(button.getAttribute('aria-pressed')==='true')return;
    if(hour.sky==='morning'){
      mode=button.dataset.mode;
    }else if(journey().outward){
      middayMode=button.dataset.mode;
    }else{
      returnMode=button.dataset.mode;
    }
    persist();render();acknowledge();
    return;
  }
  if(button.dataset.panel){showPanel(button.dataset.panel,button);return;}
  if(button.dataset.hour){
    hour=hours.find(item=>item.time===button.dataset.hour)||hours[0];
    persist();render();acknowledge();closePanel();return;
  }
  if(button.dataset.pick || button.dataset.jump){
    const target=button.dataset.pick||'commute';
    selectPriority(target);
    focusAfterClose=document.querySelector('.priority-choice[data-priority="'+target+'"]');
    if(button.dataset.jump)focusAfterClose=document.querySelector('.modes button[aria-pressed="true"]');
    closePanel();
    if(button.dataset.jump)desk.scrollIntoView({behavior:prefersReducedMotion.matches?'instant':'smooth',block:'nearest'});
    return;
  }
  if(button.id==='restToggle'){
    expanded=!expanded;
    render();acknowledge();
    if(!expanded)document.querySelector('.priority-choice[aria-pressed="true"]').focus();
  }
});
document.addEventListener('change',event=>{
  if(!event.target.matches('[data-task]'))return;
  const i=Number(event.target.dataset.task);
  if(event.target.checked)completed.add(i);else completed.delete(i);
  persist();updateTasks();setAnswer();updateDiary();
  if(priority==='forgetting')byId('memoTitle').textContent=reminderAdvice();
  if(panel)renderPanel();
  (panel?sheet:byId('tasks')).querySelector('[data-task="'+i+'"]')?.focus({preventScroll:true});
  if(!panel && !byId('tasks').querySelector('[data-task="'+i+'"]')) (byId('tasks').querySelector('input') || document.querySelector('.note-preview button')).focus({preventScroll:true});
  refreshFades();
});
document.addEventListener('submit',event=>{
  if(!event.target.matches('.note-form'))return;
  event.preventDefault();
  note=byId('scratchNote').value.slice(0,280);
  const stored=persist();
  acknowledge();
  updateTasks();setAnswer();
  const status=stored?(note?'Saved on this device. Find it in My note.':'Your note has been cleared.'):'Kept for this visit. Device storage is unavailable.';
  byId('sheetBody').innerHTML='<p class="sheetnote" role="status"></p><button class="answer-action" type="button" id="noteDone">Done</button>';
  byId('sheetBody').querySelector('p').textContent=status;
  byId('noteDone').addEventListener('click',closePanel);
  byId('noteDone').focus();
});
byId('diary').addEventListener('toggle',refreshFades,true);
render();
