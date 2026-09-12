import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../lib/db/prisma";

async function main() {
  const email = process.env.TEST_LOGIN_EMAIL;
  const password = process.env.TEST_LOGIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_LOGIN_EMAIL ou TEST_LOGIN_PASSWORD não informado.",
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
    select: {
      email: true,
      status: true,
      role: true,
      passwordHash: true,
      tenant: {
        select: {
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    console.log("USUARIO_NAO_ENCONTRADO");
    return;
  }

  console.log("E-mail:", user.email);
  console.log("Status:", user.status);
  console.log("Role:", user.role);
  console.log("Tenant:", user.tenant);
  console.log("Possui senha:", Boolean(user.passwordHash));

  if (!user.passwordHash) {
    console.log("SEM_SENHA_CADASTRADA");
    return;
  }

  const valid = await argon2.verify(
    user.passwordHash,
    password,
  );

  console.log(
    "Resultado:",
    valid ? "SENHA_CORRETA" : "SENHA_INCORRETA",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
