const request = require('supertest');
const app = require('../app');

jest.mock('../src/prisma', () => ({
  classStream: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
  },
  student: {
    count: jest.fn(),
  },
}));

const prisma = require('../src/prisma');

const mockStream = { id: 'stream-1', name: 'Form 1A', createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => jest.clearAllMocks());

describe('GET /api/streams', () => {
  it('returns all streams', async () => {
    prisma.classStream.findMany.mockResolvedValue([mockStream]);
    const res = await request(app).get('/api/streams');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Form 1A');
  });
});

describe('GET /api/streams/:id', () => {
  it('returns a single stream', async () => {
    prisma.classStream.findUnique.mockResolvedValue({ ...mockStream, students: [], streamSubjects: [] });
    const res = await request(app).get('/api/streams/stream-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('stream-1');
  });

  it('returns 404 for unknown id', async () => {
    prisma.classStream.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/streams/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/streams', () => {
  it('creates a new stream', async () => {
    prisma.classStream.create.mockResolvedValue(mockStream);
    const res = await request(app).post('/api/streams').send({ name: 'Form 1A' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Form 1A');
  });

  it('rejects missing name with 400', async () => {
    const res = await request(app).post('/api/streams').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 for duplicate stream name', async () => {
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.classStream.create.mockRejectedValue(err);
    const res = await request(app).post('/api/streams').send({ name: 'Form 1A' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/streams/:id', () => {
  it('updates a stream', async () => {
    prisma.classStream.update.mockResolvedValue({ ...mockStream, name: 'Form 1B' });
    const res = await request(app).put('/api/streams/stream-1').send({ name: 'Form 1B' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Form 1B');
  });

  it('returns 404 if stream not found', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    prisma.classStream.update.mockRejectedValue(err);
    const res = await request(app).put('/api/streams/bad-id').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/streams/:id', () => {
  it('deletes an empty stream', async () => {
    prisma.student.count.mockResolvedValue(0);
    prisma.classStream.delete.mockResolvedValue(mockStream);
    const res = await request(app).delete('/api/streams/stream-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 409 when stream has students', async () => {
    prisma.student.count.mockResolvedValue(3);
    const res = await request(app).delete('/api/streams/stream-1');
    expect(res.status).toBe(409);
  });

  it('returns 404 if stream not found', async () => {
    prisma.student.count.mockResolvedValue(0);
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    prisma.classStream.delete.mockRejectedValue(err);
    const res = await request(app).delete('/api/streams/bad-id');
    expect(res.status).toBe(404);
  });
});
