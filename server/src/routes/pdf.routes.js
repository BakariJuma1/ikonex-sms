const { Router } = require('express');
const { generateStudentReportCard, generateStreamReport } = require('../controllers/pdf.controller');

const router = Router();

router.get('/student/:studentId', generateStudentReportCard);
router.get('/stream/:streamId', generateStreamReport);

module.exports = router;
