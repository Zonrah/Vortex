// Bounded public metadata probe. Never GETs publication images.
import vm from 'node:vm';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const allowed=new Set(['vortexscans.org','api.vortexscans.org','storage.vortexscans.org']);let requests=0;
function permit(url){const u=new URL(url);assert.equal(u.protocol,'https:');assert.ok(allowed.has(u.hostname));assert.ok(!u.username&&!u.password);}
const context=vm.createContext({fetchv2:async(url,headers,method,body,options)=>{
 permit(url);assert.ok(++requests<=8,'request budget exceeded');
 const response=await fetch(url,{headers,method,redirect:'manual',signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,`HTTP ${response.status}`);let size=0;const chunks=[];
 for await(const chunk of response.body){size+=chunk.length;assert.ok(size<=options.maxBytesHint);chunks.push(Buffer.from(chunk));}
 return {status:response.status,finalUrl:response.url,contentType:response.headers.get('content-type'),bodyBytes:size,body:Buffer.concat(chunks).toString('utf8')};
}});
vm.runInContext(await readFile(new URL('../index.js',import.meta.url),'utf8'),context);const m=context.SynthetiqModule;
const discovery=await m.discoveryHome();assert.ok(discovery.sections[0].items.length);
const first=await m.searchResults('Archmage Curriculum',1);const second=await m.searchResults('Archmage Curriculum',2);
assert.equal(second.hasMore,false);const item=first.items.find(x=>x.id==='archmage-curriculum');assert.ok(item);
const details=await m.extractDetails(item.id);assert.equal(details.id,item.id);const chapters=await m.extractChapters(item.id);
assert.equal(chapters[0].id,'archmage-curriculum/chapter-1');const images=await m.extractImages(chapters[0].id);assert.ok(images.length);
permit(images[0].url);requests++;const head=await fetch(images[0].url,{method:'HEAD',headers:images[0].headers,redirect:'manual',signal:AbortSignal.timeout(25000)});
assert.equal(head.status,200);assert.ok(/^image\//.test(head.headers.get('content-type')||''));
console.log(JSON.stringify({result:'PARTIAL',discoveryItems:discovery.sections[0].items.length,query:'Archmage Curriculum',searchPages:2,firstPageItems:first.items.length,secondPageItems:second.items.length,details:details.title,authorizedChapters:chapters.length,firstChapter:chapters[0].id,lastChapter:chapters.at(-1).id,imageURLs:images.length,terminalHead:{status:head.status,contentType:head.headers.get('content-type')},requests,publicationImageBytesDownloaded:0,limitation:'HEAD confirms metadata only; terminal image body delivery and iOS remain unverified'},null,2));
