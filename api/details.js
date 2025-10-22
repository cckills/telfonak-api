import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "يرجى إدخال رابط الهاتف." });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "ar,en;q=0.9",
      },
    });

    if (!response.ok)
      return res.status(404).json({ error: "❌ الرابط غير صالح أو لا يعمل." });

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("h1.entry-title").text().trim() || "غير محدد";
    const img =
      $(".entry-content img").first().attr("src") ||
      $(".post-thumbnail img").attr("src") ||
      "";

    const specs = {};
    $("table tr").each((_, tr) => {
      const key = $(tr).find("td:first-child").text().trim();
      const val = $(tr).find("td:last-child").text().trim();
      if (key && val) specs[key] = val;
    });

    res.status(200).json({
      title,
      img,
      specs,
      source: url,
    });
  } catch (err) {
    console.error("⚠️ خطأ أثناء جلب التفاصيل:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب بيانات الهاتف." });
  }
}
