import React from 'react';
import { useQuery, useQueryClient } from 'react-query';
import Modal from './Modal';
import { apiService } from '../services/api';

export default function RecommendWalletsModal({ open, onClose, chain, setChain }) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['okx-recommend', chain],
    () => apiService.getRecommendedSmartWallets({ chain, limit: 30, minAmountUsd: 1000 }),
    { enabled: open, staleTime: 30000 }
  );

  const wallets = data?.wallets || [];
  const note = data?.note;

  const add = async (address) => {
    await apiService.addWallet({ address, nickname: `OKX-${chain}` });
    qc.invalidateQueries('watchlist');
  };

  return (
    <Modal open={open} title="OKX 候选钱包（Smart Money / KOL）" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        {['solana', 'base', 'bsc'].map((c) => (
          <button
            key={c}
            onClick={() => setChain(c)}
            className={
              'px-3 py-1.5 rounded-lg text-xs font-semibold border ' +
              (chain === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')
            }
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500 mb-3">
        说明：从 OKX signal-list 聚合 triggerWalletAddress 得到候选地址池，仅保留 Smart Money(1) / KOL(2)。标签按该地址在两类信号中的出现次数占比二选一。
      </div>

      {note ? <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl mb-3">{note}</div> : null}

      {isLoading ? (
        <div className="text-sm text-gray-500">加载中...</div>
      ) : error ? (
        <div className="text-sm text-red-600">加载失败</div>
      ) : wallets.length === 0 ? (
        <div className="text-sm text-gray-500">暂无数据（可能是 onchainos 未安装，或当前链无信号）。</div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {wallets.map((w) => (
            <div key={w.address} className="p-3 flex items-center justify-between bg-white gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-gray-900 truncate">{w.address}</div>
                  <span
                    className={
                      'text-[10px] px-2 py-0.5 rounded-full border ' +
                      (w.tag === 'KOL'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200')
                    }
                  >
                    {w.tag === 'KOL' ? 'KOL' : 'SMART'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  触发次数：{w.count} · 信号金额累计：${Math.round(w.totalAmountUsd)} · KOL:{w.kolCount} / Smart:{w.smartMoneyCount}
                </div>
              </div>
              <button
                onClick={() => add(w.address)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shrink-0"
              >
                添加
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
