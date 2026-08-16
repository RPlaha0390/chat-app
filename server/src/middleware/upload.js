// Configures multer once so uploadController and any future caller
// share the same storage/limits/filetype rules instead of redefining
// them. Kept in its own file per the spec's note that upload handling
// should stay swappable (e.g. to Cloudinary storage) without touching
// the controller or routes.
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    // Prefix with a timestamp to avoid collisions between two uploads
    // with the same original filename.
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { upload };
