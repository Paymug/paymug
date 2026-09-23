import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { abandonmentResponses as abandonmentResponsesTable } from "@/db/schema";
import type { AbandonmentResponse } from "./abandonment-responses.types";

export async function listAbandonmentResponses(input: {
  userId: string;
  storeId: string;
  environment: "sandbox" | "live";
}): Promise<AbandonmentResponse[]> {
  const db = await getDb();
  const rows = await db.query.abandonmentResponses.findMany({
    where: and(
      eq(abandonmentResponsesTable.userId, input.userId),
      eq(abandonmentResponsesTable.storeId, input.storeId),
      eq(abandonmentResponsesTable.environment, input.environment),
    ),
    orderBy: [desc(abandonmentResponsesTable.createdAt)],
    limit: 500,
  });
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId ?? undefined,
    email: row.email ?? undefined,
    question: row.question,
    answer: row.answer ?? undefined,
    marketingOptIn: row.marketingOptIn,
    createdAt: row.createdAt,
  }));
}
