const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const assignSubjectToStream = async (req, res, next) => {
  const { classStreamId, subjectId } = req.body;
  if (!classStreamId) return next(new AppError('classStreamId is required', 400));
  if (!subjectId) return next(new AppError('subjectId is required', 400));

  try {
    const assignment = await prisma.streamSubject.create({
      data: { classStreamId, subjectId },
      include: {
        classStream: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    if (error.code === 'P2002') return next(new AppError('Subject is already assigned to this stream', 409));
    if (error.code === 'P2003') return next(new AppError('Stream or subject does not exist', 400));
    next(error);
  }
};

const removeSubjectFromStream = async (req, res, next) => {
  try {
    await prisma.streamSubject.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Subject removed from stream successfully' } });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Assignment not found', 404));
    next(error);
  }
};

const getSubjectsByStream = async (req, res, next) => {
  try {
    const stream = await prisma.classStream.findUnique({ where: { id: req.params.streamId } });
    if (!stream) return next(new AppError('Class stream not found', 404));

    const assignments = await prisma.streamSubject.findMany({
      where: { classStreamId: req.params.streamId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });
    return res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

module.exports = { assignSubjectToStream, removeSubjectFromStream, getSubjectsByStream };
