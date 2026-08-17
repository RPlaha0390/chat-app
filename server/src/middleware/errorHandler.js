// Single place that turns any thrown/next(err) error into a consistent
// { status, message } JSON shape, so the client never has to parse a
// raw stack trace. Controllers just do `next(err)` or throw inside an
// async handler wrapped by asyncHandler (added in Task 3).
function errorHandler(err, req, res, next) {
  // Mongoose/Mongo errors reach here as bare 500s otherwise, even though
  // every one of them is caused by bad client input: a failed schema
  // validation, an unparseable ObjectId in a param/query/body, or a
  // unique-index collision. Map them to friendly 400s centrally (per the
  // spec) rather than hand-checking in each controller.
  if (err.name === 'ValidationError') {
    err.status = 400;
  }
  if (err.name === 'CastError') {
    err.status = 400;
    // Mongoose's own CastError text names the model and schema path;
    // replace it so we don't leak internals into a client-facing message.
    err.message = `Invalid value for '${err.path}'`;
  }
  if (err.code === 11000) {
    err.status = 400;
    err.message = 'That username or email is already taken';
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  // Log the real error server-side even when we hide details from the client.
  if (status === 500) console.error(err);

  res.status(status).json({ status, message });
}

module.exports = { errorHandler };
