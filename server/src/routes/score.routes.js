const { Router } = require('express');
const {
  createScore,
  updateScore,
  deleteScore,
  getScoresByStudent,
  getScoresByStream,
} = require('../controllers/score.controller');

const router = Router();

router.post('/', createScore);
router.put('/:id', updateScore);
router.delete('/:id', deleteScore);
router.get('/student/:studentId', getScoresByStudent);
router.get('/stream/:streamId', getScoresByStream);

module.exports = router;
