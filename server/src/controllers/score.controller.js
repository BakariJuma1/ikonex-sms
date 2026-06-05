const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const parseDecimal = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

const createScore = async (req, res, next) => {
  const { studentId, subjectId, examType } = req.body;
  const marks = parseDecimal(req.body.marks);
  const maxMarks = req.body.maxMarks !== undefined ? parseDecimal(req.body.maxMarks) : 100;

  if (maxMarks === null || maxMarks <= 0) {
    return next(new AppError('maxMarks must be a positive number', 400));
  }
  if (marks > maxMarks) {
    return next(new AppError(`marks (${marks}) cannot exceed maxMarks (${maxMarks})`, 400));
  }

  try {
    const score = await prisma.score.create({
      data: { studentId, subjectId, examType, marks, maxMarks },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
    return res.status(201).json({ success: true, data: score });
  } catch (error) {
    if (error.code === 'P2002') return next(new AppError('A score for this student, subject, and exam type already exists', 409));
    if (error.code === 'P2003') return next(new AppError('Student or subject does not exist', 400));
    next(error);
  }
};

const updateScore = async (req, res, next) => {
  const data = {};

  if (req.body.marks !== undefined) {
    const marks = parseDecimal(req.body.marks);
    if (marks === null) return next(new AppError('marks must be a valid number', 400));
    if (marks < 0) return next(new AppError('marks cannot be negative', 400));
    data.marks = marks;
  }
  if (req.body.maxMarks !== undefined) {
    const maxMarks = parseDecimal(req.body.maxMarks);
    if (maxMarks === null || maxMarks <= 0) return next(new AppError('maxMarks must be a positive number', 400));
    data.maxMarks = maxMarks;
  }

  if (Object.keys(data).length === 0) return next(new AppError('No fields provided to update', 400));

  try {
    // Fetch existing to cross-validate marks vs maxMarks after a partial update
    const existing = await prisma.score.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new AppError('Score not found', 404));

    const resolvedMarks = data.marks !== undefined ? data.marks : parseFloat(existing.marks);
    const resolvedMax = data.maxMarks !== undefined ? data.maxMarks : parseFloat(existing.maxMarks);

    if (resolvedMarks > resolvedMax) {
      return next(new AppError(`marks (${resolvedMarks}) cannot exceed maxMarks (${resolvedMax})`, 400));
    }

    const score = await prisma.score.update({
      where: { id: req.params.id },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
    return res.json({ success: true, data: score });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Score not found', 404));
    next(error);
  }
};

const deleteScore = async (req, res, next) => {
  try {
    await prisma.score.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Score deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Score not found', 404));
    next(error);
  }
};

const getScoresByStudent = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    });
    if (!student) return next(new AppError('Student not found', 404));

    const scores = await prisma.score.findMany({
      where: { studentId: req.params.studentId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    // Group EXAM and CAT scores per subject
    const grouped = {};
    for (const score of scores) {
      if (!grouped[score.subjectId]) {
        grouped[score.subjectId] = { subject: score.subject, EXAM: null, CAT: null };
      }
      grouped[score.subjectId][score.examType] = {
        id: score.id,
        marks: score.marks,
        maxMarks: score.maxMarks,
        createdAt: score.createdAt,
        updatedAt: score.updatedAt,
      };
    }

    return res.json({ success: true, data: { student, subjects: Object.values(grouped) } });
  } catch (error) {
    next(error);
  }
};

const getScoresByStream = async (req, res, next) => {
  const { subjectId } = req.query;
  if (!subjectId) return next(new AppError('subjectId query parameter is required', 400));

  try {
    const stream = await prisma.classStream.findUnique({ where: { id: req.params.streamId } });
    if (!stream) return next(new AppError('Class stream not found', 404));

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true, code: true },
    });
    if (!subject) return next(new AppError('Subject not found', 404));

    const students = await prisma.student.findMany({
      where: { classStreamId: req.params.streamId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { scores: { where: { subjectId } } },
    });

    const data = students.map((s) => {
      const exam = s.scores.find((sc) => sc.examType === 'EXAM') || null;
      const cat = s.scores.find((sc) => sc.examType === 'CAT') || null;
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        EXAM: exam ? { id: exam.id, marks: exam.marks, maxMarks: exam.maxMarks } : null,
        CAT: cat ? { id: cat.id, marks: cat.marks, maxMarks: cat.maxMarks } : null,
      };
    });

    return res.json({
      success: true,
      data: { stream: { id: stream.id, name: stream.name }, subject, students: data },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createScore, updateScore, deleteScore, getScoresByStudent, getScoresByStream };
