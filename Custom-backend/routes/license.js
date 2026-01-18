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

  const mapped = (rows || []).map(l => ({
    CharacterLicenseId: l.id,
    characterLicenseId: l.id,

    CharacterId: l.character_id,
    characterId: l.character_id,

    LicenseType: { Description: l.license_type },
    licenseType: { description: l.license_type },

    Status: l.status || "Valid",
    status: l.status || "Valid",

    DateIssued: l.date_issued,
    dateIssued: l.date_issued,

    DateExpired: l.date_expired,
    dateExpired: l.date_expired,

    IsDeleted: l.is_deleted === 1,
    isDeleted: l.is_deleted === 1,
  }));

  res.json(mapped);
});

// CREATE license
router.post("/CreateLicenseAsync", async (req, res) => {
  const l = req.body || {};

  const charId =
    l.CharacterId || l.characterId || l.character_id;

  // ✅ Accept either LicenseType string OR LicenseTypeId numeric
  const typeId =
    l.LicenseTypeId || l.licenseTypeId || l.license_type_id;

  let type =
    l.LicenseType || l.licenseType || l.license_type;

  // ✅ Map DMV LicenseTypeId -> string
  if (!type && typeId) {
    if (Number(typeId) === 1) type = "Driver's License";
    else if (Number(typeId) === 2) type = "Firearm License";
    else if (Number(typeId) === 3) type = "Fishing License";
    else type = `LicenseType-${typeId}`;
  }

  if (!charId || !type) {
    return res.status(400).json({ error: "missing_fields", charId, type, typeId });
  }

  const [result] = await db.query(
    `INSERT INTO character_licenses
      (character_id, license_type, status, date_issued, date_expired, is_deleted)
     VALUES (?, ?, 'Valid', NOW(), NULL, 0)`,
    [charId, type]
  );

  const [rows] = await db.query(
    "SELECT * FROM character_licenses WHERE id=?",
    [result.insertId]
  );

  res.json(rows[0]);
});


module.exports = router;