const express = require("express");
const router = express.Router();
const db = require("../db");

function cleanSteam(input) {
  if (!input) return "";
  return input
    .replace("steam:", "")
    .replace("license:", "")
    .replace("discord:", "")
    .trim();
}

function mapCharacter(row) {
  let meta = {};
  try { meta = row.metadata ? JSON.parse(row.metadata) : {}; } catch {}

  return {
    // ✅ IDs
    CharacterId: row.id,
    characterId: row.id,

    UserId: row.user_id,
    userId: row.user_id,

    // ✅ Names
    FirstName: row.first_name,
    firstName: row.first_name,

    LastName: row.last_name,
    lastName: row.last_name,

    // ✅ DOB / Gender
    DateOfBirth: row.dob,
    dateOfBirth: row.dob,

    Gender: row.gender,
    gender: row.gender,

    // ✅ Money
    Cash: row.cash,
    cash: row.cash,

    // ✅ Department
    DepartmentId: row.department_id,
    departmentId: row.department_id,

    // ✅ Flags
    IsDeleted: row.is_deleted === 1,
    isDeleted: row.is_deleted === 1,

    // ✅ Dates
    LastOnline: row.updated_at,
    lastOnline: row.updated_at,

    DateCreated: row.created_at,
    dateCreated: row.created_at,

    // ✅ Job
    Job: row.job,
    job: row.job,

    JobGrade: row.job_grade,
    jobGrade: row.job_grade,

    // ✅ Metadata
    Metadata: meta,
    metadata: meta,
  };
}

function mapUser(row) {
  const permInt = row.permissions == null ? 0 : parseInt(row.permissions, 10);
  const authorized = parseInt(row.is_authorized ?? 1, 10);

  return {
    UserId: row.id,
    userId: row.id,
    id: row.id,

    SteamId: row.steam_id,
    steamId: row.steam_id,
    steam_id: row.steam_id,

    Username: row.username || row.steam_id,
    username: row.username || row.steam_id,

    IsAuthorized: authorized,
    isAuthorized: authorized,

    Department: row.department || "CIV",
    department: row.department || "CIV",

    Rank: row.rank || "Player",
    rank: row.rank || "Player",

    Permissions: permInt,
    permissions: permInt,

    Departments: [],
    departments: [],

    Characters: [],
    characters: [],
  };
}

router.get("/GetUserBySteamIdAsync/:steamId", async (req, res) => {
  try {
    const steamId = cleanSteam(req.params.steamId);
    console.log("[GetUserBySteamIdAsync] cleaned:", steamId);

    const [users] = await db.query(
      "SELECT * FROM users WHERE steam_id = ? LIMIT 1",
      [steamId]
    );

    let userRow;
    if (users.length > 0) {
      userRow = users[0];
    } else {
      await db.query(
        `INSERT INTO users (steam_id, username, is_authorized, department, rank, permissions)
         VALUES (?, ?, 1, 'CIV', 'Player', 0)`,
        [steamId, steamId]
      );

      const [newUsers] = await db.query(
        "SELECT * FROM users WHERE steam_id = ? LIMIT 1",
        [steamId]
      );

      userRow = newUsers[0];
    }

    const user = mapUser(userRow);

    const [chars] = await db.query(
      "SELECT * FROM characters WHERE user_id = ? AND is_deleted = 0",
      [user.UserId]
    );

    user.Characters = chars.map(mapCharacter);

    // ✅ departments must match character DepartmentIds or UI filters them out
    const deptIds = [...new Set(user.Characters.map(c => c.DepartmentId).filter(Boolean))];

    user.Departments = deptIds.length
      ? deptIds.map((id, idx) => ({
          DepartmentId: id,
          DepartmentTag: id === 6 ? "CIV" : `DEPT${id}`,
          IsPrimary: idx === 0,
          IsActive: true,
        }))
      : [
          {
            DepartmentId: 6,
            DepartmentTag: "CIV",
            IsPrimary: true,
            IsActive: true,
          },
        ];

    if (!user.Departments.some(d => d.IsPrimary)) user.Departments[0].IsPrimary = true;

    // ✅ IMPORTANT: RAW USER OBJECT (no wrapper)
    return res.json(user);
  } catch (err) {
    console.error("GetUserBySteamIdAsync error:", err);
    return res.status(500).json(null);
  }
});

/**
 * GET /api/user/GetCharactersByUserIdAsync/:userId
 * Framework calls this AFTER user loads to populate character list.
 */
router.get("/GetCharactersByUserIdAsync/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.json([]);

    const [chars] = await db.query(
      "SELECT * FROM characters WHERE user_id = ? AND is_deleted = 0",
      [userId]
    );

    // must return array of framework-shaped characters
    const mapped = chars.map(mapCharacter);

    return res.json(mapped);
  } catch (err) {
    console.error("GetCharactersByUserIdAsync error:", err);
    return res.json([]); // never break the UI flow
  }
});

// not used by framework for this flow, but keep safe
router.get("/Current", async (req, res) => res.json(null));

module.exports = router;