
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video' && !allowedVideoTypes.includes(file.mimetype)) {
    return cb(new Error('Only mp4, mov, or webm videos are allowed.'));
  }
  if (file.fieldname === 'thumbnail' && !allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Only jpeg, png, or webp images are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

function uploadToS3(buffer, mimetype, folder) {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('video') ? 'video' : 'image';
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

function getSignedUrl(url) {
  return url;
}

module.exports = { upload, uploadToS3, getSignedUrl };
