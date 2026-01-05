const express = require("express");
const router = express.Router();
const db = require("../db");

// GET licenses
router.get("/GetLicensesByCharacterIdAsync/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.json([]);

  const [rows] = await db.query(
    "SELECT * FROM character_licenses WHERE character_id=? AND is_deleted=0",
    [id]
  );

  res.json(rows || []);
});

// CREATE license
router.post("/CreateLicenseAsync", async (req, res) => {
  const l = req.body;

  const charId = l.CharacterId || l.characterId || l.character_id;
  const type = l.LicenseType || l.licenseType || l.license_type;

  if (!charId || !type) return res.status(400).json({ error: "missing_fields" });

  const [result] = await db.query(
    `INSERT INTO character_licenses (character_id, license_type, status, date_issued, date_expired, is_deleted)
     VALUES (?, ?, 'Valid', NOW(), NULL, 0)`,
    [charId, type]
  );

  const [rows] = await db.query("SELECT * FROM character_licenses WHERE id=?", [result.insertId]);
  res.json(rows[0]);
});

module.exports = router;