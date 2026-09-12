"use client";

import {
  useState,
} from "react";

import {
  CategoriesManager,
} from "./categories-manager";

import {
  ProductsManager,
} from "./products-manager";

import {
  OptionGroupsManager,
} from "./option-groups-manager";

type CatalogManagerProps = {
  canWrite: boolean;
};

type CatalogTab =
  | "categories"
  | "products"
  | "options";

export function CatalogManager({
  canWrite,
}: CatalogManagerProps) {
  const [
    tab,
    setTab,
  ] =
    useState<CatalogTab>(
      "products",
    );

  return (
    <div className="hf-catalog-manager">
      <div
        className="hf-catalog-tabs"
        role="tablist"
        aria-label="Gestão do cardápio"
      >
        <button
          type="button"
          className={
            tab ===
            "categories"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setTab(
              "categories",
            )
          }
        >
          Categorias
        </button>

        <button
          type="button"
          className={
            tab ===
            "products"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setTab(
              "products",
            )
          }
        >
          Produtos
        </button>

        <button
          type="button"
          className={
            tab ===
            "options"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setTab(
              "options",
            )
          }
        >
          Grupos de opções
        </button>
      </div>

      {tab ===
      "categories" ? (
        <CategoriesManager
          canWrite={
            canWrite
          }
        />
      ) : tab ===
        "products" ? (
        <ProductsManager
          canWrite={
            canWrite
          }
        />
      ) : (
        <OptionGroupsManager
          canWrite={
            canWrite
          }
        />
      )}
    </div>
  );
}
