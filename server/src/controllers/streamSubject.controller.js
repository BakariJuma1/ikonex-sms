const prisma = require('../prisma');

const assignSubjectToStream = async (req, res) => {
  const { classStreamId, subjectId } = req.body;

  if (!classStreamId) {
    return res.status(400).json({ success: false, error: 'classStreamId is required' });
  }
  if (!subjectId) {
    return res.status(400).json({ success: false, error: 'subjectId is required' });
  }

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
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Subject is already assigned to this stream' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, error: 'Stream or subject does not exist' });
    }
    return res.status(500).json({ success: false, error: 'Failed to assign subject to stream' });
  }
};

const removeSubjectFromStream = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.streamSubject.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Subject removed from stream successfully' } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to remove subject from stream' });
  }
};

const getSubjectsByStream = async (req, res) => {
  const { streamId } = req.params;

  try {
    const streamExists = await prisma.classStream.findUnique({ where: { id: streamId } });
    if (!streamExists) {
      return res.status(404).json({ success: false, error: 'Class stream not found' });
    }

    const assignments = await prisma.streamSubject.findMany({
      where: { classStreamId: streamId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { name: 'asc' } },
    });

    return res.json({ success: true, data: assignments });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch subjects for stream' });
  }
};

module.exports = { assignSubjectToStream, removeSubjectFromStream, getSubjectsByStream };
