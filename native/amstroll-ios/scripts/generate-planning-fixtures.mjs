// Regenerate expected native results from the preserved original JavaScript planner.
// Run: node scripts/generate-planning-fixtures.mjs (from native/amstroll-ios).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const context=vm.createContext({window:{},Date,Intl,Map,Set});
for(const index of [2,3])vm.runInContext(fs.readFileSync(path.join(root,`References/script-${index}.js`),'utf8'),context);
const catalog=context.window.AmstrollCatalog,domain=context.window.AmstrollDomain;
const now='2026-11-03T14:00:00Z';
const defaults={minutes:47,start:'central',endpoint:'none',mood:'any',transport:'walk',budget:20,walking:45,strictBudget:false};
const cases=[
 ['zero','jordaan-pocket',{minutes:0}],
 ['default','centre-first-light',{}],
 ['cycle-return','jordaan-quiet',{minutes:720,transport:'cycle',endpoint:'start'}],
 ['ferry','noord-waterfront',{minutes:240,walking:90}],
 ['ferry-fixture','noord-waterfront',{minutes:240,walking:90},{demoFerry:true}],
 ['strict-unknown','jordaan-coffee',{minutes:240,strictBudget:true}],
 ['known-zero-budget','centre-old-stones',{minutes:240,budget:0}],
 ['endpoint','jordaan-pocket',{minutes:240,endpoint:'central'}],
 ['ns-return','ns-haarlem-halfday',{minutes:720,walking:90}],
 ['tinywalk','centre-first-light',{minutes:720,walking:0}],
 ['transit','pijp-green',{minutes:240,transport:'transit'}]
];
const fixtures=cases.map(([name,id,patch,context={}])=>{
 const prefs={...defaults,...patch},p=domain.plan(id,prefs,{now,...context});
 return {name,id,prefs,context,expected:{total:p.total,travelMinutes:p.travelMinutes,walking:p.walking,waiting:p.waiting,cost:p.cost,knownCost:p.knownCost,status:p.status,minimumMinutes:p.minimumMinutes,endpointTravel:p.endpointTravel,stopIds:p.stops.map(stop=>stop.id)}};
});
const suggestions=[0,47,720].map(minutes=>({prefs:{...defaults,minutes},ids:domain.suggest({...defaults,minutes},{now,limit:20}).map(plan=>plan.id)}));
const folder=path.join(root,'AmstrollTests/Fixtures');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'nativePlanningFixtures.json'),JSON.stringify({now,fixtures,suggestions},null,2));
fs.writeFileSync(path.join(folder,'catalogue.json'),JSON.stringify(catalog,null,2));
console.log(`Generated ${fixtures.length} planning and ${suggestions.length} ordering fixtures from the original JavaScript`);
