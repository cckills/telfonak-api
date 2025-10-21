import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const phoneName = decodeURIComponent(req.query.phone || "").trim();
    const detailsUrl = req.query.url;

    // 📱 إذا تم تمرير رابط مباشر، اجلب تفاصيل الهاتف
    if (detailsUrl) {
      const response = await fetch(detailsUrl);
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $("h1").first().text().trim();
      const specs = {};

      // استخراج المواصفات من جداول أو قوائم
      $("tr, li").each((_, el) => {
        const key = $(el).find("th").text().trim() || $(el).text().split(":")[0]?.trim();
        const value = $(el).find("td").text().trim() || $(el).text().split(":")[1]?.trim();
        if (key && value) specs[key] = value;
      });

      return res.status(200).json({
        mode: "details",
        title,
        specs,
        source: detailsUrl,
      });
    }

    // 🧠 البحث عن الأجهزة
    if (!phoneName) return res.status(400).json({ error: "Missing phone name" });

    const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(phoneName)}`;
    const response = await fetch(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    // ✅ محاولة إيجاد كل أنواع الكروت الممكنة
    $("article, .td_module_1, .td_module_3, .td_module_10, .td_module_11").each((_, el) => {
      const link = $(el).find("a").attr("href");
      const title = $(el).find(".entry-title, .td-module-title, h3, h2").text().trim();
      const img = $(el).find("img").attr("src");
      if (link && title) results.push({ title, link, img });
    });

    // في حال لم تظهر نتائج عادية، جرّب منطقة أخرى
    if (results.length === 0) {
      $("a").each((_, el) => {
        const link = $(el).attr("href");
        const title = $(el).text().trim();
        if (link && title.includes(phoneName)) results.push({ title, link });
      });
    }

    if (results.length === 0) {
      throw new Error(`لم يتم العثور على نتائج لاسم "${phoneName}" في موقع تلفونك.`);
    }

    res.status(200).json({ mode: "list", results });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
