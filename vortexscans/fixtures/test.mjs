import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const read=n=>readFile(new URL(n,import.meta.url),'utf8');const script=await read('../index.js');const expected=JSON.parse(await read('expected.json'));const plain=x=>JSON.parse(JSON.stringify(x));
async function load(overrides={}) {
 const calls=[];const context=vm.createContext({fetchv2:async(url,headers,method,body,options)=>{
 calls.push({url,headers,method,options});let name=url.includes('/api/query')?(url.includes('page=2')?'search-page-2.json':url.includes('searchTerm=&')?'home.json':'search.json'):url.includes('/chapter-')?'chapter.html':'details.html';name=overrides.fixture||name;
 return {status:200,finalUrl:url,contentType:name.endsWith('.json')?'application/json':'text/html',body:await read(name),...overrides.response};}});vm.runInContext(script,context);return {module:context.SynthetiqModule,calls};
}
test('complete source-owned path with exact normalized outputs',async()=>{
 const {module,calls}=await load();assert.deepEqual(plain(await module.searchResults('fixture',1)),expected.search);
 assert.deepEqual(plain(await module.extractDetails(expected.details.id)),expected.details);
 assert.deepEqual(plain(await module.extractChapters(expected.details.id)),expected.chapters);
 assert.deepEqual(plain(await module.extractImages(expected.chapters[0].id)),expected.images);
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.options.followRedirects===false));
});
test('discovery and deterministic second page',async()=>{
 const {module}=await load();assert.deepEqual(plain(await module.discoveryHome()),expected.discovery);
 assert.deepEqual(plain(await module.discoveryFeed('latest')), {items:expected.discovery.sections[0].items,hasMore:false});
 const page=await module.searchResults('fixture',2);assert.equal(page.hasMore,false);assert.equal(page.items[0].id,'fixture-second');
 await assert.rejects(()=>module.discoveryFeed('unknown'));await assert.rejects(()=>module.searchResults({includeTags:['a','b']}));
});
test('empty, malformed, HTTP, challenge, redirect and size exclusions',async()=>{
 const empty=await load({fixture:'empty.json'});assert.deepEqual(plain(await empty.module.searchResults('fixture')),{items:[],hasMore:false});
 for(const options of [{fixture:'malformed.json'},{response:{status:403}},{response:{contentType:'text/html'}},{response:{bodyDropped:true}},{response:{bodyBytes:3145729}},{response:{finalUrl:'https://evil.example/'}}]) {
  const {module}=await load(options);await assert.rejects(()=>module.searchResults('fixture'));
 }
 const challenge=await load({fixture:'challenge.html'});await assert.rejects(()=>challenge.module.extractDetails('fixture-vortex'),/challenge/);
});
test('complete counts, chapter ownership, paid access and image host validation',async()=>{
 for(const fixture of ['incomplete.html']){const {module}=await load({fixture});await assert.rejects(()=>module.extractChapters('fixture-vortex'),/incomplete/);}
 for(const fixture of ['locked.html','wrong-series.html','unsafe-images.html']) {const {module}=await load({fixture});await assert.rejects(()=>module.extractImages('fixture-vortex/chapter-1'));}
 const {module,calls}=await load();await assert.rejects(()=>module.extractDetails('https://evil.example/series/fixture'));await assert.rejects(()=>module.extractImages('fixture/../chapter-1'));assert.equal(calls.length,0);
});
test('SSR expressions never execute and broken image ordering rejects',async()=>{
 const details=await read('details.html');
 const expression=details.replace('"author":"Invented Author"','"author":(()=>{throw "executed"})()');
 const attack=await load({response:{body:expression}});await assert.rejects(()=>attack.module.extractDetails('fixture-vortex'),/unsupported SSR data expression/);
 const chapter=await read('chapter.html');
 const gap=await load({response:{body:chapter.replace('"order":1','"order":3')}});await assert.rejects(()=>gap.module.extractImages('fixture-vortex/chapter-1'),/page order/);
});
