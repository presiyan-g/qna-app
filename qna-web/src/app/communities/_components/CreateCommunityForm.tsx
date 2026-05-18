'use client';

import { useActionState } from 'react';
import {
  createCommunityAction,
  type CommunityFormState,
} from '@/app/actions/communities';

const INITIAL: CommunityFormState = { ok: false };

export function CreateCommunityForm() {
  const [state, formAction, pending] = useActionState(
    createCommunityAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.formError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </div>
      )}

      <Field
        label="Name"
        name="name"
        type="text"
        autoComplete="off"
        error={state.fieldErrors?.name}
      />
      <TextArea
        label="Description"
        name="description"
        error={state.fieldErrors?.description}
      />
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <Field
          label="Icon"
          name="emoji"
          type="text"
          autoComplete="off"
          placeholder="AI"
          error={state.fieldErrors?.emoji}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-cadence" className="text-[13px] font-semibold">
            Cadence
          </label>
          <select
            id="field-cadence"
            name="cadence"
            defaultValue="daily"
            className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
          {state.fieldErrors?.cadence && (
            <p className="text-[12px] text-red-700">
              {state.fieldErrors.cadence}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-[22px] py-[13px] text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? 'Creating...' : 'Create community'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  type: 'text';
  autoComplete?: string;
  error?: string;
  placeholder?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && (
        <p id={`${id}-error`} className="text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  name,
  error,
}: {
  label: string;
  name: string;
  error?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={4}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="resize-none rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {error && (
        <p id={`${id}-error`} className="text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
