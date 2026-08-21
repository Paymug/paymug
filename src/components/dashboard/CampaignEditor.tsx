"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductDescriptionEditor } from "@/components/ProductDescriptionEditor";
import { Alert, Button, Input, Select } from "@/components/ui";
import type {
  CampaignEditorProps,
  CampaignEmailType,
  CampaignRecipientsResponse,
  CampaignResponse,
  SendTiming,
} from "./CampaignEditor.types";

export function CampaignEditor({ campaign, products }: CampaignEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(campaign.title || "");
  const [subject, setSubject] = useState(String(campaign.data.subject || ""));
  const [previewText, setPreviewText] = useState(campaign.subtitle || "");
  const [recipientType, setRecipientType] = useState(
    String(campaign.data.recipientType || "all_customers"),
  );
  const [emailType, setEmailType] = useState<CampaignEmailType>(
    (campaign.data.emailType as CampaignEmailType) || "marketing",
  );
  const [content, setContent] = useState(String(campaign.data.content || ""));
  const [sendTiming, setSendTiming] = useState<SendTiming>(
    campaign.status === "scheduled" ? "later" : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(
    String(campaign.data.scheduledAt || ""),
  );
  const [testEmail, setTestEmail] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [recipientCounts, setRecipientCounts] = useState<
    Record<string, number>
  >({});
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"success" | "error">(
    "success",
  );

  async function loadRecipients() {
    const response = await fetch(
      `/api/features/campaigns/${campaign.id}/recipients`,
    );
    const data = (await response.json()) as CampaignRecipientsResponse;
    if (!response.ok) throw new Error(data.error || "Could not load recipients");
    setRecipientCount(data.count || 0);
    setRecipientCounts(data.counts || {});
    setRecipientEmails(
      (data.recipients || []).map((recipient) => recipient.email),
    );
  }

  useEffect(() => {
    void loadRecipients().catch(() => undefined);
  }, []);

  async function save(
    extra: Record<string, unknown> = {},
    nextStatus = campaign.status === "sent" ? "sent" : "draft",
  ) {
    const response = await fetch(`/api/features/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        subtitle: previewText,
        status: nextStatus,
        data: {
          ...campaign.data,
          subject,
          previewText,
          recipientType,
          emailType,
          content,
          ...extra,
        },
      }),
    });
    const data = (await response.json()) as CampaignResponse;
    if (!response.ok) throw new Error(data.error || "Could not save campaign");
  }

  async function saveDraft() {
    setWorking(true);
    setMessage(null);
    try {
      await save();
      await loadRecipients();
      setMessageVariant("success");
      setMessage("Campaign saved.");
      router.refresh();
    } catch (error) {
      setMessageVariant("error");
      setMessage(error instanceof Error ? error.message : "Could not save");
    } finally {
      setWorking(false);
    }
  }

  async function createCampaign() {
    setWorking(true);
    setMessage(null);
    try {
      if (sendTiming === "later") {
        if (!scheduledAt) throw new Error("Choose a send date and time");
        await save(
          { scheduledAt: new Date(scheduledAt).toISOString() },
          "scheduled",
        );
        setMessageVariant("success");
        setMessage("Campaign scheduled.");
        router.refresh();
      } else {
        await save({ scheduledAt: null });
        const response = await fetch(
          `/api/features/campaigns/${campaign.id}/send`,
          { method: "POST" },
        );
        const data = (await response.json()) as CampaignResponse;
        if (!response.ok) {
          throw new Error(data.error || "Could not send campaign");
        }
        router.push("/dashboard/email/campaigns");
        router.refresh();
      }
    } catch (error) {
      setMessageVariant("error");
      setMessage(
        error instanceof Error ? error.message : "Could not create campaign",
      );
    } finally {
      setWorking(false);
    }
  }

  async function sendTest() {
    setWorking(true);
    setMessage(null);
    try {
      await save();
      const response = await fetch(
        `/api/features/campaigns/${campaign.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail }),
        },
      );
      const data = (await response.json()) as CampaignResponse;
      if (!response.ok) throw new Error(data.error || "Could not send test");
      setMessageVariant("success");
      setMessage("Test email sent.");
    } catch (error) {
      setMessageVariant("error");
      setMessage(
        error instanceof Error ? error.message : "Could not send test",
      );
    } finally {
      setWorking(false);
    }
  }

  const recipientOptions = [
    { value: "all_customers", label: "All customers" },
    ...products.map((product) => ({
      value: `product:${product.id}`,
      label: `${product.name} customers`,
    })),
    { value: "custom", label: "Custom subscriber list" },
  ].map((option) => ({
    ...option,
    label: `${option.label} (${recipientCounts[option.value] || 0})`,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 pb-24">
          <div className="mx-auto flex max-w-4xl items-center px-5 py-6 sm:px-8">
            <Link
              href="/dashboard/email/campaigns"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
            >
              <ArrowLeft size={16} /> Campaigns
            </Link>
          </div>

          <article className="mx-auto mt-4 max-w-4xl px-5 sm:px-8">
            <div className="mx-auto max-w-[42rem] pb-8 pt-6">
              <h1 className="mt-4 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
                {subject || "Untitled email"}
              </h1>
              <p className="mt-4 text-lg leading-7 text-muted">
                {previewText || "Add preview text in the settings panel."}
              </p>
              <p className="mt-5 text-sm text-muted">
                Use <code className="rounded bg-[#f3f3f5] px-1.5 py-0.5 text-foreground">[name]</code>{" "}
                to insert each recipient&apos;s name. Recipients without a name use
                “there”.
              </p>
            </div>

            <div className="mx-auto max-w-[42rem] border-t border-border py-8 sm:py-12">
              <ProductDescriptionEditor value={content} onChange={setContent} />
            </div>
          </article>
        </main>

        <aside className="m-2 self-start rounded-2xl border border-[#e8e8ee] bg-white lg:sticky lg:top-1 lg:h-[calc(100vh-0.5rem)]">
          <div className="flex h-full flex-col overflow-y-auto px-6">
            <div>
              <div className="sticky top-0 z-10 mb-6 border-b border-border bg-white py-4">
                <h2 className="text-lg font-semibold">Settings</h2>
              </div>

              {message && (
                <div className="mb-5">
                  <Alert variant={messageVariant}>{message}</Alert>
                </div>
              )}

              <div className="space-y-5">
                <Input
                  label="Campaign name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                <Input
                  label="Subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
                <Input
                  label="Preview text"
                  value={previewText}
                  onChange={(event) => setPreviewText(event.target.value)}
                />
                <Select
                  label="Recipients"
                  value={recipientType}
                  options={recipientOptions}
                  onValueChange={(value) => {
                    setRecipientType(value);
                    setRecipientCount(recipientCounts[value] || 0);
                    setRecipientEmails([]);
                  }}
                />
                <Select
                  label="Email type"
                  value={emailType}
                  options={[
                    { value: "marketing", label: "Marketing and promotions" },
                    { value: "product_updates", label: "Product updates" },
                    { value: "affiliate_updates", label: "Affiliate updates" },
                  ]}
                  onValueChange={(value) =>
                    setEmailType(value as CampaignEmailType)
                  }
                />
                <p className="-mt-3 text-xs leading-5 text-muted">
                  Recipients who disabled this type are automatically excluded.
                </p>

                <div className="rounded-xl bg-[#f7f7f8] p-4 text-sm">
                  <p className="font-semibold">
                    {recipientCount === null
                      ? "Loading recipients…"
                      : `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}
                  </p>
                  {recipientEmails.length > 0 && (
                    <p className="mt-2 break-words text-xs leading-5 text-muted">
                      {recipientEmails.join(", ")}
                      {recipientCount && recipientCount > recipientEmails.length
                        ? ` and ${recipientCount - recipientEmails.length} more`
                        : ""}
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-accent-hover hover:underline"
                    onClick={() => void saveDraft()}
                    disabled={working}
                  >
                    Update recipient preview
                  </button>
                </div>

                <Select
                  label="Send time"
                  value={sendTiming}
                  options={[
                    { value: "now", label: "Send now" },
                    { value: "later", label: "Send later" },
                  ]}
                  onValueChange={(value) => setSendTiming(value as SendTiming)}
                />
                {sendTiming === "later" && (
                  <Input
                    label="Date and time"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                )}

                <div className="rounded-xl border border-border p-4">
                  <Input
                    label="Test email"
                    type="email"
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                  />
                  <Button
                    className="mt-3 w-full"
                    variant="outline"
                    disabled={working || !testEmail}
                    onClick={() => void sendTest()}
                  >
                    Send test
                  </Button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 mt-auto flex gap-3 bg-white py-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={working}
                onClick={() => void saveDraft()}
              >
                Save draft
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={working}
                onClick={() => void createCampaign()}
              >
                {sendTiming === "now" ? "Send now" : "Schedule"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
