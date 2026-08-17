import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The four real showrooms in scope (PRD §1). No demo employees or scan data.
// Review URLs start blank — configure each showroom's real Google "write a
// review" link on the Showrooms tab (or paste its Place ID) before launch.
const SHOWROOMS = [
  "EPIC Toyota — Mount Road",
  "EPIC Toyota — Vyasarpadi",
  "EPIC Toyota — Cuddalore",
  "EPIC Toyota — Porur",
];

async function main() {
  console.log("Seeding showrooms (no demo data)…");

  for (const name of SHOWROOMS) {
    const existing = await prisma.showroom.findFirst({ where: { name } });
    if (existing) {
      console.log("  = exists:", name);
      continue;
    }
    await prisma.showroom.create({
      data: { name, placeId: "", googleReviewUrl: "" },
    });
    console.log("  + showroom:", name);
  }

  const employees = await prisma.employee.count();
  const events = await prisma.scanEvent.count();
  console.log(`Done. Employees: ${employees}, scan events: ${events}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
