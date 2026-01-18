const express = require("express");
const router = express.Router();
const db = require("../db");



// ✅ LEGACY SUPPORT: core.framework calls GET /property/GetPropertyByCharacterAsync/:id
router.get("/GetPropertyByCharacterAsync/:id", async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    if (!characterId) return res.json([]);

    // If you don’t have a property table yet, return [] so core stops erroring.
    const [rows] = await db.query(
      "SELECT * FROM character_properties WHERE character_id=? AND is_deleted=0",
      [characterId]
    ).catch(() => [ [] ]);

    return res.json(rows || []);
  } catch (err) {
    console.error("GET /property/GetPropertyByCharacterAsync error:", err);
    return res.json([]);
  }
});


router.get("/getPropertyByCharacterAsync/:id", async (req, res) => {
  req.params.id = req.params.id;
  return router.handle(req, res);
});


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