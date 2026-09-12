export class AuthenticationError extends Error {
  readonly status = 401;

  constructor(
    message = "Não autenticado.",
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(
    message = "Sem permissão para executar esta operação.",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}
