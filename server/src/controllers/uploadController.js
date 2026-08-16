const { asyncHandler } = require('../utils/asyncHandler');

const handleUpload = asyncHandler(async (req, res) => {
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
