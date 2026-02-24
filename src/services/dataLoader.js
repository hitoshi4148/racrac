const fs = require("fs");
const path = require("path");

let pesticideList = [];
let pesticideData = {};

function load() {
  try {
    const turfPath = process.env.PESTICIDES_JSON_PATH
      ? path.resolve(process.env.PESTICIDES_JSON_PATH)
      : path.join(__dirname, "../../data/pesticides_target.json");
    console.log("Loading JSON:", turfPath);
    if (!fs.existsSync(turfPath)) throw new Error("pesticides_turf.json が見つかりません。");
    pesticideList = JSON.parse(fs.readFileSync(turfPath, "utf8"));
    console.log("pesticides_turf.json loaded. Count:", pesticideList.length);
  } catch (e) {
    console.error("pesticides_turf.json の読み込みに失敗:", e.message);
    process.exit(1);
  }

  try {
    const dataPath = process.env.RAC_JSON_PATH
      ? path.resolve(process.env.RAC_JSON_PATH)
      : path.join(__dirname, "../../data/pesticide_rac_target.json");
    console.log("Loading JSON:", dataPath);
    if (!fs.existsSync(dataPath)) throw new Error("pesticide_data.json が見つかりません。");
    pesticideData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    console.log("pesticide_data.json loaded.");
  } catch (e) {
    console.error("pesticide_data.json の読み込みに失敗:", e.message);
    process.exit(1);
  }
}

function getPesticideList() {
  return pesticideList;
}

function getPesticideData() {
  return pesticideData;
}

module.exports = { load, getPesticideList, getPesticideData };
