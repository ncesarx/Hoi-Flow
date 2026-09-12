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
  active: boolean;
};

type ProductStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string | number | null;
  status: ProductStatus;
  imageUrl: string | null;
  categoryId: string | null;
  category: Category | null;
};

type FormState = {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  basePrice: string;
  status: ProductStatus;
  imageUrl: string;
};

type ProductsManagerProps = {
  canWrite: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  categoryId: "",
  description: "",
  basePrice: "",
  status: "ACTIVE",
  imageUrl: "",
};

function normalizeSlug(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function formatMoney(
  value: string | number | null,
) {
  if (
    value === null ||
    value === ""
  ) {
    return "A definir";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "A definir";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(number);
}

async function apiError(
  response: Response,
  fallback: string,
) {
  try {
    const body =
      await response.json();

    if (
      typeof body?.error ===
      "string"
    ) {
      return body.error;
    }
  } catch {
    // fallback
  }

  return fallback;
}

export function ProductsManager({
  canWrite,
}: ProductsManagerProps) {
  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM,
  );

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          productsResponse,
          categoriesResponse,
        ] = await Promise.all([
          fetch(
            "/api/products",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
          fetch(
            "/api/categories",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
        ]);

        if (
          !productsResponse.ok
        ) {
          throw new Error(
            await apiError(
              productsResponse,
              "Não foi possível carregar os produtos.",
            ),
          );
        }

        if (
          !categoriesResponse.ok
        ) {
          throw new Error(
            await apiError(
              categoriesResponse,
              "Não foi possível carregar as categorias.",
            ),
          );
        }

        const productsBody =
          await productsResponse.json();

        const categoriesBody =
          await categoriesResponse.json();

        setProducts(
          Array.isArray(
            productsBody.data,
          )
            ? productsBody.data
            : [],
        );

        setCategories(
          Array.isArray(
            categoriesBody.data,
          )
            ? categoriesBody.data
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao carregar o catálogo.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(term) ||
          product.slug
            .toLowerCase()
            .includes(term) ||
          product.category?.name
            .toLowerCase()
            .includes(term),
      );
    }, [
      products,
      search,
    ]);

  const activeCount =
    useMemo(
      () =>
        products.filter(
          (product) =>
            product.status ===
            "ACTIVE",
        ).length,
      [products],
    );

  function resetForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      categoryId:
        categories.find(
          (category) =>
            category.active,
        )?.id ?? "",
    });
  }

  function startEdit(
    product: Product,
  ) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      slug: product.slug,
      categoryId:
        product.categoryId ?? "",
      description:
        product.description ?? "",
      basePrice:
        product.basePrice === null
          ? ""
          : String(
              product.basePrice,
            ),
      status:
        product.status,
      imageUrl:
        product.imageUrl ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    if (
      !form.name.trim() ||
      !form.slug.trim() ||
      !form.categoryId
    ) {
      setError(
        "Nome, slug e categoria são obrigatórios.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          editingId
            ? `/api/products/${editingId}`
            : "/api/products",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name:
                form.name.trim(),
              slug:
                normalizeSlug(
                  form.slug,
                ),
              categoryId:
                form.categoryId,
              description:
                form.description,
              basePrice:
                form.basePrice,
              status:
                form.status,
              imageUrl:
                form.imageUrl,
            }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível salvar o produto.",
          ),
        );
      }

      setMessage(
        editingId
          ? "Produto atualizado com sucesso."
          : "Produto criado com sucesso.",
      );

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o produto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    product: Product,
    status: ProductStatus,
  ) {
    if (!canWrite) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/products/${product.id}`,
          {
            method: "PATCH",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                status,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível alterar o status.",
          ),
        );
      }

      setMessage(
        status === "ARCHIVED"
          ? "Produto arquivado."
          : status === "ACTIVE"
            ? "Produto ativado."
            : "Produto desativado.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o produto.",
      );
    }
  }

  return (
    <div className="hf-product-manager">
      <section className="hf-catalog-summary">
        <article>
          <span>Produtos</span>
          <strong>
            {products.length}
          </strong>
          <small>
            Total cadastrado
          </small>
        </article>

        <article>
          <span>Ativos</span>
          <strong>
            {activeCount}
          </strong>
          <small>
            Disponíveis no catálogo
          </small>
        </article>

        <article>
          <span>Inativos</span>
          <strong>
            {
              products.filter(
                (product) =>
                  product.status ===
                  "INACTIVE",
              ).length
            }
          </strong>
          <small>
            Temporariamente ocultos
          </small>
        </article>

        <article>
          <span>Arquivados</span>
          <strong>
            {
              products.filter(
                (product) =>
                  product.status ===
                  "ARCHIVED",
              ).length
            }
          </strong>
          <small>
            Fora de operação
          </small>
        </article>
      </section>

      {canWrite && (
        <section className="hf-panel hf-product-form-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                {editingId
                  ? "Editar produto"
                  : "Novo produto"}
              </span>

              <h2>
                {editingId
                  ? "Atualizar produto"
                  : "Cadastrar produto"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="hf-button-secondary"
                onClick={resetForm}
              >
                Cancelar edição
              </button>
            )}
          </div>

          <form
            className="hf-product-form"
            onSubmit={saveProduct}
          >
            <label>
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => {
                  const name =
                    event.target.value;

                  setForm(
                    (current) => ({
                      ...current,
                      name,
                      slug:
                        editingId
                          ? current.slug
                          : normalizeSlug(
                              name,
                            ),
                    }),
                  );
                }}
                placeholder="Ex.: Coca-Cola 350ml"
                disabled={saving}
              />
            </label>

            <label>
              <span>Slug</span>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      slug:
                        normalizeSlug(
                          event.target
                            .value,
                        ),
                    }),
                  )
                }
                placeholder="coca-cola-350ml"
                disabled={saving}
              />
            </label>

            <label>
              <span>Categoria</span>
              <select
                value={
                  form.categoryId
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      categoryId:
                        event.target
                          .value,
                    }),
                  )
                }
                disabled={saving}
              >
                <option value="">
                  Selecione
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {category.name}
                      {!category.active
                        ? " (inativa)"
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                Preço base
              </span>

              <input
                inputMode="decimal"
                value={
                  form.basePrice
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      basePrice:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="Ex.: 25,90"
                disabled={saving}
              />
            </label>

            <label>
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      status:
                        event.target
                          .value as ProductStatus,
                    }),
                  )
                }
                disabled={saving}
              >
                <option value="ACTIVE">
                  Ativo
                </option>
                <option value="INACTIVE">
                  Inativo
                </option>
                <option value="ARCHIVED">
                  Arquivado
                </option>
              </select>
            </label>

            <label className="hf-product-description">
              <span>
                Descrição
              </span>

              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="Descrição comercial do produto"
                disabled={saving}
              />
            </label>

            <label className="hf-product-image-url">
              <span>
                URL da imagem
              </span>

              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      imageUrl:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="https://..."
                disabled={saving}
              />
            </label>

            <div className="hf-product-submit">
              <button
                type="submit"
                className="hf-button-primary"
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Criar produto"}
              </button>
            </div>
          </form>
        </section>
      )}

      {error && (
        <div className="hf-feedback is-error">
          {error}
        </div>
      )}

      {message && (
        <div className="hf-feedback is-success">
          {message}
        </div>
      )}

      <section className="hf-panel hf-product-list-panel">
        <div className="hf-panel-header">
          <div>
            <span className="hf-eyebrow">
              Catálogo
            </span>
            <h2>
              Produtos cadastrados
            </h2>
          </div>

          <div className="hf-product-list-tools">
            <input
              type="search"
              placeholder="Buscar produto..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

            <button
              type="button"
              className="hf-button-secondary"
              onClick={() =>
                void loadData()
              }
            >
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="hf-catalog-state">
            Carregando produtos...
          </div>
        ) : (
          <div className="hf-category-table-wrap">
            <table className="hf-category-table hf-product-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Status</th>
                  {canWrite && (
                    <th>Ações</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => (
                    <tr
                      key={
                        product.id
                      }
                    >
                      <td>
                        <strong>
                          {product.name}
                        </strong>
                        <small className="hf-product-slug">
                          {product.slug}
                        </small>
                      </td>

                      <td>
                        {product.category
                          ?.name ??
                          "Sem categoria"}
                      </td>

                      <td>
                        <strong className="hf-product-price">
                          {formatMoney(
                            product.basePrice,
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`hf-product-status is-${product.status.toLowerCase()}`}
                        >
                          {product.status ===
                          "ACTIVE"
                            ? "Ativo"
                            : product.status ===
                                "INACTIVE"
                              ? "Inativo"
                              : "Arquivado"}
                        </span>
                      </td>

                      {canWrite && (
                        <td>
                          <div className="hf-table-actions">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(
                                  product,
                                )
                              }
                            >
                              Editar
                            </button>

                            {product.status !==
                              "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(
                                    product,
                                    "ACTIVE",
                                  )
                                }
                              >
                                Ativar
                              </button>
                            )}

                            {product.status ===
                              "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(
                                    product,
                                    "INACTIVE",
                                  )
                                }
                              >
                                Desativar
                              </button>
                            )}

                            {product.status !==
                              "ARCHIVED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Arquivar "${product.name}"?`,
                                    )
                                  ) {
                                    void changeStatus(
                                      product,
                                      "ARCHIVED",
                                    );
                                  }
                                }}
                              >
                                Arquivar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}

                {!filteredProducts.length && (
                  <tr>
                    <td
                      colSpan={
                        canWrite
                          ? 5
                          : 4
                      }
                    >
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
