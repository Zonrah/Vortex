"use strict";
// Original Vortex adapter. Contract conventions informed by Synthetiq-HQ's
// Asura Scans adapter; selectors and data fields observed on Vortex 2026-10-11.
(() => {
  const BASE = "https://vortexscans.org";
  const API = "https://api.vortexscans.org";
  const MAX = 3 * 1024 * 1024;
  const HEADERS = { Accept: "text/html,application/json", Referer: BASE + "/" };
  const cache = new Map();
  const fail = message => { throw new Error("Vortex: " + message); };
  function url(value, image = false) {
    const text = String(value || "");
    if (!/^https:\/\/(?:vortexscans\.org|api\.vortexscans\.org|storage\.vortexscans\.org)\//.test(text) || /[\s\\#]/.test(text)) fail("invalid HTTPS URL or undeclared host");
    if (image && !/^https:\/\/storage\.vortexscans\.org\/\/?upload\//.test(text)) fail("invalid image host/path");
    return text;
  }
  function identity(value, chapter = false) {
    let text = String(value || "");
    if (text.startsWith(BASE + "/series/")) text = text.slice((BASE + "/series/").length);
    if (text.endsWith("/")) text = text.slice(0, -1);
    const pattern = chapter ? /^[a-z0-9][a-z0-9%'_-]{0,180}\/chapter-[a-z0-9.-]+$/i : /^[a-z0-9][a-z0-9%'_-]{0,180}$/i;
    if (!pattern.test(text) || /%2f|%5c|%00|\.\./i.test(text)) fail("invalid source identity");
    return text;
  }
  const href = id => BASE + "/series/" + id;
  const clean = text => String(text || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
  async function request(target, type) {
    url(target);
    if (typeof globalThis.fetchv2 !== "function") fail("fetchv2 required");
    const response = await globalThis.fetchv2(target, HEADERS, "GET", null, {followRedirects:false,maxBytesHint:MAX,responseClass:type});
    if (!response || response.error || response.status !== 200 || response.bodyDropped) fail("HTTP failure, redirect or challenge");
    if (response.finalUrl && response.finalUrl !== target) fail("unexpected redirect");
    const contentType = response.contentType || (response.headers || {})["content-type"] || "";
    if (!(type === "json" ? /^application\/json(?:;|$)/i : /^text\/html(?:;|$)/i).test(contentType)) fail("incorrect response type");
    const text = typeof response.text === "function" ? await response.text() : response.body;
    if (typeof text !== "string" || !text.trim() || text.length > MAX || response.bodyBytes > MAX) fail("empty, oversized or truncated body");
    if (type === "json") {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || data.error || data.errors) fail("malformed/error JSON");
      return data;
    }
    if (!/<html\b/i.test(text) || /<title>\s*(?:Just a moment|Access denied|Error|Login)/i.test(text)) fail("challenge/login/error HTML");
    return text;
  }
  // Read a restricted data literal from TanStack's observed SSR serialization.
  // This parser supports only strings, numbers, booleans, null, arrays, plain
  // objects and local $R integer references. It never evaluates page scripts.
  function field(html, name) {
    const marker = new RegExp("\\b" + name + ":(?=\\$R\\[|[0-9])").exec(html);
    if (!marker) fail("missing SSR field " + name);
    let pos = marker.index + marker[0].length, nodes = 0;
    const refs = Object.create(null);
    const ws = () => { while (/\s/.test(html[pos] || "") && pos < html.length) pos++; };
    function string() {
      let raw = '"'; pos++;
      while (pos < html.length) {
        const c = html[pos++];
        if (c === '"') return JSON.parse(raw + '"');
        if (c === "\\") {
          const e = html[pos++];
          if (e === "x") { const hex = html.slice(pos,pos+2); if (!/^[0-9a-f]{2}$/i.test(hex)) fail("bad string escape"); raw += "\\u00" + hex; pos += 2; }
          else raw += "\\" + e;
        } else raw += c;
      }
      fail("unterminated data string");
    }
    function value(depth = 0) {
      ws(); if (++nodes > 100000 || depth > 30) fail("SSR data complexity limit");
      if (html.slice(pos,pos+3) === "$R[") {
        const ref = /^\$R\[(\d+)\]/.exec(html.slice(pos)); if (!ref) fail("invalid data reference");
        pos += ref[0].length; ws();
        if (html[pos] === "=") {pos++; const v = value(depth+1); refs[ref[1]] = v; return v;}
        if (!Object.prototype.hasOwnProperty.call(refs,ref[1])) fail("unresolved data reference");
        return refs[ref[1]];
      }
      if (html[pos] === '"') return string();
      for (const [token,v] of [["!0",true],["!1",false],["null",null],["void 0",null]]) {
        if (html.slice(pos,pos+token.length) === token) {pos += token.length; return v;}
      }
      if (html[pos] === "[") {
        pos++; const out=[]; ws();
        while (html[pos] !== "]") {out.push(value(depth+1)); ws(); if (html[pos] === "]") break; if (html[pos++] !== ",") fail("invalid data array");}
        pos++; return out;
      }
      if (html[pos] === "{") {
        pos++; const out=Object.create(null); ws();
        while (html[pos] !== "}") {
          const quoted = html[pos] === '"';
          const key = quoted ? string() : (/^[A-Za-z_$][\w$]*/.exec(html.slice(pos)) || [])[0];
          if (!key || ["__proto__","prototype","constructor"].includes(key)) fail("unsafe data key");
          if (!quoted) pos += key.length;
          ws(); if (html[pos++] !== ":") fail("invalid data object"); out[key]=value(depth+1); ws();
          if (html[pos] === "}") break; if (html[pos++] !== ",") fail("invalid data separator"); ws();
        }
        pos++; return out;
      }
      const number = /^-?\d+(?:\.\d+)?/.exec(html.slice(pos));
      if (number) {pos += number[0].length; return Number(number[0]);}
      fail("unsupported SSR data expression");
    }
    return value();
  }
  function eligible(post) {
    if (!post || post.isNovel === true || post.isAdult === true || !Array.isArray(post.genres)) return false;
    if (post.postStatus && post.postStatus !== "PUBLIC") return false;
    return post.genres.every(g => g && typeof g.name === "string" && !/hentai|smut|porn|adult|explicit|erotica/i.test(g.name));
  }
  function item(post) {
    if (!eligible(post)) fail("excluded content");
    const id=identity(post.slug), title=clean(post.postTitle);
    if (!title) fail("missing series title");
    return {id,title,href:href(id),cover:url(post.featuredImage,true)};
  }
  async function searchResults(query, page = 1) {
    if (typeof query !== "string" || query.length > 200) fail("structured filters unsupported; use plain text");
    if (!Number.isSafeInteger(page) || page < 1) fail("invalid page");
    const target = API + "/api/query?page=" + page + "&perPage=20&view=archive&searchTerm=" + encodeURIComponent(query.trim()) + "&orderBy=lastChapterAddedAt&orderDirection=desc";
    const data=await request(target,"json");
    if (!Array.isArray(data.posts) || data.posts.length > 20 || !Number.isSafeInteger(data.totalCount) || data.totalCount < 0) fail("malformed search pagination");
    if (!data.posts.length && (page-1)*20 < data.totalCount) fail("incomplete search page");
    const seen=new Set(), items=[];
    for (const post of data.posts) {if (!eligible(post)) continue; const row=item(post); if (!seen.has(row.id)) {seen.add(row.id);items.push(row);}}
    return {items,hasMore:page*20<data.totalCount};
  }
  async function series(value) {
    const id=identity(value);
    if (cache.has(id)) return cache.get(id);
    const html=await request(href(id),"html"), post=field(html,"post");
    if (identity(post.slug) !== id || !eligible(post) || post.postStatus !== "PUBLIC") fail("series identity/access mismatch");
    const chapters=field(html,"initialChapters"), count=field(html,"totalChapterCount");
    if (!Array.isArray(chapters) || !Number.isSafeInteger(count) || count < 1 || chapters.length !== count) fail("incomplete source chapter list; cannot certify pagination");
    // The observed series SSR includes every chapter even though the UI renders
    // only 25. Validate the total; never return that UI-sized subset.
    const result={post,chapters}; if (cache.size >= 4) cache.delete(cache.keys().next().value); cache.set(id,result); return result;
  }
  async function extractDetails(value) {
    const {post}=await series(value);
    if (typeof post.postContent !== "string" || typeof post.seriesStatus !== "string") fail("malformed series metadata");
    return {...item(post),description:clean(post.postContent),author:typeof post.author === "string" ? clean(post.author) : "",status:post.seriesStatus,tags:post.genres.map(g=>g.name)};
  }
  function unlocked(chapter) {
    return chapter && chapter.isLocked === false && chapter.isPermanentlyLocked === false && chapter.isLockedByCoins === false && chapter.isShortLinkLocked === false && chapter.price === 0;
  }
  async function extractChapters(value) {
    const id=identity(value), {chapters}=await series(id), seen=new Set(), out=[];
    for (const chapter of chapters) {
      if (chapter.chapterStatus !== "PUBLIC" || !unlocked(chapter)) continue;
      const cid=identity(id+"/"+chapter.slug,true);
      if (!Number.isFinite(chapter.number) || typeof chapter.createdAt !== "string") fail("malformed chapter identity");
      if (seen.has(cid)) continue; seen.add(cid);
      out.push({id:cid,href:href(cid),title:"Chapter "+chapter.number+(chapter.title ? " — "+clean(chapter.title):""),number:chapter.number,releaseDate:chapter.createdAt,language:"en"});
    }
    if (!out.length) fail("no authorized free chapters");
    return out.sort((a,b)=>a.number-b.number || a.id.localeCompare(b.id));
  }
  async function extractImages(value) {
    const id=identity(value,true), seriesID=id.split("/")[0];
    const chapter=field(await request(href(id),"html"),"chapter");
    if (chapter.seriesSlug !== seriesID || chapter.slug !== id.split("/")[1] || chapter.isNovel || chapter.isAccessible !== true || !unlocked(chapter)) fail("chapter identity/access mismatch");
    const pages=chapter.publicImages;
    if (!Array.isArray(pages) || !pages.length) fail("empty terminal images");
    const ordered=pages.slice().sort((a,b)=>a.order-b.order), seen=new Set();
    return ordered.map((page,index)=>{
      if (page.order !== index || seen.has(page.url)) fail("malformed/duplicate page order");
      seen.add(page.url); return {url:url(page.url,true),headers:{Referer:BASE+"/"}};
    });
  }
  // Discovery uses the same observed archive endpoint; optional filters are
  // intentionally not advertised until their AND/NOT semantics are proven.
  async function discoveryHome() {return {sections:[{id:"latest",title:"Latest updates",items:(await searchResults("",1)).items}]};}
  async function discoveryFeed(feedID,page=1) {if (feedID !== "latest") fail("unknown feed");return searchResults("",page);}
  const handlers={searchResults,extractDetails,extractChapters,extractImages,discoveryHome,discoveryFeed};
  globalThis.SynthetiqModule=handlers;Object.assign(globalThis,handlers);
})();
