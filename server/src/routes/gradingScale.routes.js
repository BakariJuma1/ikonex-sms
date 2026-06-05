const { Router } = require('express');
const {
  getGradingScales, createGradingScale, updateGradingScale, deleteGradingScale,
} = require('../controllers/gradingScale.controller');
const { validateCreateGradingScale, validateUpdateGradingScale } = require('../middleware/validate');

const router = Router();

router.get('/', getGradingScales);
router.post('/', validateCreateGradingScale, createGradingScale);
router.put('/:id', validateUpdateGradingScale, updateGradingScale);
router.delete('/:id', deleteGradingScale);

module.exports = router;
