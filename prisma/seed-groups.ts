import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEPARTMENTS = [
  "CSE", "CSE (Data Science)", "CSE (AI & ML)", "CSE (IoT)", "CSE (Cyber Security)",
  "IT", "ECE", "EEE", "Mechanical", "Civil",
  "Electrical", "Biotechnology", "Chemical", "Aerospace",
  "Automobile", "Mechatronics", "Architecture", "Law",
  "Management", "Media & Communication", "Design"
];

const BATCH_YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

async function main() {
  // Get first user as creator (or create a system user)
  let creator = await prisma.user.findFirst();
  if (!creator) {
    console.log("No users found. Create a user first, then run this seed.");
    return;
  }

  // Seed department groups
  for (const dept of DEPARTMENTS) {
    const existing = await prisma.group.findFirst({
      where: { type: "department", department: dept },
    });
    if (!existing) {
      await prisma.group.create({
        data: {
          name: `${dept} Department`,
          description: `Official group for ${dept} students at KIIT`,
          type: "department",
          department: dept,
          createdById: creator.id,
          memberCount: 0,
        },
      });
      console.log(`Created department group: ${dept}`);
    }
  }

  // Seed batch groups
  for (const year of BATCH_YEARS) {
    const existing = await prisma.group.findFirst({
      where: { type: "batch", batchYear: year },
    });
    if (!existing) {
      await prisma.group.create({
        data: {
          name: `Batch ${year}`,
          description: `KIIT Batch of ${year} — connect with your classmates!`,
          type: "batch",
          batchYear: year,
          createdById: creator.id,
          memberCount: 0,
        },
      });
      console.log(`Created batch group: ${year}`);
    }
  }

  console.log("Groups seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
