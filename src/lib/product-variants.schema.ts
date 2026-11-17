import { z } from "zod";

const money = z.number().int().min(0).max(1_000_000_000);
const inherit = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

/** Fields a variant may set. `null` means "inherit from the product". */
export const variantOverrideSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(5000).optional(),
  sort: z.number().int().min(0).max(1000).optional(),
  status: z.enum(["draft", "published"]).optional(),
  price: money.optional(),
  customAmountEnabled: inherit(z.boolean()),
  minPrice: inherit(money),
  suggestedPrice: inherit(money),
  billingType: inherit(z.enum(["one_time", "subscription"])),
  intervalUnit: inherit(z.enum(["week", "month", "year"])),
  intervalCount: inherit(z.number().int().min(1).max(52)),
  trialDays: inherit(z.number().int().min(0).max(365)),
  productFiles: inherit(
    z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          name: z.string().min(1).max(255),
          size: z.number().int().min(0),
          type: z.string().max(200),
          storageKey: z.string().min(1).max(500),
        }),
      )
      .max(20),
  ),
  generateLicense: inherit(z.boolean()),
  licenseType: inherit(z.enum(["standard", "perpetual"])),
  // `null` = unlimited seats here, so inheritance is expressed by omitting it
  // and clearing it uses `inheritLicenseSeatLimit`.
  licenseSeatLimit: z.number().int().min(1).max(1000).nullable().optional(),
  inheritLicenseSeatLimit: z.boolean().optional(),
  licenseUpdatePeriodUnit: inherit(z.enum(["day", "week", "month", "year"])),
  licenseUpdatePeriodCount: inherit(z.number().int().min(1).max(3650)),
  deliveryContent: inherit(z.string().max(100000)),
  redirectUrl: inherit(z.string().max(2000)),
  githubRepoOwner: inherit(z.string().trim().min(1).max(100)),
  githubRepoName: inherit(z.string().trim().min(1).max(100)),
});

export type VariantOverrideInput = z.infer<typeof variantOverrideSchema>;
