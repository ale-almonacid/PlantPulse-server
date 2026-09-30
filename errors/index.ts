import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { Prisma } from "../generated/prisma/client.js";
import { InvalidFileTypeError } from "../middleware/cloudinary.middleware.js";

// ℹ️ Middleware to handle 404 and generic errors in the application

function handleErrors(app: Express) {
  // ℹ️ Handles requests to undefined routes (404 Not Found)
  app.use((req: Request, res: Response) => {
    res.status(404).json({ message: "This route does not exist" });
  });

  // ℹ️ Centralized generic error handling middleware. whenever you call next(error), this middleware will handle the error
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // always logs the error
    console.error("ERROR", req.method, req.path, err);

    if (res.headersSent) return;

    // ℹ️ Known Prisma errors => clearer status codes. Full list: https://pris.ly/d/prisma-errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2000") {
        res.status(400).json({ message: "A value is too long (max: name 100, species 150, wateringAmount 100 characters)" });
        return;
      }
      if (err.code === "P2025") {
        res.status(404).json({ message: "Record not found" });
        return;
      }
      if (err.code === "P2003") {
        res.status(400).json({ message: "Related record does not exist (check the ids you sent)" });
        return;
      }
      if (err.code === "P2007") {
        res.status(400).json({ message: "Invalid data format (e.g. an id that is not a valid UUID)" });
        return;
      }
    }
    // ℹ️ File upload errors (multer) => 400 with a clear message
    if (err instanceof multer.MulterError) {
      const messages: Record<string, string> = {
        LIMIT_UNEXPECTED_FILE: `Unexpected file field "${err.field}". Send the image in a field called "image"`,
        LIMIT_FILE_SIZE: "Image is too big (max 5 MB)",
      };
      res.status(400).json({ message: messages[err.code] ?? err.message });
      return;
    }
    if (err instanceof InvalidFileTypeError) {
      res.status(400).json({ message: err.message });
      return;
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      res.status(400).json({ message: "Invalid data sent (check field names and types)" });
      return;
    }

    // Sends a generic server error response
    res.status(500).json({
      message: "Internal server error. Check the server console for details",
    });
  });
}

export default handleErrors;
