const request = require('supertest');
const app = require('../app');

jest.mock('../src/prisma', () => ({
  score: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  classStream: { findUnique: jest.fn() },
  student: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  subject: { findUnique: jest.fn() },
}));

const prisma = require('../src/prisma');

const mockScore = {
  id: 'score-1',
  studentId: 'stu-1',
  subjectId: 'sub-1',
  examType: 'EXAM',
  marks: '56.00',
  maxMarks: '70.00',
  student: { id: 'stu-1', firstName: 'John', lastName: 'Doe', admissionNumber: 'ADM/001' },
  subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
};

beforeEach(() => jest.clearAllMocks());

describe('POST /api/scores', () => {
  it('creates an EXAM score', async () => {
    prisma.score.create.mockResolvedValue(mockScore);
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'EXAM',
      marks: 56,
      maxMarks: 70,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.examType).toBe('EXAM');
  });

  it('creates a CAT score', async () => {
    const catScore = { ...mockScore, id: 'score-2', examType: 'CAT', marks: '25.00', maxMarks: '30.00' };
    prisma.score.create.mockResolvedValue(catScore);
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'CAT',
      marks: 25,
      maxMarks: 30,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.examType).toBe('CAT');
  });

  it('rejects invalid examType', async () => {
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'QUIZ',
      marks: 50,
    });
    expect(res.status).toBe(400);
  });

  it('rejects negative marks', async () => {
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'EXAM',
      marks: -5,
    });
    expect(res.status).toBe(400);
  });

  it('rejects marks exceeding maxMarks', async () => {
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'EXAM',
      marks: 80,
      maxMarks: 70,
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate score submission', async () => {
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.score.create.mockRejectedValue(err);
    const res = await request(app).post('/api/scores').send({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      examType: 'EXAM',
      marks: 56,
      maxMarks: 70,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('PUT /api/scores/:id', () => {
  it('updates a score', async () => {
    prisma.score.findUnique.mockResolvedValue({ ...mockScore, marks: '56.00', maxMarks: '70.00' });
    prisma.score.update.mockResolvedValue({ ...mockScore, marks: '60.00' });
    const res = await request(app).put('/api/scores/score-1').send({ marks: 60 });
    expect(res.status).toBe(200);
  });

  it('returns 404 when score does not exist', async () => {
    prisma.score.findUnique.mockResolvedValue(null);
    const res = await request(app).put('/api/scores/bad-id').send({ marks: 60 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/scores/:id', () => {
  it('deletes a score', async () => {
    prisma.score.delete.mockResolvedValue(mockScore);
    const res = await request(app).delete('/api/scores/score-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when score not found', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    prisma.score.delete.mockRejectedValue(err);
    const res = await request(app).delete('/api/scores/bad-id');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/scores/student/:studentId', () => {
  it('returns grouped scores for a student', async () => {
    prisma.student.findUnique.mockResolvedValue({
      id: 'stu-1', firstName: 'John', lastName: 'Doe', admissionNumber: 'ADM/001',
    });
    prisma.score.findMany.mockResolvedValue([
      { ...mockScore, subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' } },
    ]);
    const res = await request(app).get('/api/scores/student/stu-1');
    expect(res.status).toBe(200);
    expect(res.body.data.subjects).toHaveLength(1);
    expect(res.body.data.subjects[0].EXAM).not.toBeNull();
  });

  it('returns 404 for unknown student', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/scores/student/bad-id');
    expect(res.status).toBe(404);
  });
});
