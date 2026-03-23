import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const venue = await prisma.venue.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Bar Demo (evento)",
      slug: "demo",
      timezone: "Europe/Lisbon",
      currency: "EUR",
    },
  });

  let bebidas = await prisma.menuCategory.findFirst({
    where: { venueId: venue.id, name: "Bebidas" },
  });
  if (!bebidas) {
    bebidas = await prisma.menuCategory.create({
      data: { venueId: venue.id, name: "Bebidas", sortOrder: 0 },
    });
  }

  let comida = await prisma.menuCategory.findFirst({
    where: { venueId: venue.id, name: "Comida" },
  });
  if (!comida) {
    comida = await prisma.menuCategory.create({
      data: { venueId: venue.id, name: "Comida", sortOrder: 1 },
    });
  }

  const sample: {
    categoryId: string;
    name: string;
    description: string;
    imageUrl: string;
    priceCents: number;
    sortOrder: number;
  }[] = [
    {
      categoryId: bebidas.id,
      name: "Água 50cl",
      description: "Água mineral fresca.",
      imageUrl:
        "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80&auto=format&fit=crop",
      priceCents: 150,
      sortOrder: 0,
    },
    {
      categoryId: bebidas.id,
      name: "Cerveja",
      description: "Cerveja gelada ao copo.",
      imageUrl:
        "https://images.unsplash.com/photo-1608270586623-7cf60738bb45?w=400&q=80&auto=format&fit=crop",
      priceCents: 250,
      sortOrder: 1,
    },
    {
      categoryId: comida.id,
      name: "Sandes mista",
      description: "Pão fresco com fiambre e queijo.",
      imageUrl:
        "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&q=80&auto=format&fit=crop",
      priceCents: 450,
      sortOrder: 0,
    },
  ];

  for (const s of sample) {
    const existing = await prisma.menuItem.findFirst({
      where: { venueId: venue.id, name: s.name },
    });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          venueId: venue.id,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          imageUrl: s.imageUrl,
          priceCents: s.priceCents,
          sortOrder: s.sortOrder,
          isAvailable: true,
        },
      });
    } else {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          description: s.description,
          imageUrl: s.imageUrl,
        },
      });
    }
  }

  console.log("Seed OK: venue slug=demo, categorias e itens de exemplo.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
