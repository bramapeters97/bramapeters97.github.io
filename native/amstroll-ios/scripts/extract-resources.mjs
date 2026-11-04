import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=process.argv.indexOf('--sharp-module');
const require=createRequire(import.meta.url);
const sharp=require(arg>=0?process.argv[arg+1]:'sharp');
const html=fs.readFileSync(path.join(root,'References/web-prototype.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const context=vm.createContext({window:{}});
vm.runInContext(scripts[1],context);vm.runInContext(scripts[2],context);
const assets=context.window.AmstrollAssets,catalog=context.window.AmstrollCatalog;
const resources=path.join(root,'Amstroll/Resources');
const xcassets=path.join(resources,'Assets.xcassets');
fs.mkdirSync(xcassets,{recursive:true});
const writeJSON=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const info={author:'xcode',version:1};writeJSON(path.join(xcassets,'Contents.json'),{info});
writeJSON(path.join(resources,'catalogue.json'),catalog);
const metadata={},manifest=[];
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [key,photo] of Object.entries(assets.photos)){
 const data=photo.src.match(/^data:image\/(\w+);base64,(.+)$/s);if(!data)throw Error('Photo is not embedded: '+key);
 const bytes=Buffer.from(data[2],'base64');if(bytes.length<100)throw Error('Invalid photo '+key);
 const name='photo-'+key,dir=path.join(xcassets,name+'.imageset');fs.mkdirSync(dir,{recursive:true});
 const png=await sharp(bytes).png().toBuffer();const dimension=await sharp(png).metadata();
 fs.writeFileSync(path.join(dir,name+'.png'),png);
 writeJSON(path.join(dir,'Contents.json'),{images:[{filename:name+'.png',idiom:'universal'}],info});
 const {src,...details}=photo;metadata[key]={...details,imageName:name,url:name,sourceURL:photo.source,licenseURL:photo.licenseUrl,nativeChanges:'Extracted embedded WebP and converted to PNG without resampling for native assets; display crops may vary.'};
 manifest.push({key,file:'Assets.xcassets/'+name+'.imageset/'+name+'.png',sha256:digest(png),width:dimension.width,height:dimension.height,source:photo.source,credit:photo.credit,license:photo.license,licenseURL:photo.licenseUrl,changes:photo.changes,nativeChanges:'Extracted embedded WebP and converted to PNG without resampling for native assets; display crops may vary.',areaContext:!!photo.areaContext});
}
for(const [name,svg]of [['AmstrollLogo',assets.logoSvg],['AmstrollWordmark',assets.wordmarkSvg]]){
 const dir=path.join(xcassets,name+'.imageset');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.svg'),svg);
 writeJSON(path.join(dir,'Contents.json'),{images:[{filename:name+'.svg',idiom:'universal'}],info,properties:{'preserves-vector-representation':true}});
}
// Original mark is drawn as supplied SVG paths; no redrawing or generated text.
const iconSVG=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#F8F3DE"/><stop offset="1" stop-color="#DDE8D7"/></linearGradient></defs><path fill="url(#bg)" d="M0 0h1024v1024H0z"/><g fill="none" transform="translate(144 146) scale(11.5)">${assets.logoSvg.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>[\s\S]*$/,'')}</g></svg>`;
const iconDir=path.join(xcassets,'AppIcon.appiconset');fs.mkdirSync(iconDir,{recursive:true});
const icon=await sharp(Buffer.from(iconSVG)).resize(1024,1024).flatten({background:'#F7F4EF'}).removeAlpha().png().toBuffer();
fs.writeFileSync(path.join(iconDir,'AppIcon.png'),icon);fs.writeFileSync(path.join(root,'AppStore/Amstroll-AppIcon-1024.png'),icon);fs.writeFileSync(path.join(root,'AppStore/Amstroll-AppIcon-source.svg'),iconSVG);
writeJSON(path.join(iconDir,'Contents.json'),{images:[{filename:'AppIcon.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info});
writeJSON(path.join(resources,'photos.json'),metadata);
writeJSON(path.join(resources,'asset-manifest.json'),{sourceRevision:'27084d4',sourcePrototypeSHA256:digest(Buffer.from(html)),extractedAt:'2026-11-04',photographs:manifest,icon:{file:'AppStore/Amstroll-AppIcon-1024.png',sha256:digest(icon),origin:'Derived from supplied original Amstroll SVG mark; square opaque background, no rounded mask'},fonts:['PlusJakartaSans-variable.ttf','DMSans-variable.ttf']});
// Copy original licensed fonts and source notices byte-for-byte from reference revision.
for(const [source,destination]of [['assets/amstroll/fonts/DMSans-variable.ttf','DMSans-variable.ttf'],['assets/amstroll/fonts/PlusJakartaSans-variable.ttf','PlusJakartaSans-variable.ttf'],['assets/amstroll/fonts/DMSans-OFL.txt','DMSans-OFL.txt'],['assets/amstroll/fonts/PlusJakartaSans-OFL.txt','PlusJakartaSans-OFL.txt'],['assets/amstroll/photo-credits.md','Photo-Credits.md'],['assets/amstroll/FONT-LICENSES.md','Font-Licenses.md']]){
 const target=path.join(resources,destination);
 if(fs.existsSync(target)&&fs.statSync(target).size>100)continue;
 fs.writeFileSync(target,execFileSync('git',['show','27084d4:'+source],{maxBuffer:10e6}));
}
console.log(`Extracted ${catalog.places.length} places, ${catalog.experiences.length} experiences, ${catalog.starts.length} starts, ${manifest.length} valid photo assets, fonts, vectors and opaque 1024px app icon.`);
