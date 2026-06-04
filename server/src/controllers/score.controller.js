const prisma = require('../prisma');

const VALID_EXAM_TYPES = ['EXAM', 'CAT'];

const parseDecimal = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
};

const createScore = async (req, res) => {
  const { studentId, subjectId, examType } = req.body;
  const marks = parseDecimal(req.body.marks);
  const maxMarks = req.body.maxMarks !== undefined ? parseDecimal(req.body.maxMarks) : 100;

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'studentId is required' });
  }
  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId is required' });
  }
  if (!VALID_EXAM_TYPES.includes(examType)) {
    return res.status(400).json({ success: false, error: 'examType must be EXAM or CAT' });
  }
  if (marks === null) {
    return res.status(400).json({ success: false, error: 'marks must be a valid number' });
  }
  if (maxMarks === null || maxMarks <= 0) {
    return res.status(400).json({ success: false, error: 'maxMarks must be a positive number' });
  }
  if (marks < 0) {
    return res.status(400).json({ success: false, error: 'marks cannot be negative' });
  }
  if (marks > maxMarks) {
    return res.status(400).json({
      success: false,
      error: `marks (${marks}) cannot exceed maxMarks (${maxMarks})`,
    });
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
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A score for this student, subject, and exam type already exists',
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, error: 'Student or subject does not exist' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create score' });
  }
};

const updateScore = async (req, res) => {
  const { id } = req.params;

  const data = {};
  if (req.body.marks !== undefined) {
    const marks = parseDecimal(req.body.marks);
    if (marks === null) {
      return res.status(400).json({ success: false, error: 'marks must be a valid number' });
    }
    if (marks < 0) {
      return res.status(400).json({ success: false, error: 'marks cannot be negative' });
    }
    data.marks = marks;
  }
  if (req.body.maxMarks !== undefined) {
    const maxMarks = parseDecimal(req.body.maxMarks);
    if (maxMarks === null || maxMarks <= 0) {
      return res.status(400).json({ success: false, error: 'maxMarks must be a positive number' });
    }
    data.maxMarks = maxMarks;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, error: 'No fields provided to update' });
  }

  try {
    // Fetch current score to validate marks vs maxMarks after partial update
    const existing = await prisma.score.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Score not found' });
    }

    const resolvedMarks = data.marks !== undefined ? data.marks : parseFloat(existing.marks);
    const resolvedMax = data.maxMarks !== undefined ? data.maxMarks : parseFloat(existing.maxMarks);

    if (resolvedMarks > resolvedMax) {
      return res.status(400).json({
        success: false,
        error: `marks (${resolvedMarks}) cannot exceed maxMarks (${resolvedMax})`,
      });
    }

    const score = await prisma.score.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return res.json({ success: true, data: score });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Score not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to update score' });
  }
};

const deleteScore = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.score.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Score deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Score not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete score' });
  }
};

const getScoresByStudent = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const scores = await prisma.score.findMany({
      where: { studentId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    // Group by subject, placing EXAM and CAT side by side
    const grouped = {};
    for (const score of scores) {
      const key = score.subjectId;
      if (!grouped[key]) {
        grouped[key] = { subject: score.subject, EXAM: null, CAT: null };
      }
      grouped[key][score.examType] = {
        id: score.id,
        marks: score.marks,
        maxMarks: score.maxMarks,
        createdAt: score.createdAt,
        updatedAt: score.updatedAt,
      };
    }

    return res.json({
      success: true,
      data: { student, subjects: Object.values(grouped) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch scores' });
  }
};

const getScoresByStream = async (req, res) => {
  const { streamId } = req.params;
  const { subjectId } = req.query;

  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId query parameter is required' });
  }

  try {
    const stream = await prisma.classStream.findUnique({ where: { id: streamId } });
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Class stream not found' });
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true, code: true },
    });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const students = await prisma.student.findMany({
      where: { classStreamId: streamId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        scores: {
          where: { subjectId },
        },
      },
    });

    const data = students.map((student) => {
      const exam = student.scores.find((s) => s.examType === 'EXAM') || null;
      const cat = student.scores.find((s) => s.examType === 'CAT') || null;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        EXAM: exam ? { id: exam.id, marks: exam.marks, maxMarks: exam.maxMarks } : null,
        CAT: cat ? { id: cat.id, marks: cat.marks, maxMarks: cat.maxMarks } : null,
      };
    });

    return res.json({
      success: true,
      data: { stream: { id: stream.id, name: stream.name }, subject, students: data },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch scores for stream' });
  }
};

module.exports = { createScore, updateScore, deleteScore, getScoresByStudent, getScoresByStream };
