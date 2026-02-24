const dataLoader = require("./dataLoader");
const { normalize } = require("../utils/normalize");
const { getRowsByRegNo, getCombinedTargetTextFromRows, getRacListFromRows } = require("./detailService");

function isTargetMatched(aTargetText, bTargetText) {
  if (!aTargetText || !bTargetText) return false;
  return aTargetText.includes(bTargetText) || bTargetText.includes(aTargetText);
}

function findRecommendedRotations(regNo) {
  const sourceRows = getRowsByRegNo(regNo);
  if (sourceRows.length === 0) return [];

  const sourceTargetText = getCombinedTargetTextFromRows(sourceRows);
  const sourceRacSet = new Set(getRacListFromRows(sourceRows).map(r => `${r.rac_type}-${r.rac_code}`));
  if (!sourceTargetText) return [];

  const pesticideList = dataLoader.getPesticideList();
  const regNos = new Set(pesticideList.map(row => String(row["登録番号"])));
  const result = [];

  regNos.forEach(candidateRegNo => {
    if (String(candidateRegNo) === String(regNo)) return;

    const candidateRows = getRowsByRegNo(candidateRegNo);
    if (candidateRows.length === 0) return;

    const candidateTargetText = getCombinedTargetTextFromRows(candidateRows);
    if (!isTargetMatched(sourceTargetText, candidateTargetText)) return;

    const candidateRacSet = new Set(
      getRacListFromRows(candidateRows).map(r => `${r.rac_type}-${r.rac_code}`)
    );

    for (const racCode of candidateRacSet) {
      if (sourceRacSet.has(racCode)) {
        return;
      }
    }

    const head = candidateRows[0];
    const racCodes = Array.from(candidateRacSet);
    result.push({
      登録番号: String(head["登録番号"]),
      農薬の名称_x: head["農薬の名称_x"] || head["農薬の名称"] || "－",
      正式名称: head["正式名称"] || "－",
      適用病害虫雑草名: normalize(head["適用病害虫雑草名"] || ""),
      racCodes
    });
  });

  return result;
}

module.exports = { findRecommendedRotations };
