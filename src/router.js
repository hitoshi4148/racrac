const fs = require("fs");
const url = require("url");
const path = require("path");
const { search } = require("./services/searchService");
const { getDetail } = require("./services/detailService");
const { findSameGroupPesticides } = require("./services/racGroupService");
const { findRecommendedRotations } = require("./services/rotationService");
const { findPesticidesIncludingSameGroup } = require("./services/sameGroupService");

const PUBLIC_DIR = path.join(__dirname, "../public");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function router(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname === "/api/search") {
    const pesticideKeyword = parsed.query.pesticideKeyword || "";
    const targetKeyword = parsed.query.targetKeyword || "";
    const results = search(pesticideKeyword, targetKeyword);
    console.log("検索:", pesticideKeyword, targetKeyword, "ヒット:", results.length);
    sendJson(res, 200, results);
    return;
  }

  if (pathname === "/api/detail") {
    const regNo = parsed.query.regNo || parsed.query.reg;
    if (!regNo) { sendJson(res, 400, { error: "regNo が必要です" }); return; }
    const result = getDetail(regNo);
    if (!result) { sendJson(res, 404, { error: "not found" }); return; }
    sendJson(res, 200, result);
    return;
  }

  if (pathname === "/api/racgroup") {
    const type = parsed.query.type;
    const code = parsed.query.code;
    if (!type || !code) { sendJson(res, 400, { error: "type と code が必要です" }); return; }
    const same = findSameGroupPesticides(type, code);
    sendJson(res, 200, same);
    return;
  }

  if (pathname === "/api/rotation") {
    const regNo = parsed.query.regNo || parsed.query.reg;
    if (!regNo) { sendJson(res, 400, { error: "regNo が必要です" }); return; }
    const rotations = findRecommendedRotations(regNo);
    sendJson(res, 200, rotations);
    return;
  }

  if (pathname === "/api/samegroup") {
    const regNo = parsed.query.regNo || parsed.query.reg;
    if (!regNo) { sendJson(res, 400, { error: "regNo が必要です" }); return; }
    const result = findPesticidesIncludingSameGroup(regNo);
    sendJson(res, 200, result);
    return;
  }

  // --- 静的ファイル配信 ---
  let filePath = pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, pathname);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType + "; charset=utf-8" });
    res.end(data);
  });
}

module.exports = router;
