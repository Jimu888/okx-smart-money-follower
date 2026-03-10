import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  Target
} from 'lucide-react';

// 组件导入
import StatsCard from './StatsCard';
import MonitoringStatus from './MonitoringStatus';
import RecentTrades from './RecentTrades';
import WalletPerformance from './WalletPerformance';
import LoadingSpinner from './LoadingSpinner';

// 服务导入
import { apiService } from '../services/api';
import { useAppStore } from '../store/appStore';

// 工具导入
import { formatCurrency, formatTime, cn } from '../utils/helpers';

const Dashboard = () => {
  const { systemStatus, settings } = useAppStore();
  const [timeRange, setTimeRange] = useState('24h');

  // 获取统计数据
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => apiService.getStats(),
    {
      refetchInterval: 10000, // 每10秒刷新
    }
  );

  // 获取最近交易
  const { data: recentTrades, isLoading: tradesLoading } = useQuery(
    ['recent-trades', timeRange],
    () => apiService.getRecentTrades({ timeRange, limit: 10 }),
    {
      refetchInterval: 15000, // 每15秒刷新
    }
  );

  // 获取钱包性能
  const { data: walletPerformance, isLoading: performanceLoading } = useQuery(
    'wallet-performance',
    () => apiService.getWalletPerformance(),
    {
      refetchInterval: 60000, // 每分钟刷新
    }
  );

  const isLoading = statsLoading || tradesLoading || performanceLoading;

  // 计算成功率
  const successRate = stats ? 
    (stats.successfulTrades / Math.max(stats.tradesExecuted, 1) * 100).toFixed(1) 
    : 0;

  // 状态卡片数据
  const statusCards = [
    {
      id: 'monitoring',
      title: '监控状态',
      value: stats?.isRunning ? '运行中' : '已停止',
      icon: stats?.isRunning ? CheckCircle : XCircle,
      color: stats?.isRunning ? 'green' : 'red',
      change: null,
      description: `监控 ${stats?.watchList || 0} 个钱包`
    },
    {
      id: 'trades-today',
      title: '今日交易',
      value: stats?.dailyTrades || 0,
      icon: Activity,
      color: 'blue',
      change: null,
      description: `剩余 ${Math.max(0, (settings?.maxDailyTrades || 20) - (stats?.dailyTrades || 0))} 次`
    },
    {
      id: 'success-rate',
      title: '成功率',
      value: `${successRate}%`,
      icon: Target,
      color: parseFloat(successRate) > 80 ? 'green' : parseFloat(successRate) > 60 ? 'yellow' : 'red',
      change: null,
      description: `${stats?.successfulTrades || 0}/${stats?.tradesExecuted || 0} 成功`
    },
    {
      id: 'total-volume',
      title: '跟单金额',
      value: formatCurrency((stats?.tradesExecuted || 0) * (settings?.followAmount || 100)),
      icon: DollarSign,
      color: 'purple',
      change: null,
      description: '总跟单投入'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Money Follower
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                多智能钱包自动跟单系统
              </p>
            </div>

            {/* 系统状态指示器 */}
            <div className="flex items-center space-x-4">
              <div className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium",
                systemStatus?.isHealthy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  systemStatus?.isHealthy ? "bg-green-500" : "bg-red-500"
                )} />
                <span>
                  {systemStatus?.isHealthy ? '系统正常' : '系统异常'}
                </span>
              </div>

              <div className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium",
                stats?.isRunning ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
              )}>
                <Zap className={cn(
                  "w-4 h-4",
                  stats?.isRunning ? "text-blue-500" : "text-gray-400"
                )} />
                <span>
                  {stats?.isRunning ? '监控中' : '已暂停'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {statusCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <StatsCard {...card} />
                </motion.div>
              ))}
            </div>

            {/* 监控状态和快速操作 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 监控状态 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <MonitoringStatus 
                  stats={stats}
                  settings={settings}
                />
              </motion.div>

              {/* 钱包性能 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <WalletPerformance 
                  data={walletPerformance}
                  isLoading={performanceLoading}
                />
              </motion.div>
            </div>

            {/* 最近交易 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        最近交易
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        跟单交易历史记录
                      </p>
                    </div>

                    {/* 时间范围选择器 */}
                    <div className="flex space-x-2">
                      {['1h', '6h', '24h', '7d'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                            timeRange === range
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <RecentTrades 
                  trades={recentTrades}
                  isLoading={tradesLoading}
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;