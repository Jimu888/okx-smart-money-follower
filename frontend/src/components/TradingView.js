import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../services/api';
import RecentTrades from './RecentTrades';

export default function TradingView() {
  const [limit, setLimit] = useState(50);
  const { data: trades = [], isLoading } = useQuery(['trades', limit], () => apiService.getRecentTrades({ limit }), {
    refetchInterval: 15000,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-gray-900">交易记录</div>
            <div className="text-sm text-gray-500 mt-1">展示跟单执行的历史（MVP）。</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">条数</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded-xl px-3 py-2"
            >
              {[10, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <RecentTrades trades={trades} isLoading={isLoading} />
      </div>
    </div>
  );
}
