import express, { type Express } from "express";
import logger from "morgan";
import cors from "cors";

// Middleware configuration
function config(app: Express) {
  // ℹ️ Enables Express to trust reverse proxies (e.g., when deployed behind services like Heroku or Vercel)
  app.set("trust proxy", 1);

  // ℹ️ Configures CORS to allow requests only from the specified origin
  app.use(
    cors({
      origin: [process.env.ORIGIN as string],
    })
  );

  // ℹ️ Logs requests in the development environment
  app.use(logger("dev"));

  // ℹ️ Parses incoming JSON requests
  app.use(express.json());

  // ℹ️ Parses incoming request bodies with URL-encoded data (form submissions)
  app.use(express.urlencoded({ extended: false }));
}

export default config;
