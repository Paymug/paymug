"use client";

import {
  ArrowRight,
  CaretDown,
  Check,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  fetchSetupConfiguration,
  migrateSetupDatabase,
} from "./setup-client.utils";
import { SetupStepIndicator } from "./SetupStepIndicator";
import type {
  InitialSetupConfigurationResponse,
  InitialSetupStepStatus,
} from "./setup.types";

export function SetupClient() {
  const [migrationStatus, setMigrationStatus] =
    useState<InitialSetupStepStatus>("pending");
  const [configurationStatus, setConfigurationStatus] =
    useState<InitialSetupStepStatus>("pending");
  const [configuration, setConfiguration] =
    useState<InitialSetupConfigurationResponse | null>(null);
  const [migrationMessage, setMigrationMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const setupStartedRef = useRef(false);

  const checkConfiguration = useCallback(async () => {
    setConfigurationStatus("loading");
    setError(null);
    try {
      const result = await fetchSetupConfiguration();
      setConfiguration(result);
      setConfigurationStatus(result.complete ? "complete" : "needs_action");
    } catch (setupError) {
      setConfigurationStatus("error");
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Could not check the environment",
      );
    }
  }, []);

  const runSetup = useCallback(async () => {
    setMigrationStatus("loading");
    setConfigurationStatus("pending");
    setError(null);
    try {
      const result = await migrateSetupDatabase();
      setMigrationMessage(
        result.appliedMigrations > 0
          ? `${result.appliedMigrations} migrations applied`
          : `Schema is current · ${result.totalMigrations} migrations`,
      );
      setMigrationStatus("complete");
      await checkConfiguration();
    } catch (setupError) {
      setMigrationStatus("error");
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Could not migrate the database",
      );
    }
  }, [checkConfiguration]);

  useEffect(() => {
    if (setupStartedRef.current) return;
    setupStartedRef.current = true;
    void runSetup();
  }, [runSetup]);

  return (
    <div>
      <ol className="divide-y divide-border">
        <li className="flex gap-4 px-6 py-5 sm:px-7">
          <SetupStepIndicator number={1} status={migrationStatus} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Migrate database schema</h2>
              <span className="text-xs font-medium text-muted">
                {migrationStatus === "loading"
                  ? "Running…"
                  : migrationStatus === "complete"
                    ? "Complete"
                    : migrationStatus === "error"
                      ? "Failed"
                      : "Waiting"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              Apply pending schema migrations to the configured D1 database.
            </p>
            {migrationMessage && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                {migrationMessage}
              </p>
            )}
          </div>
        </li>

        <li className="flex gap-4 px-6 py-5 sm:px-7">
          <SetupStepIndicator number={2} status={configurationStatus} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Configure the environment</h2>
              <span className="text-xs font-medium text-muted">
                {configurationStatus === "loading"
                  ? "Checking…"
                  : configurationStatus === "complete"
                    ? "Complete"
                    : configurationStatus === "needs_action"
                      ? "Needs attention"
                      : configurationStatus === "error"
                        ? "Failed"
                        : "Waiting"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              Confirm the minimum variables required before creating an account.
            </p>

            {configuration && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <button
                  type="button"
                  aria-expanded={configurationOpen}
                  onClick={() => setConfigurationOpen((open) => !open)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 bg-stone-50 px-4 py-3 text-left text-sm font-semibold"
                >
                  Required environment variables
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={`transition-transform ${configurationOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {configurationOpen && (
                  <ul className="divide-y divide-border">
                    {configuration.items.map((item) => (
                      <li key={item.key} className="flex gap-3 px-4 py-3.5">
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                            item.configured
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.configured ? (
                            <Check size={12} weight="bold" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="font-semibold text-foreground">
                              {item.key}
                            </code>
                            <span
                              className={`text-xs font-semibold ${
                                item.configured
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {item.configured ? "Configured" : "Missing"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="mt-3 text-xs leading-5 text-muted">
              Payments, email delivery, file storage, and GitHub access are set
              up later from the dashboard.
            </p>
          </div>
        </li>
      </ol>

      {error && (
        <div className="mx-6 mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-7">
          {error}
        </div>
      )}

      <div className="border-t border-border px-6 py-5 sm:px-7">
        {migrationStatus === "error" ? (
          <Button className="w-full" onClick={() => void runSetup()}>
            Retry setup
          </Button>
        ) : configurationStatus === "needs_action" ||
          configurationStatus === "error" ? (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => void checkConfiguration()}
          >
            Check configuration again
          </Button>
        ) : configurationStatus === "complete" ? (
          <Link
            href="/setup/account"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-dark transition hover:bg-accent-hover"
          >
            Continue to account setup
            <ArrowRight size={16} weight="bold" />
          </Link>
        ) : (
          <Button className="w-full" disabled>
            Setting up…
          </Button>
        )}
      </div>
    </div>
  );
}
