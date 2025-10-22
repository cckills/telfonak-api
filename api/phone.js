import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "يرجى إدخال اسم الهاتف." });

  try {
    const results = [];
    let page = 1;
    let hasNext = true;

    // 🔁 التكرار على صفحات البحث
    while (hasNext && page <= 5) {
      const searchUrl = `https://telfonak.com/page/${page}/?s=${encodeURIComponent(phone)}`;
      console.log("⏳ Fetching:", searchUrl);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept-Language": "ar,en;q=0.9",
        },
      });

      if (!response.ok) break;
      const html = await response.text();
      const $ = cheerio.load(html);
      const items = $(".media");

      if (items.length === 0) {
        hasNext = false;
        break;
      }

      // ✅ استخدم for..of لدعم await
      for (const el of items.toArray()) {
        const link = $(el).find("a.image-link").attr("href");
        const title = $(el).find("a.image-link").attr("title");
        const img =
          $(el).find("span.img").attr("data-bgsrc") ||
          $(el).find("img").attr("src");

        if (link && title) {
          try {
            // 🧠 جلب صفحة الهاتف لمعرفة المعالج
            const phonePage = await fetch(link, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept-Language": "ar,en;q=0.9",
              },
            });

            if (phonePage.ok) {
              const phoneHtml = await phonePage.text();
              const $$ = cheerio.load(phoneHtml);

              // 🧠 استخراج المعالج وتحديد المختصر والتلميح
              let fullChipset =
                $$("tr:contains('المعالج') td.aps-attr-value span").text().trim() ||
                $$("tr:contains('المعالج') span.aps-1co").text().trim() ||
                "";

              let shortChipset = fullChipset;
              let chipsetTooltip = "";

              // 🎯 تنظيف النص من رموز غير مفيدة
              fullChipset = fullChipset.replace(/\s+/g, " ").trim();

              if (fullChipset) {
                // ✅ نأخذ أول جزئين فقط ليظهر كاختصار (مثلاً: Kirin 710F)
                const match = fullChipset.match(/^([\u0600-\u06FFA-Za-z0-9\+\-\_ ]{3,20})/);
                shortChipset = match ? match[1].trim() : fullChipset;

                // ✨ الباقي يوضع في التلميح فقط
                chipsetTooltip = fullChipset !== shortChipset ? fullChipset : "";
              }

              results.push({
                title,
                link,
                img,
                chipset: shortChipset || "غير محدد",
                chipsetTooltip,
                source: "telfonak.com",
              });
            }
          } catch (err) {
            console.error("⚠️ خطأ أثناء جلب صفحة الهاتف:", err.message);
          }
        }
      }

      // 🔄 تحقق من وجود صفحة تالية
      hasNext = $(".pagination .next, .nav-links .next").length > 0;
      page++;
    }

    // ✅ إذا وجد نتائج
    if (results.length > 0) {
      res.status(200).json({ mode: "list", results });
      return;
    }

    // 🟡 إذا لم توجد نتائج نحاول صفحة الهاتف مباشرة
    const phoneUrl = `https://telfonak.com/${encodeURIComponent(phone)}/`;
    const pageRes = await fetch(phoneUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "ar,en;q=0.9",
      },
    });

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

    res.status(404).json({
      error: "❌ لم يتم العثور على أي نتائج لهذا الاسم في الموقع.",
    });
  } catch (err) {
    console.error("⚠️ خطأ أثناء الجلب:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب البيانات." });
  }
}
