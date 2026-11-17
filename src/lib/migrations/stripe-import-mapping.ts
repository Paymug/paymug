/**
 * Parser for the mapping file Stripe returns after a card import (Paddle via
 * IXOPAY, Dodo or Polar exports). One row links a source customer (and
 * optionally its payment method) to the new Stripe ids. Pure: no I/O.
 */

export interface StripeMappingRow {
  sourceCustomerId: string;
  sourcePaymentMethodId: string | null;
  stripeCustomerId: string;
  stripePaymentMethodId: string | null;
}

/** Minimal RFC 4180 CSV reader: quotes, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function findColumns(header: string[]) {
  const names = header.map(norm);
  const find = (test: (name: string) => boolean) => names.findIndex(test);
  const isPm = (name: string) => /payment|method|card|pm/.test(name);
  const stripeCustomer = find((n) => n.includes("stripe") && n.includes("customer"));
  const stripePm = find((n) => n.includes("stripe") && isPm(n));
  const sourceCustomer = find((n) => !n.includes("stripe") && n.includes("customer") && !isPm(n));
  const sourcePm = find((n) => !n.includes("stripe") && isPm(n));
  return { stripeCustomer, stripePm, sourceCustomer, sourcePm };
}

export class MappingParseError extends Error {}

/** Throws {@link MappingParseError} when the columns cannot be identified. */
export function parseStripeMappingCsv(text: string): StripeMappingRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new MappingParseError("The mapping file has no rows");
  const columns = findColumns(rows[0]);
  if (columns.stripeCustomer < 0 || columns.sourceCustomer < 0) {
    throw new MappingParseError(
      "Could not find a source customer column and a Stripe customer column in the header",
    );
  }
  const out: StripeMappingRow[] = [];
  for (const row of rows.slice(1)) {
    const cell = (index: number) => (index >= 0 ? (row[index] ?? "").trim() : "");
    const sourceCustomerId = cell(columns.sourceCustomer);
    const stripeCustomerId = cell(columns.stripeCustomer);
    if (!sourceCustomerId || !/^cus_/.test(stripeCustomerId)) continue;
    const stripePm = cell(columns.stripePm);
    out.push({
      sourceCustomerId,
      sourcePaymentMethodId: cell(columns.sourcePm) || null,
      stripeCustomerId,
      stripePaymentMethodId: /^(pm|card)_/.test(stripePm) ? stripePm : null,
    });
  }
  return out;
}

export interface MappableSubscription {
  recordId: string;
  sourceCustomerId: string | null;
  sourcePaymentMethodId: string | null;
}

/**
 * Matches mapping rows to imported subscriptions: by customer id, and by
 * payment method id too when both sides carry one. First row wins per record.
 */
export function matchMapping(
  subscriptions: MappableSubscription[],
  rows: StripeMappingRow[],
): { matched: Map<string, StripeMappingRow>; unmatched: string[] } {
  const matched = new Map<string, StripeMappingRow>();
  const unmatched: string[] = [];
  for (const subscription of subscriptions) {
    const candidates = rows.filter((row) => row.sourceCustomerId === subscription.sourceCustomerId);
    const exact = candidates.find(
      (row) =>
        subscription.sourcePaymentMethodId &&
        row.sourcePaymentMethodId === subscription.sourcePaymentMethodId,
    );
    const pick = exact ?? candidates.find((row) => !row.sourcePaymentMethodId || !subscription.sourcePaymentMethodId);
    if (subscription.sourceCustomerId && pick) matched.set(subscription.recordId, pick);
    else unmatched.push(subscription.recordId);
  }
  return { matched, unmatched };
}
