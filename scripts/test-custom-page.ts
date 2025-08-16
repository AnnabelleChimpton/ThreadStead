import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testCustomPage() {
  try {
    // List all pages
    const allPages = await db.customPage.findMany();
    console.log("All pages:", allPages);

    // Try to find published pages
    const publishedPages = await db.customPage.findMany({
      where: {
        published: true,
      },
    });
    console.log("Published pages:", publishedPages);

    // Try to find navigation pages
    const navPages = await db.customPage.findMany({
      where: {
        published: true,
        showInNav: true,
      },
      orderBy: {
        navOrder: "asc",
      },
    });
    console.log("Navigation pages:", navPages);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testCustomPage();