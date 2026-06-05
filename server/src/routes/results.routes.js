const { Router } = require('express');
const { getStudentResults, getStreamResults, getTopStudents, getSubjectAverages } = require('../controllers/results.controller');

const router = Router();

router.get('/top-students', getTopStudents);
router.get('/subject-averages', getSubjectAverages);
router.get('/student/:studentId', getStudentResults);
router.get('/stream/:streamId', getStreamResults);

module.exports = router;
