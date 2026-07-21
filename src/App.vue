<template>
  <div id="app">
    <div class="page-container">
      <router-view />
    </div>
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">📊</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">设置</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
/* ===== CSS Variables ===== */
:root {
  --color-bg: #f5f6fa;
  --color-surface: #ffffff;
  --color-text: #1a1a2e;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  --color-border: #e5e7eb;
  --color-primary: #3b82f6;
  --color-profit: #e74c3c;
  --color-profit-bg: #fef2f2;
  --color-loss: #27ae60;
  --color-loss-bg: #ecfdf5;
  --color-warning: #f59e0b;
  --color-warning-bg: #fffbeb;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
}

/* ===== Reset & Base ===== */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-container {
  flex: 1;
  padding: 16px;
  padding-bottom: 80px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Bottom Navigation ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 11px;
  padding: 4px 16px;
  border-radius: var(--radius-sm);
  transition: color 0.2s;
}

.nav-icon {
  font-size: 20px;
  line-height: 1;
}

.nav-label {
  font-weight: 500;
}

.nav-item.router-link-active {
  color: var(--color-primary);
}

/* ===== Shared Utility Classes ===== */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.metric-value {
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.text-profit {
  color: var(--color-profit);
}

.text-loss {
  color: var(--color-loss);
}

.text-neutral {
  color: var(--color-text);
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
}

.tag-profit {
  background: var(--color-profit-bg);
  color: var(--color-profit);
}

.tag-loss {
  background: var(--color-loss-bg);
  color: var(--color-loss);
}

.tag-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-danger {
  background: var(--color-loss-bg);
  color: var(--color-loss);
}

.btn-danger:hover {
  background: var(--color-loss);
  color: #fff;
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-ghost:hover {
  background: var(--color-bg);
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--color-primary);
}

select.input {
  appearance: none;
  background: var(--color-surface)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")
    no-repeat right 12px center;
  padding-right: 32px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--color-text-muted);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state-text {
  font-size: 15px;
}

/* Skeleton loading */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg) 25%,
    #e5e7eb 50%,
    var(--color-bg) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
</style>
