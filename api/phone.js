import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const phoneName = decodeURIComponent(req.query.phone || "").trim();
    const detailsUrl = req.query.url;

    // 📄 إذا تم تمرير رابط مباشر، اجلب تفاصيل الهاتف من أي موقع
    if (detailsUrl) {
      const html = await (await fetch(detailsUrl)).text();
      const $ = cheerio.load(html);
      const title = $("h1, .title, .page-title").first().text().trim();
      const specs = {};

      $("tr, li").each((_, el) => {
        const key = $(el).find("th").text().trim() || $(el).text().split(":")[0]?.trim();
        const val = $(el).find("td").text().trim() || $(el).text().split(":")[1]?.trim();
        if (key && val) specs[key] = val;
      });

      return res.json({
        mode: "details",
        title,
        specs,
        source: detailsUrl,
      });
    }

    if (!phoneName) return res.status(400).json({ error: "يرجى كتابة اسم الهاتف" });

    const searchEngines = [
      {
        name: "تلفونك",
        url: (q) => `https://telfonak.com/?s=${encodeURIComponent(q)}`,
        parse: ($) => {
          const results = [];
          $("article, .td_module_1, .td_module_3, .td_module_10, .td_module_11").each((_, el) => {
            const title = $(el).find(".entry-title, .td-module-title, h2, h3").text().trim();
            const link = $(el).find("a").attr("href");
            const img = $(el).find("img").attr("src");
            if (title && link) results.push({ title, link, img });
          });
          return results;
        },
      },
      {
        name: "موبوليست",
        url: (q) => `https://www.mobolist.net/search?q=${encodeURIComponent(q)}`,
        parse: ($) => {
          const results = [];
          $(".device").each((_, el) => {
            const title = $(el).find(".device-title").text().trim();
            const link = "https://www.mobolist.net" + $(el).find("a").attr("href");
            const img = $(el).find("img").attr("data-src") || $(el).find("img").attr("src");
            if (title && link) results.push({ title, link, img });
          });
          return results;
        },
      },
      {
        name: "موبايلز جيت",
        url: (q) => `https://mobilesgate.com/?s=${encodeURIComponent(q)}`,
        parse: ($) => {
          const results = [];
          $("article, .post").each((_, el) => {
            const title = $(el).find("h2, h3, .entry-title").text().trim();
            const link = $(el).find("a").attr("href");
            const img = $(el).find("img").attr("src");
            if (title && link) results.push({ title, link, img });
          });
          return results;
        },
      },
    ];

    const allResults = [];

    for (const site of searchEngines) {
      try {
        const html = await (await fetch(site.url(phoneName))).text();
        const $ = cheerio.load(html);
        const results = site.parse($);
        results.forEach((r) => (r.source = site.name));
        allResults.push(...results);
      } catch {
        // إذا فشل موقع ما، نكمل بالبقية
      }
    }

    if (allResults.length === 0) {
      return res.status(404).json({ error: `لم يتم العثور على نتائج لكلمة "${phoneName}" في أي موقع.` });
    }

    res.json({
      mode: "list",
      count: allResults.length,
      results: allResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
