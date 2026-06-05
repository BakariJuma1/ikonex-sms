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

const bulkCreateStreams = async (req, res, next) => {
  const { names } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    return next(new AppError('names must be a non-empty array', 400));
  }

  try {
    const existing = await prisma.classStream.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));

    const toCreate = [];
    const skipped = [];
    const seenInBatch = new Set();

    names.forEach((rawName, i) => {
      const name = rawName?.trim();
      if (!name) {
        skipped.push({ index: i + 1, name: rawName || '(empty)', reason: 'Empty name' });
        return;
      }
      const nameLower = name.toLowerCase();
      if (existingNames.has(nameLower)) {
        skipped.push({ index: i + 1, name, reason: 'Already exists' });
        return;
      }
      if (seenInBatch.has(nameLower)) {
        skipped.push({ index: i + 1, name, reason: 'Duplicate in batch' });
        return;
      }
      seenInBatch.add(nameLower);
      toCreate.push({ name });
    });

    if (toCreate.length > 0) {
      await prisma.classStream.createMany({ data: toCreate });
    }

    return res.json({
      success: true,
      data: { created: toCreate.length, skippedCount: skipped.length, skipped },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createStream, getAllStreams, getStreamById, updateStream, deleteStream, bulkCreateStreams };
