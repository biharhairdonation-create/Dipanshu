const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Store in memory, then push to S3 manually (gives more control over private ACL + signed URLs)
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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB per file
});

// Uploads a buffer to a private S3 bucket, returns the object key (not a public URL)
async function uploadToS3(buffer, mimetype, folder) {
  const key = `${folder}/${crypto.randomUUID()}${path.extname(mimetype.split('/')[1] ? '.' + mimetype.split('/')[1] : '')}`;
  await s3
    .putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'private' // videos are never public — always served via signed URL
    })
    .promise();
  return key;
}

// Generates a temporary signed URL so only paying/subscribed users can stream a video
function getSignedUrl(key, expiresInSeconds = 3600) {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Expires: expiresInSeconds
  });
}

module.exports = { upload, uploadToS3, getSignedUrl };
