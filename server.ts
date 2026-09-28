// ℹ️ Loads environment variables from a .env file into process.env (must be the first import)
import "dotenv/config";

// Imports Express (a Node.js framework for handling HTTP requests) and initializes the server
import express from "express";
const app = express();

// ℹ️ Loads and applies global middleware (CORS, JSON parsing, etc.) for server configurations
import config from "./config/index.js";
config(app);

// ℹ️ Test Route. Can be left and used for waking up the server if idle
app.get("/", (req, res) => {
  res.json("All good in here");
});

// 👇 Defines and applies route handlers
import indexRouter from "./routes/index.routes.js";
app.use("/api", indexRouter);

// ❗ Centralized error handling (must be placed after routes)
import handleErrors from "./errors/index.js";
handleErrors(app);

// ℹ️ Defines the server port (default: 5005)
const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`Server listening. Local access on http://localhost:${PORT}`);
});

// ℹ️ Exported for serverless deployments like Vercel
export default app;
