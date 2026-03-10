import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

export default function WalletManager() {
  const qc = useQueryClient();
  const { data: wallets = [], isLoading } = useQuery('watchlist', () => apiService.getWatchList());

  const [address, setAddress] = useState('');
  const [nickname, setNickname] = useState('');

  const add = async () => {
    if (!address.trim()) return toast.error('请输入钱包地址');
    await apiService.addWallet({ address: address.trim(), nickname: nickname.trim() });
    setAddress('');
    setNickname('');
    qc.invalidateQueries('watchlist');
    qc.invalidateQueries('wallet-performance');
    qc.invalidateQueries('dashboard-stats');
  };

  const remove = async (addr) => {
    await apiService.removeWallet(addr);
    qc.invalidateQueries('watchlist');
    qc.invalidateQueries('wallet-performance');
    qc.invalidateQueries('dashboard-stats');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="text-xl font-semibold text-gray-900">聪明钱包管理</div>
        <div className="text-sm text-gray-500 mt-1">添加你想跟踪的钱包地址（EVM 0x... 或 Solana 地址）。</div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm"
            placeholder="昵称（可选）"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm sm:col-span-2"
            placeholder="钱包地址"
          />
        </div>

        <div className="mt-3">
          <button onClick={add} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black">
            添加
          </button>
        </div>

        <div className="mt-8">
          <div className="text-sm font-medium text-gray-700">当前监控列表</div>
          <div className="mt-2 divide-y border rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-500">加载中...</div>
            ) : wallets.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">暂无钱包。先添加几个再启动监控。</div>
            ) : (
              wallets.map((w) => (
                <div key={w.address} className="p-4 flex items-center justify-between bg-white">
                  <div>
                    <div className="font-medium text-gray-900">{w.nickname || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{w.address}</div>
                  </div>
                  <button
                    onClick={() => remove(w.address)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
                  >
                    移除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        提醒：开源项目中不会内置任何人的 API Key / 私钥。用户必须在本地 .env 配置自己的。
      </div>
    </div>
  );
}
