import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "يرجى إدخال اسم الهاتف." });

  try {
    // 🟢 رابط البحث في موقع telfonak
    const searchUrl = `https://telfonak.com/?s=${encodeURIComponent(phone)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    // 🔍 استخراج الهواتف من نتائج البحث
    $(".media").each((_, el) => {
      const link = $(el).find("a.image-link").attr("href");
      const title = $(el).find("a.image-link").attr("title");
      const img = $(el)
        .find("span.img")
        .attr("data-bgsrc") || $(el).find("img").attr("src");

      if (link && title) {
        results.push({
          title,
          link,
          img,
          source: "telfonak.com",
        });
      }
    });

    // ✅ إذا وجد نتائج (قائمة)
    if (results.length > 0) {
      res.status(200).json({ mode: "list", results });
      return;
    }

    // 🟡 إذا لم توجد نتائج — نحاول جلب صفحة هاتف مفصلة
    const phoneUrl = `https://telfonak.com/${encodeURIComponent(phone)}/`;
    const pageRes = await fetch(phoneUrl);

    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      const $$ = cheerio.load(pageHtml);

      const title = $$("h1.entry-title").text().trim() || phone;
      const img =
        $$(".entry-content img").first().attr("src") ||
        $$(".post-thumbnail img").attr("src");
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
        source: phoneUrl,
      });
      return;
    }

    res.status(404).json({ error: "❌ لم يتم العثور على أي نتائج لهذا الاسم في الموقع." });
  } catch (err) {
    console.error("خطأ أثناء الجلب:", err);
    res.status(500).json({ error: "⚠️ حدث خطأ أثناء جلب البيانات." });
  }
}
