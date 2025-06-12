const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Steam proxy is running' });
});

// Endpoint untuk sinkronisasi daftar game Steam ke file lokal
app.get("/api/sync-steam-apps", async (req, res) => {
  try {
    const url = "https://api.steampowered.com/ISteamApps/GetAppList/v2/";
    const response = await fetch(url);
    const data = await response.json();
    fs.writeFileSync(
      path.join(__dirname, "steam-apps.json"),
      JSON.stringify(data.applist.apps, null, 2)
    );
    res.json({
      message: "Daftar game Steam berhasil di-sync!",
      total: data.applist.apps.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal sinkronisasi daftar game Steam" });
  }
});

app.get("/api/appdetails", async (req, res) => {
  const { appids } = req.query;
  if (!appids) return res.status(400).json({ error: "Missing appids" });

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appids}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from Steam API" });
  }
});

// Endpoint search yang mencari di steam-apps.json lokal
app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing query" });
  let allApps = [];
  try {
    allApps = JSON.parse(
      fs.readFileSync(path.join(__dirname, "steam-apps.json"))
    );
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Daftar game lokal belum tersedia, silakan sync dulu." });
  }
  // Cari game yang namanya mengandung query (case-insensitive)
  const matches = allApps.filter((app) =>
    app.name.toLowerCase().includes(query.toLowerCase())
  );
  // Ambil max 10 hasil, lalu ambil appid-nya
  const appids = matches.slice(0, 10).map((app) => app.appid);
  res.json(appids);
});

app.listen(PORT, () => {
  console.log(`Steam proxy running on port ${PORT}`);
});
