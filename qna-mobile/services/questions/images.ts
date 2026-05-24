export type InspectableImage = {
  accessibilityLabel: string;
  uri: string;
};

export function toInspectableImage({
  accessibilityLabel,
  uri,
}: {
  accessibilityLabel: string;
  uri: string | null | undefined;
}): InspectableImage | null {
  const trimmedUri = uri?.trim();
  if (!trimmedUri) return null;

  return {
    accessibilityLabel,
    uri: trimmedUri,
  };
}
