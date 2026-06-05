const { Router } = require('express');
const multer = require('multer');
const { createStudent, getAllStudents, getStudentById, updateStudent, deleteStudent, getStudentsByStream, importStudents } = require('../controllers/student.controller');
const { validateCreateStudent } = require('../middleware/validate');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'text/csv'
      || file.mimetype === 'application/vnd.ms-excel'
      || file.originalname.toLowerCase().endsWith('.csv');
    ok ? cb(null, true) : cb(new Error('Only CSV files are accepted'));
  },
});

const router = Router();

router.post('/import', csvUpload.single('file'), importStudents);
router.post('/', validateCreateStudent, createStudent);
router.get('/', getAllStudents);
router.get('/stream/:streamId', getStudentsByStream);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
