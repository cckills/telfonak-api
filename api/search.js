// search.js

// 🧠 دوال مساعدة
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "") // إزالة الرموز
    .replace(/\s+/g, " ") // توحيد المسافات
    .trim();
}

function filterResults(results, query) {
  const seen = new Set();
  const normalizedQuery = normalizeText(query);

  return results.filter(item => {
    const name = normalizeText(item.title || "");
    if (seen.has(name)) return false;
    seen.add(name);

    return (
      name.includes(normalizedQuery) ||
      normalizedQuery.includes(name) ||
      normalizedQuery.split(" ").some(q => name.includes(q))
    );
  });
}

// 🔍 دالة البحث الرئيسية
export async function searchPhones(query) {
  if (!query) return [];

  const response = await fetch(`/api/details?query=${encodeURIComponent(query)}`);
  const data = await response.json();

  // تأكد أن البيانات تحتوي على results أو مصفوفة
  const phones = data.results || data || [];

  // ✨ تصفية النتائج وإزالة المكررات
  const filtered = filterResults(phones, query);

  return filtered;
}
