import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const phone = req.query.phone || req.url.split("?phone=")[1];
    if (!phone) return res.status(400).json({ error: "Missing phone parameter" });

    // تحويل الاسم إلى شكل رابط الموقع (slug)
    const slug = decodeURIComponent(phone)
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();

    const url = `https://telfonak.com/${slug}/`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`فشل في جلب الصفحة (${response.status})`);

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();
    const specs = {};

    $(".specs-table tr").each((_, el) => {
      const key = $(el).find("th").text().trim();
      const value = $(el).find("td").text().trim();
      if (key && value) specs[key] = value;
    });

    if (Object.keys(specs).length === 0) {
      $("li").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(":")) {
          const [k, v] = text.split(":");
          specs[k.trim()] = v.trim();
        }
      });
    }

    if (!title) throw new Error("لم يتم العثور على الهاتف المطلوب.");

    res.status(200).json({
      success: true,
      source: url,
      title,
      specs
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
