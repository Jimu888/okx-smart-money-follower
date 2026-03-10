import React from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

export default function MonitoringStatus({ stats, settings }) {
  const start = async () => {
    await apiService.startMonitoring();
  };
  const stop = async () => {
    await apiService.stopMonitoring();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900">自动跟单监控</div>
          <div className="text-sm text-gray-500 mt-1">
            触发条件：至少 <b>{settings?.minTriggerCount ?? stats?.settings?.minTriggerCount ?? 3}</b> 个钱包同时买入
          </div>
          <div className="text-sm text-gray-500 mt-1">
            跟单金额：<b>{settings?.followAmount ?? stats?.settings?.followAmount ?? 100}</b> USDC
          </div>
        </div>
        <div className="flex gap-2">
          {!stats?.isRunning ? (
            <button
              onClick={start}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black"
            >
              启动
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 text-sm font-medium hover:bg-gray-300"
            >
              停止
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-xs text-gray-500">监控钱包</div>
          <div className="text-lg font-semibold">{stats?.watchList ?? 0}</div>
        </div>
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-xs text-gray-500">今日交易</div>
          <div className="text-lg font-semibold">{stats?.dailyTrades ?? 0}</div>
        </div>
        <div className="rounded-xl bg-gray-50 border p-3">
          <div className="text-xs text-gray-500">总执行</div>
          <div className="text-lg font-semibold">{stats?.tradesExecuted ?? 0}</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        提醒：目前后端默认 <b>TEST_MODE=true</b>（不执行真实交易）。要实盘请在 .env 里关掉。
      </div>
    </div>
  );
}
