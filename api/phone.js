import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  if (!phone)
    return res.status(400).json({ error: "يرجى إدخال اسم الهاتف أو الطراز." });

  try {
    const results = [];
    const uniqueTitles = new Set();
    let page = 1;
    let hasNext = true;

    const normalize = (t) =>
      t.toLowerCase().replace(/[^\w\u0600-\u06FF\-]/g, "").trim();
    const normalizedQuery = normalize(phone);

    while (hasNext && page <= 5) {
      const searchUrl =
        page === 1
          ? `https://telfonak.com/?s=${encodeURIComponent(phone)}`
          : `https://telfonak.com/page/${page}/?s=${encodeURIComponent(phone)}`;

      const response = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en;q=0.9" },
      });
      if (!response.ok) break;

      const html = await response.text();
      const $ = cheerio.load(html);
      const items = $(".media, .post, article");
      if (items.length === 0) { hasNext = false; break; }

      for (const el of items.toArray()) {
        const link = $(el).find("a.image-link").attr("href");
        const title =
          $(el).find("a.image-link").attr("title") ||
          $(el).find("h2 a").text().trim();
        const img =
          $(el).find("span.img").attr("data-bgsrc") ||
          $(el).find("img").attr("src") ||
          "https://telfonak.com/wp-content/uploads/2023/12/huawei-y9-prime-2019.webp";

        if (!link || !title || uniqueTitles.has(title)) continue;
        uniqueTitles.add(title);

        const normalizedTitle = normalize(title);
        const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
        const quickMatch = queryWords.every((word) => normalizedTitle.includes(word));
        if (!quickMatch) continue;

        let chipset = "غير محدد";
        let model = "غير محدد";
        let matched = false;

        try {
          const phonePage = await fetch(link, {
            headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ar,en;q=0.9" },
          });

          if (phonePage.ok) {
            const phoneHtml = await phonePage.text();
            const $$ = cheerio.load(phoneHtml);

            model =
              $$("li:contains('الموديل') span").text().trim() ||
              $$("li:contains('الطراز') span").text().trim() ||
              $$("tr:contains('الموديل') td:last-child").text().trim() ||
              $$("tr:contains('الطراز') td:last-child").text().trim() ||
              "غير محدد";

            const fullChipset =
              $$("tr:contains('المعالج') td.aps-attr-value span").text().trim() ||
              $$("tr:contains('المعالج') td.aps-attr-value").text().trim() ||
              "";
            const match = fullChipset.match(/[A-Za-z\u0600-\u06FF]+\s*[A-Za-z0-9\-]+/);
            chipset = match ? match[0].trim() : fullChipset || "غير محدد";

            const normalizedModel = normalize(model);
            matched = queryWords.every(
              (word) => normalizedTitle.includes(word) || normalizedModel.includes(word)
            );
          }
        } catch (err) {
          console.error("⚠️ خطأ أثناء قراءة صفحة الهاتف:", err.message);
        }

        if (matched) {
          results.push({ title, link, img, model, chipset, source: "telfonak.com" });
        }
      }

      hasNext = $(".pagination .next, .nav-links .next").length > 0;
      page++;
    }

    if (results.length > 0) {
      results.sort((a, b) => {
        const aMatch = normalize(a.title).includes(normalizedQuery);
        const bMatch = normalize(b.title).includes(normalizedQuery);
        return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
      });
      res.status(200).json({ mode: "list", results });
    } else {
      res.status(404).json({ error: "❌ لم يتم العثور على أي نتائج بهذا الاسم أو الطراز." });
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء الجلب:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب البيانات." });
  }
}
