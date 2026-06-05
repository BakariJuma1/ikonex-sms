const { Router } = require('express');
const { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject } = require('../controllers/subject.controller');
const { validateCreateSubject } = require('../middleware/validate');

const router = Router();

router.post('/', validateCreateSubject, createSubject);
router.get('/', getAllSubjects);
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;
