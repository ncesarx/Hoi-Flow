"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email,
              password,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "Não foi possível entrar.",
        );

        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Não foi possível conectar ao servidor.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="hf-login">
      <div className="hf-login-glow" />

      <section className="hf-login-layout">
        <div className="hf-login-brand">
          <div className="hf-brand-mark">
            <span className="hf-brand-hoi">
              HOI-
            </span>

            <span className="hf-brand-flow">
              FLOW
            </span>
          </div>

          <div className="hf-brand-subtitle">
            TECH SOLUTIONS
          </div>

          <div className="hf-brand-line" />

          <h1>
            Operação inteligente
            para restaurantes.
          </h1>

          <p>
            Atendimento, pedidos,
            cardápio, operação e
            inteligência em uma única
            plataforma.
          </p>

          <div className="hf-brand-services">
            <span>ATENDIMENTO</span>
            <i />
            <span>PEDIDOS</span>
            <i />
            <span>OPERAÇÃO</span>
            <i />
            <span>IA</span>
          </div>
        </div>

        <section className="hf-login-card">
          <div className="hf-login-card-heading">
            <span>
              ACESSO SEGURO
            </span>

            <h2>
              Bem-vindo à Hoi-Flow
            </h2>

            <p>
              Entre com sua conta para
              acessar a operação do seu
              restaurante.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="hf-login-form"
          >
            <label>
              <span>E-mail</span>

              <input
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>Senha</span>

              <input
                type="password"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
              />
            </label>

            {error && (
              <div
                className="hf-login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Entrando..."
                : "Entrar na plataforma"}
            </button>
          </form>

          <footer>
            <span>
              HOI-FLOW
            </span>

            <small>
              Restaurant Operating
              System
            </small>
          </footer>
        </section>
      </section>
    </main>
  );
}
