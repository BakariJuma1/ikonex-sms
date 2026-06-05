const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map((e) => e.msg) });
  }
  next();
};

const validateCreateStream = [
  body('name').trim().notEmpty().withMessage('Stream name is required'),
  handleValidation,
];

const validateCreateStudent = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('admissionNumber').trim().notEmpty().withMessage('Admission number is required'),
  body('classStreamId').notEmpty().withMessage('classStreamId is required'),
  handleValidation,
];

const validateCreateSubject = [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('code').trim().notEmpty().withMessage('Subject code is required'),
  handleValidation,
];

const validateCreateScore = [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('subjectId').notEmpty().withMessage('subjectId is required'),
  body('examType').isIn(['EXAM', 'CAT']).withMessage('examType must be EXAM or CAT'),
  body('marks')
    .notEmpty().withMessage('marks is required')
    .isFloat({ min: 0 }).withMessage('marks must be a non-negative number'),
  handleValidation,
];

module.exports = { validateCreateStream, validateCreateStudent, validateCreateSubject, validateCreateScore };
