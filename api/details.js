import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "يرجى إدخال رابط الهاتف." });

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "ar,en;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(404).json({ error: "لم يتم العثور على الصفحة المطلوبة." });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // عنوان الهاتف
    const title = $("h1, h2").first().text().trim() || "غير محدد";

    // صورة الهاتف
    const img =
      $("span.img").attr("data-bgsrc") ||
      $("img").first().attr("src") ||
      "https://telfonak.com/wp-content/uploads/2023/12/huawei-y9-prime-2019.webp";

    // تجميع المواصفات من الجداول والقوائم
    const specs = {};
    $("tr").each((i, el) => {
      const key = $(el).find("th, td:first-child").text().trim();
      const val = $(el).find("td:last-child").text().trim();
      if (key && val) specs[key] = val;
    });

    $("li").each((i, el) => {
      const text = $(el).text().trim();
      const [key, val] = text.split(/[:\-]/).map(s => s.trim());
      if (key && val) specs[key] = val;
    });

    // ضمان وجود بعض الخصائص الأساسية
    if (!specs["المعالج"]) {
      const processor =
        $("tr:contains('المعالج') td.aps-attr-value span").text().trim() ||
        $("tr:contains('المعالج') td.aps-attr-value").text().trim() ||
        "غير محدد";
      specs["المعالج"] = processor;
    }

    if (!specs["الموديل"] && !specs["الطراز"]) {
      const model =
        $("li:contains('الموديل') span").text().trim() ||
        $("li:contains('الطراز') span").text().trim() ||
        "غير محدد";
      specs["الموديل"] = model;
    }

    res.status(200).json({
      title,
      img,
      specs,
      source: url,
    });
  } catch (err) {
    console.error("⚠️ خطأ أثناء جلب تفاصيل الهاتف:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب التفاصيل." });
  }
}
