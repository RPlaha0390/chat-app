const express = require('express');
const { upload } = require('../middleware/upload');
const { handleUpload } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer's fileFilter errors (e.g. wrong type) surface as a generic
// Error, not one with .status set — this wrapper maps that to 400
// instead of falling through to errorHandler's default 500.
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      err.status = 400;
      return next(err);
    }
    next();
  });
}

router.post('/', requireAuth, uploadSingle, handleUpload);

module.exports = router;
