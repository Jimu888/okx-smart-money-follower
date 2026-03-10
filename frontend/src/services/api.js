import axios from 'axios';
import toast from 'react-hot-toast';

// 创建axios实例
const api = axios.create({
  // Keep baseURL empty so we can call both /health and /api/* via absolute paths
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response Error:', error);
    
    // 处理常见错误
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          toast.error(data.message || '请求参数错误');
          break;
        case 401:
          toast.error('未授权，请检查API配置');
          break;
        case 403:
          toast.error('无权限访问');
          break;
        case 404:
          toast.error('请求的资源不存在');
          break;
        case 429:
          // 429 对轮询场景很常见，不要用红色 toast 打断用户
          console.warn('Rate limited (429)');
          break;
        case 500:
          toast.error('服务器内部错误');
          break;
        default:
          toast.error(data.message || '请求失败');
      }
    } else if (error.request) {
      toast.error('网络连接失败，请检查网络');
    } else {
      toast.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// API服务类
class ApiService {
  // 系统相关
  async getHealth() {
    const response = await api.get('/health');
    return response.data;
  }

  async getStats() {
    const response = await api.get('/api/stats');
    return response.data;
  }

  async getSettings() {
    const response = await api.get('/api/settings');
    return response.data;
  }

  async updateSettings(settings) {
    const response = await api.put('/api/settings', settings);
    return response.data;
  }

  // 监控控制
  async startMonitoring() {
    const response = await api.post('/api/monitoring/start');
    toast.success('监控已启动');
    return response.data;
  }

  async stopMonitoring() {
    const response = await api.post('/api/monitoring/stop');
    toast.success('监控已停止');
    return response.data;
  }

  async getMonitoringStatus() {
    const response = await api.get('/api/monitoring/status');
    return response.data;
  }

  // 钱包管理
  async getWatchList() {
    const response = await api.get('/api/wallets');
    // backend may return either an array (walletRoutes) or { wallets: [...] } (apiRoutes)
    const data = response.data;
    return Array.isArray(data) ? data : (data?.wallets || []);
  }

  async addWallet(wallet) {
    const response = await api.post('/api/wallets', wallet);
    toast.success(`已添加钱包: ${wallet.nickname || wallet.address}`);
    return response.data;
  }

  async removeWallet(address) {
    const response = await api.delete(`/api/wallets/${address}`);
    toast.success('已移除钱包');
    return response.data;
  }

  async updateWallet(address, updates) {
    const response = await api.put(`/wallets/${address}`, updates);
    toast.success('钱包信息已更新');
    return response.data;
  }

  async getWalletPerformance(address = null) {
    const url = address ? `/api/wallets/${address}/performance` : '/api/wallets/performance';
    const response = await api.get(url);
    return response.data;
  }

  // 交易相关
  async getRecentTrades(params = {}) {
    const response = await api.get('/api/trading/history', { params });
    return response.data;
  }

  async getTrade(tradeId) {
    const response = await api.get(`/trading/${tradeId}`);
    return response.data;
  }

  async getTradeStats(params = {}) {
    const response = await api.get('/api/trading/stats', { params });
    return response.data;
  }

  // Positions
  async getPositions(params = {}) {
    const response = await api.get('/api/positions', { params });
    return response.data;
  }

  async sellPosition(id, sellPct = 100) {
    const response = await api.post(`/api/positions/${id}/sell`, { sellPct });
    return response.data;
  }

  async getRecommendedSmartWallets(params = {}) {
    const response = await api.get('/api/smart-wallets/recommend', { params });
    return response.data;
  }

  async simulateTrade(params) {
    const response = await api.post('/trading/simulate', params);
    return response.data;
  }

  // 信号相关
  async getSignals(params = {}) {
    const response = await api.get('/signals', { params });
    return response.data;
  }

  async getSignalHistory(params = {}) {
    const response = await api.get('/signals/history', { params });
    return response.data;
  }

  // 分析相关
  async analyzeToken(tokenAddress, chain) {
    const response = await api.post('/analysis/token', {
      tokenAddress,
      chain
    });
    return response.data;
  }

  async getMarketTrends(params = {}) {
    const response = await api.get('/analysis/trends', { params });
    return response.data;
  }

  async getSmartMoneyActivity(params = {}) {
    const response = await api.get('/analysis/smart-money', { params });
    return response.data;
  }

  // 通知相关
  async getNotifications(params = {}) {
    const response = await api.get('/notifications', { params });
    return response.data;
  }

  async markNotificationRead(notificationId) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async getNotificationSettings() {
    const response = await api.get('/notifications/settings');
    return response.data;
  }

  async updateNotificationSettings(settings) {
    const response = await api.put('/notifications/settings', settings);
    toast.success('通知设置已更新');
    return response.data;
  }

  // 导入导出
  async exportData(type = 'all') {
    const response = await api.get(`/export/${type}`, {
      responseType: 'blob'
    });
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `smart-money-data-${type}-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('数据导出成功');
    return true;
  }

  async importData(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    toast.success('数据导入成功');
    return response.data;
  }

  // WebSocket连接 (用于实时更新)
  connectWebSocket(onMessage, onError, onClose) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      toast.success('实时连接已建立');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析失败:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket连接已关闭:', event.code, event.reason);
      if (onClose) onClose(event);
    };
    
    return ws;
  }

  // 测试连接
  async testConnection() {
    try {
      const response = await api.get('/health');
      toast.success('连接测试成功');
      return { success: true, data: response.data };
    } catch (error) {
      toast.error('连接测试失败');
      return { success: false, error: error.message };
    }
  }

  // 重置系统
  async resetSystem() {
    const response = await api.post('/system/reset');
    toast.success('系统已重置');
    return response.data;
  }

  // 获取日志
  async getLogs(params = {}) {
    const response = await api.get('/system/logs', { params });
    return response.data;
  }

  // 系统备份
  async createBackup() {
    const response = await api.post('/system/backup');
    toast.success('备份创建成功');
    return response.data;
  }

  async restoreBackup(backupId) {
    const response = await api.post(`/system/restore/${backupId}`);
    toast.success('备份恢复成功');
    return response.data;
  }

  async getBackups() {
    const response = await api.get('/system/backups');
    return response.data;
  }
}

// 创建并导出API服务实例
export const apiService = new ApiService();

// 默认导出
export default api;