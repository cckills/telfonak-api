import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const query = req.query.phone || req.url.split("?phone=")[1];
    if (!query) return res.status(400).json({ error: "Missing phone name" });

    const phoneName = decodeURIComponent(query).trim();
    const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(phoneName)}`;

    // الخطوة 1: البحث في الموقع
    const searchResponse = await fetch(searchUrl);
    const searchHtml = await searchResponse.text();
    const $search = cheerio.load(searchHtml);

    // جلب أول نتيجة بحث
    const firstLink = $search(".td-module-thumb a").attr("href");

    if (!firstLink)
      throw new Error("لم يتم العثور على أي نتائج لهذا الاسم في الموقع.");

    // الخطوة 2: الدخول إلى صفحة الهاتف الفعلية
    const response = await fetch(firstLink);
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

    res.status(200).json({
      success: true,
      searchQuery: phoneName,
      source: firstLink,
      title,
      specs
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
