"use strict";
// AllManga partial candidate. API query fields were observed in the public
// site's eae8034.js bundle on 2026-10-11. No downloaded code is executed.
// Direct API access returned a challenge. Chapter and terminal response shapes
// have not been observed; this candidate MUST remain retired until certified.
(() => {
  const BASE = "https://allmanga.to";
  const API = "https://api.allanime.day/api";
  const MAX = 1024 * 1024;
  const HEADERS = { Accept: "application/json", Referer: BASE + "/" };
  const fields = "_id name thumbnail isAdult genres tags";
  const searchQuery = `query($search:SearchInput,$limit:Int,$page:Int,$translationType:VaildTranslationTypeMangaEnumType,$countryOrigin:VaildCountryOriginEnumType){mangas(search:$search,limit:$limit,page:$page,translationType:$translationType,countryOrigin:$countryOrigin){pageInfo{total} edges{${fields}}}}`;
  const detailsQuery = `query($_id:String!,$search:SearchInput){manga(_id:$_id,search:$search){${fields} description authors status availableChapters availableChaptersDetail}}`;
  function itemID(value) {
    const match = String(value || "").match(/^(?:https:\/\/allmanga\.to\/manga\/)?([A-Za-z0-9]{1,64})\/?$/);
    if (!match) throw new Error("Invalid AllManga item identity");
    return match[1];
  }
  function cover(value) {
    // Only the origin host has been observed for static images. Never widen
    // this allowlist from a response or silently proxy unsupported covers.
    if (typeof value !== "string" || !/^https:\/\/allmanga\.to\/[A-Za-z0-9/_%.?=&-]+$/.test(value)) throw new Error("Unobserved or invalid cover host");
    return value;
  }
  function safe(record) {
    return record && record.isAdult === false && Array.isArray(record.genres) && Array.isArray(record.tags)
      && record.genres.concat(record.tags).every(tag => typeof tag === "string" && !/hentai|smut|adult|porn|explicit|nudity|ecchi/i.test(tag));
  }
  function normalize(record) {
    if (!safe(record)) throw new Error("Excluded adult or unclassified content");
    const id = itemID(record._id);
    if (typeof record.name !== "string" || !record.name.trim()) throw new Error("Missing title");
    return { id, title: record.name.trim(), href: BASE + "/manga/" + id, cover: cover(record.thumbnail) };
  }
  async function request(query, variables) {
    if (typeof globalThis.fetchv2 !== "function") throw new Error("AllManga requires fetchv2");
    const url = API + "?query=" + encodeURIComponent(query) + "&variables=" + encodeURIComponent(JSON.stringify(variables));
    const response = await globalThis.fetchv2(url, HEADERS, "GET", null, { followRedirects: false, maxBytesHint: MAX, responseClass: "json" });
    if (!response || response.error || response.status !== 200 || response.bodyDropped) throw new Error("AllManga API unavailable or challenged");
    if (response.finalUrl && response.finalUrl !== url) throw new Error("Unexpected API redirect");
    const type = response.contentType || (response.headers || {})["content-type"] || "";
    if (!/^application\/json(?:;|$)/i.test(type)) throw new Error("Expected API JSON; challenge/HTML rejected");
    const text = typeof response.text === "function" ? await response.text() : response.body;
    if (typeof text !== "string" || !text.trim() || text.length > MAX || response.bodyBytes > MAX) throw new Error("Invalid API body size");
    const payload = JSON.parse(text);
    if (!payload || payload.errors || !payload.data || typeof payload.data !== "object") throw new Error("Malformed or unauthorized API response");
    return payload.data;
  }
  async function searchResults(query, page = 1) {
    if (typeof query !== "string" || !query.trim() || query.length > 200) throw new Error("A meaningful plain-text query is required; structured filters are unsupported");
    if (!Number.isSafeInteger(page) || page < 1) throw new Error("Invalid search page");
    const data = await request(searchQuery, { search: { query: query.trim(), allowAdult: false, allowUnknown: false }, limit: 20, page, translationType: "sub", countryOrigin: "ALL" });
    const list = data.mangas;
    if (!list || !Array.isArray(list.edges) || list.edges.length > 20 || !list.pageInfo || !Number.isSafeInteger(list.pageInfo.total) || list.pageInfo.total < 0) throw new Error("Malformed catalogue pagination");
    if (!list.edges.length && (page - 1) * 20 < list.pageInfo.total) throw new Error("Incomplete catalogue page");
    const seen = new Set();
    const items = [];
    for (const record of list.edges) {
      if (!safe(record)) continue;
      const item = normalize(record);
      if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
    }
    return { items, hasMore: page * 20 < list.pageInfo.total };
  }
  async function extractDetails(value) {
    const id = itemID(value);
    const data = await request(detailsQuery, { _id: id, search: { allowAdult: false, allowUnknown: false } });
    const result = normalize(data.manga);
    if (result.id !== id) throw new Error("Source identity mismatch");
    if (typeof data.manga.description !== "string" || !Array.isArray(data.manga.authors) || !data.manga.authors.every(x => typeof x === "string") || typeof data.manga.status !== "string") throw new Error("Unverified details shape");
    return { ...result, description: data.manga.description.replace(/<[^>]*>/g, "").trim(), author: data.manga.authors.join(", "), status: data.manga.status, tags: [...new Set(data.manga.genres.concat(data.manga.tags))] };
  }
  async function extractChapters(value) {
    itemID(value);
    throw new Error("PARTIAL: complete AllManga chapter schema unverified; live API challenged");
  }
  async function extractImages() {
    throw new Error("PARTIAL: AllManga terminal content and image hosts unverified");
  }
  const handlers = { searchResults, extractDetails, extractChapters, extractImages };
  globalThis.SynthetiqModule = handlers;
  Object.assign(globalThis, handlers);
})();
