const { Router } = require('express');
const { getStudentResults, getStreamResults } = require('../controllers/results.controller');

const router = Router();

router.get('/student/:studentId', getStudentResults);
router.get('/stream/:streamId', getStreamResults);

module.exports = router;
