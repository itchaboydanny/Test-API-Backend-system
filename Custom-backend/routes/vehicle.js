const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/CreateVehicleAsync", async (req, res) => {
  const v = req.body;
  const [result] = await db.query(
    `INSERT INTO vehicles (character_id, model, plate, garage, stored, fuel, engine_health, body_health, colors, mods, damage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      v.characterId || v.character_id,
      v.model,
      v.plate,
      v.garage || null,
      v.stored ?? 1,
      v.fuel ?? 100,
      v.engineHealth ?? v.engine_health ?? 1000,
      v.bodyHealth ?? v.body_health ?? 1000,
      JSON.stringify(v.colors ?? {}),
      JSON.stringify(v.mods ?? {}),
      JSON.stringify(v.damage ?? {})
    ]
  );
  const [rows] = await db.query("SELECT * FROM vehicles WHERE id=?", [result.insertId]);
  res.json(rows[0]);
});

router.get("/GetVehiclesByCharacterAsync/:characterId", async (req, res) => {
  const { characterId } = req.params;
  const [rows] = await db.query("SELECT * FROM vehicles WHERE character_id=? AND is_deleted=0", [characterId]);
  res.json(rows);
});

router.put("/UpdateVehicleAsync/:vehicleId", async (req, res) => {
  const { vehicleId } = req.params;
  const v = req.body;
  await db.query(
    `UPDATE vehicles
     SET garage=?, stored=?, fuel=?, engine_health=?, body_health=?, colors=?, mods=?, damage=?
     WHERE id=?`,
    [
      v.garage ?? null,
      v.stored ?? 1,
      v.fuel ?? 100,
      v.engineHealth ?? v.engine_health ?? 1000,
      v.bodyHealth ?? v.body_health ?? 1000,
      JSON.stringify(v.colors ?? {}),
      JSON.stringify(v.mods ?? {}),
      JSON.stringify(v.damage ?? {}),
      vehicleId
    ]
  );
  const [rows] = await db.query("SELECT * FROM vehicles WHERE id=?", [vehicleId]);
  res.json(rows[0]);
});

router.get("/searchExact/:plate", async (req, res) => {
  const { plate } = req.params;
  const [rows] = await db.query("SELECT * FROM vehicles WHERE plate=? LIMIT 1", [plate]);
  res.json(rows.length ? rows[0] : null);
});

router.get("/search/:plate", async (req, res) => {
  const { plate } = req.params;
  const [rows] = await db.query("SELECT * FROM vehicles WHERE plate LIKE ?", [`%${plate}%`]);
  res.json(rows);
});

module.exports = router;
