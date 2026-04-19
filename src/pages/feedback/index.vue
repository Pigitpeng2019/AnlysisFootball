<template>
  <div class="app-container padding-tabbar feedback-page">
    <div class="page-background"></div>
    
    <van-nav-bar title="💬 帮助反馈" fixed class="nav-bar" />
    
    <div class="content-wrapper">
      <div class="intro-card">
        <div class="card-icon">📢</div>
        <div class="card-text">
          请在GitHub上提交Issue，告知不准确的联赛和具体场次，以便我改进算法。有什么好的思路也可以提出。
        </div>
        <a class="github-link" href="https://github.com/czl0325/football_frontend" target="_blank">
          <span class="link-icon">⭐</span>
          <span>跳转链接，给个Star</span>
          <span class="arrow">→</span>
        </a>
      </div>
      
      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🧠</span>
          <span class="section-title">分析思路</span>
        </div>
        <div class="section-content analysis-text">
          以23/24英超第22轮利物浦主场对阵切尔西为例，利物浦赛前排名第一，积分48，切尔西赛前排名第10，积分31，每家公司开出初赔，初赔主队水位，客队水位，以及即时赔率，即时赔率主队水位，客队水位。<br><br>
          通过大数据找出历史比赛中，初赔同样让球，主客队水位相同的比赛(误差±0.015)，即时赔率同样让球，主客队水位相同的比赛，如果是联赛，且联赛赛程已经超过1/4，因为利物浦排名比切尔西高，再加入筛选条件主队排名高于客队的比赛，以及主队积分>=客队积分+(48-31)的比赛，最终将找到的所有比赛计算赢盘输盘的场次，来得出赢盘输盘的概率。
        </div>
        <div class="section-content update-text">
          <span class="update-icon">🔄</span>
          <span>更新让球推导：查找出本赛季主队主场和客队客场都对阵的同一支球队，获取这两场比赛各自的让初和让终，通过两场比赛让初+让初，让终+让终，计算出合理的让初和让终，最后把所有让初和让终取平均值，对比本场的让初和让终。</span>
        </div>
      </div>
      
      <a class="telegram-card" href="https://t.me/+M1O5yLtJVGpmNmFl" target="_blank">
        <span class="telegram-icon">✈️</span>
        <span class="telegram-text">加飞机群讨论</span>
        <span class="arrow">→</span>
      </a>
      
      <div class="support-card">
        <div class="support-header">
          <span class="support-icon">☕</span>
          <span class="support-title">请作者吃碗沙茶面</span>
        </div>
        <div class="qr-codes">
          <div class="qr-item">
            <van-image :src="getAssetsFile('alipay.jpg')" class="qr-image" />
            <span class="qr-label">支付宝</span>
          </div>
          <div class="qr-item">
            <van-image :src="getAssetsFile('wxpay.jpg')" class="qr-image" />
            <span class="qr-label">微信</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { getAssetsFile } from "@/utils/tools.ts"

defineOptions({
  name: "Feedback"
})
</script>

<style lang="less" scoped>
.feedback-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
}

.page-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 101, 0, 0.05) 0%, transparent 50%),
    linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  z-index: -1;
  pointer-events: none;
}

.nav-bar {
  background: rgba(10, 14, 20, 0.95) !important;
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  
  :deep(.van-nav-bar__title) {
    color: var(--text-primary) !important;
    font-weight: 600;
    font-size: 18px;
  }
}

.content-wrapper {
  padding: 12px;
  padding-top: 46px;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.intro-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-icon {
  font-size: 32px;
}

.card-text {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--primary-gradient);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
  
  .link-icon {
    font-size: 16px;
  }
  
  .arrow {
    margin-left: auto;
    transition: transform 0.3s ease;
  }
  
  &:hover .arrow {
    transform: translateX(4px);
  }
}

.section-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 24px;
}

.section-title {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 700;
}

.section-content {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.analysis-text {
  margin-bottom: 16px;
  padding: 14px;
  background: rgba(255, 71, 87, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(255, 71, 87, 0.15);
  color: #ff6b7a;
}

.update-text {
  display: flex;
  gap: 10px;
  padding: 14px;
  background: rgba(0, 212, 170, 0.08);
  border-radius: 10px;
  border: 1px solid rgba(0, 212, 170, 0.15);
  color: var(--secondary-color);
  
  .update-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
}

.telegram-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-card);
  border-radius: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(25, 137, 250, 0.3);
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    background: var(--bg-card-hover);
  }
  
  .telegram-icon {
    font-size: 28px;
  }
  
  .telegram-text {
    color: #1890ff;
    font-size: 16px;
    font-weight: 600;
  }
  
  .arrow {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 18px;
  }
}

.support-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-color);
}

.support-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.support-icon {
  font-size: 24px;
}

.support-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.qr-codes {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-image {
  width: 150px;
  height: 200px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.qr-label {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}
</style>
