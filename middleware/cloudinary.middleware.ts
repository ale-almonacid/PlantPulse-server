import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ℹError sent when the uploaded file is not an image (handled in errors/index.ts => 400)
class InvalidFileTypeError extends Error {}

// Multer reads the file from the form-data request and keeps it in memory (req.file.buffer)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    // only accept images. Checks the type AND the extension (some clients send images as "application/octet-stream")
    const isImage = file.mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(file.originalname);

    if (!isImage) {
      cb(new InvalidFileTypeError(`"${file.originalname}" is not an image (allowed: jpg, png, webp, gif, avif, heic)`));
      return;
    }
    cb(null, true);
  },
});

// Sends the file in memory to Cloudinary and returns its data (secure_url, public_id...)
function uploadToCloudinary(buffer: Buffer, folder = "plantpulse-plants"): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export {
  uploadImage,
  InvalidFileTypeError,
  uploadToCloudinary,
  cloudinary, // Exported to allow file deletion via SDK (cloudinary.uploader.destroy)
};
