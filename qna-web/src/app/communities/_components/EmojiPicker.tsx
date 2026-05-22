'use client';

import { useEffect, useId, useRef, useState } from 'react';

type EmojiCategory = {
  name: string;
  emojis: string[];
};

const CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    emojis: [
      '😀','😄','😁','😆','😅','😂','🙂','😉','😊','😇',
      '🥰','😍','🤩','😘','😎','🤓','🧐','🤔','😴','🥳',
      '🙌','👏','👍','👎','🤝','💪','🫶','🙏','👋','🤗',
    ],
  },
  {
    name: 'Symbols',
    emojis: [
      '⭐','🌟','✨','💫','🔥','💯','⚡','🚀','💡','🎯',
      '🏆','🥇','🎖️','🎉','🎊','🎈','❤️','🧡','💛','💚',
      '💙','💜','🖤','🤍','💖','✅','❎','❓','❗','♻️',
    ],
  },
  {
    name: 'Tech',
    emojis: [
      '💻','🖥️','⌨️','🖱️','📱','📲','🔌','🔋','💾','💿',
      '📡','🛰️','🤖','🧠','🔬','🧪','⚙️','🛠️','🔧','🔩',
      '📊','📈','📉','📋','📎','🔗','🔒','🔓','🗝️','💬',
    ],
  },
  {
    name: 'Nature',
    emojis: [
      '🌲','🌳','🌴','🌵','🌱','🌿','☘️','🍀','🌷','🌸',
      '🌺','🌻','🌼','🌹','🌍','🌎','🌏','🌙','☀️','⛅',
      '🌈','🌊','❄️','🔥','⚡','🌋','🏔️','🏝️','🐶','🐱',
    ],
  },
  {
    name: 'Food',
    emojis: [
      '🍕','🍔','🍟','🌭','🥪','🌮','🌯','🥗','🍣','🍜',
      '🍝','🍦','🍩','🍪','🎂','🍰','🍓','🍎','🍌','🍇',
      '🍊','🥑','🥕','🌽','☕','🍵','🍺','🍷','🥂','🧉',
    ],
  },
  {
    name: 'Activities',
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
        aria-label="Choose an emoji"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-paper text-base hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span aria-hidden="true">{value || '😀'}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Emoji picker"
          className="absolute right-0 top-full z-10 mt-2 w-[280px] rounded-lg border border-line bg-card p-2 shadow-lg"
        >
          <div
            role="tablist"
            aria-label="Emoji categories"
            className="flex gap-1 border-b border-line pb-2"
          >
            {CATEGORIES.map((category, index) => (
              <button
                key={category.name}
                type="button"
                role="tab"
                aria-selected={index === activeCategory}
                onClick={() => setActiveCategory(index)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                  index === activeCategory
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted hover:bg-paper'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            aria-label={CATEGORIES[activeCategory].name}
            className="mt-2 grid max-h-[200px] grid-cols-8 gap-1 overflow-y-auto"
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
        </div>
      )}
    </div>
  );
}
