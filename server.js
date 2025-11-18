import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();
const LOG_PATH = path.join(__dirname, "data", "logs.json");

app.use(express.json());
app.use(express.static(__dirname));

function readLogs() {
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

function buildSummary(logs) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let monthBottles = 0;
  let monthAmount = 0;
  let yearBottles = 0;
  let yearAmount = 0;

  logs.forEach((log) => {
    const d = new Date(log.date);
    if (Number.isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = d.getMonth();
    const count = log.count || 1;
    const price = typeof log.price === "number" ? log.price : 0;

    if (y === currentYear) {
      yearBottles += count;
      yearAmount += price;
      if (m === currentMonth) {
        monthBottles += count;
        monthAmount += price;
      }
    }
  });

  return {
    monthBottles,
    monthAmount,
    yearBottles,
    yearAmount,
  };
}

app.get("/api/logs", (_req, res) => {
  res.json({ logs: readLogs() });
});

app.post("/api/logs", (req, res) => {
  const { date, price, count } = req.body || {};
  if (!date) {
    return res.status(400).json({ error: "date 필드는 필수입니다." });
  }
  const cleanPrice = Number.isFinite(price) ? price : 0;
  const cleanCount = Number.isFinite(count) ? count : 1;

  const logs = readLogs();
  logs.push({
    date,
    price: cleanPrice,
    count: cleanCount,
  });
  writeLogs(logs);
  res.status(201).json({ success: true });
});

app.get("/api/summary", (_req, res) => {
  const logs = readLogs();
  res.json(buildSummary(logs));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
