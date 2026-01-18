const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * LEGACY ROUTES
 * These exist only to support old core.framework calls.
 * They map old endpoints → new DB logic.
 */

// ✅ core.framework calls: "character/license"
router.get("/character/license", async (req, res) => {
  try {
    // If core sends characterId via query (?characterId=17)
    const charId =
      parseInt(req.query.characterId, 10) ||
      parseInt(req.query.id, 10) ||
      parseInt(req.query.character_id, 10);

    // If core sends it via header (common)
    const headerId = parseInt(req.headers["characterid"], 10);

    const characterId = charId || headerId;

    if (!characterId) return res.json([]);

    const [licenses] = await db.query(
      "SELECT * FROM character_licenses WHERE character_id=? AND is_deleted=0",
      [characterId]
    );

    const mapped = (licenses || []).map(l => ({
      CharacterLicenseId: l.id,
      characterLicenseId: l.id,

      CharacterId: l.character_id,
      characterId: l.character_id,

      // ✅ DMV expects LicenseType.Description
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

    return res.json(mapped);
  } catch (err) {
    console.error("legacy character/license error:", err);
    return res.json([]);
  }
});


// ✅ core.framework calls: "property/getPropertyByCharacterAsync/:id"
router.get("/property/getPropertyByCharacterAsync/:id", async (req, res) => {
  try {
    const characterId = parseInt(req.params.id, 10);
    if (!characterId) return res.json([]);

    // If you DO have a properties table, map it here.
    // Otherwise return [] so the core stops erroring.
    const [rows] = await db.query(
      "SELECT * FROM character_properties WHERE character_id=? AND is_deleted=0",
      [characterId]
    ).catch(() => [ [] ]);

    return res.json(rows || []);
  } catch (err) {
    console.error("legacy property/getPropertyByCharacterAsync error:", err);
    return res.json([]);
  }
});

module.exports = router;