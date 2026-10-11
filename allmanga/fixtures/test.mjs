import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read = name => readFile(new URL(name, import.meta.url),'utf8');
const expected = JSON.parse(await read('expected.json'));
const script = await readFile(new URL('../index.js',import.meta.url),'utf8');
async function load(fixture='search.json',options={}) {
 const body = await read(fixture); const calls=[];
 const context = vm.createContext({fetchv2:async (url,headers,method,requestBody,settings)=>{calls.push({url,headers,method,settings});return {status:200,contentType:'application/json',finalUrl:url,body,bodyBytes:Buffer.byteLength(body),...options};}});
 vm.runInContext(script,context); return {module:context.SynthetiqModule,calls};
}
const plain = value => JSON.parse(JSON.stringify(value));
test('exact invented search output, duplicate and adult exclusion, pagination',async()=>{
 const {module,calls}=await load(); assert.deepEqual(plain(await module.searchResults('fixture',1)),expected.search);
 const vars=JSON.parse(new URL(calls[0].url).searchParams.get('variables'));
 assert.equal(vars.search.allowAdult,false); assert.equal(vars.search.allowUnknown,false); assert.equal(calls[0].settings.followRedirects,false);
 const second=await load('search-page-2.json'); const result=plain(await second.module.searchResults('fixture',2)); assert.equal(result.hasMore,false); assert.equal(result.items[0].id,'Fixture02');
});
test('exact invented details and stable source identity',async()=>{
 const {module}=await load('details.json'); assert.deepEqual(plain(await module.extractDetails('Fixture01')),expected.details);
 await assert.rejects(()=>module.extractDetails('Wrong01'),/identity mismatch/);
 await assert.rejects(()=>module.extractDetails('https://evil.example/manga/Fixture01'),/identity/);
});
test('empty, malformed, unauthorized and challenge responses',async()=>{
 const empty=await load('empty.json'); assert.deepEqual(plain(await empty.module.searchResults('fixture')),{items:[],hasMore:false});
 for(const fixture of ['malformed.json','unauthorized.json','challenge.html']) {
  const {module}=await load(fixture); await assert.rejects(()=>module.searchResults('fixture'));
 }
 for(const options of [{status:403},{bodyDropped:true},{contentType:'text/html'},{finalUrl:'https://evil.example/'},{bodyBytes:1048577}]) {
  const {module}=await load('search.json',options); await assert.rejects(()=>module.searchResults('fixture'));
 }
});
test('filters and unverified reading stages reject without network requests',async()=>{
 const {module,calls}=await load(); await assert.rejects(()=>module.searchResults({includeTags:['A','B']}),/unsupported/);
 await assert.rejects(()=>module.extractChapters('Fixture01'),{message:expected.chaptersError});
 await assert.rejects(()=>module.extractImages('Fixture01'),{message:expected.imagesError}); assert.equal(calls.length,0);
});
