'use client';

import { useId, useRef, useState } from 'react';
import {
  requestImageUploadAction,
  type RequestImageUploadResult,
} from '@/app/actions/uploads';
import type { UploadScope } from '@/services/uploads';

type Status = 'idle' | 'requesting' | 'uploading' | 'error';

export function ImageUploader({
  name,
  scope,
  communityId,
  label,
  initialUrl = null,
  helpText,
}: {
  name: string;
  scope: UploadScope;
  communityId: string | null;
  label: string;
  initialUrl?: string | null;
  helpText?: string;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onFileSelected(file: File) {
    setError(null);
    setStatus('requesting');

    let result: RequestImageUploadResult;
    try {
      result = await requestImageUploadAction({
        scope,
        contentType: file.type,
        sizeBytes: file.size,
        communityId,
      });
    } catch {
      setStatus('error');
      setError('Could not start upload. Try again.');
      return;
    }

    if (!result.ok) {
      setStatus('error');
      setError(
        result.formError ??
          result.fieldErrors?.contentType ??
          result.fieldErrors?.sizeBytes ??
          result.fieldErrors?.scope ??
          'Could not start upload.',
      );
      return;
    }

    setStatus('uploading');
    try {
      const putResponse = await fetch(result.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`PUT failed: ${putResponse.status}`);
      }
    } catch {
      setStatus('error');
      setError('Upload to storage failed. Try again.');
      return;
    }

    setUrl(result.data.publicUrl);
    setStatus('idle');
  }

  function clear() {
    setUrl(null);
    setStatus('idle');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const busy = status === 'requesting' || status === 'uploading';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <input type="hidden" name={name} value={url ?? ''} />

      {url ? (
        <div className="flex items-start gap-3">
          <img
            src={url}
            alt=""
            className="h-24 w-24 rounded-md border border-line object-cover"
          />
          <button
            type="button"
            onClick={clear}
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFileSelected(file);
            }}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-semibold text-ink transition hover:border-primary hover:text-primary ${
              busy ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Choose image
          </label>
        </div>
      )}

      {status === 'requesting' && (
        <p className="text-[12px] text-muted">Preparing upload...</p>
      )}
      {status === 'uploading' && (
        <p className="text-[12px] text-muted">Uploading...</p>
      )}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      {helpText && !error && (
        <p className="text-[12px] text-muted">{helpText}</p>
      )}
    </div>
  );
}
