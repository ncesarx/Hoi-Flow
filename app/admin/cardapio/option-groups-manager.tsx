"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SelectionType =
  | "SINGLE"
  | "MULTIPLE";

type OptionItem = {
  id: string;
  optionGroupId: string;
  name: string;
  priceDelta:
    | string
    | number;
  position: number;
  active: boolean;
};

type OptionGroup = {
  id: string;
  name: string;
  slug: string;
  selectionType:
    SelectionType;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  position: number;
  active: boolean;

  options: OptionItem[];

  _count?: {
    products: number;
  };
};

type Product = {
  id: string;
  name: string;
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "ARCHIVED";
};

type ProductGroupRelation = {
  tenantId: string;
  productId: string;
  optionGroupId: string;
  position: number;

  optionGroup: OptionGroup;
};

type Props = {
  canWrite: boolean;
};

type GroupForm = {
  name: string;
  slug: string;

  selectionType:
    SelectionType;

  minSelections: string;
  maxSelections: string;

  required: boolean;
  position: string;
  active: boolean;
};

const EMPTY_GROUP:
  GroupForm = {
  name: "",
  slug: "",

  selectionType:
    "SINGLE",

  minSelections: "0",
  maxSelections: "1",

  required: false,
  position: "0",
  active: true,
};

function slugify(
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

function money(
  value:
    | string
    | number,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number === 0
  ) {
    return "Sem acréscimo";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
      signDisplay: "always",
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

export function OptionGroupsManager({
  canWrite,
}: Props) {
  const [
    groups,
    setGroups,
  ] =
    useState<OptionGroup[]>(
      [],
    );

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    editingGroupId,
    setEditingGroupId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    groupForm,
    setGroupForm,
  ] =
    useState<GroupForm>(
      EMPTY_GROUP,
    );

  const [
    selectedGroupId,
    setSelectedGroupId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    optionName,
    setOptionName,
  ] =
    useState("");

  const [
    optionPrice,
    setOptionPrice,
  ] =
    useState("0");

  const [
    optionPosition,
    setOptionPosition,
  ] =
    useState("0");

  const [
    selectedProductId,
    setSelectedProductId,
  ] =
    useState("");

  const [
    productRelations,
    setProductRelations,
  ] =
    useState<
      ProductGroupRelation[]
    >([]);

  const [
    relationLoading,
    setRelationLoading,
  ] =
    useState(false);

  const loadData =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const [
            groupsResponse,
            productsResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/option-groups",
                {
                  cache:
                    "no-store",

                  credentials:
                    "same-origin",
                },
              ),

              fetch(
                "/api/products",
                {
                  cache:
                    "no-store",

                  credentials:
                    "same-origin",
                },
              ),
            ]);

          if (
            !groupsResponse.ok
          ) {
            throw new Error(
              await apiError(
                groupsResponse,
                "Não foi possível carregar os grupos.",
              ),
            );
          }

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

          const groupsBody =
            await groupsResponse.json();

          const productsBody =
            await productsResponse.json();

          const loadedGroups:
            OptionGroup[] =
            Array.isArray(
              groupsBody.data,
            )
              ? groupsBody.data
              : [];

          const loadedProducts:
            Product[] =
            Array.isArray(
              productsBody.data,
            )
              ? productsBody.data
              : [];

          setGroups(
            loadedGroups,
          );

          setProducts(
            loadedProducts,
          );

          setSelectedGroupId(
            (current) =>
              current ??
              loadedGroups[0]
                ?.id ??
              null,
          );

          setSelectedProductId(
            (current) =>
              current ||
              loadedProducts.find(
                (product) =>
                  product.status ===
                  "ACTIVE",
              )?.id ||
              loadedProducts[0]
                ?.id ||
              "",
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Falha ao carregar os grupos.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedGroup =
    useMemo(
      () =>
        groups.find(
          (group) =>
            group.id ===
            selectedGroupId,
        ) ?? null,
      [
        groups,
        selectedGroupId,
      ],
    );

  const activeGroups =
    useMemo(
      () =>
        groups.filter(
          (group) =>
            group.active,
        ).length,
      [groups],
    );

  function resetGroupForm() {
    setEditingGroupId(
      null,
    );

    setGroupForm(
      EMPTY_GROUP,
    );
  }

  function startEditGroup(
    group: OptionGroup,
  ) {
    if (!canWrite) {
      return;
    }

    setEditingGroupId(
      group.id,
    );

    setGroupForm({
      name:
        group.name,

      slug:
        group.slug,

      selectionType:
        group.selectionType,

      minSelections:
        String(
          group.minSelections,
        ),

      maxSelections:
        String(
          group.maxSelections,
        ),

      required:
        group.required,

      position:
        String(
          group.position,
        ),

      active:
        group.active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function setSelectionType(
    selectionType:
      SelectionType,
  ) {
    setGroupForm(
      (current) => {
        if (
          selectionType ===
          "SINGLE"
        ) {
          return {
            ...current,

            selectionType:
              "SINGLE",

            minSelections:
              current.required
                ? "1"
                : "0",

            maxSelections:
              "1",
          };
        }

        return {
          ...current,

          selectionType:
            "MULTIPLE",

          maxSelections:
            Number(
              current.maxSelections,
            ) > 1
              ? current.maxSelections
              : "2",
        };
      },
    );
  }

  function setRequired(
    required: boolean,
  ) {
    setGroupForm(
      (current) => ({
        ...current,

        required,

        minSelections:
          required
            ? Number(
                current.minSelections,
              ) > 0
              ? current.minSelections
              : "1"
            : current.minSelections,
      }),
    );
  }

  async function saveGroup(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          editingGroupId
            ? `/api/option-groups/${editingGroupId}`
            : "/api/option-groups",
          {
            method:
              editingGroupId
                ? "PATCH"
                : "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  groupForm.name,

                slug:
                  slugify(
                    groupForm.slug,
                  ),

                selectionType:
                  groupForm.selectionType,

                minSelections:
                  Number(
                    groupForm.minSelections,
                  ),

                maxSelections:
                  Number(
                    groupForm.maxSelections,
                  ),

                required:
                  groupForm.required,

                position:
                  Number(
                    groupForm.position,
                  ),

                active:
                  groupForm.active,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível salvar o grupo.",
          ),
        );
      }

      setMessage(
        editingGroupId
          ? "Grupo atualizado com sucesso."
          : "Grupo criado com sucesso.",
      );

      resetGroupForm();

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o grupo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleGroup(
    group: OptionGroup,
  ) {
    if (!canWrite) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/option-groups/${group.id}`,
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
                active:
                  !group.active,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível alterar o grupo.",
          ),
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o grupo.",
      );
    }
  }

  async function createOption(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !selectedGroup ||
      !canWrite
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const normalized =
        optionPrice
          .trim()
          .replace(",", ".");

      const priceDelta =
        Number(normalized);

      if (
        !Number.isFinite(
          priceDelta,
        )
      ) {
        throw new Error(
          "Acréscimo inválido.",
        );
      }

      const response =
        await fetch(
          "/api/options",
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                optionGroupId:
                  selectedGroup.id,

                name:
                  optionName.trim(),

                priceDelta,

                position:
                  Number(
                    optionPosition,
                  ),

                active: true,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível criar a opção.",
          ),
        );
      }

      setOptionName("");
      setOptionPrice("0");

      setOptionPosition(
        String(
          selectedGroup
            .options.length + 1,
        ),
      );

      setMessage(
        "Opção criada com sucesso.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar a opção.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function patchOption(
    option: OptionItem,
    data: Record<
      string,
      unknown
    >,
  ) {
    if (!canWrite) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/options/${option.id}`,
          {
            method: "PATCH",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                data,
              ),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível alterar a opção.",
          ),
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar a opção.",
      );
    }
  }


  async function deleteOption(
    option: OptionItem,
  ) {
    if (!canWrite) {
      return;
    }

    const confirmed =
      window.confirm(
        `Excluir definitivamente a opção "${option.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          `/api/options/${option.id}`,
          {
            method: "DELETE",

            credentials:
              "same-origin",
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível excluir a opção.",
          ),
        );
      }

      setMessage(
        `Opção "${option.name}" excluída com sucesso.`,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a opção.",
      );
    }
  }

  const loadProductRelations =
    useCallback(
      async (
        productId: string,
      ) => {
        if (!productId) {
          setProductRelations(
            [],
          );
          return;
        }

        setRelationLoading(
          true,
        );

        try {
          const response =
            await fetch(
              `/api/products/${productId}/option-groups`,
              {
                cache:
                  "no-store",

                credentials:
                  "same-origin",
              },
            );

          if (!response.ok) {
            throw new Error(
              await apiError(
                response,
                "Não foi possível carregar os grupos do produto.",
              ),
            );
          }

          const body =
            await response.json();

          setProductRelations(
            Array.isArray(
              body.data,
            )
              ? body.data
              : [],
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Falha ao carregar vínculos.",
          );
        } finally {
          setRelationLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadProductRelations(
      selectedProductId,
    );
  }, [
    selectedProductId,
    loadProductRelations,
  ]);

  async function attachGroup(
    group: OptionGroup,
  ) {
    if (
      !canWrite ||
      !selectedProductId
    ) {
      return;
    }

    const nextPosition =
      productRelations.length +
      1;

    try {
      const response =
        await fetch(
          `/api/products/${selectedProductId}/option-groups`,
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                optionGroupId:
                  group.id,

                position:
                  nextPosition,
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível vincular o grupo.",
          ),
        );
      }

      setMessage(
        "Grupo vinculado ao produto.",
      );

      await loadProductRelations(
        selectedProductId,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível vincular o grupo.",
      );
    }
  }

  async function detachGroup(
    relation:
      ProductGroupRelation,
  ) {
    if (
      !canWrite ||
      !selectedProductId
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/products/${selectedProductId}/option-groups/${relation.optionGroupId}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          },
        );

      if (!response.ok) {
        throw new Error(
          await apiError(
            response,
            "Não foi possível remover o vínculo.",
          ),
        );
      }

      setMessage(
        "Grupo removido do produto.",
      );

      await loadProductRelations(
        selectedProductId,
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível remover o vínculo.",
      );
    }
  }

  const linkedIds =
    new Set(
      productRelations.map(
        (relation) =>
          relation.optionGroupId,
      ),
    );

  return (
    <div className="hf-option-groups-manager">
      <section className="hf-catalog-summary">
        <article>
          <span>
            Grupos
          </span>

          <strong>
            {groups.length}
          </strong>

          <small>
            Total cadastrado
          </small>
        </article>

        <article>
          <span>
            Grupos ativos
          </span>

          <strong>
            {activeGroups}
          </strong>

          <small>
            Disponíveis para uso
          </small>
        </article>

        <article>
          <span>
            Opções
          </span>

          <strong>
            {groups.reduce(
              (
                total,
                group,
              ) =>
                total +
                group.options.length,
              0,
            )}
          </strong>

          <small>
            Escolhas cadastradas
          </small>
        </article>

        <article>
          <span>
            Vínculos
          </span>

          <strong>
            {groups.reduce(
              (
                total,
                group,
              ) =>
                total +
                (
                  group._count
                    ?.products ??
                  0
                ),
              0,
            )}
          </strong>

          <small>
            Produto × grupo
          </small>
        </article>
      </section>

      {canWrite && (
        <section className="hf-panel hf-option-group-form-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                {editingGroupId
                  ? "Editar grupo"
                  : "Novo grupo"}
              </span>

              <h2>
                Regras de seleção
              </h2>
            </div>

            {editingGroupId && (
              <button
                type="button"
                className="hf-button-secondary"
                onClick={
                  resetGroupForm
                }
              >
                Cancelar
              </button>
            )}
          </div>

          <form
            className="hf-option-group-form"
            onSubmit={
              saveGroup
            }
          >
            <label>
              <span>Nome</span>

              <input
                value={
                  groupForm.name
                }
                onChange={(
                  event,
                ) => {
                  const name =
                    event.target
                      .value;

                  setGroupForm(
                    (current) => ({
                      ...current,

                      name,

                      slug:
                        editingGroupId
                          ? current.slug
                          : slugify(
                              name,
                            ),
                    }),
                  );
                }}
                placeholder="Ex.: Mistura"
              />
            </label>

            <label>
              <span>Slug</span>

              <input
                value={
                  groupForm.slug
                }
                onChange={(
                  event,
                ) =>
                  setGroupForm(
                    (current) => ({
                      ...current,

                      slug:
                        slugify(
                          event.target
                            .value,
                        ),
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>
                Tipo de seleção
              </span>

              <select
                value={
                  groupForm.selectionType
                }
                onChange={(
                  event,
                ) =>
                  setSelectionType(
                    event.target
                      .value as
                      SelectionType,
                  )
                }
              >
                <option value="SINGLE">
                  Escolha única
                </option>

                <option value="MULTIPLE">
                  Múltipla escolha
                </option>
              </select>
            </label>

            <label>
              <span>Mínimo</span>

              <input
                type="number"
                min="0"
                value={
                  groupForm.minSelections
                }
                onChange={(
                  event,
                ) =>
                  setGroupForm(
                    (current) => ({
                      ...current,

                      minSelections:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>Máximo</span>

              <input
                type="number"
                min="1"
                value={
                  groupForm.maxSelections
                }
                disabled={
                  groupForm.selectionType ===
                  "SINGLE"
                }
                onChange={(
                  event,
                ) =>
                  setGroupForm(
                    (current) => ({
                      ...current,

                      maxSelections:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>Posição</span>

              <input
                type="number"
                min="0"
                value={
                  groupForm.position
                }
                onChange={(
                  event,
                ) =>
                  setGroupForm(
                    (current) => ({
                      ...current,

                      position:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label className="hf-option-check">
              <input
                type="checkbox"
                checked={
                  groupForm.required
                }
                onChange={(
                  event,
                ) =>
                  setRequired(
                    event.target
                      .checked,
                  )
                }
              />

              <span>
                Obrigatório
              </span>
            </label>

            <label className="hf-option-check">
              <input
                type="checkbox"
                checked={
                  groupForm.active
                }
                onChange={(
                  event,
                ) =>
                  setGroupForm(
                    (current) => ({
                      ...current,

                      active:
                        event.target
                          .checked,
                    }),
                  )
                }
              />

              <span>
                Grupo ativo
              </span>
            </label>

            <button
              type="submit"
              className="hf-button-primary"
              disabled={saving}
            >
              {saving
                ? "Salvando..."
                : editingGroupId
                  ? "Salvar alterações"
                  : "Criar grupo"}
            </button>
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

      <section className="hf-option-groups-layout">
        <div className="hf-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                Configuração
              </span>

              <h2>
                Grupos de opções
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="hf-catalog-state">
              Carregando...
            </div>
          ) : (
            <div className="hf-option-group-list">
              {groups.map(
                (group) => (
                  <article
                    key={
                      group.id
                    }
                    className={`hf-option-group-card ${
                      selectedGroupId ===
                      group.id
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedGroupId(
                        group.id,
                      )
                    }
                  >
                    <div className="hf-option-group-card-top">
                      <div>
                        <strong>
                          {group.name}
                        </strong>

                        <small>
                          {group.selectionType ===
                          "SINGLE"
                            ? "Escolha única"
                            : "Múltipla escolha"}
                          {" · "}
                          {group.required
                            ? "Obrigatório"
                            : "Opcional"}
                        </small>
                      </div>

                      <span
                        className={
                          group.active
                            ? "hf-category-status is-active"
                            : "hf-category-status is-inactive"
                        }
                      >
                        {group.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </div>

                    <div className="hf-option-group-rule">
                      <span>
                        Mín.{" "}
                        <strong>
                          {group.minSelections}
                        </strong>
                      </span>

                      <span>
                        Máx.{" "}
                        <strong>
                          {group.maxSelections}
                        </strong>
                      </span>

                      <span>
                        {
                          group.options
                            .length
                        }{" "}
                        opções
                      </span>

                      <span>
                        {
                          group._count
                            ?.products ??
                          0
                        }{" "}
                        produtos
                      </span>
                    </div>

                    {canWrite && (
                      <div
                        className="hf-table-actions"
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            startEditGroup(
                              group,
                            )
                          }
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void toggleGroup(
                              group,
                            )
                          }
                        >
                          {group.active
                            ? "Desativar"
                            : "Ativar"}
                        </button>
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        <div className="hf-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                Opções
              </span>

              <h2>
                {selectedGroup
                  ?.name ??
                  "Selecione um grupo"}
              </h2>
            </div>
          </div>

          {selectedGroup && (
            <>
              {canWrite && (
                <form
                  className="hf-option-create-form"
                  onSubmit={
                    createOption
                  }
                >
                  <input
                    value={
                      optionName
                    }
                    onChange={(
                      event,
                    ) =>
                      setOptionName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Nome da opção"
                    required
                  />

                  <input
                    value={
                      optionPrice
                    }
                    onChange={(
                      event,
                    ) =>
                      setOptionPrice(
                        event.target
                          .value,
                      )
                    }
                    inputMode="decimal"
                    placeholder="Acréscimo"
                  />

                  <input
                    type="number"
                    min="0"
                    value={
                      optionPosition
                    }
                    onChange={(
                      event,
                    ) =>
                      setOptionPosition(
                        event.target
                          .value,
                      )
                    }
                    aria-label="Posição"
                  />

                  <button
                    type="submit"
                    className="hf-button-primary"
                  >
                    Adicionar
                  </button>
                </form>
              )}

              <div className="hf-option-list">
                {selectedGroup.options.map(
                  (option) => (
                    <div
                      key={
                        option.id
                      }
                      className="hf-option-row"
                    >
                      <div>
                        <strong>
                          {option.name}
                        </strong>

                        <small>
                          {money(
                            option.priceDelta,
                          )}
                          {" · "}
                          posição{" "}
                          {
                            option.position
                          }
                        </small>
                      </div>

                      <span
                        className={
                          option.active
                            ? "hf-category-status is-active"
                            : "hf-category-status is-inactive"
                        }
                      >
                        {option.active
                          ? "Ativa"
                          : "Inativa"}
                      </span>

                      {canWrite && (
                        <div className="hf-table-actions">
                          <button
                            type="button"
                            onClick={() =>
                              void patchOption(
                                option,
                                {
                                  active:
                                    !option.active,
                                },
                              )
                            }
                          >
                            {option.active
                              ? "Desativar"
                              : "Ativar"}
                          </button>
                          <button
			    type="button"
                            className="hf-danger-action"
                            onClick={() =>
                            void deleteOption(
                            option,
                          )
                        }
                      >
                       Excluir
                      </button>
                        </div>
                      )}
                    </div>
                  ),
                )}

                {!selectedGroup
                  .options.length && (
                  <div className="hf-catalog-state">
                    Nenhuma opção cadastrada.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="hf-panel hf-product-option-link-panel">
        <div className="hf-panel-header">
          <div>
            <span className="hf-eyebrow">
              Produtos
            </span>

            <h2>
              Vincular grupos ao produto
            </h2>
          </div>
        </div>

        <div className="hf-product-option-selector">
          <label>
            <span>
              Produto
            </span>

            <select
              value={
                selectedProductId
              }
              onChange={(
                event,
              ) =>
                setSelectedProductId(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                Selecione
              </option>

              {products.map(
                (product) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.name}
                    {product.status !==
                    "ACTIVE"
                      ? ` (${product.status.toLowerCase()})`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {selectedProductId && (
          <div className="hf-product-group-columns">
            <div>
              <h3>
                Vinculados
              </h3>

              {relationLoading ? (
                <div className="hf-catalog-state">
                  Carregando...
                </div>
              ) : (
                <div className="hf-linked-groups">
                  {productRelations.map(
                    (
                      relation,
                    ) => (
                      <div
                        key={
                          relation.optionGroupId
                        }
                        className="hf-linked-group-row"
                      >
                        <span className="hf-position-badge">
                          {
                            relation.position
                          }
                        </span>

                        <div>
                          <strong>
                            {
                              relation.optionGroup.name
                            }
                          </strong>

                          <small>
                            {
                              relation.optionGroup
                                .selectionType
                            }
                          </small>
                        </div>

                        {canWrite && (
                          <button
                            type="button"
                            className="hf-button-secondary"
                            onClick={() =>
                              void detachGroup(
                                relation,
                              )
                            }
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ),
                  )}

                  {!productRelations.length && (
                    <div className="hf-catalog-state">
                      Nenhum grupo vinculado.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3>
                Disponíveis
              </h3>

              <div className="hf-linked-groups">
                {groups
                  .filter(
                    (group) =>
                      group.active &&
                      !linkedIds.has(
                        group.id,
                      ),
                  )
                  .map(
                    (group) => (
                      <div
                        key={
                          group.id
                        }
                        className="hf-linked-group-row"
                      >
                        <div>
                          <strong>
                            {
                              group.name
                            }
                          </strong>

                          <small>
                            {
                              group.options.length
                            }{" "}
                            opções
                          </small>
                        </div>

                        {canWrite && (
                          <button
                            type="button"
                            className="hf-button-primary"
                            onClick={() =>
                              void attachGroup(
                                group,
                              )
                            }
                          >
                            Vincular
                          </button>
                        )}
                      </div>
                    ),
                  )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
