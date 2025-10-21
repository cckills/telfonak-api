import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const phoneQuery = req.query.phone || req.url.split("?phone=")[1];
    if (!phoneQuery) return res.status(400).json({ error: "Missing phone name" });

    const searchWords = phoneQuery.trim().split(" ");
    const baseName = searchWords.join(" ");
    const attempts = [
      baseName,
      `Huawei ${baseName}`,
      `${baseName} Huawei`,
      `${baseName} Prime`,
      `${baseName} 2019`,
      `${baseName} 2020`,
      `${baseName} 2021`,
      `${baseName} 2022`,
      `${baseName} 2023`,
      `${baseName} Pro`,
      `${baseName} Plus`,
      `${baseName} Note`,
      `${baseName} A15`,
    ];

    let firstLink = null;

    // 🧭 الخطوة 1: جرّب البحث بعدة أشكال حتى تجد نتيجة
    for (const attempt of attempts) {
      const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(attempt)}`;
      const searchResponse = await fetch(searchUrl);
      const searchHtml = await searchResponse.text();
      const $search = cheerio.load(searchHtml);

      const link = $search(".td-module-thumb a").attr("href");
      if (link) {
        firstLink = link;
        console.log("✅ Found match:", attempt);
        break;
      }
    }

    if (!firstLink) throw new Error("لم يتم العثور على أي نتائج لهذا الاسم في الموقع.");

    // 🧭 الخطوة 2: جلب صفحة الهاتف الحقيقي
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

    // fallback
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
      searchQuery: phoneQuery,
      source: firstLink,
      title,
      specs
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
