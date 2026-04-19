<template>
  <div class="app-container padding-tabbar home-page">
    <div class="page-background"></div>
    
    <van-nav-bar title="⚽ 实时比赛" fixed class="nav-bar">
      <template #right>
        <span class="nav-switch" @click="onChangeMatchList">
          <span class="switch-text">{{ matchType === "all" ? "全部" : "竞彩" }}</span>
        </span>
      </template>
    </van-nav-bar>
    
    <div v-if="requestError" class="error-container">
      <div class="error-glow"></div>
      <div class="error-content">
        <div class="error-icon-wrapper">
          <span class="error-icon">📡</span>
        </div>
        <div class="error-title">服务暂时不可用</div>
        <div class="error-message">由于服务器IP被封，暂时只支持通过FID进行比赛分析</div>
        
        <van-form @submit="onSubmit" class="fid-form">
          <div class="input-wrapper">
            <van-field 
              v-model="fid" 
              name="fid" 
              placeholder="请输入比赛FID" 
              class="fid-input"
            />
          </div>
          <van-button type="primary" block class="submit-btn" native-type="submit">
            <span>开始分析</span>
            <span class="arrow">→</span>
          </van-button>
        </van-form>
        
        <div class="history-section">
          <div class="section-header">
            <span class="section-icon">📋</span>
            <span class="section-title">历史查询</span>
          </div>
          <div class="history-list">
            <div 
              v-for="match in historyMatches" 
              :key="match.fid" 
              class="history-item"
              @click="$router.push(`/match/detail?fid=${match.fid}`)"
            >
              <div class="history-match">
                <span class="match-teams">{{ match.home }} vs {{ match.visit }}</span>
                <span class="match-info">{{ match.group }} ({{ match.time }})</span>
              </div>
              <van-icon name="arrow" class="arrow-icon"/>
            </div>
            <div v-if="historyMatches.length === 0" class="empty-history">
              <span class="empty-icon">📭</span>
              <span>暂无历史记录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="content-wrapper">
      <van-sticky class="sticky-filter" :offset-top="46">
        <div class="filter-btn" @click="showMatchTypes=true">
          <div class="filter-left">
            <span class="filter-icon">🔍</span>
            <span class="filter-text">比赛筛选</span>
          </div>
          <div class="filter-right">
            <span class="filter-count">{{ selectMatchTypes.length }}/{{ matchGroups.length }}</span>
            <van-icon name="arrow" class="arrow-icon"/>
          </div>
        </div>
      </van-sticky>
      
      <van-pull-refresh 
        class="match-list-wrapper" 
        v-model="isLoading" 
        @refresh="onRefreshList"
      >
        <div class="match-list">
          <match-item 
            v-for="(match, index) in matchList" 
            :key="match.fid" 
            :match="match"
            :style="{ animationDelay: `${index * 0.05}s` }"
          />
        </div>
        <div v-if="matchList.length === 0 && !isLoading" class="empty-state">
          <span class="empty-icon">⚽</span>
          <div class="empty-text">暂无比赛数据</div>
          <div class="empty-subtext">下拉刷新试试</div>
        </div>
      </van-pull-refresh>
      
      <van-popup v-model:show="showMatchTypes" position="bottom" round class="filter-popup">
        <div class="popup-header">
          <span class="popup-title">选择联赛</span>
          <van-icon name="cross" class="popup-close" @click="showMatchTypes=false"/>
        </div>
        <div class="filter-actions">
          <van-button size="small" plain round @click="onSelectType(1)" class="action-btn">全选</van-button>
          <van-button size="small" plain round @click="onSelectType(2)" class="action-btn">全不选</van-button>
          <van-button size="small" plain round @click="onSelectType(3)" class="action-btn accent">五大联赛</van-button>
          <van-button size="small" plain round @click="onSelectType(4)" class="action-btn accent">热门</van-button>
        </div>
        <div class="league-grid">
          <van-checkbox-group v-model="selectMatchTypes" @change="onChangeMatchType">
            <van-checkbox 
              v-for="item in matchGroups" 
              :key="item" 
              :name="item" 
              class="league-item"
            >
              {{ item }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onActivated, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import MatchItem from "@/pages/home/src/MatchItem.vue"
import { getGithubToken, getMatchList } from "@/http/api/football.ts"
import { IMatchInfo } from "@/models/match.ts"
import { useLocalStorage } from "@vueuse/core"
import { closeToast, showLoadingToast } from "vant"
import { getAllMatchGroup } from "@/utils/tools.ts"

defineOptions({
  name: "Home"
})
const route = useRoute()
const router = useRouter()
const isLoading = ref(false)
let originMatchList:IMatchInfo[] = []
const requestError = ref(false)
const fid = ref("")
const matchType = useLocalStorage<string>("match_type", "all")
const matchList = ref<IMatchInfo[]>([])
const matchGroups = ref<string[]>([])
const showMatchTypes = ref(false)
const selectMatchTypes = ref<string[]>([])
const onRefreshList = () => {
  showLoadingToast({
    message: "加载比赛...",
    duration: 0,
    forbidClick: true
  })
  isLoading.value = true
  getMatchList(matchType.value)
  .then((res:IMatchInfo[]) => {
    originMatchList = res
    matchGroups.value = getAllMatchGroup(res) as string[]
    if (selectMatchTypes.value.length === 0) {
      selectMatchTypes.value = matchGroups.value
    }
    onChangeMatchType()
    requestError.value = false
  }).catch(() => {
    originMatchList = []
    requestError.value = true
  }).finally(() => {
    closeToast()
    isLoading.value = false
  })
}
const onChangeMatchType = () => {
  matchList.value = originMatchList.filter(item => {
    if (item.match_category) {
      return selectMatchTypes.value.includes(item.match_category)
    }
    return false
  })
}
const onChangeMatchList = () => {
  matchType.value = matchType.value === "all" ? "jingcai" : "all"
  onRefreshList()
}
const onSelectType = (type: number) => {
  if (type === 1) {
    selectMatchTypes.value = matchGroups.value
  } else if (type === 2) {
    selectMatchTypes.value = []
  } else if (type === 3) {
    selectMatchTypes.value = ["英超", "意甲", "德甲", "西甲", "法甲"]
  } else if (type === 4) {
    selectMatchTypes.value = ["英超", "意甲", "德甲", "西甲", "法甲", "欧冠", "欧罗巴", "亚冠"]
  }
}
const historyMatches = useLocalStorage<any[]>("history_matches", [])
onRefreshList()
const onSubmit = (values: any) => {
  router.push(`/match/detail?fid=${values.fid}`)
}
const onCodeChange = (code?: string) => {
  const saveCode = localStorage.getItem("code")
  if (code && code !== saveCode) {
    showLoadingToast({
      message: "正在获取token...",
      duration: 0,
      forbidClick: true
    })
    getGithubToken(route.query.code as string).then(res => {
      if (res.access_token) {
        localStorage.setItem("code", route.query.code as string)
        localStorage.setItem("token", res.access_token as string)
      } else {
        localStorage.removeItem("code")
        localStorage.removeItem("token")
      }
    }).catch(() => {
      localStorage.removeItem("code")
      localStorage.removeItem("token")
      window.location.href = '/'
    }).finally(() => {
      closeToast()
    })
  }
}
watch(() => route.query.code, (code) => {
  onCodeChange(code as string)
}, {immediate: true})
onActivated(() => {
  onCodeChange(route.query.code as string)
})
</script>

<style lang="less" scoped>
.home-page {
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
    radial-gradient(ellipse at 50% 0%, rgba(255, 101, 0, 0.08) 0%, transparent 50%),
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

.nav-switch {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  background: rgba(255, 101, 0, 0.15);
  border-radius: 20px;
  border: 1px solid rgba(255, 101, 0, 0.3);
  transition: all 0.3s ease;
  
  &:active {
    background: rgba(255, 101, 0, 0.25);
    transform: scale(0.95);
  }
}

.switch-text {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
}

.content-wrapper {
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

.sticky-filter {
  z-index: 100;
}

.filter-btn {
  background: rgba(20, 26, 35, 0.95);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(20px);
  transition: all 0.2s ease;
  
  &:active {
    background: rgba(30, 38, 50, 0.95);
  }
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-icon {
  font-size: 18px;
}

.filter-text {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-count {
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 101, 0, 0.1);
  padding: 3px 10px;
  border-radius: 12px;
}

.arrow-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.match-list-wrapper {
  min-height: 70vh;
}

.match-list {
  padding-bottom: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  text-align: center;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-text {
  color: var(--text-secondary);
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-subtext {
  color: var(--text-muted);
  font-size: 14px;
}

.error-container {
  position: relative;
  padding: 60px 20px 40px;
  min-height: 80vh;
}

.error-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 71, 87, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.error-content {
  position: relative;
  z-index: 1;
  text-align: center;
  animation: fadeInUp 0.6s ease-out;
}

.error-icon-wrapper {
  margin-bottom: 24px;
}

.error-icon {
  font-size: 72px;
  display: inline-block;
  animation: shake 0.6s ease-in-out 2;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-10deg); }
  40% { transform: rotate(10deg); }
  60% { transform: rotate(-10deg); }
  80% { transform: rotate(10deg); }
}

.error-title {
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.error-message {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.fid-form {
  margin-bottom: 40px;
}

.input-wrapper {
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  
  :deep(.van-field__control) {
    color: var(--text-primary);
    font-size: 15px;
    &::placeholder {
      color: var(--text-muted);
    }
  }
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--primary-gradient) !important;
  border: none !important;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  height: 48px;
  box-shadow: 0 4px 20px rgba(255, 101, 0, 0.3);
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 2px 12px rgba(255, 101, 0, 0.25);
  }
  
  .arrow {
    transition: transform 0.3s ease;
  }
  
  &:hover .arrow {
    transform: translateX(4px);
  }
}

.history-section {
  margin-top: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.section-icon {
  font-size: 20px;
}

.section-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  
  &:active {
    background: var(--bg-card-hover);
    transform: scale(0.98);
  }
}

.history-match {
  flex: 1;
  min-width: 0;
}

.match-teams {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-info {
  color: var(--text-muted);
  font-size: 12px;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  color: var(--text-muted);
  font-size: 14px;
}

.empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.filter-popup {
  :deep(.van-popup) {
    background: var(--bg-secondary) !important;
    border-radius: 20px 20px 0 0 !important;
  }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.popup-title {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.popup-close {
  color: var(--text-muted);
  font-size: 20px;
  padding: 4px;
  
  &:active {
    color: var(--text-secondary);
  }
}

.filter-actions {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 70px;
  font-size: 13px;
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
  color: var(--text-secondary) !important;
  
  &.accent {
    border-color: rgba(255, 101, 0, 0.3) !important;
    color: var(--primary-color) !important;
    background: rgba(255, 101, 0, 0.08) !important;
  }
}

.league-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 20px 30px;
  max-height: 400px;
  overflow-y: auto;
}

.league-item {
  padding: 10px 8px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  
  &:active {
    background: var(--bg-card-hover);
  }
  
  :deep(.van-checkbox__label) {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
  }
  
  :deep(.van-checkbox__icon--checked .van-icon) {
    background: var(--primary-gradient) !important;
    border-color: var(--primary-color) !important;
  }
}

.league-grid::-webkit-scrollbar {
  width: 4px;
}

.league-grid::-webkit-scrollbar-track {
  background: transparent;
}

.league-grid::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}
</style>
