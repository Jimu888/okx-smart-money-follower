import React from 'react';

export default function WalletPerformance({ data }) {
  const wallets = data?.wallets || [];
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="text-lg font-semibold text-gray-900">监控的钱包</div>
      <div className="text-sm text-gray-500 mt-1">（MVP）当前仅展示列表，后续可加胜率/ROI等。</div>

      <div className="mt-4 space-y-3">
        {wallets.length === 0 ? (
          <div className="text-sm text-gray-500">还没添加聪明钱包。</div>
        ) : (
          wallets.map((w) => (
            <div key={w.address} className="rounded-xl border bg-gray-50 p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{w.nickname || 'Unnamed'}</div>
                <div className="text-xs text-gray-500">{w.address}</div>
              </div>
              <div className="text-xs text-gray-500">added</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
