const request = require('supertest');
const app = require('../app');
const {
  computeSubjectResults,
  computeOverall,
  assignPositions,
} = require('../src/controllers/results.controller');

jest.mock('../src/prisma', () => ({
  student: { findUnique: jest.fn(), findMany: jest.fn() },
  classStream: { findUnique: jest.fn() },
  streamSubject: { findMany: jest.fn() },
  gradingScale: { findMany: jest.fn() },
  score: { findMany: jest.fn() },
}));

const prisma = require('../src/prisma');

// ─── Grading scale fixture ────────────────────────────────────────────────────
const gradingScales = [
  { minScore: '80', maxScore: '100', grade: 'A',  points: '12' },
  { minScore: '70', maxScore: '79',  grade: 'B+', points: '10' },
  { minScore: '60', maxScore: '69',  grade: 'B',  points: '9'  },
  { minScore: '50', maxScore: '59',  grade: 'C+', points: '7'  },
  { minScore: '0',  maxScore: '49',  grade: 'E',  points: '1'  },
];

const streamSubjects = [
  { subjectId: 'sub-1', subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' } },
  { subjectId: 'sub-2', subject: { id: 'sub-2', name: 'English', code: 'ENG' } },
];

beforeEach(() => jest.clearAllMocks());

// ─── Unit tests: pure computation helpers ────────────────────────────────────

describe('computeSubjectResults', () => {
  it('computes percentage, grade and points for EXAM+CAT', () => {
    const scores = [
      { subjectId: 'sub-1', examType: 'EXAM', marks: '56', maxMarks: '70' },
      { subjectId: 'sub-1', examType: 'CAT',  marks: '24', maxMarks: '30' },
    ];
    const [result] = computeSubjectResults(scores, [streamSubjects[0]], gradingScales);
    expect(result.totalMarks).toBe(80);
    expect(result.totalMaxMarks).toBe(100);
    expect(result.percentage).toBe(80);
    expect(result.grade).toBe('A');
    expect(result.points).toBe(12);
  });

  it('uses 0 for missing EXAM or CAT', () => {
    const scores = [
      { subjectId: 'sub-1', examType: 'EXAM', marks: '42', maxMarks: '70' },
    ];
    const [result] = computeSubjectResults(scores, [streamSubjects[0]], gradingScales);
    expect(result.catMarks).toBeNull();
    expect(result.totalMaxMarks).toBe(70);
  });

  it('returns N/A grade when no grading scales exist', () => {
    const scores = [
      { subjectId: 'sub-1', examType: 'EXAM', marks: '56', maxMarks: '70' },
    ];
    const [result] = computeSubjectResults(scores, [streamSubjects[0]], []);
    expect(result.grade).toBe('N/A');
  });
});

describe('computeOverall', () => {
  it('calculates meanScore and overallGrade across subjects', () => {
    const subjectResults = [
      { totalMarks: 80, totalMaxMarks: 100, points: 12, percentage: 80 },
      { totalMarks: 60, totalMaxMarks: 100, points: 9,  percentage: 60 },
    ];
    const { meanScore, overallGrade, aggregateMarks } = computeOverall(subjectResults, gradingScales);
    expect(meanScore).toBe(70);
    expect(overallGrade).toBe('B+');
    expect(aggregateMarks).toBe(21);
  });
});

describe('assignPositions', () => {
  it('ranks items correctly with ties', () => {
    const items = [
      { id: 'a', aggregateMarks: 30 },
      { id: 'b', aggregateMarks: 30 },
      { id: 'c', aggregateMarks: 20 },
    ];
    const map = assignPositions(items);
    expect(map['a']).toBe(1);
    expect(map['b']).toBe(1);
    expect(map['c']).toBe(3);
  });

  it('assigns position 1 to the highest scorer', () => {
    const items = [
      { id: 'x', aggregateMarks: 10 },
      { id: 'y', aggregateMarks: 50 },
    ];
    const map = assignPositions(items);
    expect(map['y']).toBe(1);
    expect(map['x']).toBe(2);
  });
});

// ─── HTTP integration tests ───────────────────────────────────────────────────

const mockStudentRecord = {
  id: 'stu-1',
  firstName: 'John',
  lastName: 'Doe',
  admissionNumber: 'ADM/001',
  gender: 'Male',
  classStreamId: 'stream-1',
  classStream: { id: 'stream-1', name: 'Form 1A' },
  scores: [
    { subjectId: 'sub-1', examType: 'EXAM', marks: '56', maxMarks: '70' },
    { subjectId: 'sub-1', examType: 'CAT',  marks: '24', maxMarks: '30' },
  ],
};

describe('GET /api/results/student/:studentId', () => {
  it('returns student results with grade and class position', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudentRecord);
    prisma.streamSubject.findMany.mockResolvedValue([streamSubjects[0]]);
    prisma.gradingScale.findMany.mockResolvedValue(gradingScales);
    prisma.student.findMany.mockResolvedValue([mockStudentRecord]);

    const res = await request(app).get('/api/results/student/stu-1');
    expect(res.status).toBe(200);
    expect(res.body.data.overall.overallGrade).toBe('A');
    expect(res.body.data.overall.classPosition).toBe(1);
    expect(res.body.data.subjects[0].grade).toBe('A');
  });

  it('returns 404 for unknown student', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/results/student/bad-id');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/results/stream/:streamId', () => {
  it('returns ranked stream results', async () => {
    const stream = { id: 'stream-1', name: 'Form 1A' };
    const student2 = {
      ...mockStudentRecord,
      id: 'stu-2',
      firstName: 'Jane',
      scores: [
        { subjectId: 'sub-1', examType: 'EXAM', marks: '35', maxMarks: '70' },
        { subjectId: 'sub-1', examType: 'CAT',  marks: '10', maxMarks: '30' },
      ],
    };

    prisma.classStream.findUnique.mockResolvedValue(stream);
    prisma.streamSubject.findMany.mockResolvedValue([streamSubjects[0]]);
    prisma.gradingScale.findMany.mockResolvedValue(gradingScales);
    prisma.student.findMany.mockResolvedValue([mockStudentRecord, student2]);

    const res = await request(app).get('/api/results/stream/stream-1');
    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(2);
    // John (80%) should be ranked #1
    expect(res.body.data.students[0].firstName).toBe('John');
    expect(res.body.data.students[0].classPosition).toBe(1);
  });

  it('returns 404 for unknown stream', async () => {
    prisma.classStream.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/results/stream/bad-id');
    expect(res.status).toBe(404);
  });
});
