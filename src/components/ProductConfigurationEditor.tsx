"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import { Button, Input, Select } from "./ui";
import type { ProductConfigurationEditorProps } from "./ProductConfigurationEditor.types";

function createId() {
  return crypto.randomUUID();
}

function toCents(value: string) {
  return Math.max(0, Math.round((Number(value) || 0) * 100));
}

export function ProductConfigurationEditor({
  currency,
  defaultPrice,
  options,
  bundles,
  onOptionsChange,
  onBundlesChange,
}: ProductConfigurationEditorProps) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-[#fafafd] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Options</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Add mutually exclusive tiers with their own price.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="w-11 h-10 p-0"
          onClick={() =>
            onOptionsChange([
              ...options,
              {
                id: createId(),
                name: `Option ${options.length + 1}`,
                price: defaultPrice,
              },
            ])
          }
        >
          <Plus size={18} className="absolute" />
        </Button>
      </div>

      {options.map((option) => (
        <div
          key={option.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3"
        >
          <Input
            label="Option name"
            value={option.name}
            onChange={(event) =>
              onOptionsChange(
                options.map((item) =>
                  item.id === option.id
                    ? { ...item, name: event.target.value }
                    : item,
                ),
              )
            }
          />
          <Input
            label={`Price (${currency})`}
            type="number"
            min="0"
            step="0.01"
            value={(option.price / 100).toFixed(2)}
            onChange={(event) =>
              onOptionsChange(
                options.map((item) =>
                  item.id === option.id
                    ? { ...item, price: toCents(event.target.value) }
                    : item,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() =>
              onOptionsChange(options.filter((item) => item.id !== option.id))
            }
            className="mt-6 grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${option.name}`}
          >
            <Trash size={17} />
          </button>
        </div>
      ))}

      <div className="border-t border-border pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Extra bundles</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Optional add-on groups can allow one or multiple selections.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-12 h-10 p-0"
            onClick={() =>
              onBundlesChange([
                ...bundles,
                {
                  id: createId(),
                  name: `Bundle ${bundles.length + 1}`,
                  selectionMode: "single",
                  choices: [],
                },
              ])
            }
          >
            <Plus size={18} className="absolute" />
          </Button>
        </div>
      </div>

      {bundles.map((bundle) => (
        <div
          key={bundle.id}
          className="space-y-3 rounded-xl border border-border bg-white p-4"
        >
          <div className="flex flex-col gap-3">
            <Input
              label="Bundle name"
              value={bundle.name}
              onChange={(event) =>
                onBundlesChange(
                  bundles.map((item) =>
                    item.id === bundle.id
                      ? { ...item, name: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <Select
              label="Selection"
              name={`bundle-mode-${bundle.id}`}
              value={bundle.selectionMode}
              onValueChange={(value) =>
                onBundlesChange(
                  bundles.map((item) =>
                    item.id === bundle.id
                      ? {
                          ...item,
                          selectionMode: value as "single" | "multiple",
                        }
                      : item,
                  ),
                )
              }
              options={[
                { value: "single", label: "Select one" },
                { value: "multiple", label: "Select multiple" },
              ]}
            />
            <button
              type="button"
              onClick={() =>
                onBundlesChange(bundles.filter((item) => item.id !== bundle.id))
              }
              className="mt-6 grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete ${bundle.name}`}
            >
              <Trash size={17} />
            </button>
          </div>

          {bundle.choices.map((choice) => (
            <div
              key={choice.id}
              className="flex flex-col gap-3 border-t border-border pt-3"
            >
              <Input
                label="Extra"
                value={choice.name}
                onChange={(event) =>
                  onBundlesChange(
                    bundles.map((item) =>
                      item.id === bundle.id
                        ? {
                            ...item,
                            choices: item.choices.map((entry) =>
                              entry.id === choice.id
                                ? { ...entry, name: event.target.value }
                                : entry,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
              <Input
                label={`Price (${currency})`}
                type="number"
                min="0"
                step="0.01"
                value={(choice.price / 100).toFixed(2)}
                onChange={(event) =>
                  onBundlesChange(
                    bundles.map((item) =>
                      item.id === bundle.id
                        ? {
                            ...item,
                            choices: item.choices.map((entry) =>
                              entry.id === choice.id
                                ? {
                                    ...entry,
                                    price: toCents(event.target.value),
                                  }
                                : entry,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  onBundlesChange(
                    bundles.map((item) =>
                      item.id === bundle.id
                        ? {
                            ...item,
                            choices: item.choices.filter(
                              (entry) => entry.id !== choice.id,
                            ),
                          }
                        : item,
                    ),
                  )
                }
                className="mt-6 grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${choice.name}`}
              >
                <Trash size={17} />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onBundlesChange(
                bundles.map((item) =>
                  item.id === bundle.id
                    ? {
                        ...item,
                        choices: [
                          ...item.choices,
                          {
                            id: createId(),
                            name: `Extra ${item.choices.length + 1}`,
                            price: 0,
                          },
                        ],
                      }
                    : item,
                ),
              )
            }
          >
            <Plus size={15} /> Add extra
          </Button>
        </div>
      ))}
    </div>
  );
}
