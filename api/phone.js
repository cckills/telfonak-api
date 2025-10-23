import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  if (!phone)
    return res.status(400).json({ error: "يرجى إدخال اسم الهاتف." });

  try {
    const results = [];
    const uniqueTitles = new Set(); // 🟢 لتجنب تكرار الأجهزة
    let page = 1;
    let hasNext = true;

    while (hasNext && page <= 5) {
      const searchUrl =
        page === 1
          ? `https://telfonak.com/?s=${encodeURIComponent(phone)}`
          : `https://telfonak.com/page/${page}/?s=${encodeURIComponent(phone)}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "ar,en;q=0.9",
        },
      });

      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      const items = $(".media, .post, article");

      if (items.length === 0) {
        hasNext = false;
        break;
      }

      for (const el of items.toArray()) {
        const link = $(el).find("a.image-link").attr("href");
        const title = $(el).find("a.image-link").attr("title");
        const img =
          $(el).find("span.img").attr("data-bgsrc") ||
          $(el).find("img").attr("src");

        if (link && title && !uniqueTitles.has(title)) {
          uniqueTitles.add(title);

          // 🧠 تصفية النتائج لتكون أكثر دقة (تشابه جزئي مع اسم البحث)
          const normalizedTitle = title.toLowerCase().replace(/\s+/g, "");
          const normalizedQuery = phone.toLowerCase().replace(/\s+/g, "");
          if (!normalizedTitle.includes(normalizedQuery)) continue;

          // 🧩 محاولة جلب المعالج من صفحة الهاتف
          let chipset = "غير محدد";
          try {
            const phonePage = await fetch(link, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept-Language": "ar,en;q=0.9",
              },
            });

            if (phonePage.ok) {
              const phoneHtml = await phonePage.text();
              const $$ = cheerio.load(phoneHtml);

              let fullChipset =
                $$("tr:contains('المعالج') td.aps-attr-value span").text().trim() ||
                $$("tr:contains('المعالج') td.aps-attr-value").text().trim() ||
                "";

              fullChipset = fullChipset.replace(/\s+/g, " ").trim();
              const match = fullChipset.match(/[A-Za-z\u0600-\u06FF]+\s*[A-Za-z0-9\-]+/);
              chipset = match ? match[0].trim() : fullChipset;
            }
          } catch {}

          results.push({ title, link, img, chipset, source: "telfonak.com" });
        }
      }

      hasNext = $(".pagination .next, .nav-links .next").length > 0;
      page++;
    }

    if (results.length > 0) {
      // ✅ ترتيب النتائج حسب تطابق الاسم مع البحث
      results.sort((a, b) => {
        const aMatch = a.title.toLowerCase().includes(phone.toLowerCase());
        const bMatch = b.title.toLowerCase().includes(phone.toLowerCase());
        return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
      });

      res.status(200).json({ mode: "list", results });
    } else {
      res.status(404).json({
        error: "❌ لم يتم العثور على أي نتائج لهذا الاسم في الموقع.",
      });
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء الجلب:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب البيانات." });
  }
}
