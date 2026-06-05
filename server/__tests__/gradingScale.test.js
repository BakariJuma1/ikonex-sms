const request = require('supertest');
const app = require('../app');

jest.mock('../src/prisma', () => ({
  gradingScale: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const prisma = require('../src/prisma');

const mockScale = {
  id: 'gs-1',
  grade: 'A',
  minScore: '80.00',
  maxScore: '100.00',
  points: '12.00',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/grading-scales', () => {
  it('returns all grading scales', async () => {
    prisma.gradingScale.findMany.mockResolvedValue([mockScale]);
    const res = await request(app).get('/api/grading-scales');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].grade).toBe('A');
  });
});

describe('POST /api/grading-scales', () => {
  it('creates a grading scale entry', async () => {
    prisma.gradingScale.create.mockResolvedValue(mockScale);
    const res = await request(app).post('/api/grading-scales').send({
      grade: 'A',
      minScore: 80,
      maxScore: 100,
      points: 12,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.grade).toBe('A');
  });

  it('rejects missing grade', async () => {
    const res = await request(app).post('/api/grading-scales').send({
      minScore: 80,
      maxScore: 100,
      points: 12,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects minScore out of 0-100 range', async () => {
    const res = await request(app).post('/api/grading-scales').send({
      grade: 'A',
      minScore: -5,
      maxScore: 100,
      points: 12,
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/grading-scales/:id', () => {
  it('updates a grading scale entry', async () => {
    prisma.gradingScale.update.mockResolvedValue({ ...mockScale, points: '11.00' });
    const res = await request(app).put('/api/grading-scales/gs-1').send({ points: 11 });
    expect(res.status).toBe(200);
  });

  it('rejects invalid points in update', async () => {
    const res = await request(app).put('/api/grading-scales/gs-1').send({ points: -1 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/grading-scales/:id', () => {
  it('deletes a grading scale entry', async () => {
    prisma.gradingScale.delete.mockResolvedValue(mockScale);
    const res = await request(app).delete('/api/grading-scales/gs-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
