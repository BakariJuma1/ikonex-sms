const { Router } = require('express');
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../controllers/subject.controller');

const router = Router();

router.post('/', createSubject);
router.get('/', getAllSubjects);
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
