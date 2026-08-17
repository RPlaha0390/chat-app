// Handles image uploads by returning the file's static URL. Multer
// stores the file to disk and decorates req.file; this handler wraps
// that into a response. Relies on the routes layer to handle auth
// and multer's file validation (type, size).
const { asyncHandler } = require('../utils/asyncHandler');

const handleUpload = asyncHandler(async (req, res) => {
  // req.file is undefined if multer's fileFilter rejected the file
  // (e.g., wrong MIME type) or if no file field was sent. Either way,
  // return 400 — caught by routes' uploadSingle wrapper to set .status.
  if (!req.file) {
    const err = new Error('No file uploaded, or file was rejected');
    err.status = 400;
    throw err;
  }

  // /uploads is served statically from app.js, so this path resolves
  // directly to the file on disk.
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

module.exports = { handleUpload };
