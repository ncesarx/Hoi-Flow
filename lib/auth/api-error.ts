import { NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth/errors";

export function authErrorResponse(
  error: unknown,
): NextResponse | null {
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 401,
      },
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 403,
      },
    );
  }

  return null;
}
