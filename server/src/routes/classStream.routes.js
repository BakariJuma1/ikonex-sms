const { Router } = require('express');
const { createStream, getAllStreams, getStreamById, updateStream, deleteStream } = require('../controllers/classStream.controller');
const { validateCreateStream } = require('../middleware/validate');

const router = Router();

router.post('/', validateCreateStream, createStream);
router.get('/', getAllStreams);
router.get('/:id', getStreamById);
router.put('/:id', updateStream);
router.delete('/:id', deleteStream);

module.exports = router;
