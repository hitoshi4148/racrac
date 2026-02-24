const http = require("http");
const router = require("./src/router");
const dataLoader = require("./src/services/dataLoader");

const PORT = process.env.PORT || 3000;

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

dataLoader.load();

const server = http.createServer((req, res) => {
  router(req, res);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
