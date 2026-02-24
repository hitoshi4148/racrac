const dataLoader = require("./dataLoader");
const { getRacListFromRows } = require("./detailService");

function buildRowsByRegNoMap() {
  const pesticideList = dataLoader.getPesticideList();
  const map = new Map();
  pesticideList.forEach(row => {
    const regNo = String(row["登録番号"]);
    if (!map.has(regNo)) map.set(regNo, []);
    map.get(regNo).push(row);
  });
  return map;
}

function getRacCodesFromRows(rows) {
  return Array.from(new Set(getRacListFromRows(rows).map(r => `${r.rac_type}-${r.rac_code}`)));
}

function findPesticidesIncludingSameGroup(regNo) {
  const rowsByRegNo = buildRowsByRegNoMap();
  const sourceRows = rowsByRegNo.get(String(regNo)) || [];
  if (sourceRows.length === 0) return [];

  const sourceRacCodes = getRacCodesFromRows(sourceRows);
  const sourceRacSet = new Set(sourceRacCodes);
  const out = [];

  for (const [candidateRegNo, candidateRows] of rowsByRegNo.entries()) {
    if (candidateRegNo === String(regNo)) continue;
    const candidateRacCodes = getRacCodesFromRows(candidateRows);
    const matchedRacCodes = candidateRacCodes.filter(code => sourceRacSet.has(code));
    if (matchedRacCodes.length === 0) continue;

    const head = candidateRows[0];
    out.push({
      登録番号: candidateRegNo,
      農薬の名称_x: head["農薬の名称_x"] || head["農薬の名称"] || "－",
      正式名称: head["正式名称"] || "－",
      racCodes: candidateRacCodes,
      matchedRacCodes
    });
  }

  return out;
}

module.exports = { findPesticidesIncludingSameGroup };
