const { Router } = require('express');
const {
  assignSubjectToStream,
  removeSubjectFromStream,
  getSubjectsByStream,
} = require('../controllers/streamSubject.controller');

const router = Router();

router.post('/', assignSubjectToStream);
router.get('/stream/:streamId', getSubjectsByStream);
router.delete('/:id', removeSubjectFromStream);

module.exports = router;
