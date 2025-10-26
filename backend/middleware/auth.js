const admin = require("firebase-admin");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "No token" });
  const token = authHeader.split(" ")[1];
  admin
    .auth()
    .verifyIdToken(token)
    .then((dt) => {
      req.firebaseUid = dt.uid;
      next();
    })
    .catch(() => res.status(401).json({ error: "Invalid token" }));
}
function requireRole(...roles) {
  return (req, res, next) => {
    // assumes role resolved earlier and attached to req.currentUserRole
    if (!roles.includes(req.currentUserRole))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
module.exports = { authenticate, requireRole };
