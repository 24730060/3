import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// [환경 변수 연결]
// Vite 환경(import.meta.env)의 키를 process.env로 연결하여 앱 전체에서 사용할 수 있게 합니다.
try {
  // @ts-ignore
  const viteEnv = import.meta.env;
  if (viteEnv) {
    // 사용자가 .env 파일에 VITE_API_KEY 또는 VITE_GEMINI_API_KEY로 설정했을 경우를 대비
    const apiKey = viteEnv.VITE_API_KEY || viteEnv.VITE_GEMINI_API_KEY || viteEnv.GEMINI_API_KEY;
    
    if (apiKey) {
      // index.html에서 생성한 window.process.env에 할당
      (window as any).process.env.API_KEY = apiKey;
    }
  }
} catch (e) {
  console.warn("Environment variable mapping skipped:", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);