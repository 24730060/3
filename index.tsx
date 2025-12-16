import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RefreshCw, AlertTriangle } from 'lucide-react';

// [환경 변수 연결]
try {
  // @ts-ignore
  const viteEnv = import.meta.env;
  if (viteEnv) {
    const apiKey = viteEnv.VITE_API_KEY || viteEnv.VITE_GEMINI_API_KEY || viteEnv.GEMINI_API_KEY;
    if (apiKey) {
      (window as any).process.env.API_KEY = apiKey;
    }
  }
} catch (e) {
  console.warn("Environment variable mapping skipped:", e);
}

// [에러 바운더리] 앱이 터졌을 때 흰 화면 대신 에러 메시지를 보여줌
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("App Crash:", error, errorInfo);
  }

  handleReset = () => {
    // 로컬 스토리지 문제일 수 있으므로 삭제 시도
    if (window.confirm("앱 데이터를 초기화하고 다시 실행하시겠습니까? (저장된 기록이 사라질 수 있습니다)")) {
        localStorage.clear();
        window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center font-sans">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
             <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-red-800 mb-2">앱 실행 중 오류가 발생했습니다.</h1>
          <p className="text-sm text-red-600 mb-6 max-w-xs break-words">
            {this.state.error?.message || "알 수 없는 오류"}
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-white border border-red-200 text-red-700 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
                새로고침
            </button>
            <button 
                onClick={this.handleReset}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
                <RefreshCw className="w-4 h-4" /> 데이터 초기화 및 복구
            </button>
          </div>
          <p className="mt-8 text-xs text-slate-400">
             Vercel 환경 변수(VITE_API_KEY)가 올바른지 확인해주세요.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);