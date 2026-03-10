import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { apiService } from '../services/api';
import { formatCurrency, formatTime } from '../utils/helpers';
// import SectionTitle from './SectionTitle';
import Modal from './Modal';
import Tooltip from './Tooltip';
import RecommendWalletsModal from './RecommendWalletsModal';

export default function Workbench() {
  const qc = useQueryClient();

  const { data: stats } = useQuery('dashboard-stats', () => apiService.getStats(), { refetchInterval: 20000 });
  const { data: settings } = useQuery('settings', () => apiService.getSettings(), { refetchInterval: 60000 });
  const { data: wallets = [] } = useQuery('watchlist', () => apiService.getWatchList(), { refetchInterval: 60000 });
  const { data: recentTrades = [] } = useQuery(['recent-trades', 5], () => apiService.getRecentTrades({ limit: 5 }), {
    refetchInterval: 30000,
  });

  // form state (edit then save)
  const [form, setForm] = useState(null);

  // Slider snapping helpers
  const snap = (v, points, threshold = 3) => {
    const n = Number(v);
    for (const p of points) {
      if (Math.abs(n - p) <= threshold) return p;
    }
    return n;
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));

  React.useEffect(() => {
    if (settings && !form) {
      setForm({
        followAmount: settings.followAmount ?? 100,
        // 默认B：系统自动选择该链的可用支付币种（优先 USDC/USDT，不行再用原生币）
        followAssetMode: settings.followAssetMode ?? 'AUTO',
        // 高级：按链覆盖（例如 { solana: { asset: 'USDC', amount: 100 } })
        perChainFollow: settings.perChainFollow ?? {},

        minTriggerCount: settings.minTriggerCount ?? 3,
        maxSlippage: settings.maxSlippage ?? 5,
        checkInterval: settings.checkInterval ?? 30000,

        stopLossPercent: settings.stopLossPercent ?? 0,
        takeProfitRules:
          Array.isArray(settings.takeProfitRules) && settings.takeProfitRules.length
            ? settings.takeProfitRules
            : [{ profitPct: 100, sellPct: 30 }],
      });
    }
  }, [settings, form]);

  const start = async () => {
    await apiService.startMonitoring();
    qc.invalidateQueries('dashboard-stats');
  };
  const stop = async () => {
    await apiService.stopMonitoring();
    qc.invalidateQueries('dashboard-stats');
  };

  const saveSettings = async () => {
    await apiService.updateSettings(form);
    toast.success('已保存');
    qc.invalidateQueries('settings');
    qc.invalidateQueries('dashboard-stats');
  };

  // UI density - 统一紧凑设计
  const UI = {
    // 标签样式
    label: 'text-xs font-medium text-gray-700',
    labelTitle: 'text-xs font-medium text-gray-700 inline-flex items-center gap-1 mb-1',

    // 输入框样式 - 统一高度和样式
    input: 'w-full h-8 border border-gray-200 rounded-md px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300 transition-all',
    inputNumber: 'w-full h-8 border border-gray-200 rounded-md px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300 transition-all text-center',
    select: 'w-full h-8 border border-gray-200 rounded-md px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300 transition-all',

    // 按钮样式
    btnPrimary: 'h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm',
    btnSecondary: 'h-8 px-3 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors',
    btnDanger: 'h-8 px-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors',

    // 卡片样式
    card: 'bg-white rounded-lg border border-gray-200 shadow-sm',
    cardHeader: 'px-4 py-3 border-b border-gray-100',
    cardBody: 'p-4',
    cardCompact: 'p-3',

    // 间距
    sectionGap: 'space-y-3',
    fieldGap: 'gap-3',

    // 文字
    title: 'text-sm font-semibold text-gray-900',
    subtitle: 'text-xs text-gray-500 mt-0.5',
    helper: 'text-xs text-gray-500 mt-1',
  };

  // wallet add/remove
  const [newAddr, setNewAddr] = useState('');
  const [newNick, setNewNick] = useState('');
  const addWallet = async () => {
    if (!newAddr.trim()) return toast.error('请输入钱包地址');
    await apiService.addWallet({ address: newAddr.trim(), nickname: newNick.trim() });
    setNewAddr('');
    setNewNick('');
    qc.invalidateQueries('watchlist');
    qc.invalidateQueries('dashboard-stats');
  };
  const removeWallet = async (addr) => {
    await apiService.removeWallet(addr);
    qc.invalidateQueries('watchlist');
    qc.invalidateQueries('dashboard-stats');
  };

  const [showAllWallets, setShowAllWallets] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [openRecommend, setOpenRecommend] = useState(false);
  const [recommendChain, setRecommendChain] = useState('solana');
  const walletPreview = useMemo(() => {
    const list = Array.isArray(wallets) ? wallets : (wallets?.wallets || []);
    if (showAllWallets) return list;
    return list.slice(0, 3);
  }, [wallets, showAllWallets]);

  return (
    <div className="max-w-6xl mx-auto px-3 py-3 space-y-3">
      {/* Top bar - 紧凑状态栏 */}
      <div className={`${UI.card} ${UI.cardCompact} flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white border-emerald-100`}>
        <div>
          <div className={UI.title}>Smart Money Follower</div>
          <div className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1">
              状态：<span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stats?.isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {stats?.isRunning ? '运行中' : '已停止'}
              </span>
            </span>
            <span className="text-gray-300">|</span>
            <span>监控 {stats?.watchList ?? 0} 个钱包</span>
          </div>
        </div>

        <div className="flex gap-2">
          {!stats?.isRunning ? (
            <button onClick={start} className={`${UI.btnPrimary} px-4`}>
              ▶ 启动
            </button>
          ) : (
            <button onClick={stop} className={`${UI.btnSecondary} px-4`}>
              ⏹ 停止
            </button>
          )}
        </div>
      </div>

      {/* Block 1: 触发条件 */}
      <div className={`${UI.card} ${UI.cardBody}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className={UI.title}>触发条件</div>
            <div className={UI.subtitle}>当多个钱包同时买入同一代币时触发跟单</div>
          </div>
        </div>

        {!form ? (
          <div className="text-xs text-gray-500">加载中...</div>
        ) : (
          <>
            {/* 第一行输入：强制 4 等宽列，保证输入框水平对齐 */}
            <div className={`grid grid-cols-12 ${UI.fieldGap} items-end`}>
            <div className="col-span-3 flex flex-col">
              <div className={`${UI.labelTitle} h-5 mb-0`}>触发数量<Tooltip text="至少多少个钱包同时买入才触发跟单" /></div>
              <input
                type="number"
                value={form.minTriggerCount}
                onChange={(e) => setForm({ ...form, minTriggerCount: Number(e.target.value) })}
                className={UI.inputNumber}
                min={1} max={50}
              />
            </div>

            <div className="col-span-3 flex flex-col">
              <div className="flex items-center justify-between h-5 mb-0">
                <div className={UI.labelTitle + ' mb-0'}>跟单金额<Tooltip text="每次触发后的买入金额（USDT）" /></div>
                <button
                  onClick={() => setOpenAdvanced(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium leading-none"
                  style={{ padding: 0 }}
                >
                  高级
                </button>
              </div>
              <input
                type="number"
                value={form.followAmount}
                onChange={(e) => setForm({ ...form, followAmount: Number(e.target.value) })}
                className={UI.inputNumber}
                min={1}
              />
            </div>

            <div className="col-span-3 flex flex-col">
              <div className={`${UI.labelTitle} h-5 mb-0`}>最大滑点<Tooltip text="交易时允许的最大价格滑点" /></div>
              <div className="relative">
                <input
                  type="number"
                  value={form.maxSlippage}
                  onChange={(e) => setForm({ ...form, maxSlippage: Number(e.target.value) })}
                  className={`${UI.inputNumber} pr-7`}
                  min={0.1} step={0.1}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
              </div>
            </div>

            <div className="col-span-3 flex flex-col">
              <div className={`${UI.labelTitle} h-5 mb-0`}>检查间隔(ms)</div>
              <input
                type="number"
                value={form.checkInterval}
                onChange={(e) => setForm({ ...form, checkInterval: Number(e.target.value) })}
                className={UI.inputNumber}
                min={5000} step={1000}
              />
            </div>

          </div>

          {/* 第二行：支付资产（独占一行，避免挤占栅格导致错位） */}
          <div className="mt-3">
            <div className={UI.labelTitle}>支付资产</div>
            <select
              value={form.followAssetMode || 'AUTO'}
              onChange={(e) => setForm({ ...form, followAssetMode: e.target.value })}
              className={UI.select}
            >
              <option value="AUTO">自动选择（优先 USDC/USDT）</option>
              <option value="PER_CHAIN">按链单独设置</option>
            </select>
          </div>
        </>
        )}
      </div>

      {/* Block 2: 止盈止损 */}
      <div className={`${UI.card} ${UI.cardBody}`}>
        <div className="mb-3">
          <div className={UI.title}>止盈止损</div>
          <div className={UI.subtitle}>基于买入均价计算，止盈分档触发，止损全仓清空</div>
        </div>

        {!form ? null : (
          <div className={UI.sectionGap}>
            {/* 止损设置 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div className={UI.labelTitle}>止损百分比</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={form.stopLossPercent}
                    onChange={(e) => setForm({ ...form, stopLossPercent: clamp(e.target.value, 0, 90) })}
                    className={UI.inputNumber}
                    min={0} step={1}
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
                <input
                  type="range"
                  min={0} max={90} step={1}
                  value={form.stopLossPercent}
                  onChange={(e) => setForm({ ...form, stopLossPercent: snap(clamp(e.target.value, 0, 90), [10, 15, 20, 25, 30, 40, 50]) })}
                  className="mt-2 w-full"
                />
                <div className={UI.helper}>例如20表示跌幅20%时全仓止损</div>
              </div>
            </div>

            {/* 止盈规则 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className={UI.title}>止盈规则</div>
                  <div className={UI.subtitle}>涨幅达到指定比例时卖出部分仓位</div>
                </div>
              </div>

              <div className="space-y-2">
                {form.takeProfitRules.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-md">
                    <div className="col-span-4">
                      <div className="text-xs text-gray-500 mb-1">涨幅%</div>
                      <input
                        type="number"
                        value={r.profitPct}
                        onChange={(e) => {
                          const next = [...form.takeProfitRules];
                          next[idx] = { ...next[idx], profitPct: clamp(e.target.value, 0, 500) };
                          setForm({ ...form, takeProfitRules: next });
                        }}
                        className={UI.input}
                        placeholder="如100"
                      />
                    </div>

                    <div className="col-span-4">
                      <div className="text-xs text-gray-500 mb-1">卖出%</div>
                      <input
                        type="number"
                        value={r.sellPct}
                        onChange={(e) => {
                          const next = [...form.takeProfitRules];
                          next[idx] = { ...next[idx], sellPct: clamp(e.target.value, 1, 100) };
                          setForm({ ...form, takeProfitRules: next });
                        }}
                        className={UI.input}
                        placeholder="如30"
                      />
                    </div>

                    <div className="col-span-3 text-center">
                      <div className="text-xs text-gray-500">
                        +{r.profitPct}% → 卖{r.sellPct}%
                      </div>
                    </div>

                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          const next = form.takeProfitRules.filter((_, i) => i !== idx);
                          setForm({ ...form, takeProfitRules: next.length ? next : [{ profitPct: 100, sellPct: 30 }] });
                        }}
                        className={UI.btnDanger}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setForm({ ...form, takeProfitRules: [...form.takeProfitRules, { profitPct: 200, sellPct: 20 }] })}
                  className={UI.btnSecondary}
                >
                  + 添加档位
                </button>
                <button onClick={saveSettings} className={UI.btnPrimary}>
                  💾 保存设置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 高级设置Modal */}
      <Modal
        open={openAdvanced}
        title="高级设置"
        onClose={() => setOpenAdvanced(false)}
      >
        <div className="mb-4">
          <div className={UI.title}>按链单独配置支付资产</div>
          <div className={UI.subtitle}>为不同区块链设置专用的支付币种和金额</div>
        </div>

        {!form ? null : (
          <div className={UI.sectionGap}>
            {['solana','base','bsc','ethereum','arbitrum','xlayer'].map((chain) => {
              const nativeSymbolMap = { solana: 'SOL', bsc: 'BNB', ethereum: 'ETH', base: 'ETH', arbitrum: 'ETH', xlayer: 'OKB' };
              const nativeSymbol = nativeSymbolMap[chain] || 'NATIVE';
              const cur = form.perChainFollow?.[chain] || {};
              
              return (
                <div key={chain} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-md">
                  <div className="col-span-2">
                    <div className="text-xs font-semibold text-gray-900 uppercase">{chain}</div>
                  </div>
                  
                  <div className="col-span-4">
                    <select
                      value={cur.asset || ''}
                      onChange={(e) => {
                        const next = { ...(form.perChainFollow || {}) };
                        const v = e.target.value;
                        if (!v) {
                          delete next[chain];
                        } else {
                          next[chain] = { ...(next[chain] || {}), asset: v };
                        }
                        setForm({ ...form, perChainFollow: next });
                      }}
                      className={UI.select}
                    >
                      <option value="">自动选择</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="NATIVE">{nativeSymbol}</option>
                    </select>
                  </div>
                  
                  <div className="col-span-4">
                    <div className="relative">
                      <input
                        type="number"
                        value={cur.amount ?? ''}
                        onChange={(e) => {
                          const next = { ...(form.perChainFollow || {}) };
                          const amount = e.target.value === '' ? '' : Number(e.target.value);
                          const asset = cur.asset || '';
                          if (!asset) {
                            next[chain] = { ...(next[chain] || {}), amount };
                          } else {
                            next[chain] = { ...(next[chain] || {}), asset, amount };
                          }
                          setForm({ ...form, perChainFollow: next });
                        }}
                        className={UI.input}
                        placeholder={cur.asset ? `金额` : '先选资产'}
                        min={0}
                      />
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <button
                      onClick={() => {
                        const next = { ...(form.perChainFollow || {}) };
                        delete next[chain];
                        setForm({ ...form, perChainFollow: next });
                      }}
                      className={UI.btnDanger}
                    >
                      清除
                    </button>
                  </div>
                </div>
              );
            })}
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">配置后将覆盖默认的跟单金额设置</div>
              <button onClick={saveSettings} className={UI.btnPrimary}>
                💾 保存配置
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Block 3: 聪明钱包 */}
      <div className={`${UI.card} ${UI.cardBody}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={UI.title}>聪明钱包 ({wallets.length})</div>
            <div className={UI.subtitle}>监控这些钱包的交易行为，触发跟单条件</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenRecommend(true)}
              className={UI.btnSecondary}
            >
              📋 推荐导入
            </button>
            {wallets.length > 3 && (
              <button
                onClick={() => setShowAllWallets((v) => !v)}
                className={UI.btnSecondary}
              >
                {showAllWallets ? '收起' : `显示全部`}
              </button>
            )}
          </div>
        </div>

        {/* 添加钱包 */}
        <div className="grid grid-cols-12 gap-2 mb-4 p-3 bg-gray-50 rounded-md">
          <input
            value={newNick}
            onChange={(e) => setNewNick(e.target.value)}
            className={`${UI.input} col-span-3`}
            placeholder="备注名称"
          />
          <input
            value={newAddr}
            onChange={(e) => setNewAddr(e.target.value)}
            className={`${UI.input} col-span-7`}
            placeholder="钱包地址 (0x... 或 solana地址)"
          />
          <button 
            onClick={addWallet} 
            className={`${UI.btnPrimary} col-span-2`}
          >
            + 添加
          </button>
        </div>

        {/* 钱包列表 */}
        <div className="space-y-1">
          {walletPreview.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-md">
              <div className="text-2xl mb-2">🔗</div>
              <div className="text-xs">还没有监控钱包</div>
              <div className="text-xs">添加一些聪明钱包开始跟单</div>
            </div>
          ) : (
            walletPreview.map((w) => (
              <div key={w.address} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded-md hover:border-gray-200 transition-colors">
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">
                    {w.nickname || '未命名钱包'}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {w.address.slice(0, 8)}...{w.address.slice(-6)}
                  </div>
                </div>
                <button
                  onClick={() => removeWallet(w.address)}
                  className={`${UI.btnDanger} text-xs`}
                >
                  移除
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <RecommendWalletsModal
        open={openRecommend}
        onClose={() => setOpenRecommend(false)}
        chain={recommendChain}
        setChain={setRecommendChain}
      />

      {/* Block 4: 最近交易 */}
      <div className={UI.card}>
        <div className={`${UI.cardHeader} flex items-center justify-between`}>
          <div>
            <div className={UI.title}>最近交易</div>
            <div className={UI.subtitle}>显示最近5条交易记录</div>
          </div>
          <a href="/history" className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
            查看全部 →
          </a>
        </div>

        <div className="divide-y divide-gray-100">
          {recentTrades.length === 0 ? (
            <div className="p-4 text-center text-gray-500 bg-gray-50">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-xs">暂无交易记录</div>
            </div>
          ) : (
            recentTrades.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">
                      {t.token?.symbol || t.token?.name || 'UNKNOWN'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {t.chain}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatTime(t.timestamp)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">{formatCurrency(t.amount || 0)}</div>
                  <div className={`text-xs px-1.5 py-0.5 rounded mt-0.5 ${ 
                    t.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    t.status === 'failed' || t.status === 'error' ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {t.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="text-center text-xs text-gray-400 bg-gray-50 rounded-md p-3">
        🔒 开源项目，所有API密钥和私钥需要在本地.env配置
      </div>
    </div>
  );
}
