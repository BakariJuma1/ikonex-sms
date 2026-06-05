const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');

const round2 = (n) => Math.round(n * 100) / 100;

function lookupGrade(percentage, gradingScales) {
  if (!gradingScales.length) return { grade: 'N/A', points: 0 };
  const scale = gradingScales.find(
    (s) => percentage >= parseFloat(s.minScore) && percentage <= parseFloat(s.maxScore)
  );
  return scale ? { grade: scale.grade, points: parseFloat(scale.points) } : { grade: 'N/A', points: 0 };
}

function computeSubjectResults(scores, streamSubjects, gradingScales) {
  return streamSubjects.map((ss) => {
    const subjectScores = scores.filter((s) => s.subjectId === ss.subjectId);
    const exam = subjectScores.find((s) => s.examType === 'EXAM');
    const cat = subjectScores.find((s) => s.examType === 'CAT');

    const examComponent = exam
      ? round2((parseFloat(exam.marks) / parseFloat(exam.maxMarks)) * 70)
      : 0;
    const catComponent = cat
      ? round2((parseFloat(cat.marks) / parseFloat(cat.maxMarks)) * 30)
      : 0;

    const finalScore = round2(examComponent + catComponent);
    const { grade, points } = lookupGrade(finalScore, gradingScales);

    return {
      subject: ss.subject,
      examMarks: exam ? parseFloat(exam.marks) : null,
      catMarks: cat ? parseFloat(cat.marks) : null,
      totalMarks: finalScore,
      percentage: finalScore,
      grade,
      points,
    };
  });
}

function computeOverall(subjectResults, gradingScales) {
  const totalMarks = subjectResults.reduce((sum, s) => sum + s.totalMarks, 0);
  const aggregateMarks = round2(subjectResults.reduce((sum, s) => sum + s.points, 0));
  const meanScore = subjectResults.length > 0 ? round2(totalMarks / subjectResults.length) : 0;
  const { grade: overallGrade } = lookupGrade(meanScore, gradingScales);
  return { aggregateMarks, meanScore, overallGrade };
}

function assignPositions(items, key = 'aggregateMarks') {
  const sorted = [...items].sort((a, b) => b[key] - a[key]);
  const result = {};
  sorted.forEach((item, i) => {
    result[item.id] =
      i === 0 || item[key] !== sorted[i - 1][key] ? i + 1 : result[sorted[i - 1].id];
  });
  return result;
}

const getStudentResults = async (req, res, next) => {
  const { studentId } = req.params;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { classStream: true },
    });
    if (!student) return next(new AppError('Student not found', 404));

    const [streamSubjects, gradingScales, allStreamStudents] = await Promise.all([
      prisma.streamSubject.findMany({
        where: { classStreamId: student.classStreamId },
        include: { subject: { select: { id: true, name: true, code: true } } },
        orderBy: { subject: { name: 'asc' } },
      }),
      prisma.gradingScale.findMany(),
      prisma.student.findMany({
        where: { classStreamId: student.classStreamId },
        include: { scores: true },
      }),
    ]);

    const aggregatesForRanking = allStreamStudents.map((s) => ({
      id: s.id,
      aggregateMarks: computeOverall(
        computeSubjectResults(s.scores, streamSubjects, gradingScales),
        gradingScales
      ).aggregateMarks,
    }));
    const positionMap = assignPositions(aggregatesForRanking);

    const target = allStreamStudents.find((s) => s.id === studentId);
    const subjectResults = computeSubjectResults(target.scores, streamSubjects, gradingScales);
    const { aggregateMarks, meanScore, overallGrade } = computeOverall(subjectResults, gradingScales);

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          classStream: { id: student.classStream.id, name: student.classStream.name },
        },
        subjects: subjectResults,
        overall: {
          aggregateMarks,
          meanScore,
          overallGrade,
          classPosition: positionMap[studentId],
          totalStudentsInStream: allStreamStudents.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStreamResults = async (req, res, next) => {
  const { streamId } = req.params;

  try {
    const stream = await prisma.classStream.findUnique({ where: { id: streamId } });
    if (!stream) return next(new AppError('Class stream not found', 404));

    const [streamSubjects, gradingScales, students] = await Promise.all([
      prisma.streamSubject.findMany({
        where: { classStreamId: streamId },
        include: { subject: { select: { id: true, name: true, code: true } } },
        orderBy: { subject: { name: 'asc' } },
      }),
      prisma.gradingScale.findMany(),
      prisma.student.findMany({
        where: { classStreamId: streamId },
        include: { scores: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    const studentData = students.map((s) => {
      const subjectResults = computeSubjectResults(s.scores, streamSubjects, gradingScales);
      const { aggregateMarks, meanScore, overallGrade } = computeOverall(subjectResults, gradingScales);
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        subjectResults,
        aggregateMarks,
        meanScore,
        overallGrade,
      };
    });

    const classPositionMap = assignPositions(studentData);
    studentData.forEach((s) => { s.classPosition = classPositionMap[s.id]; });

    streamSubjects.forEach((_, subjectIdx) => {
      const subjectRankItems = studentData.map((s) => ({
        id: s.id,
        percentage: s.subjectResults[subjectIdx].percentage,
      }));
      const subjectPositionMap = assignPositions(subjectRankItems, 'percentage');
      studentData.forEach((s) => {
        s.subjectResults[subjectIdx].subjectPosition = subjectPositionMap[s.id];
      });
    });

    studentData.sort((a, b) => a.classPosition - b.classPosition);

    return res.json({
      success: true,
      data: {
        stream: { id: stream.id, name: stream.name },
        subjects: streamSubjects.map((ss) => ss.subject),
        totalStudents: students.length,
        students: studentData,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentResults,
  getStreamResults,
  computeSubjectResults,
  computeOverall,
  assignPositions,
};
