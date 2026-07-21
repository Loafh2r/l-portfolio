<template>
  <div id="app">
    <div class="page-container">
      <router-view />
    </div>
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="nav-label">组合</span>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span class="nav-label">管理</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
/* ===== CSS Variables ===== */
:root {
  --color-bg: #f0f2f5;
  --color-surface: #ffffff;
  --color-text: #1d1d1f;
  --color-text-secondary: #6e6e73;
  --color-text-muted: #aeaeb2;
  --color-border: #e8e8ed;
  --color-border-light: #f2f2f7;
  --color-primary: #0071e3;
  --color-profit: #e74c3c;
  --color-profit-bg: rgba(231, 76, 60, 0.08);
  --color-loss: #27ae60;
  --color-loss-bg: rgba(39, 174, 96, 0.08);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.08);
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-hover: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Menlo', monospace;
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== Reset & Base ===== */
*, *::before, *::after {
  margin: 0; padding: 0; box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
  padding-bottom: 88px;
  max-width: 540px;
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
  padding: 6px 0;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0,0,0,0.08);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-muted);
  padding: 4px 24px;
  transition: color var(--transition);
}

.nav-svg {
  width: 22px;
  height: 22px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.nav-item.router-link-active {
  color: var(--color-primary);
}

/* ===== Shared Utility Classes ===== */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 16px;
  border: 0.5px solid var(--color-border-light);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.metric-label {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.metric-value {
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-mono);
  letter-spacing: -0.01em;
}

.text-profit { color: var(--color-profit); }
.text-loss { color: var(--color-loss); }
.text-neutral { color: var(--color-text); }

.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
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
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.01em;
}

.btn:active { transform: scale(0.97); }

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger {
  background: var(--color-profit-bg);
  color: var(--color-profit);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn-ghost:hover { background: var(--color-bg); }

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
  background: var(--color-surface);
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0,113,227,0.12);
}

select.input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236e6e73' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.empty-state {
  text-align: center;
  padding: 56px 24px;
  color: var(--color-text-muted);
}

.empty-state-icon {
  font-size: 44px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-state-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--color-bg) 25%, #e0e0e5 50%, var(--color-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
  border-radius: var(--radius-xs);
}

/* Type tags */
.tag-stock { background: #ede9fe; color: #7c3aed; }
.tag-etf { background: #dbeafe; color: #2563eb; }
.tag-fund { background: #fef3c7; color: #d97706; }
</style>
