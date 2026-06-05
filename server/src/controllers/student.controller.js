const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const createStudent = async (req, res, next) => {
  const { firstName, lastName, admissionNumber, gender, classStreamId } = req.body;
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
    if (error.code === 'P2002') return next(new AppError('A student with that admission number already exists', 409));
    if (error.code === 'P2003') return next(new AppError('Class stream does not exist', 400));
    next(error);
  }
};

const getAllStudents = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { classStream: { select: { id: true, name: true } } },
    });
    return res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        classStream: { select: { id: true, name: true } },
        scores: {
          include: { subject: { select: { id: true, name: true, code: true } } },
          orderBy: { subject: { name: 'asc' } },
        },
      },
    });
    if (!student) return next(new AppError('Student not found', 404));
    return res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  const { firstName, lastName, admissionNumber, gender, classStreamId } = req.body;
  const data = {};
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (admissionNumber !== undefined) data.admissionNumber = admissionNumber.trim();
  if (gender !== undefined) data.gender = gender?.trim() || null;
  if (classStreamId !== undefined) data.classStreamId = classStreamId;

  if (Object.keys(data).length === 0) return next(new AppError('No fields provided to update', 400));

  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data,
      include: { classStream: { select: { id: true, name: true } } },
    });
    return res.json({ success: true, data: student });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Student not found', 404));
    if (error.code === 'P2002') return next(new AppError('A student with that admission number already exists', 409));
    if (error.code === 'P2003') return next(new AppError('Class stream does not exist', 400));
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } });
    return res.json({ success: true, data: { message: 'Student deleted successfully' } });
  } catch (error) {
    if (error.code === 'P2025') return next(new AppError('Student not found', 404));
    next(error);
  }
};

const getStudentsByStream = async (req, res, next) => {
  try {
    const stream = await prisma.classStream.findUnique({ where: { id: req.params.streamId } });
    if (!stream) return next(new AppError('Class stream not found', 404));

    const students = await prisma.student.findMany({
      where: { classStreamId: req.params.streamId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { classStream: { select: { id: true, name: true } } },
    });
    return res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

module.exports = { createStudent, getAllStudents, getStudentById, updateStudent, deleteStudent, getStudentsByStream };
