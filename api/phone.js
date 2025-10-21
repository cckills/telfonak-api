import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const phoneName = decodeURIComponent(req.query.phone || "").trim();
    const detailsUrl = req.query.url;

    // 🟢 المرحلة 2: إذا تم تمرير رابط مباشر -> اجلب المواصفات فقط
    if (detailsUrl) {
      const response = await fetch(detailsUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $("h1").first().text().trim();
      const specs = {};

      $(".specs-table tr").each((_, el) => {
        const key = $(el).find("th").text().trim();
        const value = $(el).find("td").text().trim();
        if (key && value) specs[key] = value;
      });

      if (Object.keys(specs).length === 0) {
        $("li").each((_, el) => {
          const text = $(el).text().trim();
          if (text.includes(":")) {
            const [k, v] = text.split(":");
            specs[k.trim()] = v.trim();
          }
        });
      }

      return res.status(200).json({
        mode: "details",
        title,
        specs,
        source: detailsUrl,
      });
    }

    // 🟢 المرحلة 1: البحث عن الأجهزة
    if (!phoneName) return res.status(400).json({ error: "Missing phone name" });
    const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(phoneName)}`;
    const searchResponse = await fetch(searchUrl);
    const searchHtml = await searchResponse.text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $(".td_module_10, .td_module_11, .td_module_1, .td_module_3").each((_, el) => {
      const link = $(el).find("a").attr("href");
      const title = $(el).find(".entry-title, .td-module-title").text().trim();
      const img = $(el).find("img").attr("src");
      if (link && title) results.push({ title, link, img });
    });

    if (results.length === 0) throw new Error("لم يتم العثور على نتائج لهذا الاسم.");

    res.status(200).json({ mode: "list", results });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
