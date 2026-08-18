"use client";

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import {
  buttonBaseClass,
  buttonVariantClasses,
  cardClass,
  inputClass,
  labelClass,
} from "./ui.styles";

export { CustomSelect as Select } from "./CustomSelect";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "outline" | "ghost" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      className={`${buttonBaseClass} ${buttonVariantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label className={labelClass} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input id={inputId} className={inputClass} {...props} />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label className={labelClass} htmlFor={inputId}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`${inputClass} min-h-[110px] resize-y`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Alert({
  children,
  variant = "error",
}: {
  children: ReactNode;
  variant?: "error" | "success" | "info";
}) {
  const styles =
    variant === "error"
      ? "bg-red-50 text-red-800 border-red-100"
      : variant === "success"
        ? "bg-emerald-50 text-emerald-800 border-emerald-100"
        : "bg-amber-50 text-amber-900 border-amber-100";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${cardClass} flex flex-col items-center px-6 py-14 text-center`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
