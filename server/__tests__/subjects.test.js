const request = require('supertest');
const app = require('../app');

jest.mock('../src/prisma', () => ({
  subject: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  streamSubject: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  classStream: {
    findUnique: jest.fn(),
  },
  score: {
    count: jest.fn(),
  },
}));

const prisma = require('../src/prisma');

const mockSubject = {
  id: 'sub-1',
  name: 'Mathematics',
  code: 'MATH',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/subjects', () => {
  it('returns all subjects', async () => {
    prisma.subject.findMany.mockResolvedValue([mockSubject]);
    const res = await request(app).get('/api/subjects');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].code).toBe('MATH');
  });
});

describe('GET /api/subjects/:id', () => {
  it('returns a subject by id', async () => {
    prisma.subject.findUnique.mockResolvedValue(mockSubject);
    const res = await request(app).get('/api/subjects/sub-1');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Mathematics');
  });

  it('returns 404 for unknown subject', async () => {
    prisma.subject.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/subjects/bad-id');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/subjects', () => {
  it('creates a subject', async () => {
    prisma.subject.create.mockResolvedValue(mockSubject);
    const res = await request(app).post('/api/subjects').send({ name: 'Mathematics', code: 'MATH' });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('MATH');
  });

  it('rejects missing name or code', async () => {
    const res = await request(app).post('/api/subjects').send({ name: 'Mathematics' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate subject code', async () => {
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.subject.create.mockRejectedValue(err);
    const res = await request(app).post('/api/subjects').send({ name: 'Math', code: 'MATH' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/subjects/:id', () => {
  it('updates a subject', async () => {
    prisma.subject.update.mockResolvedValue({ ...mockSubject, name: 'Advanced Math' });
    const res = await request(app).put('/api/subjects/sub-1').send({ name: 'Advanced Math' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Advanced Math');
  });
});

describe('DELETE /api/subjects/:id', () => {
  it('deletes a subject with no scores', async () => {
    prisma.score.count.mockResolvedValue(0);
    prisma.subject.delete.mockResolvedValue(mockSubject);
    const res = await request(app).delete('/api/subjects/sub-1');
    expect(res.status).toBe(200);
  });

  it('returns 409 when subject has score records', async () => {
    prisma.score.count.mockResolvedValue(5);
    const res = await request(app).delete('/api/subjects/sub-1');
    expect(res.status).toBe(409);
  });
});

describe('POST /api/stream-subjects', () => {
  it('assigns a subject to a stream', async () => {
    const assignment = {
      id: 'ss-1',
      classStreamId: 'stream-1',
      subjectId: 'sub-1',
      classStream: { id: 'stream-1', name: 'Form 1A' },
      subject: { id: 'sub-1', name: 'Mathematics', code: 'MATH' },
    };
    prisma.streamSubject.create.mockResolvedValue(assignment);
    const res = await request(app)
      .post('/api/stream-subjects')
      .send({ classStreamId: 'stream-1', subjectId: 'sub-1' });
    expect(res.status).toBe(201);
    expect(res.body.data.subject.code).toBe('MATH');
  });

  it('returns 409 when subject is already assigned', async () => {
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.streamSubject.create.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/stream-subjects')
      .send({ classStreamId: 'stream-1', subjectId: 'sub-1' });
    expect(res.status).toBe(409);
  });
});
