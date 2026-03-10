import React from 'react';

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl border border-emerald-100 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-br from-white to-emerald-50 border-b border-emerald-100">
            <div className="text-base font-semibold text-gray-900">{title}</div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
          <div className="p-4 max-h-[75vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
