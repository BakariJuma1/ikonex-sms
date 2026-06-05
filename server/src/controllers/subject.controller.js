const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const createSubject = async (req, res, next) => {
  try {
    const subject = await prisma.subject.create({
      data: { name: req.body.name.trim(), code: req.body.code.trim().toUpperCase() },
    });
    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 'P2002') return next(new AppError('A subject with that code already exists', 409));
    next(error);
  }
};

const getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { streamSubjects: true, scores: true } } },
    });
    return res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const getSubjectById = async (req, res, next) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: {
        streamSubjects: {
          include: { classStream: { select: { id: true, name: true } } },
          orderBy: { classStream: { name: 'asc' } },
        },
      },
    });
    if (!subject) return next(new AppError('Subject not found', 404));
    return res.json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  const { name, code } = req.body;
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (code !== undefined) data.code = code.trim().toUpperCase();

  if (Object.keys(data).length === 0) return next(new AppError('No fields provided to update', 400));

  try {
    const subject = await prisma.subject.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Subject not found', 404));
    if (error.code === 'P2002') return next(new AppError('A subject with that code already exists', 409));
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const scoreCount = await prisma.score.count({ where: { subjectId: req.params.id } });
    if (scoreCount > 0) {
      return next(new AppError(
        `Cannot delete subject — it has ${scoreCount} score record(s) associated with it`,
        409
      ));
    }
    await prisma.subject.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Subject deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Subject not found', 404));
    next(error);
  }
};

const bulkCreateSubjects = async (req, res, next) => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return next(new AppError('subjects must be a non-empty array', 400));
  }

  try {
    const existing = await prisma.subject.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((s) => s.code.toLowerCase()));

    const toCreate = [];
    const skipped = [];
    const seenInBatch = new Set();

    subjects.forEach((item, i) => {
      const name = item?.name?.trim();
      const code = item?.code?.trim()?.toUpperCase();
      if (!name || !code) {
        skipped.push({ index: i + 1, name: name || '(empty)', code: code || '(empty)', reason: 'Name and code are required' });
        return;
      }
      const codeLower = code.toLowerCase();
      if (existingCodes.has(codeLower)) {
        skipped.push({ index: i + 1, name, code, reason: 'Code already exists' });
        return;
      }
      if (seenInBatch.has(codeLower)) {
        skipped.push({ index: i + 1, name, code, reason: 'Duplicate code in batch' });
        return;
      }
      seenInBatch.add(codeLower);
      toCreate.push({ name, code });
    });

    if (toCreate.length > 0) {
      await prisma.subject.createMany({ data: toCreate });
    }

    return res.json({
      success: true,
      data: { created: toCreate.length, skippedCount: skipped.length, skipped },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject, bulkCreateSubjects };
