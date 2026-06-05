const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const gradingScales = [
  { minScore: 80, maxScore: 100, grade: 'A',  points: 12 },
  { minScore: 75, maxScore: 79,  grade: 'A-', points: 11 },
  { minScore: 70, maxScore: 74,  grade: 'B+', points: 10 },
  { minScore: 65, maxScore: 69,  grade: 'B',  points: 9  },
  { minScore: 60, maxScore: 64,  grade: 'B-', points: 8  },
  { minScore: 55, maxScore: 59,  grade: 'C+', points: 7  },
  { minScore: 50, maxScore: 54,  grade: 'C',  points: 6  },
  { minScore: 45, maxScore: 49,  grade: 'C-', points: 5  },
  { minScore: 40, maxScore: 44,  grade: 'D+', points: 4  },
  { minScore: 35, maxScore: 39,  grade: 'D',  points: 3  },
  { minScore: 30, maxScore: 34,  grade: 'D-', points: 2  },
  { minScore: 0,  maxScore: 29,  grade: 'E',  points: 1  },
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
