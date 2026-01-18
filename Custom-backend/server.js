require("dotenv").config(); // MUST be first

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: [
    "http://192.168.0.55:4200",
    "http://localhost:4200"
  ],
  credentials: true,
}));

/* =========================
   REQUEST LOGGER
========================= */
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

/* =========================
   ROUTES
========================= */

const userRoutes = require("./routes/user");
const propertyRoutes = require("./routes/property");
const characterRoutes = require("./routes/character");
const vehicleRoutes = require("./routes/vehicle");
const licenseRoutes = require("./routes/license");

/* =========================
   LOCAL DEV LOGIN (V4)
========================= */

app.post("/api/v4/auth/login/local", (req, res) => {
  // MUST match an existing users.steam_id
  const steamId = "steam:11000014baa95f7";

  res.cookie("dojrp_steam", steamId, {
  httpOnly: false,
  sameSite: "none",   // 🔑 REQUIRED
  secure: false       // ok for HTTP dev
});

  console.log("✅ Local login cookie set:", steamId);
  res.json({ ok: true });
});

/* =========================
   CURRENT USER (V4)
========================= */

app.get("/api/v4/users/current", async (req, res) => {
  const raw = req.cookies?.dojrp_steam;

  if (!raw) {
    console.log("❌ No dojrp_steam cookie");
    return res.status(401).json(null);
  }

  const steamId = raw
    .replace("steam:", "")
    .replace("license:", "")
    .replace("discord:", "")
    .trim();

  const db = require("./db");

  const [rows] = await db.query(
    "SELECT * FROM users WHERE steam_id = ? LIMIT 1",
    [steamId]
  );

  if (!rows.length) {
    console.log("❌ User not found for steam:", steamId);
    return res.status(401).json(null);
  }

  const user = rows[0];

  console.log("✅ Current user resolved:", user.username);

  res.json({
    id: user.id,
    userId: user.id,
    steamId: user.steam_id,
    username: user.username || user.steam_id,
    rank: user.rank || "Player",
    department: user.department || "CIV",
    permissions: Number(user.permissions ?? 0),
    isAuthorized: Number(user.is_authorized ?? 1),
  });
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/v4/health", (req, res) => {
  res.json({
    status: "ok",
    cookies: req.cookies,
    time: new Date().toISOString(),
  });
});

/* =========================
   DARlEN / LEGACY ROUTES
========================= */

// with /api prefix
app.use("/api/user", userRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/license", licenseRoutes);

// without /api prefix (FiveM core compatibility)
app.use("/user", userRoutes);
app.use("/property", propertyRoutes);
app.use("/character", characterRoutes);
app.use("/vehicle", vehicleRoutes);
app.use("/license", licenseRoutes);

// legacy root router
app.use("/", require("./routes/legacy"));

/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {
  res.send("API Running");
});

/* =========================
   START SERVER
========================= */

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log("✅ Loaded DOJ_API_KEY:", process.env.DOJ_API_KEY ? "YES" : "NO");
});