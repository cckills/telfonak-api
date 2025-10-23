import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "❌ يرجى إدخال كلمة البحث." });

  try {
    const normalize = (text) =>
      text.toLowerCase().replace(/[^\w\u0600-\u06FF\s]/gi, "").trim();

    const query = normalize(q);
    const results = [];
    const seen = new Set();

    let page = 1;
    let hasNext = true;

    // 🌀 البحث في الصفحات الأولى فقط (حتى 3 صفحات)
    while (hasNext && page <= 3) {
      const searchUrl =
        page === 1
          ? `https://telfonak.com/?s=${encodeURIComponent(q)}`
          : `https://telfonak.com/page/${page}/?s=${encodeURIComponent(q)}`;

      console.log("🔍 Fetching:", searchUrl);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "ar,en;q=0.9",
        },
      });

      if (!response.ok) break;
      const html = await response.text();
      const $ = cheerio.load(html);

      const phones = $("article, .post, .media");

      if (phones.length === 0) {
        hasNext = false;
        break;
      }

      phones.each((_, el) => {
        const link = $(el).find("a.image-link").attr("href");
        const title = $(el).find("a.image-link").attr("title");
        const img =
          $(el).find("span.img").attr("data-bgsrc") ||
          $(el).find("img").attr("src");

        if (title && link && !seen.has(title)) {
          if (normalize(title).includes(query)) {
            seen.add(title);
            results.push({ title, link, img });
          }
        }
      });

      hasNext = $(".pagination .next, .nav-links .next").length > 0;
      page++;
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "❌ لم يتم العثور على أي نتائج لهذا الاسم.",
      });
    }

    res.status(200).json({ count: results.length, results });
  } catch (err) {
    console.error("⚠️ خطأ أثناء البحث:", err);
    res
      .status(500)
      .json({ error: "حدث خطأ أثناء تنفيذ عملية البحث." });
  }
}
