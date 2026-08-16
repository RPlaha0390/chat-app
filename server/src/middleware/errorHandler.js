// Single place that turns any thrown/next(err) error into a consistent
// { status, message } JSON shape, so the client never has to parse a
// raw stack trace. Controllers just do `next(err)` or throw inside an
// async handler wrapped by asyncHandler (added in Task 3).
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  // Log the real error server-side even when we hide details from the client.
  if (status === 500) console.error(err);

  res.status(status).json({ status, message });
}

module.exports = { errorHandler };
