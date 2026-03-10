import React, { useState } from 'react';

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/70 border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-white"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      {open ? (
        <span className="absolute z-10 top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  );
}
