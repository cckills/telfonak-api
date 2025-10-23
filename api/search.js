import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "❌ يرجى إدخال كلمة البحث." });

  try {
    // 🔍 تحويل النص للبحث بدون رموز أو اختلافات
    const normalize = (text) =>
      text.toLowerCase().replace(/[^\w\s]/gi, "").trim();

    const query = normalize(q);

    // 🧠 اجلب قائمة الهواتف من موقعك أو من قاعدة البيانات
    const response = await fetch("https://telfonak.com/");
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $(".phone-item, .entry-title a").each((_, el) => {
      const title = $(el).text().trim();
      const link = $(el).attr("href");
      const img = $(el).find("img").attr("src") || "";

      if (title && link && normalize(title).includes(query)) {
        results.push({ title, link, img });
      }
    });

    // ✨ إزالة المكررات بالاسم
    const unique = [];
    const seen = new Set();
    for (const item of results) {
      if (!seen.has(item.title)) {
        unique.push(item);
        seen.add(item.title);
      }
    }

    res.status(200).json({ count: unique.length, results: unique });
  } catch (err) {
    console.error("⚠️ خطأ أثناء البحث:", err);
    res.status(500).json({ error: "حدث خطأ أثناء تنفيذ عملية البحث." });
  }
}
