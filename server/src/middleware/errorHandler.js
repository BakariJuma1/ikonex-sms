class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return res.end();
  }

  // Raw Prisma errors not explicitly wrapped by a controller
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Duplicate value violates unique constraint' });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({ success: false, error: 'Referenced record does not exist' });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.statusCode ? err.message : 'Internal server error',
  });
};

module.exports = { errorHandler, AppError };
