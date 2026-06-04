const prisma = require('../prisma');

const createStream = async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Stream name is required' });
  }

  try {
    const stream = await prisma.classStream.create({
      data: { name: name.trim() },
    });

    return res.status(201).json({ success: true, data: stream });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A stream with that name already exists' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create stream' });
  }
};

const getAllStreams = async (req, res) => {
  try {
    const streams = await prisma.classStream.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true, streamSubjects: true } },
      },
    });

    return res.json({ success: true, data: streams });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch streams' });
  }
};

const getStreamById = async (req, res) => {
  const { id } = req.params;

  try {
    const stream = await prisma.classStream.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: { lastName: 'asc' },
        },
        streamSubjects: {
          include: { subject: true },
        },
      },
    });

    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }

    return res.json({ success: true, data: stream });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch stream' });
  }
};

const updateStream = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Stream name is required' });
  }

  try {
    const stream = await prisma.classStream.update({
      where: { id },
      data: { name: name.trim() },
    });

    return res.json({ success: true, data: stream });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A stream with that name already exists' });
    }
    return res.status(500).json({ success: false, error: 'Failed to update stream' });
  }
};

const deleteStream = async (req, res) => {
  const { id } = req.params;

  try {
    const studentCount = await prisma.student.count({ where: { classStreamId: id } });

    if (studentCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete stream — it still has ${studentCount} student(s) assigned to it`,
      });
    }

    await prisma.classStream.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Stream deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete stream' });
  }
};

module.exports = { createStream, getAllStreams, getStreamById, updateStream, deleteStream };
