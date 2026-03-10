import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

// 组件导入
import Navbar from './components/Navbar';
import Workbench from './components/Workbench';
import History from './components/History';
import LoadingSpinner from './components/LoadingSpinner';

// 服务导入
import { apiService } from './services/api';
import { useAppStore } from './store/appStore';

// 样式导入
import './styles/globals.css';

// React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30秒
    },
  },
});

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { setSystemStatus, setSettings } = useAppStore();

  // 检查系统状态
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await apiService.getHealth();
        setIsConnected(true);
        setSystemStatus({
          isHealthy: response.status === 'healthy',
          services: response.services,
          version: response.version
        });

        // 加载系统设置
        const settingsResponse = await apiService.getSettings();
        setSettings(settingsResponse);

      } catch (error) {
        console.error('系统状态检查失败:', error);
        setIsConnected(false);
        setSystemStatus({
          isHealthy: false,
          services: null,
          error: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkSystemStatus();
    
    // 定期检查系统状态
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, [setSystemStatus, setSettings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            无法连接到服务器
          </h1>
          <p className="text-gray-600 mb-6">
            请检查后端服务是否正在运行
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            重新连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <main className="pb-20">
            <Routes>
              <Route path="/" element={<Workbench />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>

          {/* Toast通知 */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;