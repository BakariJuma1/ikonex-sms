const { Router } = require('express');
const { createScore, updateScore, deleteScore, getScoresByStudent, getScoresByStream } = require('../controllers/score.controller');
const { validateCreateScore } = require('../middleware/validate');

const router = Router();

router.post('/', validateCreateScore, createScore);
router.put('/:id', updateScore);
router.delete('/:id', deleteScore);
router.get('/student/:studentId', getScoresByStudent);
router.get('/stream/:streamId', getScoresByStream);

module.exports = router;
