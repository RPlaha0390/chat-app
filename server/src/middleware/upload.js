// Configures multer once so uploadController and any future caller
// share the same storage/limits/filetype rules instead of redefining
// them. Kept in its own file per the spec's note that upload handling
// should stay swappable (e.g. to Cloudinary storage) without touching
// the controller or routes.
const multer = require('multer');
const path = require('path');

// The only image types we accept, mapped to the extension we will store
// them under. Deriving the extension from the (verified-against-this-map)
// mimetype rather than from the client's filename means an upload can
// never land on disk as `.html`/`.svg`/`.js` and get served back as
// executable content from the API origin.
const ALLOWED_MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// Strips directory components (`../`, absolute paths) that multer does
// NOT sanitize out of a client-supplied `originalname`, then removes the
// extension — we append our own — and anything that isn't a plain
// filename character, so the stored name can only ever be a leaf inside
// the uploads directory.
function safeBaseName(originalname) {
  const base = path.basename(originalname || '');
  const withoutExt = base.slice(0, base.length - path.extname(base).length);
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned || 'upload';
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    // Prefix with a timestamp to avoid collisions between two uploads
    // with the same original filename.
    cb(null, `${Date.now()}-${safeBaseName(file.originalname)}${ALLOWED_MIME_EXTENSIONS[file.mimetype]}`);
  },
});

function fileFilter(req, file, cb) {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_MIME_EXTENSIONS, file.mimetype)) {
    return cb(new Error('Only PNG, JPEG, GIF and WebP image uploads are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { upload };
