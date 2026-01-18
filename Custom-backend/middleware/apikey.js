module.exports = function (req, res, next) {
  // 🔓 LOCAL DEV BYPASS
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const hdr = req.headers['x-doj-apikey'];

  if (!hdr) {
    console.log("❌ Missing X-DOJ-APIKey header");
    return res.status(401).json({ error: "missing_api_key" });
  }

  const expected = process.env.DOJ_API_KEY;

  if (!expected) {
    console.log("⚠️ DOJ_API_KEY env missing on server");
    return res.status(500).json({ error: "server_key_missing" });
  }

  if (hdr !== expected) {
    console.log("❌ Invalid API key");
    return res.status(403).json({ error: "invalid_api_key" });
  }

  next();
};