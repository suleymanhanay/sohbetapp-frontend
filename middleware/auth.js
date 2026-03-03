const jwt = require("jsonwebtoken");
const S = process.env.JWT_SECRET || "sohbet_secret_2024";
const auth = (req, res, next) => { try { req.user = jwt.verify(req.headers.authorization?.replace("Bearer ",""), S); next(); } catch { res.status(401).json({error:"Yetkisiz"}); }};
const admin = (req, res, next) => { if(req.user.role!=="admin") return res.status(403).json({error:"Yetki yok"}); next(); };
module.exports = { auth, admin };
