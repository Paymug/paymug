'use client';

import { Camera, Trash, UserCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Input } from '@/components/ui';
import { readCustomerAvatarFile } from '../customer-avatar.utils';
import type {
  CustomerProfileDetailsProps,
  CustomerProfileDetailsResponse,
} from './CustomerProfileDetails.types';

export function CustomerProfileDetails({
  customer,
}: CustomerProfileDetailsProps) {
  const router = useRouter();
  const [name, setName] = useState(customer.name || '');
  const [avatarImageUrl, setAvatarImageUrl] = useState(
    customer.avatarImageUrl || '',
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectAvatar(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setAvatarImageUrl(await readCustomerAvatarFile(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not read profile image',
      );
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const response = await fetch('/api/customer/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarImageUrl }),
    });
    const data = (await response.json()) as CustomerProfileDetailsResponse;
    setSaving(false);
    if (!response.ok) {
      setError(data.error || 'Could not update account settings');
      return;
    }
    setMessage('Account details updated.');
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-[#e8e8ee] bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Profile details</h2>
        <p className="mt-1 text-sm text-[#85859d]">
          Your name and image appear in your customer portal.
        </p>
      </div>

      <form onSubmit={saveProfile} className="mt-6">
        <div className="flex items-center gap-4 border-b border-[#eeeeF2] pb-6">
          <div className="relative shrink-0">
            <label
              htmlFor="customer-avatar"
              className="group relative grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-[#d8d8e0] bg-[#f7f7f8] text-[#9a9aaa]"
              aria-label={avatarImageUrl ? 'Replace profile image' : 'Upload profile image'}
            >
              {avatarImageUrl ? (
                <img
                  src={avatarImageUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle size={38} weight="thin" />
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                <Camera size={20} />
              </span>
            </label>
            <input
              id="customer-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void selectAvatar(event.target.files?.[0])}
              className="sr-only"
            />
            {avatarImageUrl && (
              <button
                type="button"
                onClick={() => setAvatarImageUrl('')}
                className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-[#eeeeF2] bg-white text-red-600 shadow-sm"
                aria-label="Remove profile image"
              >
                <Trash size={13} />
              </button>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Profile image</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#85859d]">
              JPEG, PNG, or WebP. Maximum file size 1 MB.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Your name"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={customer.email}
            readOnly
            aria-readonly="true"
            className="[&_input]:cursor-not-allowed [&_input]:bg-[#f7f7f8] [&_input]:text-[#77778a]"
          />
        </div>
        <p className="mt-2 text-xs text-[#9292a3]">
          Your email is tied to your purchase history and cannot be changed.
        </p>

        {(message || error) && (
          <div className="mt-5">
            {message ? (
              <Alert variant="success">{message}</Alert>
            ) : (
              <Alert>{error}</Alert>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </section>
  );
}
