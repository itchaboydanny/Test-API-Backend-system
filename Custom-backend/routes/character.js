const express = require("express");
const router = express.Router();
const db = require("../db");

function mapCharacter(row) {
  return {
    CharacterId: row.id,
    UserId: row.user_id,
    FirstName: row.first_name,
    LastName: row.last_name,
    DateOfBirth: row.dob,
    Gender: row.gender,
    Cash: row.cash,
    DepartmentId: row.department_id,
    IsDeleted: row.is_deleted === 1,
    LastOnline: row.updated_at,
    DateCreated: row.created_at,
    Job: row.job,
    JobGrade: row.job_grade,
    Metadata: row.metadata ? JSON.parse(row.metadata) : {},
  };
}

router.get("/get/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.json([]);

    const [rows] = await db.query(
      "SELECT * FROM characters WHERE user_id = ? AND is_deleted = 0",
      [userId]
    );

    const deptMap = {
      1: { DepartmentId: 1, DepartmentTag: "LSPD", DepartmentName: "Los Santos Police Department" },
      2: { DepartmentId: 2, DepartmentTag: "BCSO", DepartmentName: "Blaine County Sheriff's Office" },
      3: { DepartmentId: 3, DepartmentTag: "SAHP", DepartmentName: "San Andreas Highway Patrol" },
      4: { DepartmentId: 4, DepartmentTag: "LSFD", DepartmentName: "Los Santos Fire Department" },
      6: { DepartmentId: 6, DepartmentTag: "CIV",  DepartmentName: "Civilian" }
    };

    const mapped = rows.map(row => {
      const deptId = row.department_id || 6;
      const departmentObj = deptMap[deptId] || deptMap[6];

      return {
        CharacterId: row.id,
        characterId: row.id,

        UserId: row.user_id,
        userId: row.user_id,

        FirstName: row.first_name,
        firstName: row.first_name,

        LastName: row.last_name,
        lastName: row.last_name,

        DateOfBirth: row.dob,
        dateOfBirth: row.dob,

        Gender: row.gender,
        gender: row.gender,

        Cash: row.cash,
        cash: row.cash,

        DepartmentId: deptId,
        departmentId: deptId,

        Department: departmentObj,        // ✅ REQUIRED FOR UI TO SHOW CHARACTER
        department: departmentObj,        // ✅ (extra compatibility)

        IsDeleted: row.is_deleted === 1,
        isDeleted: row.is_deleted === 1,

        LastOnline: row.updated_at,
        lastOnline: row.updated_at,

        DateCreated: row.created_at,
        dateCreated: row.created_at,

        Job: row.job,
        job: row.job,

        JobGrade: row.job_grade,
        jobGrade: row.job_grade,

        Properties: [],                   // ✅ prevents UI errors later
        properties: [],

        Metadata: row.metadata ? JSON.parse(row.metadata) : {},
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error("character get user error:", err);
    return res.json([]);
  }
});

router.get("/GetByIdAsync/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM characters WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows.length) return res.json(null);

    const row = rows[0];

    const deptMap = {
      1: { DepartmentId: 1, DepartmentTag: "LSPD", DepartmentName: "Los Santos Police Department" },
      2: { DepartmentId: 2, DepartmentTag: "BCSO", DepartmentName: "Blaine County Sheriff's Office" },
      3: { DepartmentId: 3, DepartmentTag: "SAHP", DepartmentName: "San Andreas Highway Patrol" },
      4: { DepartmentId: 4, DepartmentTag: "LSFD", DepartmentName: "Los Santos Fire Department" },
      6: { DepartmentId: 6, DepartmentTag: "CIV",  DepartmentName: "Civilian" }
    };

    const deptId = row.department_id || 6;
    const departmentObj = deptMap[deptId] || deptMap[6];

    // ✅ Pull bank accounts for this character
    const [accounts] = await db.query(
      "SELECT * FROM bank_accounts WHERE character_id=? AND is_deleted=0",
      [row.id]
    );

    const bankAccountsMapped = (accounts || []).map(a => ({
  AccountId: a.id,
  accountId: a.id,

  CharacterId: a.character_id,
  characterId: a.character_id,

  Name: a.account_name,
  name: a.account_name,

  Balance: Number(a.balance || 0),
  balance: Number(a.balance || 0),

  Bank: a.bank_name || "Fleeca Bank",
  bank: a.bank_name || "Fleeca Bank",

  IsFrozen: a.is_frozen === 1,
  isFrozen: a.is_frozen === 1,

  IsDeleted: a.is_deleted === 1,
  isDeleted: a.is_deleted === 1,
}));

    // ✅ Pull licenses if you have a table for them
    let licensesMapped = [];
    try {
      const [licenses] = await db.query(
        "SELECT * FROM character_licenses WHERE character_id=? AND is_deleted=0",
        [row.id]
      );

      licensesMapped = (licenses || []).map(l => ({
        CharacterLicenseId: l.id,
        characterLicenseId: l.id,

        CharacterId: l.character_id,
        characterId: l.character_id,

        LicenseType: l.license_type,
        licenseType: l.license_type,

        Status: l.status || "Valid",
        status: l.status || "Valid",

        DateIssued: l.date_issued,
        dateIssued: l.date_issued,

        DateExpired: l.date_expired,
        dateExpired: l.date_expired,

        IsDeleted: l.is_deleted === 1,
        isDeleted: l.is_deleted === 1,
      }));
    } catch (e) {
      // If the table doesn't exist yet, just return empty array
      licensesMapped = [];
    }

    return res.json({
      CharacterId: row.id,
      characterId: row.id,

      UserId: row.user_id,
      userId: row.user_id,

      FirstName: row.first_name,
      firstName: row.first_name,

      LastName: row.last_name,
      lastName: row.last_name,

      DateOfBirth: row.dob,
      dateOfBirth: row.dob,

      Gender: row.gender,
      gender: row.gender,

      Cash: Number(row.cash || 0),
      cash: Number(row.cash || 0),

      DepartmentId: deptId,
      departmentId: deptId,

      Department: departmentObj,
      department: departmentObj,

      IsDeleted: row.is_deleted === 1,
      isDeleted: row.is_deleted === 1,

      LastOnline: row.updated_at,
      lastOnline: row.updated_at,

      DateCreated: row.created_at,
      dateCreated: row.created_at,

      Job: row.job,
      job: row.job,

      JobGrade: Number(row.job_grade || 0),
      jobGrade: Number(row.job_grade || 0),

      Properties: [],
      properties: [],

      // ✅ THIS IS WHAT FIXES ATM + HUD
      BankAccounts: bankAccountsMapped,
      bankAccounts: bankAccountsMapped,

      // ✅ License system expects these arrays
      CharacterLicenses: licensesMapped,
      characterLicenses: licensesMapped,

      Metadata: row.metadata ? JSON.parse(row.metadata) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    });
  } catch (err) {
    console.error("GetByIdAsync error:", err);
    return res.json(null);
  }
});

router.post("/CreateCharacterAsync", async (req, res) => {
  try {
    const c = req.body;

    console.log("CREATE CHARACTER BODY:", c);

    const userId = c.UserId || c.userId || c.user_id;
    if (!userId) {
      return res.status(400).json({ error: "missing_user_id" });
    }

    const [result] = await db.query(
      `INSERT INTO characters (
        user_id,
        first_name,
        last_name,
        gender,
        dob,
        phone,
        cash,
        job,
        job_grade,
        department_id,
        is_deleted,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        userId,
        c.FirstName || c.firstName || c.first_name,
        c.LastName || c.lastName || c.last_name,
        c.Gender || c.gender || null,
        c.DateOfBirth || c.dob || null,
        c.phone || null,
        c.Cash || c.cash || 0,
        c.job || null,
        c.JobGrade || c.jobGrade || c.job_grade || 0,
        c.DepartmentId || c.departmentId || c.department_id || 6,
        JSON.stringify(c.Metadata || c.metadata || {})
      ]
    );

    const charId = result.insertId;

    // ✅ Auto-create default bank account
    await db.query(
      `INSERT INTO bank_accounts (character_id, account_name, account_number, balance, account_type, is_deleted)
       VALUES (?, 'Personal Account', CONCAT('ACCT', ?), 0, 'personal', 0)`,
      [charId, charId]
    );

    const [rows] = await db.query(
      "SELECT * FROM characters WHERE id = ? LIMIT 1",
      [charId]
    );

    console.log("✅ Character inserted:", rows[0]);
    return res.json(mapCharacter(rows[0]));
  } catch (err) {
    console.error("❌ CreateCharacterAsync error:", err);
    return res.status(500).json({ error: "InternalServerError" });
  }
});

router.put("/UpdateCharacterAsync/:id", async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  await db.query(
    `UPDATE characters
     SET first_name=?, last_name=?, dob=?, gender=?, phone=?, cash=?, job=?, job_grade=?, last_x=?, last_y=?, last_z=?, last_heading=?, metadata=?
     WHERE id=?`,
    [
      c.firstName || c.first_name,
      c.lastName || c.last_name,
      c.dob || null,
      c.gender || null,
      c.phone || null,
      c.cash ?? 0,
      c.job ?? null,
      c.jobGrade ?? c.job_grade ?? 0,
      c.lastX ?? c.last_x ?? null,
      c.lastY ?? c.last_y ?? null,
      c.lastZ ?? c.last_z ?? null,
      c.lastHeading ?? c.last_heading ?? null,
      JSON.stringify(c.metadata ?? {}),
      id
    ]
  );
  const [rows] = await db.query("SELECT * FROM characters WHERE id=?", [id]);
  res.json(rows[0]);
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM characters WHERE id=?", [id]);
  res.json(true);
});

router.get("/GetCashAsync/:id", async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query("SELECT cash FROM characters WHERE id=? LIMIT 1", [id]);
  res.json(rows.length ? rows[0].cash : 0);
});

router.get("/UpdateCashAsync/:id/:cash", async (req, res) => {
  const { id, cash } = req.params;
  await db.query("UPDATE characters SET cash=? WHERE id=?", [cash, id]);
  res.json(true);
});

router.get("/GetBankAccountsByCharacterIdAsync/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM bank_accounts WHERE character_id=? AND is_deleted=0",
      [id]
    );

    const mapped = rows.map(r => ({
  AccountId: r.id,
  accountId: r.id,

  CharacterId: r.character_id,
  characterId: r.character_id,

  Name: r.account_name,
  name: r.account_name,

  Balance: Number(r.balance || 0),
  balance: Number(r.balance || 0),

  Bank: r.bank_name || "Fleeca Bank",
  bank: r.bank_name || "Fleeca Bank",

  IsFrozen: r.is_frozen === 1,
  isFrozen: r.is_frozen === 1,

  IsDeleted: r.is_deleted === 1,
  isDeleted: r.is_deleted === 1,
}));

    return res.json(mapped);
  } catch (err) {
    console.error("GetBankAccountsByCharacterIdAsync error:", err);
    return res.json([]);
  }
});

router.post("/CreateBankAccountAsync", async (req, res) => {
  try {
    const b = req.body || {};

    const characterId =
      b.characterId ||
      b.CharacterId ||
      b.character_id ||
      b.characterID ||
      b.CharacterID;

    if (!characterId) {
      console.log("❌ CreateBankAccountAsync missing characterId. BODY:", b);
      return res.status(400).json({ error: "missing_character_id" });
    }

    const accountName = b.accountName || b.Name || b.account_name || "Personal Account";
    const bank = b.bank || b.Bank || b.bank_name || "Maze Bank";

    const [result] = await db.query(
      `INSERT INTO bank_accounts 
        (character_id, account_name, account_number, balance, account_type, is_deleted)
       VALUES (?, ?, CONCAT('ACCT', ?), 0, ?, 0)`,
      [
        characterId,
        accountName,
        characterId,
        b.accountType || b.AccountType || b.account_type || "personal"
      ]
    );

    const [rows] = await db.query(
      "SELECT * FROM bank_accounts WHERE id=? LIMIT 1",
      [result.insertId]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ CreateBankAccountAsync error:", err);
    return res.status(500).json({ error: "InternalServerError" });
  }
});

router.get("/UpdateBankAccountBalanceAsync/:accountId/:newBalance", async (req, res) => {
  const { accountId, newBalance } = req.params;
  await db.query("UPDATE bank_accounts SET balance=? WHERE id=?", [newBalance, accountId]);
  res.json(true);
});

module.exports = router;
