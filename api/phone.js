import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(phone)}`;

  try {
    const response = await fetch(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const results = [];

    $(".blog-box").each((_, el) => {
      const title = $(el).find(".title a").text().trim();
      const link = $(el).find(".title a").attr("href");
      const img = $(el).find("img").attr("src"); // ✅ جلب الصورة من نتيجة البحث
      if (title && link) {
        results.push({
          title,
          link,
          img,
          source: "telfonak.com",
        });
      }
    });

    // إذا وجد نتائج — إرسالها للواجهة
    if (results.length > 0) {
      res.status(200).json({ mode: "list", results });
      return;
    }

    // 🔁 إذا لم توجد نتائج — ربما المستخدم كتب اسم هاتف مباشر
    const phonePage = await fetch(`https://telfonak.com/${encodeURIComponent(phone)}/`);
    if (phonePage.ok) {
      const pageHtml = await phonePage.text();
      const $$ = cheerio.load(pageHtml);

      const title = $$("h1.entry-title").text().trim();
      const img = $$(".entry-content img").first().attr("src");
      const specs = {};

      $$(".entry-content table tr").each((_, tr) => {
        const key = $$(tr).find("td:first-child").text().trim();
        const val = $$(tr).find("td:last-child").text().trim();
        if (key && val) specs[key] = val;
      });

      res.status(200).json({
        mode: "details",
        title,
        img,
        specs,
        source: `https://telfonak.com/${encodeURIComponent(phone)}/`,
      });
      return;
    }

    res.status(404).json({ error: "لم يتم العثور على أي نتائج لهذا الاسم في الموقع." });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ أثناء جلب البيانات." });
  }
}
