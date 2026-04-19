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
  background: var(--bg-card);
  border-radius: 16px;
  margin: 10px 12px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out;
  
  &:active {
    transform: scale(0.98);
    box-shadow: var(--shadow-glow);
  }
}

.is-live {
  border-color: rgba(255, 71, 87, 0.3);
  box-shadow: 0 0 20px rgba(255, 71, 87, 0.1);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
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
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.status-live {
    background: rgba(255, 71, 87, 0.15);
    color: #ff4757;
    border: 1px solid rgba(255, 71, 87, 0.3);
  }
  
  &.status-ended {
    background: rgba(139, 148, 158, 0.15);
    color: var(--text-secondary);
    border: 1px solid rgba(139, 148, 158, 0.3);
  }
  
  &.status-upcoming {
    background: rgba(0, 212, 170, 0.15);
    color: var(--secondary-color);
    border: 1px solid rgba(0, 212, 170, 0.3);
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
  padding: 20px 16px;
  gap: 12px;
}

.team {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.team-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.3;
}

.team-rank {
  font-size: 11px;
  color: var(--text-muted);
}

.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
}

.score {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Outfit', monospace;
  letter-spacing: 2px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.score-live {
  background: var(--primary-gradient);
  color: white;
  border: none;
  animation: glow 2s ease-in-out infinite;
}

.match-time {
  font-size: 11px;
  color: var(--text-muted);
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid var(--border-color);
}

.time-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.clock-icon {
  font-size: 14px;
}

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.95);
    opacity: 0.9;
  }
  
  .arrow {
    transition: transform 0.3s ease;
  }
  
  &:hover .arrow {
    transform: translateX(4px);
  }
}
</style>
