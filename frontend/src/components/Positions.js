import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import { formatCurrency, formatTime } from '../utils/helpers';

export default function Positions() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('OPEN');

  const { data: positions = [], isLoading } = useQuery(['positions', status], () => apiService.getPositions({ status }), {
    refetchInterval: 15000,
  });

  const sell = async (id, pct) => {
    const r = await apiService.sellPosition(id, pct);
    if (r.success) toast.success(`卖出请求成功（${pct}%）`);
    else toast.error(r.error || '卖出失败');
    qc.invalidateQueries(['positions', status]);
    qc.invalidateQueries('trades');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold text-gray-900">持仓 (Positions)</div>
            <div className="text-sm text-gray-500 mt-1">用于止盈/止损策略的仓位列表（以买入均价为基准）。</div>
          </div>
          <div className="flex gap-2">
            {['OPEN', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  'px-3 py-2 rounded-xl text-sm font-medium ' +
                  (status === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 text-xs text-gray-500">加载中...</div>
        ) : positions.length === 0 ? (
          <div className="p-4 text-xs text-gray-500">暂无持仓。系统成功跟单后会自动创建 position。</div>
        ) : (
          <div className="divide-y">
            {positions.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">
                    {p.symbol || 'UNKNOWN'} <span className="text-xs text-gray-500">({p.chain})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    entry: ${p.entryPriceUsd ?? '-'} · last: ${p.lastPriceUsd ?? '-'} · pnl: {p.pnlPercent ? `${p.pnlPercent.toFixed(2)}%` : '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    买入: {formatCurrency(p.buyAmountUsdc || 0)} · 已卖出: {p.soldPercent || 0}% · 创建: {formatTime(p.createdAt)}
                  </div>
                </div>

                {p.status === 'OPEN' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => sell(p.id, 100)}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100"
                    >
                      全卖
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">{p.closedReason || 'CLOSED'}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-6 border-t text-xs text-gray-500">
          注意：目前自动卖出在 TEST_MODE 下会模拟成功；实盘卖出需要钱包签名能力（Solana签名还没补齐）。
        </div>
      </div>
    </div>
  );
}
