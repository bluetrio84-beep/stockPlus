import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import './index.css'

/**
 * 리액트 애플리케이션의 엔트리 포인트(시작점)입니다.
 * HTML의 'root' 엘리먼트에 리액트 컴포넌트를 렌더링합니다.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode: 개발 모드에서 잠재적인 문제를 감지하기 위한 도구입니다.
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
