const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * Create a DMV-compatible VehicleRegistration object
 */
function buildRegistration(vehicleId, characterId, deptId, registeredDate) {
  return {
    VehicleRegistrationId: 0,
    VehicleId: vehicleId,
    CharacterId: characterId,
    DateRegistered: registeredDate,
    DepartmentId: deptId,
    ExpiryDate: null,
    Vehicle: null
  };
}

/**
 * Convert DB vehicle row -> DMV Vehicle object
 * MUST include Registrations array or C# will crash on .First()
 */
function buildVehicleObject(row, reg) {
  return {
    VehicleId: row.id,
    IsDeleted: row.is_deleted === 1,
    IsDestroyed: row.is_destroyed === 1,
    IsEmergencyVeh: row.is_emergencyveh === 1,
    IsImpounded: row.is_impounded === 1,
    IsPoliceVeh: row.is_policeveh === 1,
    IsSpawned: row.is_spawned === 1,

    LicensePlate: row.plate,
    LocX: row.locx ?? 0,
    LocY: row.locy ?? 0,
    LocZ: row.locz ?? 0,

    ModelName: row.model,
    PrimaryColor: row.primary_color ?? "Unknown",
    SecondaryColor: row.secondary_color ?? "Unknown",

    IsStolen: row.is_stolen === 1,
    IsWanted: row.is_wanted === 1,

    // ✅ CRITICAL: must contain at least 1 registration
    Registrations: [reg]
  };
}

/**
 * ✅ CreateVehicleAsync (DMV UI)
 * returns VEHICLE object (C# parses Vehicle from json)
 */
router.post("/CreateVehicleAsync", async (req, res) => {
  try {
    const v = req.body || {};

    const characterId =
      v.CharacterId ||
      v.characterId ||
      v.character_id ||
      v?.Registrations?.[0]?.CharacterId ||
      v?.registrations?.[0]?.CharacterId;

    const deptId =
      v?.Registrations?.[0]?.DepartmentId ||
      v?.registrations?.[0]?.DepartmentId ||
      v.DepartmentId ||
      v.departmentId ||
      6;

    if (!characterId) {
      console.log("❌ missing characterId. BODY:", v);
      return res.status(400).json(null);
    }

    const model = v.ModelName || v.modelName || v.Model || v.model;
    const plate = v.LicensePlate || v.licensePlate || v.plate || v.Plate;

    if (!model || !plate) {
      console.log("❌ missing model/plate", { model, plate });
      return res.status(400).json(null);
    }

    const trimmedPlate = plate.trim();

    // ✅ Prevent duplicates by plate
    const [existing] = await db.query(
      "SELECT * FROM vehicles WHERE plate=? LIMIT 1",
      [trimmedPlate]
    );

    if (existing.length) {
      const reg = buildRegistration(existing[0].id, characterId, deptId, new Date(existing[0].created_at));
      const vehicleObj = buildVehicleObject(existing[0], reg);
      return res.json(vehicleObj);
    }

    // ✅ Insert into vehicles
    const [result] = await db.query(
      `INSERT INTO vehicles
        (character_id, model, plate, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [characterId, model, trimmedPlate]
    );

    const vehicleId = result.insertId;

    // ✅ Insert into vehicle_registrations (NO character_id column)
    await db.query(
  `INSERT INTO vehicle_registrations
    (vehicle_id, registration_status, issued_at, expires_at, metadata, created_at, updated_at)
   VALUES (?, 'Valid', NOW(), NULL, ?, NOW(), NOW())`,
  [result.insertId, JSON.stringify({
    characterId: characterId,
    plate: finalPlate,
    model: model
  })]
);

    const [rows] = await db.query("SELECT * FROM vehicles WHERE id=?", [vehicleId]);

    const reg = buildRegistration(vehicleId, characterId, deptId, new Date(rows[0].created_at));
    const vehicleObj = buildVehicleObject(rows[0], reg);

    return res.json(vehicleObj);
  } catch (err) {
    console.error("❌ CreateVehicleAsync error:", err);
    return res.status(500).json(null);
  }
});

/**
 * ✅ GetVehiclesByCharacterAsync
 * MUST return list of VehicleRegistration objects (NOT vehicles)
 */
router.get("/GetVehiclesByCharacterAsync/:characterId", async (req, res) => {
  try {
    const { characterId } = req.params;

    // pull registrations tied to this characterId from metadata and join vehicle
    const [rows] = await db.query(
      `
      SELECT 
        vr.id AS VehicleRegistrationId,
        vr.vehicle_id,
        vr.registration_status,
        vr.issued_at,
        vr.expires_at,
        vr.metadata,
        v.*
      FROM vehicle_registrations vr
      JOIN vehicles v ON v.id = vr.vehicle_id
      WHERE JSON_EXTRACT(vr.metadata, '$.characterId') = ?
        AND v.is_deleted = 0
      ORDER BY vr.issued_at DESC
      `,
      [characterId]
    );

    const output = rows.map((row) => {
      // ✅ turn vr row into the structure your UI expects
      const reg = {
        VehicleRegistrationId: row.VehicleRegistrationId,
        vehicleRegistrationId: row.VehicleRegistrationId,

        VehicleId: row.vehicle_id,
        vehicleId: row.vehicle_id,

        CharacterId: Number(characterId),
        characterId: Number(characterId),

        DepartmentId: 6,
        departmentId: 6,

        DateRegistered: row.issued_at,
        dateRegistered: row.issued_at,

        ExpiryDate: row.expires_at,
        expiryDate: row.expires_at,

        Status: row.registration_status,
        status: row.registration_status,

        IsDeleted: false,
        isDeleted: false
      };

      // ✅ attach vehicle object like the old DMV expects
      reg.Vehicle = {
        VehicleId: row.id,
        vehicleId: row.id,

        LicensePlate: row.plate,
        licensePlate: row.plate,

        ModelName: row.model,
        modelName: row.model,

        PrimaryColor: row.color || "Unknown",
        primaryColor: row.color || "Unknown",

        IsDeleted: row.is_deleted === 1,
        isDeleted: row.is_deleted === 1,

        IsStolen: false,
        isStolen: false
      };

      return reg;
    });

    return res.json(output);
  } catch (err) {
    console.error("❌ GetVehiclesByCharacterAsync error:", err);
    return res.json([]);
  }
});

/**
 * ✅ DeleteVehicleAsync
 * MUST return boolean true/false (C# expects bool)
 */
router.post("/DeleteVehicleAsync", async (req, res) => {
  try {
    const body = req.body || {};

    const vehicleId =
      body.VehicleId ||
      body.vehicleId ||
      body.id ||
      body.ID;

    if (!vehicleId) {
      console.log("❌ DeleteVehicleAsync missing vehicleId. BODY:", body);
      return res.json(false);
    }

    const [result] = await db.query(
      "UPDATE vehicles SET is_deleted=1 WHERE id=?",
      [vehicleId]
    );

    if (result.affectedRows === 0) {
      console.log("❌ DeleteVehicleAsync vehicle not found:", vehicleId);
      return res.json(false);
    }

    return res.json(true);
  } catch (err) {
    console.error("❌ DeleteVehicleAsync error:", err);
    return res.json(false);
  }
});

module.exports = router;