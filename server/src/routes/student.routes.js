const { Router } = require('express');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByStream,
} = require('../controllers/student.controller');

const router = Router();

router.post('/', createStudent);
router.get('/', getAllStudents);
router.get('/stream/:streamId', getStudentsByStream);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
