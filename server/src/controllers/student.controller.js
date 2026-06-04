const prisma = require('../prisma');

const createStudent = async (req, res) => {
  const { firstName, lastName, admissionNumber, gender, classStreamId } = req.body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ success: false, error: 'First name and last name are required' });
  }
  if (!admissionNumber?.trim()) {
    return res.status(400).json({ success: false, error: 'Admission number is required' });
  }
  if (!classStreamId) {
    return res.status(400).json({ success: false, error: 'Class stream is required' });
  }

  try {
    const student = await prisma.student.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        admissionNumber: admissionNumber.trim(),
        gender: gender?.trim() || null,
        classStreamId,
      },
      include: { classStream: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ success: true, data: student });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A student with that admission number already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, error: 'Class stream does not exist' });
    }
    return res.status(500).json({ success: false, error: 'Failed to create student' });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { classStream: { select: { id: true, name: true } } },
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
};

const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        classStream: { select: { id: true, name: true } },
        scores: {
          include: { subject: { select: { id: true, name: true, code: true } } },
          orderBy: { subject: { name: 'asc' } },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    return res.json({ success: true, data: student });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch student' });
  }
};

const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, admissionNumber, gender, classStreamId } = req.body;

  const data = {};
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (admissionNumber !== undefined) data.admissionNumber = admissionNumber.trim();
  if (gender !== undefined) data.gender = gender?.trim() || null;
  if (classStreamId !== undefined) data.classStreamId = classStreamId;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, error: 'No fields provided to update' });
  }

  try {
    const student = await prisma.student.update({
      where: { id },
      data,
      include: { classStream: { select: { id: true, name: true } } },
    });

    return res.json({ success: true, data: student });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'A student with that admission number already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, error: 'Class stream does not exist' });
    }
    return res.status(500).json({ success: false, error: 'Failed to update student' });
  }
};

const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.student.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Student deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
};

const getStudentsByStream = async (req, res) => {
  const { streamId } = req.params;

  try {
    const streamExists = await prisma.classStream.findUnique({ where: { id: streamId } });
    if (!streamExists) {
      return res.status(404).json({ success: false, error: 'Class stream not found' });
    }

    const students = await prisma.student.findMany({
      where: { classStreamId: streamId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { classStream: { select: { id: true, name: true } } },
    });

    return res.json({ success: true, data: students });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch students for stream' });
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByStream,
};
