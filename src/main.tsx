import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
// 通用样式先引入，页面样式由各功能页面自己引入，保证层叠顺序：基础 → 通用组件 → 页面
import './shared/styles/base.css';
import './shared/styles/components.css';
import { App } from './App';
import { installTokens } from './shared/styles/tokens';

installTokens();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>,
);
