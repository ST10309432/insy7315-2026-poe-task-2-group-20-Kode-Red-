/** An error with an HTTP status code that is safe to show to the user. */
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'Please log in to continue') { return new AppError(401, msg); }
  static forbidden(msg = 'You do not have permission to do that') { return new AppError(403, msg); }
  static notFound(msg = 'Not found') { return new AppError(404, msg); }
  static conflict(msg, details) { return new AppError(409, msg, details); }
  static unprocessable(msg, details) { return new AppError(422, msg, details); }
}

module.exports = AppError;
