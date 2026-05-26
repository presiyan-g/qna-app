'use client';

import { useActionState, useState } from 'react';
import { Spinner } from '@/app/_components/Spinner';
import {
  createCommunityAction,
  updateCommunityAction,
  type CommunityFormState,
} from '@/app/actions/communities';
import type { CommunityCategory } from '@/db/schema/communities';
import { ImageUploader } from '@/app/_components/ImageUploader';
import { EmojiPicker } from './EmojiPicker';

const INITIAL: CommunityFormState = { ok: false };

type CategoryOption = Pick<CommunityCategory, 'id' | 'name'>;

export type CommunityFormInitialValue = {
  name: string;
  description: string;
  emoji: string;
  coverImageUrl: string | null;
  categoryId: string | null;
  cadence: 'daily' | 'weekly' | 'custom';
  communityId: string;
};

type CreateProps = {
  mode: 'create';
  categories: CategoryOption[];
  initialValue?: undefined;
  slug?: undefined;
};

type EditProps = {
  mode: 'edit';
  categories: CategoryOption[];
  initialValue: CommunityFormInitialValue;
  slug: string;
};

type Props = CreateProps | EditProps;

export function CommunityForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const boundAction = isEdit
    ? updateCommunityAction.bind(null, props.slug)
    : createCommunityAction;

  const [state, formAction, pending] = useActionState(boundAction, INITIAL);

  const [emoji, setEmoji] = useState(props.initialValue?.emoji ?? '');

  const submitLabel = isEdit
    ? pending
      ? 'Saving...'
      : 'Save changes'
    : pending
      ? 'Creating...'
      : 'Create community';

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
        defaultValue={props.initialValue?.name}
        error={state.fieldErrors?.name}
      />
      <TextArea
        label="Description"
        name="description"
        defaultValue={props.initialValue?.description}
        error={state.fieldErrors?.description}
      />
      <ImageUploader
        name="coverImageUrl"
        scope="community-cover"
        communityId={props.initialValue?.communityId ?? null}
        label="Cover image (optional)"
        helpText="JPEG, PNG, WebP, or AVIF up to 5 MB."
        initialUrl={props.initialValue?.coverImageUrl ?? null}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="field-categoryId" className="text-[13px] font-semibold">
          Category
        </label>
        <select
          id="field-categoryId"
          name="categoryId"
          defaultValue={props.initialValue?.categoryId ?? ''}
          aria-invalid={state.fieldErrors?.categoryId ? 'true' : undefined}
          className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">No category</option>
          {props.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.categoryId && (
          <p className="text-[12px] text-red-700">
            {state.fieldErrors.categoryId}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-emoji" className="text-[13px] font-semibold text-ink">
            Icon
          </label>
          <div className="relative">
            <input
              id="field-emoji"
              name="emoji"
              type="text"
              autoComplete="off"
              placeholder="AI"
              value={emoji}
              maxLength={4}
              onChange={(event) => setEmoji(event.target.value)}
              aria-invalid={state.fieldErrors?.emoji ? 'true' : undefined}
              aria-describedby={
                state.fieldErrors?.emoji ? 'field-emoji-error' : undefined
              }
              className="w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-line bg-paper py-2.5 pl-3.5 pr-12 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute inset-y-0 right-1.5 flex items-center">
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
          </div>
          {state.fieldErrors?.emoji && (
            <p id="field-emoji-error" className="text-[12px] text-red-700">
              {state.fieldErrors.emoji}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-cadence" className="text-[13px] font-semibold">
            Cadence
          </label>
          <select
            id="field-cadence"
            name="cadence"
            defaultValue={props.initialValue?.cadence ?? 'daily'}
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

      <button type="submit" disabled={pending} className="q-btn q-btn-primary">
        {pending && <Spinner />}
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  defaultValue,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  type: 'text';
  autoComplete?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
