import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ℹ️ Multer reads the file from the form-data request and keeps it in memory (req.file.buffer)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    // only accept images (jpg, png, webp...)
    cb(null, file.mimetype.startsWith("image/"));
  },
});

// ℹ️ Sends the file in memory to Cloudinary and returns its data (secure_url, public_id...)
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
  uploadToCloudinary,
  cloudinary, // Exported to allow file deletion via SDK (cloudinary.uploader.destroy)
};
