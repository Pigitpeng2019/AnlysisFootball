<template>
  <div class="app-container reanalyze-page">
    <div class="page-background"></div>
    
    <van-nav-bar title="📊 比赛复盘" fixed class="nav-bar" />
    
    <van-sticky class="sticky-date" :offset-top="46">
      <div class="date-selector" @click="showDatePicker=true">
        <div class="date-info">
          <span class="date-icon">📅</span>
          <div class="date-text">
            <div class="date-label">选择日期</div>
            <div class="date-value">{{ searchValue.matchDate }}</div>
          </div>
        </div>
        <van-icon name="arrow" class="date-arrow"/>
      </div>
    </van-sticky>
    
    <!-- 新增筛选区域 -->
    <van-sticky class="sticky-filter" :offset-top="100">
      <div class="filter-container">
        <!-- 搜索框 -->
        <div class="search-box">
          <van-icon name="search" class="search-icon"/>
          <input 
            type="text" 
            v-model="searchValue.keyword" 
            placeholder="搜索球队名称" 
            class="search-input"
            @input="onSearch"
          />
          <van-icon 
            name="cross" 
            class="search-clear" 
            v-if="searchValue.keyword"
            @click="clearSearch"
          />
        </div>
        
        <!-- 筛选按钮 -->
        <div class="filter-btn" @click="showFilterPopup=true">
          <van-icon name="filter" class="filter-icon"/>
          <span class="filter-text">筛选</span>
          <van-badge 
            v-if="hasActiveFilters" 
            class="filter-badge" 
            :content="activeFilterCount" 
          />
        </div>
      </div>
    </van-sticky>
    
    <div class="content-wrapper">
      <van-pull-refresh 
        class="match-list-container" 
        v-model="pagination.refreshing" 
        @refresh="onGetMatchByDate(true)"
      >
        <van-list 
          v-model:loading="pagination.loading" 
          :finished="pagination.finished" 
          finished-text="没有更多比赛" 
          @load="onGetMatchByDate(false)" 
          :immediate-check="false"
        >
          <match-item 
            v-for="(match, index) in filteredMatchList" 
            :key="match.fid" 
            :match="match"
            :style="{ animationDelay: `${index * 0.05}s` }"
          />
          <div v-if="filteredMatchList.length === 0 && !pagination.loading && !pagination.refreshing" class="empty-state">
            <span class="empty-icon">📅</span>
            <div class="empty-text">暂无比赛数据</div>
            <div class="empty-subtext">请选择其他日期或筛选条件</div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
    
    <van-popup v-model:show="showDatePicker" position="bottom" class="date-popup">
      <div class="popup-header">
        <span class="popup-title">选择比赛日期</span>
        <van-icon name="cross" class="popup-close" @click="showDatePicker=false"/>
      </div>
      <van-date-picker 
        v-model="selectDate" 
        :max-date="maxDate" 
        :min-date="minDate" 
        @confirm="onConfirmDate" 
        @cancel="showDatePicker=false"
        class="date-picker"
      />
    </van-popup>
    
    <!-- 筛选弹窗 -->
    <van-popup v-model:show="showFilterPopup" position="bottom" class="filter-popup">
      <div class="popup-header">
        <span class="popup-title">筛选条件</span>
        <van-icon name="cross" class="popup-close" @click="showFilterPopup=false"/>
      </div>
      <div class="filter-content">
        <!-- 联赛类型筛选 -->
        <div class="filter-section">
          <div class="filter-section-title">联赛类型</div>
          <van-checkbox-group v-model="filterOptions.leagueTypes" direction="horizontal">
            <van-checkbox 
              v-for="league in availableLeagues" 
              :key="league" 
              :name="league"
              :icon-size="20"
            >
              {{ league }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
        
        <!-- 比赛状态筛选 -->
        <div class="filter-section">
          <div class="filter-section-title">比赛状态</div>
          <van-checkbox-group v-model="filterOptions.matchStatus" direction="horizontal">
            <van-checkbox name="已结束" :icon-size="20">已结束</van-checkbox>
            <van-checkbox name="进行中" :icon-size="20">进行中</van-checkbox>
            <van-checkbox name="未开始" :icon-size="20">未开始</van-checkbox>
          </van-checkbox-group>
        </div>
        
        <!-- 清空按钮 -->
        <div class="filter-actions">
          <van-button 
            type="default" 
            class="reset-btn" 
            @click="resetFilters"
          >
            重置筛选
          </van-button>
          <van-button 
            type="primary" 
            class="confirm-btn" 
            @click="applyFilters"
          >
            应用筛选
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue"
import dayjs from "dayjs"
import _ from "lodash"
import { getMatchesByDate } from "@/http/api/football.ts"
import MatchItem from "@/pages/home/src/MatchItem.vue"
import { IMatchInfo } from "@/models/match.ts"
import { defaultPagination, IPaginationInfo } from "@/http/http.ts"

defineOptions({
  name: "Reanalyze"
})

const searchValue = reactive({
  matchDate: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
  keyword: ""
})

const pagination = reactive<IPaginationInfo>(_.cloneDeep(defaultPagination))
const showDatePicker = ref(false)
const showFilterPopup = ref(false)
const matchList = ref<IMatchInfo[]>([])

// 筛选选项
const filterOptions = reactive({
  leagueTypes: [] as string[],
  matchStatus: [] as string[]
})

// 日期选择
const selectDate = computed(() => {
  return searchValue.matchDate.split("-")
})

const minDate = computed(() => {
  return dayjs().subtract(25, "year").toDate()
})

const maxDate = computed(() => {
  return dayjs().toDate()
})

// 获取可用的联赛类型
const availableLeagues = computed(() => {
  const leagues = new Set<string>()
  matchList.value.forEach(match => {
    if (match.match_category) {
      leagues.add(match.match_category)
    }
  })
  return Array.from(leagues)
})

// 判断是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return filterOptions.leagueTypes.length > 0 || 
         filterOptions.matchStatus.length > 0 || 
         searchValue.keyword.length > 0
})

// 激活的筛选条件数量
const activeFilterCount = computed(() => {
  let count = 0
  if (filterOptions.leagueTypes.length > 0) count++
  if (filterOptions.matchStatus.length > 0) count++
  if (searchValue.keyword.length > 0) count++
  return count
})

// 筛选后的比赛列表
const filteredMatchList = computed(() => {
  let result = [...matchList.value]
  
  // 按关键词搜索
  if (searchValue.keyword) {
    const keyword = searchValue.keyword.toLowerCase()
    result = result.filter(match => {
      const homeTeam = match.home_team?.toLowerCase() || ""
      const visitTeam = match.visit_team?.toLowerCase() || ""
      return homeTeam.includes(keyword) || visitTeam.includes(keyword)
    })
  }
  
  // 按联赛类型筛选
  if (filterOptions.leagueTypes.length > 0) {
    result = result.filter(match => {
      return filterOptions.leagueTypes.includes(match.match_category || "")
    })
  }
  
  // 按比赛状态筛选
  if (filterOptions.matchStatus.length > 0) {
    result = result.filter(match => {
      return filterOptions.matchStatus.includes(match.match_status || "")
    })
  }
  
  return result
})

const onConfirmDate = ({ selectedValues }: { selectedValues: string[] }) => {
  searchValue.matchDate = selectedValues.join('-');
  showDatePicker.value = false
  onGetMatchByDate(true)
}

const onGetMatchByDate = (refresh = true) => {
  if (refresh) {
    pagination.pageNum = 1
  } else {
    pagination.pageNum++
  }
  getMatchesByDate(searchValue.matchDate, pagination).then((res: any) => {
    matchList.value = refresh ? res.data : matchList.value.concat(res.data)
  })
}

const onSearch = () => {
  // 搜索时不需要重新请求数据，直接在本地筛选
}

const clearSearch = () => {
  searchValue.keyword = ""
}

const resetFilters = () => {
  filterOptions.leagueTypes = []
  filterOptions.matchStatus = []
  searchValue.keyword = ""
}

const applyFilters = () => {
  showFilterPopup.value = false
}

onGetMatchByDate()
</script>

<style lang="scss" scoped>
.reanalyze-page {
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
    linear-gradient(180deg, rgba(15, 15, 20, 0.75) 0%, rgba(15, 15, 20, 0.85) 100%),
    url('https://media.comfy.org/website/enterprise/dark-fluid-texture.webp') center/cover no-repeat;
  z-index: -1;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    left: -20%;
    width: 140%;
    height: 140%;
    background: 
      radial-gradient(ellipse at 15% 25%, rgba(139, 92, 246, 0.2) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 75%, rgba(99, 102, 241, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 65%);
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -30%;
    right: -20%;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(ellipse at 25% 85%, rgba(168, 85, 247, 0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 80% 35%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
    border-radius: 50%;
    filter: blur(45px);
    opacity: 0.6;
  }
}

.nav-bar {
  background: linear-gradient(135deg, rgba(15, 15, 22, 0.95) 0%, rgba(22, 22, 30, 0.92) 100%) !important;
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  box-shadow: 
    0 4px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 1px 0 rgba(255, 255, 255, 0.05);
  border-bottom: none;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -50%;
    width: 200%;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(139, 92, 246, 0.4) 20%, 
      rgba(99, 102, 241, 0.6) 50%, 
      rgba(139, 92, 246, 0.4) 80%, 
      transparent 100%);
    animation: shimmerLine 3s ease-in-out infinite;
  }

  :deep(.van-nav-bar__title) {
    color: #f8fafc !important;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-lg);
    letter-spacing: var(--letter-spacing-tight);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  :deep(.van-nav-bar__left),
  :deep(.van-nav-bar__right) {
    color: #a78bfa;
    opacity: 0.9;
    transition: all 0.3s ease;
    
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}

.sticky-date {
  z-index: 100;
}

.date-selector {
  background: rgba(22, 22, 29, 0.9);
  backdrop-filter: blur(16px);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 14px;
  transition: all 0.25s ease;

  &:active {
    background: rgba(30, 30, 42, 0.95);
    transform: scale(0.99);
    border-color: rgba(139, 92, 246, 0.25);
  }
}

.date-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.date-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.4));
}

.date-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  color: #64748b;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  font-weight: var(--font-weight-medium);
}

.date-value {
  color: #f8fafc;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-mono);
  letter-spacing: var(--letter-spacing-tight);
}

.date-arrow {
  color: #a78bfa;
  font-size: 16px;
  transition: transform 0.3s ease;
}

.date-selector:active .date-arrow {
  transform: translateX(4px);
}

.content-wrapper {
  padding: 12px 5%;
  animation: fadeInUp 0.6s ease-out;
  width: 100%;
  max-width: 90%;
  margin: 0 auto;
  box-sizing: border-box;
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

.match-list-container {
  min-height: 70vh;
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
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-text {
  color: #cbd5e1;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  margin-bottom: 8px;
  letter-spacing: var(--letter-spacing-tight);
}

.empty-subtext {
  color: #64748b;
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-normal);
}

.date-popup {
  :deep(.van-popup) {
    background: #f7fafc !important;
    border-radius: 20px 20px 0 0 !important;
  }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 20px 20px 0 0;
}

.popup-title {
  color: white;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-tight);
}

.popup-close {
  color: rgba(255, 255, 255, 0.85);
  font-size: 20px;
  padding: 4px;

  &:active {
    color: white;
  }
}

.date-picker {
  :deep(.van-picker) {
    background: transparent;
  }

  :deep(.van-picker__toolbar) {
    background: rgba(22, 22, 29, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  :deep(.van-picker__title) {
    color: #f8fafc;
    font-weight: 600;
  }

  :deep(.van-picker-item) {
    color: #94a3b8;
  }

  :deep(.van-picker-item--selected) {
    color: #a78bfa;
    font-weight: 600;
  }
}

/* 筛选区域样式 */
.sticky-filter {
  z-index: 99;
}

.filter-container {
  background: rgba(22, 22, 29, 0.9);
  backdrop-filter: blur(16px);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(30, 30, 42, 0.8);
  border-radius: 10px;
  padding: 10px 14px;
  gap: 10px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  transition: all 0.2s ease;

  &:focus-within {
    border-color: #8b5cf6;
    background: rgba(40, 40, 56, 0.9);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }
}

.search-icon {
  color: #a78bfa;
  font-size: 16px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: var(--font-size-sm);
  outline: none;
  letter-spacing: var(--letter-spacing-normal);

  &::placeholder {
    color: #64748b;
  }
}

.search-clear {
  color: #64748b;
  font-size: 14px;
  padding: 4px;

  &:active {
    color: #94a3b8;
  }
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
  transition: all 0.25s ease;

  &:active {
    transform: scale(0.96);
    box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
  }
}

.filter-icon {
  color: white;
  font-size: 14px;
}

.filter-text {
  color: white;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-normal);
}

.filter-badge {
  :deep(.van-badge) {
    background: #ef4444 !important;
    font-size: 11px;
    padding: 0 6px;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 9px;
  }
}

/* 筛选弹窗样式 */
.filter-popup {
  :deep(.van-popup) {
    background: rgba(22, 22, 29, 0.98) !important;
    border-radius: 20px 20px 0 0 !important;
    max-height: 70vh;
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
  }
}

.filter-content {
  padding: 24px 20px;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-section-title {
  color: #94a3b8;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: var(--letter-spacing-tight);

  &::before {
    content: '';
    width: 4px;
    height: 14px;
    background: linear-gradient(180deg, #8b5cf6, #6366f1);
    border-radius: 2px;
  }
}

.filter-section :deep(.van-checkbox) {
  margin-right: 16px;
  margin-bottom: 14px;

  :deep(.van-checkbox__label) {
    color: #cbd5e1;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-normal);
  }

  :deep(.van-checkbox__icon) {
    border-color: #475569;
    border-radius: 4px;
  }

  :deep(.van-checkbox__icon--checked) {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    border-color: #8b5cf6;
    border-radius: 4px;
  }
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.reset-btn {
  flex: 1;
  :deep(.van-button) {
    background: rgba(30, 30, 42, 0.8);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-weight: 500;

    &:active {
      background: rgba(40, 40, 56, 0.9);
    }
  }
}

.confirm-btn {
  flex: 1;
  :deep(.van-button) {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);

    &:active {
      transform: scale(0.98);
      box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
    }
  }
}
</style>
