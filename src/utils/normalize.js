function normalize(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .toLowerCase();
}

module.exports = { normalize };
