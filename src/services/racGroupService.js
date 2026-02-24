const { normalize } = require("../utils/normalize");
const dataLoader = require("./dataLoader");
const { getComponentsFromRow } = require("./detailService");

function findSameGroupPesticides(type, code) {
  const pesticideData = dataLoader.getPesticideData();
  const pesticideList = dataLoader.getPesticideList();

  const arr = pesticideData[type.toLowerCase()] || [];
  const groupEntries = arr.filter(r =>
    String(r.rac_type) === String(type) && String(r.rac_code) === String(code)
  );

  const same = [];
  groupEntries.forEach(r => {
    const example = normalize(r.examples || "");
    if (!example) return;
    pesticideList.forEach(p => {
      const comps = getComponentsFromRow(p);
      for (const c of comps) {
        const nc = normalize(c);
        if (nc.includes(example) || example.includes(nc)) {
          same.push({
            登録番号: p["登録番号"],
            農薬の名称_x: p["農薬の名称_x"],
            正式名称: p["正式名称"]
          });
          break;
        }
      }
    });
  });

  const uniq = {};
  same.forEach(e => { uniq[e.登録番号] = e; });
  return Object.values(uniq);
}

module.exports = { findSameGroupPesticides };
