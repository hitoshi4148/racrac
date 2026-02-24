const { normalize } = require("../utils/normalize");
const dataLoader = require("./dataLoader");

function getComponentsFromRow(row) {
  const comps = new Set();
  if (row["有効成分"]) comps.add(String(row["有効成分"]).trim());
  Object.keys(row).forEach(k => {
    if (k && k.startsWith("有効成分") && typeof row[k] === "string") {
      const v = row[k].trim();
      if (v && !v.includes("総使用回数") && !v.includes("を含む")) {
        comps.add(v);
      }
    }
  });
  return Array.from(comps).filter(Boolean);
}

function findRacByComponents(components) {
  const pesticideData = dataLoader.getPesticideData();
  const racList = [];
  const seen = new Set();
  const typeKeys = Object.keys(pesticideData);

  components.forEach(comp => {
    const nc = normalize(comp);
    typeKeys.forEach(typeKey => {
      const arr = pesticideData[typeKey] || [];
      arr.forEach(r => {
        const ex = normalize(r.examples || "");
        if (!ex) return;
        if (nc.includes(ex) || ex.includes(nc)) {
          const keyId = `${r.rac_type}-${r.rac_code}`;
          if (!seen.has(keyId)) {
            seen.add(keyId);
            racList.push({
              key: keyId,
              rac_type: r.rac_type,
              rac_code: r.rac_code,
              group_name: r.group_name,
              made_of_action: r.made_of_action,
              examples: r.examples,
              remarks: r.remarks
            });
          }
        }
      });
    });
  });

  return racList;
}

function getRacListFromRows(rows) {
  const allComponents = new Set();
  rows.forEach(r => {
    getComponentsFromRow(r).forEach(c => allComponents.add(c));
  });
  return findRacByComponents(Array.from(allComponents));
}

function getRowsByRegNo(regNo) {
  const pesticideList = dataLoader.getPesticideList();
  return pesticideList.filter(e => String(e["登録番号"]) === String(regNo));
}

function getNormalizedTargetsFromRows(rows) {
  const targets = new Set();
  rows.forEach(row => {
    const targetFields = [
      row["適用対象"],
      row["適用病害虫名"],
      row["適用病害虫雑草名"]
    ];
    targetFields.forEach(v => {
      const n = normalize(v || "");
      if (n) targets.add(n);
    });
  });
  return Array.from(targets);
}

function getCombinedTargetTextFromRows(rows) {
  return getNormalizedTargetsFromRows(rows).join("|");
}

function getDetail(regNo) {
  const detailRows = getRowsByRegNo(regNo);
  if (detailRows.length === 0) return null;

  const racList = getRacListFromRows(detailRows);

  const detail = detailRows.map(row => ({
    登録番号: row["登録番号"],
    用途_x: row["用途_x"] || "－",
    農薬の種類_x: row["農薬の種類_x"] || row["農薬の種類"] || "－",
    農薬の名称_x: row["農薬の名称_x"] || row["農薬の名称"] || "－",
    正式名称: row["正式名称"] || "－",
    作物名: row["作物名"] || "－",
    適用場所: row["適用場所"] || "－",
    適用病害虫雑草名: row["適用病害虫雑草名"] || "－",
    有効成分: row["有効成分"] || "－",
    濃度: row["濃度"] || "－",
    希釈倍数使用量: row["希釈倍数使用量"] || "－",
    散布液量: row["散布液量"] || "－",
    使用時期: row["使用時期"] || "－",
    総使用回数: row["有効成分①を含む農薬の総使用回数"] || row["有効成分1を含む農薬の総使用回数"] || row["総使用回数"] || "－",
    使用方法: row["使用方法"] || "－"
  }));

  return { detail, racList };
}

module.exports = {
  getDetail,
  getComponentsFromRow,
  getRacListFromRows,
  getRowsByRegNo,
  getNormalizedTargetsFromRows,
  getCombinedTargetTextFromRows
};
