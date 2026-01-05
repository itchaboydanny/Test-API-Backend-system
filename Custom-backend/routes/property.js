const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/GetPropertiesAsync", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM properties WHERE is_deleted=0");
    res.json(rows); // ✅ RAW array
  } catch (e) {
    console.error("GetPropertiesAsync error:", e);
    res.json([]); // ✅ never block framework
  }
});

router.get("/GetAddressesAsync", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM addresses");
    res.json(rows); // ✅ RAW array
  } catch (e) {
    console.error("GetAddressesAsync error:", e);
    res.json([]);
  }
});

module.exports = router;