import { AuthorizationError } from "@/lib/auth/errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  // Alguns clientes legítimos podem não enviar Origin.
  // Quando o navegador enviar Origin, ele precisa coincidir
  // com a origem pública da aplicação.
  if (!origin) {
    return;
  }

  const host = request.headers.get("host");

  if (!host) {
    throw new AuthorizationError(
      "Origem da requisição inválida.",
    );
  }

  const expectedOrigin = `https://${host}`;

  if (origin !== expectedOrigin) {
    throw new AuthorizationError(
      "Origem da requisição inválida.",
    );
  }
}
