const crypto = require("crypto");

const token = crypto.randomBytes(24).toString("base64url");
const hash = crypto.createHash("sha256").update(token).digest("hex");

console.log("Admin token (dung mot lan de luu):");
console.log(token);
console.log("");
console.log("ADMIN_ELEVATION_TOKEN_HASH (luu vao .env.local hoac Vercel env):");
console.log(hash);
