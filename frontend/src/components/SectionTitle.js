import React from 'react';

export default function SectionTitle({ title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-1.5 h-6 rounded-full bg-emerald-500 mt-1" />
      <div>
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        {desc ? <div className="text-sm text-gray-500 mt-1">{desc}</div> : null}
      </div>
    </div>
  );
}
