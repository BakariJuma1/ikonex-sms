const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const gradingScales = [
  { minScore: 75, maxScore: 100, grade: 'A', points: 4.0 },
  { minScore: 60, maxScore: 74,  grade: 'B', points: 3.0 },
  { minScore: 50, maxScore: 59,  grade: 'C', points: 2.0 },
  { minScore: 40, maxScore: 49,  grade: 'D', points: 1.0 },
  { minScore: 0,  maxScore: 39,  grade: 'E', points: 0.0 },
];

async function main() {
  for (const entry of gradingScales) {
    const existing = await prisma.gradingScale.findFirst({ where: { grade: entry.grade } });
    if (existing) {
      await prisma.gradingScale.update({ where: { id: existing.id }, data: entry });
      console.log(`Updated grade ${entry.grade}`);
    } else {
      await prisma.gradingScale.create({ data: entry });
      console.log(`Created grade ${entry.grade}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
