import type { CheckoutCustomData } from "./checkout-custom-data.types";
import type {
  ConfigurableProduct,
  ProductBundle,
  ProductOption,
  ResolvedProductConfiguration,
} from "./product-configurations.types";

export const productOptionCustomKey = "product_option";
export const productBundleCustomKeyPrefix = "product_bundle_";

export function parseProductOptions(value: string): ProductOption[] {
  try {
    const parsed = JSON.parse(value) as ProductOption[];
    return Array.isArray(parsed)
      ? parsed.map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
        }))
      : [];
  } catch {
    return [];
  }
}

export function parseProductBundles(value: string): ProductBundle[] {
  try {
    const parsed = JSON.parse(value) as ProductBundle[];
    return Array.isArray(parsed)
      ? parsed.map((bundle) => ({
          id: bundle.id,
          name: bundle.name,
          selectionMode: bundle.selectionMode,
          choices: Array.isArray(bundle.choices)
            ? bundle.choices.map((choice) => ({
                id: choice.id,
                name: choice.name,
                price: choice.price,
              }))
            : [],
        }))
      : [];
  } catch {
    return [];
  }
}

export function serializeProductConfiguration(value: unknown): string {
  return JSON.stringify(value || []);
}

export function resolveProductConfiguration(
  product: ConfigurableProduct,
  custom: CheckoutCustomData = {},
  basePrice = product.price,
): ResolvedProductConfiguration {
  const selectedOption = product.options.length
    ? product.options.find(
        (option) => option.id === custom[productOptionCustomKey],
      ) || product.options[0]
    : undefined;
  const selectedBundleChoices: ResolvedProductConfiguration["selectedBundleChoices"] = [];
  let price = selectedOption?.price ?? basePrice;
  const normalizedCustom = { ...custom };

  if (selectedOption) {
    normalizedCustom[productOptionCustomKey] = selectedOption.id;
  }

  for (const bundle of product.bundles) {
    const key = `${productBundleCustomKeyPrefix}${bundle.id}`;
    const requestedIds = (custom[key] || "").split(",").filter(Boolean);
    const selectedChoices = bundle.choices.filter((choice) =>
      requestedIds.includes(choice.id),
    );
    const normalizedChoices =
      bundle.selectionMode === "single"
        ? selectedChoices.slice(0, 1)
        : selectedChoices;
    if (normalizedChoices.length) {
      normalizedCustom[key] = normalizedChoices.map((choice) => choice.id).join(",");
    } else {
      delete normalizedCustom[key];
    }
    for (const choice of normalizedChoices) {
      price += choice.price;
      selectedBundleChoices.push({ bundle, choice });
    }
  }

  return {
    price,
    selectedOption,
    selectedBundleChoices,
    custom: normalizedCustom,
  };
}

export function getProductStartingPrice(product: ConfigurableProduct): number {
  return product.options.length
    ? Math.min(...product.options.map((option) => option.price))
    : product.price;
}
