// Express doesn't catch rejected promises from async route handlers on
// its own — without this, a thrown error inside an `async (req, res)`
// handler would crash the process instead of reaching errorHandler.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
