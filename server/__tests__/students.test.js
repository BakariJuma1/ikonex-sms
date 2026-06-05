const request = require('supertest');
const app = require('../app');

jest.mock('../src/prisma', () => ({
  student: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classStream: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../src/prisma');

const mockStudent = {
  id: 'stu-1',
  firstName: 'John',
  lastName: 'Doe',
  admissionNumber: 'ADM/001',
  gender: 'Male',
  classStreamId: 'stream-1',
  classStream: { id: 'stream-1', name: 'Form 1A' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/students', () => {
  it('returns all students', async () => {
    prisma.student.findMany.mockResolvedValue([mockStudent]);
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/students/:id', () => {
  it('returns a single student with stream', async () => {
    prisma.student.findUnique.mockResolvedValue(mockStudent);
    const res = await request(app).get('/api/students/stu-1');
    expect(res.status).toBe(200);
    expect(res.body.data.admissionNumber).toBe('ADM/001');
  });

  it('returns 404 for unknown student', async () => {
    prisma.student.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/students/bad-id');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/students/stream/:streamId', () => {
  it('returns students belonging to a stream', async () => {
    prisma.classStream.findUnique.mockResolvedValue({ id: 'stream-1', name: 'Form 1A' });
    prisma.student.findMany.mockResolvedValue([mockStudent]);
    const res = await request(app).get('/api/students/stream/stream-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 404 for unknown stream', async () => {
    prisma.classStream.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/students/stream/bad-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/students', () => {
  it('registers a new student', async () => {
    prisma.student.create.mockResolvedValue(mockStudent);
    const res = await request(app).post('/api/students').send({
      firstName: 'John',
      lastName: 'Doe',
      admissionNumber: 'ADM/001',
      classStreamId: 'stream-1',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.firstName).toBe('John');
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/students').send({ firstName: 'John' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate admission number', async () => {
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.student.create.mockRejectedValue(err);
    const res = await request(app).post('/api/students').send({
      firstName: 'John',
      lastName: 'Doe',
      admissionNumber: 'ADM/001',
      classStreamId: 'stream-1',
    });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/students/:id', () => {
  it('updates a student record', async () => {
    prisma.student.update.mockResolvedValue({ ...mockStudent, firstName: 'Jane' });
    const res = await request(app).put('/api/students/stu-1').send({ firstName: 'Jane' });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Jane');
  });
});

describe('DELETE /api/students/:id', () => {
  it('deletes a student', async () => {
    prisma.student.delete.mockResolvedValue(mockStudent);
    const res = await request(app).delete('/api/students/stu-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 if student not found', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    prisma.student.delete.mockRejectedValue(err);
    const res = await request(app).delete('/api/students/bad-id');
    expect(res.status).toBe(404);
  });
});
