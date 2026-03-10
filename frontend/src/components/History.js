import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../services/api';
import { formatCurrency, formatTime } from '../utils/helpers';

export default function History() {
  const [limit, setLimit] = useState(200);
  const { data: trades = [], isLoading } = useQuery(['history', limit], () => apiService.getRecentTrades({ limit }), {
    refetchInterval: 15000,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-gray-900">交易历史</div>
            <div className="text-sm text-gray-500 mt-1">字段：时间、金额、代币、网络、交易哈希、状态。</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">条数</span>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded-xl px-3 py-2">
              {[50, 100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 text-xs text-gray-500">加载中...</div>
        ) : trades.length === 0 ? (
          <div className="p-4 text-xs text-gray-500">暂无交易记录</div>
        ) : (
          <div className="divide-y">
            {trades.map((t) => (
              <div key={t.id} className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{formatTime(t.timestamp)}</div>
                  <div className="text-xs text-gray-500">{t.status}</div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-sm font-semibold">{formatCurrency(t.amount || 0)}</div>
                </div>

                <div className="sm:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{t.token?.symbol || t.token?.name || 'UNKNOWN'}</div>
                  <div className="text-xs text-gray-500 break-all">{t.token?.tokenAddress || ''}</div>
                </div>

                <div className="sm:col-span-1">
                  <div className="text-sm font-medium text-gray-900">{t.chain || '-'}</div>
                </div>

                <div className="sm:col-span-3">
                  <div className="text-xs text-gray-500 break-all">
                    {t.txHash || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
