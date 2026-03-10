import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery('settings', () => apiService.getSettings());

  const [form, setForm] = useState({
    followAmount: 100,
    minTriggerCount: 3,
    maxSlippage: 5,
    checkInterval: 30000,
    stopLossPercent: 0,
    takeProfitRules: [{ profitPct: 100, sellPct: 30 }],
  });

  useEffect(() => {
    if (settings) {
      setForm({
        followAmount: settings.followAmount ?? 100,
        minTriggerCount: settings.minTriggerCount ?? 3,
        maxSlippage: settings.maxSlippage ?? 5,
        checkInterval: settings.checkInterval ?? 30000,
        stopLossPercent: settings.stopLossPercent ?? 0,
        takeProfitRules: Array.isArray(settings.takeProfitRules) && settings.takeProfitRules.length
          ? settings.takeProfitRules
          : [{ profitPct: 100, sellPct: 30 }],
      });
    }
  }, [settings]);

  const save = async () => {
    await apiService.updateSettings(form);
    toast.success('已保存');
    qc.invalidateQueries('settings');
    qc.invalidateQueries('dashboard-stats');
  };

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-gray-500">加载中...</div>;

  // 统一UI样式
  const UI = {
    input: 'input-unified',
    btn: 'btn-unified bg-emerald-600 text-white hover:bg-emerald-700',
    card: 'card-unified p-4',
    title: 'text-sm font-semibold text-gray-900',
    subtitle: 'text-xs text-gray-500 mt-0.5',
    label: 'text-xs font-medium text-gray-700 mb-1',
  };

  return (
    <div className="max-w-4xl mx-auto px-3 py-3">
      <div className={UI.card}>
        <div className={UI.title}>策略设置</div>
        <div className={UI.subtitle}>配置跟单触发条件、金额和风险管理参数</div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm">
            <div className="text-gray-700 font-medium">跟单金额 (USDC)</div>
            <input
              type="number"
              value={form.followAmount}
              onChange={(e) => setForm({ ...form, followAmount: Number(e.target.value) })}
              className="mt-2 w-full border rounded-xl px-3 py-2"
              min={1}
            />
          </label>

          <label className="text-sm">
            <div className="text-gray-700 font-medium">触发钱包数 (>=)</div>
            <input
              type="number"
              value={form.minTriggerCount}
              onChange={(e) => setForm({ ...form, minTriggerCount: Number(e.target.value) })}
              className="mt-2 w-full border rounded-xl px-3 py-2"
              min={1}
              max={50}
            />
          </label>

          <label className="text-sm">
            <div className="text-gray-700 font-medium">最大滑点 (%)</div>
            <input
              type="number"
              value={form.maxSlippage}
              onChange={(e) => setForm({ ...form, maxSlippage: Number(e.target.value) })}
              className="mt-2 w-full border rounded-xl px-3 py-2"
              min={0.1}
              step={0.1}
            />
          </label>

          <label className="text-sm">
            <div className="text-gray-700 font-medium">检查间隔 (ms)</div>
            <input
              type="number"
              value={form.checkInterval}
              onChange={(e) => setForm({ ...form, checkInterval: Number(e.target.value) })}
              className="mt-2 w-full border rounded-xl px-3 py-2"
              min={5000}
              step={1000}
            />
            <div className="text-xs text-gray-500 mt-1">建议 10000-60000。太小会触发更多API调用。</div>
          </label>

          <label className="text-sm">
            <div className="text-gray-700 font-medium">止损 (%)（触发全卖）</div>
            <input
              type="number"
              value={form.stopLossPercent}
              onChange={(e) => setForm({ ...form, stopLossPercent: Number(e.target.value) })}
              className="mt-2 w-full border rounded-xl px-3 py-2"
              min={0}
              step={1}
            />
            <div className="text-xs text-gray-500 mt-1">例如 20 表示 -20% 触发全卖。0 表示关闭止损。</div>
          </label>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-gray-900">止盈规则（每档只触发一次）</div>
          <div className="text-xs text-gray-500 mt-1">示例：上涨 100% 卖出 30%。你可以添加多档。</div>

          <div className="mt-3 space-y-2">
            {form.takeProfitRules.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <input
                  type="number"
                  value={r.profitPct}
                  onChange={(e) => {
                    const next = [...form.takeProfitRules];
                    next[idx] = { ...next[idx], profitPct: Number(e.target.value) };
                    setForm({ ...form, takeProfitRules: next });
                  }}
                  className="border rounded-xl px-3 py-2 sm:col-span-2"
                  placeholder="涨幅%（如100）"
                />
                <input
                  type="number"
                  value={r.sellPct}
                  onChange={(e) => {
                    const next = [...form.takeProfitRules];
                    next[idx] = { ...next[idx], sellPct: Number(e.target.value) };
                    setForm({ ...form, takeProfitRules: next });
                  }}
                  className="border rounded-xl px-3 py-2 sm:col-span-2"
                  placeholder="卖出%（如30）"
                />
                <button
                  onClick={() => {
                    const next = form.takeProfitRules.filter((_, i) => i !== idx);
                    setForm({ ...form, takeProfitRules: next.length ? next : [{ profitPct: 100, sellPct: 30 }] });
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <button
              onClick={() => setForm({ ...form, takeProfitRules: [...form.takeProfitRules, { profitPct: 200, sellPct: 20 }] })}
              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black"
            >
              + 添加止盈档
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button onClick={save} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-black">
            保存设置
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          注意：这些是服务端设置，会保存到 data/db.json。止盈止损以"买入均价"为基准，且每个止盈档只触发一次。
        </div>
      </div>
    </div>
  );
}
