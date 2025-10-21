import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Missing phone name" });

    const url = `https://telfonak.com/${phone}/`;
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();
    const specs = {};

    // استخراج المواصفات من عناصر الصفحة
    $(".specs-table tr").each((_, el) => {
      const key = $(el).find("th").text().trim();
      const value = $(el).find("td").text().trim();
      if (key && value) specs[key] = value;
    });

    // fallback في حال لم توجد .specs-table
    if (Object.keys(specs).length === 0) {
      $("li").each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes(":")) {
          const [k, v] = text.split(":");
          specs[k.trim()] = v.trim();
        }
      });
    }

    return res.status(200).json({
      success: true,
      source: url,
      title,
      specs
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
