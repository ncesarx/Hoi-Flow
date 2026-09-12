"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoriesManagerProps = {
  canWrite: boolean;
};

type FormState = {
  name: string;
  slug: string;
  position: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  position: "0",
  active: true,
};

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readApiError(
  response: Response,
  fallback: string,
) {
  try {
    const body = await response.json();

    if (
      body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Usa a mensagem padrão.
  }

  return fallback;
}

export function CategoriesManager({
  canWrite,
}: CategoriesManagerProps) {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>(EMPTY_FORM);

  const activeCount = useMemo(
    () =>
      categories.filter(
        (category) => category.active,
      ).length,
    [categories],
  );

  const loadCategories =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch("/api/categories", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              "Não foi possível carregar as categorias.",
            ),
          );
        }

        const body = await response.json();

        setCategories(
          Array.isArray(body.data)
            ? body.data
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as categorias.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(category: Category) {
    if (!canWrite) {
      return;
    }

    setEditingId(category.id);

    setForm({
      name: category.name,
      slug: category.slug,
      position: String(
        category.position,
      ),
      active: category.active,
    });

    setError(null);
    setMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function changeName(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug:
        editingId === null
          ? normalizeSlug(value)
          : current.slug,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    const name = form.name.trim();
    const slug =
      normalizeSlug(form.slug);

    const position =
      Number.parseInt(
        form.position,
        10,
      );

    if (!name) {
      setError(
        "Informe o nome da categoria.",
      );
      return;
    }

    if (!slug) {
      setError(
        "Informe um slug válido.",
      );
      return;
    }

    if (
      !Number.isInteger(position) ||
      position < 0
    ) {
      setError(
        "A posição deve ser um número inteiro igual ou maior que zero.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const isEditing =
        editingId !== null;

      const response = await fetch(
        isEditing
          ? `/api/categories/${editingId}`
          : "/api/categories",
        {
          method:
            isEditing
              ? "PATCH"
              : "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            slug,
            position,
            active: form.active,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            isEditing
              ? "Não foi possível atualizar a categoria."
              : "Não foi possível criar a categoria.",
          ),
        );
      }

      setMessage(
        isEditing
          ? "Categoria atualizada com sucesso."
          : "Categoria criada com sucesso.",
      );

      resetForm();
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a categoria.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(
    category: Category,
  ) {
    if (!canWrite) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/categories/${category.id}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            active: !category.active,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Não foi possível alterar o status da categoria.",
          ),
        );
      }

      setMessage(
        category.active
          ? "Categoria desativada."
          : "Categoria ativada.",
      );

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar a categoria.",
      );
    }
  }

  return (
    <div className="hf-category-manager">
      <section className="hf-catalog-summary">
        <article>
          <span>Categorias</span>
          <strong>
            {categories.length}
          </strong>
          <small>
            Total cadastrado
          </small>
        </article>

        <article>
          <span>Ativas</span>
          <strong>
            {activeCount}
          </strong>
          <small>
            Visíveis no catálogo
          </small>
        </article>

        <article>
          <span>Inativas</span>
          <strong>
            {categories.length -
              activeCount}
          </strong>
          <small>
            Fora de operação
          </small>
        </article>

        <article>
          <span>Acesso</span>
          <strong className="hf-access-value">
            {canWrite
              ? "Gestão"
              : "Leitura"}
          </strong>
          <small>
            {canWrite
              ? "Edição autorizada"
              : "CATALOG_READ"}
          </small>
        </article>
      </section>

      {canWrite && (
        <section className="hf-panel hf-category-form-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                {editingId
                  ? "Editar categoria"
                  : "Nova categoria"}
              </span>

              <h2>
                {editingId
                  ? "Atualizar categoria"
                  : "Cadastrar categoria"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="hf-button-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar edição
              </button>
            )}
          </div>

          <form
            className="hf-category-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Nome</span>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  changeName(
                    event.target.value,
                  )
                }
                placeholder="Ex.: Sobremesas"
                maxLength={100}
                disabled={saving}
                required
              />
            </label>

            <label>
              <span>Slug</span>

              <input
                type="text"
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: normalizeSlug(
                      event.target.value,
                    ),
                  }))
                }
                placeholder="sobremesas"
                maxLength={120}
                disabled={saving}
                required
              />
            </label>

            <label className="hf-position-field">
              <span>Posição</span>

              <input
                type="number"
                min="0"
                step="1"
                value={form.position}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    position:
                      event.target.value,
                  }))
                }
                disabled={saving}
              />
            </label>

            <label className="hf-active-field">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active:
                      event.target.checked,
                  }))
                }
                disabled={saving}
              />

              <span>
                Categoria ativa
              </span>
            </label>

            <button
              type="submit"
              className="hf-button-primary"
              disabled={saving}
            >
              {saving
                ? "Salvando..."
                : editingId
                  ? "Salvar alterações"
                  : "Criar categoria"}
            </button>
          </form>
        </section>
      )}

      {error && (
        <div
          className="hf-feedback is-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="hf-feedback is-success"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="hf-panel hf-category-list-panel">
        <div className="hf-panel-header">
          <div>
            <span className="hf-eyebrow">
              Estrutura do cardápio
            </span>

            <h2>
              Categorias cadastradas
            </h2>
          </div>

          <button
            type="button"
            className="hf-button-secondary"
            onClick={() =>
              void loadCategories()
            }
            disabled={loading}
          >
            {loading
              ? "Atualizando..."
              : "Atualizar"}
          </button>
        </div>

        {loading ? (
          <div className="hf-catalog-state">
            Carregando categorias...
          </div>
        ) : categories.length === 0 ? (
          <div className="hf-catalog-state">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <div className="hf-category-table-wrap">
            <table className="hf-category-table">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Categoria</th>
                  <th>Slug</th>
                  <th>Status</th>
                  {canWrite && (
                    <th>Ações</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {categories.map(
                  (category) => (
                    <tr key={category.id}>
                      <td>
                        <span className="hf-position-badge">
                          {category.position}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {category.name}
                        </strong>
                      </td>

                      <td>
                        <code>
                          {category.slug}
                        </code>
                      </td>

                      <td>
                        <span
                          className={
                            category.active
                              ? "hf-category-status is-active"
                              : "hf-category-status is-inactive"
                          }
                        >
                          {category.active
                            ? "Ativa"
                            : "Inativa"}
                        </span>
                      </td>

                      {canWrite && (
                        <td>
                          <div className="hf-table-actions">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  category,
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void toggleCategory(
                                  category,
                                )
                              }
                            >
                              {category.active
                                ? "Desativar"
                                : "Ativar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
