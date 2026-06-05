const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const createStream = async (req, res, next) => {
  try {
    const stream = await prisma.classStream.create({
      data: { name: req.body.name.trim() },
    });
    return res.status(201).json({ success: true, data: stream });
  } catch (error) {
    if (error.code === 'P2002') return next(new AppError('A stream with that name already exists', 409));
    next(error);
  }
};

const getAllStreams = async (req, res, next) => {
  try {
    const streams = await prisma.classStream.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true, streamSubjects: true } } },
    });
    return res.json({ success: true, data: streams });
  } catch (error) {
    next(error);
  }
};

const getStreamById = async (req, res, next) => {
  try {
    const stream = await prisma.classStream.findUnique({
      where: { id: req.params.id },
      include: {
        students: { orderBy: { lastName: 'asc' } },
        streamSubjects: { include: { subject: true } },
      },
    });
    if (!stream) return next(new AppError('Stream not found', 404));
    return res.json({ success: true, data: stream });
  } catch (error) {
    next(error);
  }
};

const updateStream = async (req, res, next) => {
  const { name } = req.body;
  if (!name?.trim()) return next(new AppError('Stream name is required', 400));

  try {
    const stream = await prisma.classStream.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    return res.json({ success: true, data: stream });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Stream not found', 404));
    if (error.code === 'P2002') return next(new AppError('A stream with that name already exists', 409));
    next(error);
  }
};

const deleteStream = async (req, res, next) => {
  try {
    const studentCount = await prisma.student.count({ where: { classStreamId: req.params.id } });
    if (studentCount > 0) {
      return next(new AppError(
        `Cannot delete stream — it still has ${studentCount} student(s) assigned to it`,
        409
      ));
    }
    await prisma.classStream.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Stream deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Stream not found', 404));
    next(error);
  }
};

module.exports = { createStream, getAllStreams, getStreamById, updateStream, deleteStream };
