import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.INITIAL_OWNER_EMAIL;
  const password = process.env.INITIAL_OWNER_PASSWORD;

  if (!email) {
    throw new Error("INITIAL_OWNER_EMAIL não informado.");
  }

  if (!password || password.length < 12) {
    throw new Error(
      "INITIAL_OWNER_PASSWORD deve possuir pelo menos 12 caracteres.",
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: "xero-verde",
    },
  });

  if (!tenant) {
    throw new Error('Tenant "xero-verde" não encontrado.');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error(`Já existe um usuário com o e-mail ${email}.`);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Administrador Xero Verde",
      email,
      passwordHash,
      status: "ACTIVE",
      role: "OWNER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      tenantId: true,
    },
  });

  console.log("Usuário OWNER criado:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
