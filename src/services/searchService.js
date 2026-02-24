const { normalize } = require("../utils/normalize");
const dataLoader = require("./dataLoader");
const { getRacListFromRows } = require("./detailService");

function toSearchText(values) {
  return values.map(v => normalize(v || "")).filter(Boolean).join("|");
}

function search(pesticideKeyword, targetKeyword) {
  const nPesticideKeyword = normalize(pesticideKeyword);
  const nTargetKeyword = normalize(targetKeyword);
  if (!nPesticideKeyword && !nTargetKeyword) return [];

  const pesticideList = dataLoader.getPesticideList();
  const unique = [];
  const seen = new Set();
  let debugCount = 0;

  console.log("[search-debug] pesticideKeyword:", nPesticideKeyword);
  console.log("[search-debug] targetKeyword:", nTargetKeyword);

  pesticideList.forEach(e => {
    const fieldValues = {
      適用対象: e["適用対象"] || "",
      適用病害虫名: e["適用病害虫名"] || "",
      適用病害虫雑草名: e["適用病害虫雑草名"] || "",
      作物名: e["作物名"] || "",
      用途: e["用途_x"] || e["用途_y"] || "",
      農薬名称: e["農薬の名称_x"] || e["農薬の名称_y"] || e["農薬の名称"] || "",
      メーカー名: e["正式名称"] || ""
    };

    const pesticideSearchText = toSearchText([
      fieldValues.農薬名称,
      fieldValues.メーカー名,
      fieldValues.用途,
      fieldValues.作物名
    ]);
    const targetSearchText = toSearchText([
      fieldValues.適用対象,
      fieldValues.適用病害虫名,
      fieldValues.適用病害虫雑草名,
      fieldValues.作物名,
      fieldValues.用途,
      fieldValues.農薬名称
    ]);

    if (debugCount < 25) {
      debugCount += 1;
      console.log("[search-debug] compare:", {
        regNo: String(e["登録番号"] || ""),
        pesticideKeyword: nPesticideKeyword,
        targetKeyword: nTargetKeyword,
        fields: fieldValues
      });
    }

    const pesticideMatch = !nPesticideKeyword || pesticideSearchText.includes(nPesticideKeyword);
    const targetMatch = !nTargetKeyword || targetSearchText.includes(nTargetKeyword);

    if (!pesticideMatch || !targetMatch) return;

    const reg = String(e["登録番号"]);
    if (!seen.has(reg)) {
      seen.add(reg);
      const rows = pesticideList.filter(row => String(row["登録番号"]) === reg);
      const racCodes = getRacListFromRows(rows).map(r => `${r.rac_type}-${r.rac_code}`);
      unique.push({
        登録番号: reg,
        用途_x: e["用途_x"] || "－",
        農薬の名称_x: e["農薬の名称_x"] || e["農薬の名称"] || "－",
        正式名称: e["正式名称"] || "－",
        適用病害虫雑草名: e["適用病害虫雑草名"] || "－",
        racCodes
      });
      console.log("[search-debug] hit:", reg, e["農薬の名称_x"] || e["農薬の名称"] || "");
    }
  });

  return unique;
}

module.exports = { search };
