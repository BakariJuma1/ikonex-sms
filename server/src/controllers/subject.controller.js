const prisma = require('../prisma');

const createSubject = async (req, res) => {
  const { name, code } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, error: 'Subject name is required' });
  }
  if (!code?.trim()) {
    return res.status(400).json({ success: false, error: 'Subject code is required' });
  }

  try {
    const subject = await prisma.subject.create({
      data: { name: name.trim(), code: code.trim().toUpperCase() },
    });

    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A subject with that code already exists' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create subject' });
  }
};

const getAllSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { streamSubjects: true, scores: true } },
      },
    });

    return res.json({ success: true, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
};

const getSubjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        streamSubjects: {
          include: { classStream: { select: { id: true, name: true } } },
          orderBy: { classStream: { name: 'asc' } },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    return res.json({ success: true, data: subject });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch subject' });
  }
};

const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (code !== undefined) data.code = code.trim().toUpperCase();

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, error: 'No fields provided to update' });
  }

  try {
    const subject = await prisma.subject.update({
      where: { id },
      data,
    });

    return res.json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A subject with that code already exists' });
    }
    return res.status(500).json({ success: false, error: 'Failed to update subject' });
  }
};

const deleteSubject = async (req, res) => {
  const { id } = req.params;

  try {
    const scoreCount = await prisma.score.count({ where: { subjectId: id } });

    if (scoreCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete subject — it has ${scoreCount} score record(s) associated with it`,
      });
    }

    await prisma.subject.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Subject deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete subject' });
  }
};

module.exports = { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject };
