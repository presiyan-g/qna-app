export type InlineEmphasisSegment = {
  text: string;
  emphasized: boolean;
};

export function parseInlineEmphasis(input: string): InlineEmphasisSegment[] {
  const segments: InlineEmphasisSegment[] = [];
  let index = 0;

  while (index < input.length) {
    const start = input.indexOf('*', index);
    if (start === -1) {
      pushSegment(segments, input.slice(index), false);
      break;
    }

    const end = input.indexOf('*', start + 1);
    if (end === -1) {
      pushSegment(segments, input.slice(index), false);
      break;
    }

    const emphasizedText = input.slice(start + 1, end);
    if (emphasizedText.trim().length === 0) {
      pushSegment(segments, input.slice(index, end + 1), false);
      index = end + 1;
      continue;
    }

    pushSegment(segments, input.slice(index, start), false);
    pushSegment(segments, emphasizedText, true);
    index = end + 1;
  }

  return segments;
}

function pushSegment(
  segments: InlineEmphasisSegment[],
  text: string,
  emphasized: boolean,
) {
  if (text.length === 0) return;
  const last = segments.at(-1);
  if (last?.emphasized === emphasized) {
    last.text += text;
    return;
  }
  segments.push({ text, emphasized });
}
