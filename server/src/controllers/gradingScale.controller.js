const prisma = require('../prisma');

const getGradingScales = async (req, res, next) => {
  try {
    const scales = await prisma.gradingScale.findMany({
      orderBy: { minScore: 'desc' },
    });
    return res.json({ success: true, data: scales });
  } catch (error) {
    next(error);
  }
};

const createGradingScale = async (req, res, next) => {
  const { grade, minScore, maxScore, points } = req.body;
  try {
    const scale = await prisma.gradingScale.create({
      data: {
        grade: grade.trim().toUpperCase(),
        minScore: parseFloat(minScore),
        maxScore: parseFloat(maxScore),
        points: parseFloat(points),
      },
    });
    return res.status(201).json({ success: true, data: scale });
  } catch (error) {
    next(error);
  }
};

const updateGradingScale = async (req, res, next) => {
  const { id } = req.params;
  const { minScore, maxScore, points } = req.body;
  try {
    const scale = await prisma.gradingScale.update({
      where: { id },
      data: {
        ...(minScore !== undefined && { minScore: parseFloat(minScore) }),
        ...(maxScore !== undefined && { maxScore: parseFloat(maxScore) }),
        ...(points !== undefined && { points: parseFloat(points) }),
      },
    });
    return res.json({ success: true, data: scale });
  } catch (error) {
    next(error);
  }
};

const deleteGradingScale = async (req, res, next) => {
  const { id } = req.params;
  try {
    await prisma.gradingScale.delete({ where: { id } });
    return res.json({ success: true, message: 'Grading scale entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGradingScales, createGradingScale, updateGradingScale, deleteGradingScale };
