<template>
  <div class="item-container" :class="{ 'is-live': match.match_status === '正在进行' }">
    <div class="header">
      <div class="league-badge">
        <span class="league-icon">⚽</span>
        <span class="league-name">{{ match.match_group }}</span>
      </div>
      <div class="status-badge" :class="getStatusClass(match.match_status)">
        <span v-if="match.match_status === '正在进行'" class="live-dot"></span>
        {{ match.match_status }}
      </div>
    </div>
    
    <div class="content">
      <div class="team home-team">
        <span class="team-name">{{ match.home_team }}</span>
        <span class="team-rank" v-if="match.home_team_rank">Rank #{{ match.home_team_rank }}</span>
      </div>
      
      <div class="score-container">
        <div class="score" :class="{ 'score-live': match.match_status === '正在进行' }">
          {{ match.field_score ?? "VS" }}
        </div>
        <div class="match-time" v-if="match.match_time">{{ match.match_time }}</div>
      </div>
      
      <div class="team away-team">
        <span class="team-name">{{ match.visit_team }}</span>
        <span class="team-rank" v-if="match.visit_team_rank">Rank #{{ match.visit_team_rank }}</span>
      </div>
    </div>
    
    <div class="footer">
      <div class="time-info">
        <span class="clock-icon">🕐</span>
        <span>{{ match.match_time || '时间待定' }}</span>
      </div>
      <router-link :to="`/match/detail?fid=${match.fid}`" class="analyze-btn">
        <span>深度分析</span>
        <span class="arrow">→</span>
      </router-link>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { IMatchInfo } from "@/models/match.ts"

defineOptions({
  name: "MatchItem"
})

defineProps<{
  match: IMatchInfo
}>()

const getStatusClass = (status: string | undefined) => {
  if (status === '正在进行') return 'status-live'
  if (status === '已结束') return 'status-ended'
  if (status === '未开始') return 'status-upcoming'
  return ''
}
</script>

<style lang="less" scoped>
.item-container {
  position: relative;
  background: rgba(22, 22, 32, 0.75);
  border-radius: 20px;
  margin: 12px 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(139, 92, 246, 0.12);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  backdrop-filter: blur(24px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(139, 92, 246, 0.4) 20%, 
      rgba(99, 102, 241, 0.6) 50%, 
      rgba(139, 92, 246, 0.4) 80%, 
      transparent 100%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      ellipse at 30% 0%,
      rgba(139, 92, 246, 0.08) 0%,
      transparent 50%
    );
    pointer-events: none;
    transition: all 0.4s ease;
  }
  
  &:hover {
    transform: translateY(-4px);
    border-color: rgba(139, 92, 246, 0.35);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 40px rgba(139, 92, 246, 0.15),
      0 0 0 1px rgba(139, 92, 246, 0.1) inset;
    
    &::before {
      opacity: 1;
    }
    
    &::after {
      top: -60%;
      left: -60%;
      background: radial-gradient(
        ellipse at 30% 0%,
        rgba(139, 92, 246, 0.12) 0%,
        transparent 50%
      );
    }
  }
  
  &:active {
    transform: translateY(-2px) scale(0.99);
  }
}

.is-live {
  border-color: rgba(255, 71, 87, 0.3);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.35),
    0 0 30px rgba(255, 71, 87, 0.12);
  
  &::before {
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 71, 87, 0.5) 20%, 
      rgba(255, 100, 100, 0.7) 50%, 
      rgba(255, 71, 87, 0.5) 80%, 
      transparent 100%);
  }
  
  &:hover {
    border-color: rgba(255, 71, 87, 0.5);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 50px rgba(255, 71, 87, 0.2);
  }
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.league-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.league-icon {
  font-size: 16px;
}

.league-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #e2e8f0;
  letter-spacing: var(--letter-spacing-tight);
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
} 
  &.status-live {
    background: rgba(255, 71, 87, 0.15);
    color: #ff4757;
    border: 1px solid rgba(255, 71, 87, 0.3);
  }
  
  &.status-ended {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  
  &.status-upcoming {
    background: rgba(139, 92, 246, 0.15);
    color: #a78bfa;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #ff4757;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
}

.content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 20px;
  gap: 12px;
}

.team {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.team-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: #f8fafc;
  text-align: center;
  line-height: var(--line-height-snug);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.team-rank {
  font-size: var(--font-size-xs);
  color: #64748b;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  letter-spacing: var(--letter-spacing-normal);
}

.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
}

.score {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: #f8fafc;
  font-family: var(--font-mono);
  letter-spacing: var(--letter-spacing-wider);
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.score-live {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  animation: glow 2s ease-in-out infinite;
}

.match-time {
  font-size: var(--font-size-xs);
  color: #64748b;
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  letter-spacing: var(--letter-spacing-tight);
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: #94a3b8;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  letter-spacing: var(--letter-spacing-normal);
}

.clock-icon {
  font-size: 14px;
}

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-radius: 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(139, 92, 246, 0.45);
    
    &::before {
      left: 100%;
    }
    
    .arrow {
      transform: translateX(4px);
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.97);
  }
  
  .arrow {
    transition: transform 0.3s ease;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }
  50% {
    box-shadow: 0 4px 24px rgba(139, 92, 246, 0.6);
  }
}

@keyframes livePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
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

</style>
