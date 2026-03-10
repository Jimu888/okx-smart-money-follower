import React from 'react';
import { formatTime, formatCurrency } from '../utils/helpers';

export default function RecentTrades({ trades = [], isLoading }) {
  if (isLoading) {
    return <div className="p-4 text-xs text-gray-500">加载中...</div>;
  }

  if (!trades?.length) {
    return <div className="p-4 text-xs text-gray-500">暂无交易记录</div>;
  }

  return (
    <div className="divide-y">
      {trades.map((t) => (
        <div key={t.id} className="p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">{t.token?.symbol || 'UNKNOWN'}</div>
            <div className="text-xs text-gray-500 mt-1">
              {t.chain} · 触发 {t.matchedWallets?.length || 0} 钱包 · {formatTime(t.timestamp)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{formatCurrency(t.amount || 0)}</div>
            <div className="text-xs mt-1">
              <span
                className={
                  t.status === 'completed'
                    ? 'text-green-600'
                    : t.status === 'failed' || t.status === 'error'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }
              >
                {t.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
