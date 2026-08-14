import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 English Simplify Backend running at http://localhost:${PORT}`);
  console.log(`📡 Health check endpoint: http://localhost:${PORT}/api/v1/simplify/health`);
});
