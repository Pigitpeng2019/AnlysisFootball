<template>
  <div class="app-container">
    <!-- 左侧卡片式导航栏 -->
    <aside class="sidebar" v-show="route.meta.showTab">
      <div class="sidebar-content">
        <!-- Logo/品牌区域 -->
        <div class="sidebar-logo">
          <div class="logo-icon">
            <span class="icon-text">⚽</span>
          </div>
          <span class="logo-title">足球分析</span>
        </div>
        
        <!-- 导航菜单 -->
        <nav class="sidebar-nav">
          <router-link 
            to="/home" 
            class="nav-item"
            :class="{ active: route.path === '/home' }"
          >
            <div class="nav-icon">
              <van-icon name="home-o" size="20" />
            </div>
            <span class="nav-text">实时比赛</span>
            <div class="nav-indicator" v-if="route.path === '/home'"></div>
          </router-link>
          
          <router-link 
            to="/reanalyze" 
            class="nav-item"
            :class="{ active: route.path === '/reanalyze' }"
          >
            <div class="nav-icon">
              <van-icon name="bar-chart-o" size="20" />
            </div>
            <span class="nav-text">复盘分析</span>
            <div class="nav-indicator" v-if="route.path === '/reanalyze'"></div>
          </router-link>
          
          <router-link 
            to="/setting" 
            class="nav-item"
            :class="{ active: route.path === '/setting' }"
          >
            <div class="nav-icon">
              <van-icon name="user-o" size="20" />
            </div>
            <span class="nav-text">设置中心</span>
            <div class="nav-indicator" v-if="route.path === '/setting'"></div>
          </router-link>
        </nav>
        
        <!-- 底部装饰 -->
        <div class="sidebar-footer">
          <div class="gradient-decoration"></div>
        </div>
      </div>
    </aside>
    
    <!-- 主内容区域 -->
    <main class="main-content" :class="{ 'with-sidebar': route.meta.showTab }">
      <router-view v-slot="{ Component }">
        <keep-alive :include="cachedViews">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useCacheViewsStore } from "@/store/cacheViews.ts"
import { useRoute } from "vue-router"

const store = useCacheViewsStore()
const cachedViews = computed(() => store.cachedViews)
const route = useRoute()
</script>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

/* 左侧侧边栏 */
.sidebar {
  width: 80px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  padding-top: 20px;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, rgba(22, 22, 30, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 0 20px 20px 0;
  box-shadow: 
    8px 0 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    1px 0 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(180deg, 
      transparent 0%, 
      rgba(139, 92, 246, 0.3) 20%, 
      rgba(99, 102, 241, 0.4) 50%, 
      rgba(139, 92, 246, 0.3) 80%, 
      transparent 100%);
  }
}

/* Logo区域 */
.sidebar-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  padding: 12px;
}

.logo-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
  border-radius: 14px;
  border: 1px solid rgba(139, 92, 246, 0.25);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 24px rgba(139, 92, 246, 0.3);
  }
}

.icon-text {
  font-size: 22px;
}

.logo-title {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 12px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  text-decoration: none;
  
  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.2);
  }
  
  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(99, 102, 241, 0.14) 100%);
    border-color: rgba(139, 92, 246, 0.35);
    box-shadow: 
      0 4px 20px rgba(139, 92, 246, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .nav-item.active & {
    color: #a78bfa;
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
  }
}

.nav-text {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .nav-item.active & {
    color: #a78bfa;
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
}

.nav-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
  }
}

/* 底部装饰 */
.sidebar-footer {
  padding: 16px;
}

.gradient-decoration {
  width: 48px;
  height: 8px;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.4), rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.4));
  border-radius: 4px;
  animation: shimmerLine 3s ease-in-out infinite;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-content.with-sidebar {
  margin-left: 80px;
}
</style>
