require("dotenv").config(); // ✅ MUST be first

const express = require("express");
const app = express();

app.use(express.json());

// ✅ ROUTES
const userRoutes = require("./routes/user");
const propertyRoutes = require("./routes/property");
const characterRoutes = require("./routes/character");
const vehicleRoutes = require("./routes/vehicle"); // ✅ if you have this file

const licenseRoutes = require("./routes/license");
app.use("/api/license", licenseRoutes);

// ✅ request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ API KEY MIDDLEWARE
function apiKeyMiddleware(req, res, next) {
  const key = req.headers["x-doj-apikey"];

  // ✅ These are the ONLY endpoints that should bypass
  // (things the framework calls BEFORE key is set / during bootstrap)
  const bypassRoutes = [
    "/api/user/GetUserBySteamIdAsync",
    "/api/user/Current",

    "/api/property/GetPropertiesAsync",
    "/api/property/GetAddressesAsync",

    "/api/character/get/user",        // gets character list
    "/api/character/CreateCharacterAsync", // allows creating character

    "/api/character/GetBankAccountsByCharacterIdAsync",
"/api/character/GetCashAsync",
  ];

  const isBypass = bypassRoutes.some(route =>
    req.originalUrl.startsWith(route)
  );

  // ✅ bypass route
  if (isBypass) {
    console.log("⚠️ API KEY BYPASS:", req.originalUrl);
    return next();
  }

  // ✅ enforce key on everything else
  if (!key) {
    console.log("❌ Missing X-DOJ-APIKey header");
    return res.status(401).json({ error: "missing_api_key" });
  }

  if (!process.env.DOJ_API_KEY) {
    console.log("❌ DOJ_API_KEY is missing from .env");
    return res.status(500).json({ error: "server_missing_env_key" });
  }

  if (key !== process.env.DOJ_API_KEY) {
    console.log("❌ Invalid API Key:", key);
    console.log("✅ Expected Key:", process.env.DOJ_API_KEY);
    return res.status(403).json({ error: "invalid_api_key" });
  }

  console.log("✅ API KEY OK:", key.substring(0, 8) + "...");
  next();
}

// ✅ apply middleware ONLY to /api
app.use("/api", apiKeyMiddleware);

// ✅ ROUTE MOUNTING
app.use("/api/user", userRoutes);
app.use("/api/property", propertyRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/vehicle", vehicleRoutes); // ✅ only if route exists

// ✅ ROOT TEST
app.get("/", (req, res) => res.send("API Running"));

// ✅ START
app.listen(3000, () => {
  console.log("✅ API running on port 3000");
  console.log("✅ Loaded DOJ_API_KEY:", process.env.DOJ_API_KEY ? "YES" : "NO");
});