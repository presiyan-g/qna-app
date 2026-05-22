'use client';

import { useEffect, useId, useRef, useState } from 'react';

type EmojiCategory = {
  name: string;
  icon: string;
  emojis: string[];
};

const CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀','😄','😁','😆','😅','😂','🙂','😉','😊','😇',
      '🥰','😍','🤩','😘','😎','🤓','🧐','🤔','😴','🥳',
      '🙌','👏','👍','👎','🤝','💪','🫶','🙏','👋','🤗',
    ],
  },
  {
    name: 'Symbols',
    icon: '⭐',
    emojis: [
      '⭐','🌟','✨','💫','🔥','💯','⚡','🚀','💡','🎯',
      '🏆','🥇','🎖️','🎉','🎊','🎈','❤️','🧡','💛','💚',
      '💙','💜','🖤','🤍','💖','✅','❎','❓','❗','♻️',
    ],
  },
  {
    name: 'Tech',
    icon: '💻',
    emojis: [
      '💻','🖥️','⌨️','🖱️','📱','📲','🔌','🔋','💾','💿',
      '📡','🛰️','🤖','🧠','🔬','🧪','⚙️','🛠️','🔧','🔩',
      '📊','📈','📉','📋','📎','🔗','🔒','🔓','🗝️','💬',
    ],
  },
  {
    name: 'Nature',
    icon: '🌲',
    emojis: [
      '🌲','🌳','🌴','🌵','🌱','🌿','☘️','🍀','🌷','🌸',
      '🌺','🌻','🌼','🌹','🌍','🌎','🌏','🌙','☀️','⛅',
      '🌈','🌊','❄️','🔥','⚡','🌋','🏔️','🏝️','🐶','🐱',
    ],
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: [
      '🍕','🍔','🍟','🌭','🥪','🌮','🌯','🥗','🍣','🍜',
      '🍝','🍦','🍩','🍪','🎂','🍰','🍓','🍎','🍌','🍇',
      '🍊','🥑','🥕','🌽','☕','🍵','🍺','🍷','🥂','🧉',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🎾','🏐','🏓','🏸','🥊','🥋',
      '🎮','🎲','🎨','🎭','🎬','🎤','🎧','🎼','📚','✏️',
      '📝','📖','🏋️','🚴','🏃','🧘','🎯','🏆','🥇','🎓',
    ],
  },
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={value ? 'Change icon' : 'Choose an icon'}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper text-base hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {value ? (
          <span aria-hidden="true" className="truncate text-xs font-bold">
            {value}
          </span>
        ) : (
          <span aria-hidden="true" className="opacity-60">
            🚫
          </span>
        )}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Emoji picker"
          className="absolute right-0 top-full z-10 mt-2 w-[324px] rounded-lg border border-line bg-card p-2 shadow-lg"
        >
          <div
            role="tablist"
            aria-label="Emoji categories"
            className="flex items-center justify-between gap-1 border-b border-line pb-2"
          >
            {CATEGORIES.map((category, index) => (
              <button
                key={category.name}
                type="button"
                role="tab"
                aria-selected={index === activeCategory}
                aria-label={category.name}
                title={category.name}
                onClick={() => setActiveCategory(index)}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${
                  index === activeCategory
                    ? 'bg-primary-soft'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <span aria-hidden="true">{category.icon}</span>
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            aria-label={CATEGORIES[activeCategory].name}
            className="mt-2 grid grid-cols-8 gap-1"
          >
            {CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                aria-label={`Use ${emoji}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-primary-soft"
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="w-full rounded-md px-2 py-1 text-[12px] font-semibold text-muted hover:bg-paper hover:text-ink"
            >
              No icon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
