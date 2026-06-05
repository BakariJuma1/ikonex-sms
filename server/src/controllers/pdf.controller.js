const PDFDocument = require('pdfkit');
const prisma = require('../prisma');
const { AppError } = require('../middleware/errorHandler');
const { computeSubjectResults, computeOverall, assignPositions } = require('./results.controller');

const MARGIN = 50;
const PAGE_W = 595;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 20;
const HEADER_ROW_H = 22;

function drawRow(doc, cols, values, y, opts = {}) {
  const { bg = null, textColor = '#222222', bold = false, rowH = ROW_H } = opts;
  const totalW = cols.reduce((s, c) => s + c.w, 0);

  if (bg) {
    doc.fillColor(bg).rect(MARGIN, y, totalW, rowH).fill();
  }

  doc.strokeColor('#cccccc').lineWidth(0.5).rect(MARGIN, y, totalW, rowH).stroke();

  doc.fillColor(textColor).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
  let x = MARGIN;
  cols.forEach(({ w, align }, i) => {
    const val = values[i] != null ? String(values[i]) : '-';
    doc.text(val, x + 4, y + Math.round((rowH - 9) / 2) + 1, {
      width: w - 8,
      align: align || 'left',
      lineBreak: false,
    });
    x += w;
  });

  doc.strokeColor('#cccccc').lineWidth(0.5);
  x = MARGIN;
  for (let i = 0; i < cols.length - 1; i++) {
    x += cols[i].w;
    doc.moveTo(x, y).lineTo(x, y + rowH).stroke();
  }

  return y + rowH;
}

// Adds a new page with the header row repeated when content nears the bottom.
function checkPageBreak(doc, y, cols, headerValues) {
  if (y + ROW_H > doc.page.height - MARGIN - 20) {
    doc.addPage();
    y = MARGIN;
    y = drawRow(doc, cols, headerValues, y, {
      bg: '#2c3e50',
      textColor: 'white',
      bold: true,
      rowH: HEADER_ROW_H,
    });
  }
  return y;
}

const generateStudentReportCard = async (req, res, next) => {
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
    const classPosition = positionMap[studentId];

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true });
    const filename = `report-card-${student.admissionNumber.replace(/\//g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc
      .fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('IKONEX ACADEMY', MARGIN, 40, { align: 'center', width: CONTENT_W });
    doc
      .fontSize(13).font('Helvetica').fillColor('#555555')
      .text('Student Report Card', MARGIN, 68, { align: 'center', width: CONTENT_W });
    doc.moveTo(MARGIN, 88).lineTo(PAGE_W - MARGIN, 88).strokeColor('#aaaaaa').lineWidth(1).stroke();

    let y = 100;
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Student Name:  ${student.firstName} ${student.lastName}`, MARGIN, y);
    doc.text(`Admission No:  ${student.admissionNumber}`, MARGIN + 255, y);
    y += 18;
    doc.text(`Class Stream:  ${student.classStream.name}`, MARGIN, y);
    doc.text(`Gender:  ${student.gender || 'N/A'}`, MARGIN + 255, y);
    y += 30;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 12;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('SUBJECT RESULTS', MARGIN, y);
    y += 14;

    const subjectCols = [
      { w: 145, align: 'left' },
      { w: 52,  align: 'center' },
      { w: 52,  align: 'center' },
      { w: 55,  align: 'center' },
      { w: 55,  align: 'center' },
      { w: 62,  align: 'center' },
      { w: 74,  align: 'center' },
    ];
    const subjectHeaders = ['Subject', 'EXAM', 'CAT', 'Total', 'Max', 'Percentage', 'Grade'];

    y = drawRow(doc, subjectCols, subjectHeaders, y, {
      bg: '#2c3e50', textColor: 'white', bold: true, rowH: HEADER_ROW_H,
    });

    subjectResults.forEach((sr, i) => {
      y = checkPageBreak(doc, y, subjectCols, subjectHeaders);
      y = drawRow(doc, subjectCols, [
        sr.subject.name,
        sr.examMarks != null ? sr.examMarks : '-',
        sr.catMarks  != null ? sr.catMarks  : '-',
        sr.totalMarks,
        sr.totalMaxMarks || '-',
        sr.totalMaxMarks > 0 ? `${sr.percentage}%` : '-',
        sr.grade,
      ], y, { bg: i % 2 === 0 ? '#f7f9fb' : null });
    });

    y += 20;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('OVERALL SUMMARY', MARGIN, y);
    y += 14;

    const summaryCols = [
      { w: 125, align: 'center' },
      { w: 125, align: 'center' },
      { w: 125, align: 'center' },
      { w: 120, align: 'center' },
    ];

    y = drawRow(doc, summaryCols, ['Aggregate Points', 'Mean Score', 'Overall Grade', 'Class Position'], y, {
      bg: '#2c3e50', textColor: 'white', bold: true, rowH: HEADER_ROW_H,
    });
    y = drawRow(doc, summaryCols, [
      aggregateMarks,
      `${meanScore}%`,
      overallGrade,
      `${classPosition} / ${allStreamStudents.length}`,
    ], y, { bg: '#eaf4fb', bold: true });

    y += 20;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 8;
    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
       .text(`Generated: ${genDate}`, MARGIN, y, { align: 'right', width: CONTENT_W });

    doc.end();
  } catch (error) {
    next(error);
  }
};

const generateStreamReport = async (req, res, next) => {
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
        aggregateMarks,
        meanScore,
        overallGrade,
      };
    });

    const positionMap = assignPositions(studentData);
    const rows = studentData
      .map((s) => ({ ...s, classPosition: positionMap[s.id] }))
      .sort((a, b) => a.classPosition - b.classPosition);

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true });
    const filename = `class-report-${stream.name.replace(/\s+/g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc
      .fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('IKONEX ACADEMY', MARGIN, 40, { align: 'center', width: CONTENT_W });
    doc
      .fontSize(13).font('Helvetica').fillColor('#555555')
      .text('Class Performance Report', MARGIN, 66, { align: 'center', width: CONTENT_W });
    doc.moveTo(MARGIN, 86).lineTo(PAGE_W - MARGIN, 86).strokeColor('#aaaaaa').lineWidth(1).stroke();

    const genDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    let y = 98;
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Stream: ${stream.name}`, MARGIN, y);
    doc.text(`Date: ${genDate}`, MARGIN + 255, y);
    doc.text(`Total Students: ${students.length}`, MARGIN, y + 18);
    y += 42;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 12;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text('STUDENT RANKINGS', MARGIN, y);
    y += 14;

    const streamCols = [
      { w: 45,  align: 'center' },
      { w: 90,  align: 'left' },
      { w: 175, align: 'left' },
      { w: 65,  align: 'center' },
      { w: 60,  align: 'center' },
      { w: 60,  align: 'center' },
    ];
    const streamHeaders = ['Position', 'Adm No', 'Full Name', 'Aggregate', 'Mean %', 'Grade'];

    y = drawRow(doc, streamCols, streamHeaders, y, {
      bg: '#2c3e50', textColor: 'white', bold: true, rowH: HEADER_ROW_H,
    });

    rows.forEach((s, i) => {
      y = checkPageBreak(doc, y, streamCols, streamHeaders);
      y = drawRow(doc, streamCols, [
        s.classPosition,
        s.admissionNumber,
        `${s.lastName}, ${s.firstName}`,
        s.aggregateMarks,
        `${s.meanScore}%`,
        s.overallGrade,
      ], y, { bg: i % 2 === 0 ? '#f7f9fb' : null });
    });

    y += 16;
    doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
       .text(`Generated: ${genDate}`, MARGIN, y, { align: 'right', width: CONTENT_W });

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { generateStudentReportCard, generateStreamReport };
