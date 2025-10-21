import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "يرجى إدخال اسم الهاتف." });

  try {
    // 🟢 البحث داخل موقع telfonak.com باستخدام Google
    const searchUrl = `https://www.google.com/search?q=site:telfonak.com+${encodeURIComponent(phone)}&hl=ar`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $("a").each((_, el) => {
      const link = $(el).attr("href");
      const title = $(el).text().trim();
      const img = $(el).find("img").attr("src");

      // 🔍 تصفية الروابط الخاصة بموقع telfonak فقط
      if (link && link.includes("telfonak.com") && title && !link.includes("/search?")) {
        results.push({
          title: title.replace(/\s+-\s+تلفونك.*/g, "").trim(),
          link: link.split("&sa=")[0].replace("/url?q=", ""),
          img: img || null,
          source: "telfonak.com",
        });
      }
    });

    // إذا وجد نتائج بحث
    if (results.length > 0) {
      res.status(200).json({ mode: "list", results });
      return;
    }

    // 🟡 في حال لم يوجد نتائج، نحاول جلب صفحة الهاتف مباشرة
    const directUrl = `https://telfonak.com/${encodeURIComponent(phone)}/`;
    const pageRes = await fetch(directUrl);
    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      const $$ = cheerio.load(pageHtml);

      const title = $$("h1.entry-title").text().trim() || phone;
      const img = $$(".entry-content img").first().attr("src") || null;
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
        source: directUrl,
      });
      return;
    }

    res.status(404).json({ error: "❌ لم يتم العثور على أي نتائج لهذا الاسم في الموقع." });
  } catch (err) {
    console.error("خطأ أثناء الجلب:", err);
    res.status(500).json({ error: "⚠️ حدث خطأ أثناء جلب البيانات." });
  }
}
