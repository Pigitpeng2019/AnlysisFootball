<template>
  <div class="app-container padding-tabbar reanalyze-page">
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
            v-for="(match, index) in matchList" 
            :key="match.fid" 
            :match="match"
            :style="{ animationDelay: `${index * 0.05}s` }"
          />
          <div v-if="matchList.length === 0 && !pagination.loading && !pagination.refreshing" class="empty-state">
            <span class="empty-icon">📅</span>
            <div class="empty-text">暂无比赛数据</div>
            <div class="empty-subtext">请选择其他日期</div>
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
})
const pagination = reactive<IPaginationInfo>(_.cloneDeep(defaultPagination))
const showDatePicker = ref(false)
const matchList = ref<IMatchInfo[]>([])
const selectDate = computed(() => {
  return searchValue.matchDate.split("-")
})
const minDate = computed(() => {
  return dayjs().subtract(25, "year").toDate()
})
const maxDate = computed(() => {
  return dayjs().toDate()
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
    radial-gradient(ellipse at 50% 0%, rgba(0, 212, 170, 0.05) 0%, transparent 50%),
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

.sticky-date {
  z-index: 100;
}

.date-selector {
  background: rgba(20, 26, 35, 0.95);
  padding: 16px 16px;
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

.date-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.date-icon {
  font-size: 24px;
}

.date-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  font-family: 'Outfit', monospace;
}

.date-arrow {
  color: var(--text-muted);
  font-size: 16px;
  transition: transform 0.3s ease;
}

.date-selector:active .date-arrow {
  transform: translateX(4px);
}

.content-wrapper {
  padding: 12px 0;
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
  opacity: 0.5;
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

.date-popup {
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

.date-picker {
  :deep(.van-picker) {
    background: transparent;
  }
  
  :deep(.van-picker__toolbar) {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }
  
  :deep(.van-picker__title) {
    color: var(--text-primary);
    font-weight: 600;
  }
  
  :deep(.van-picker-item) {
    color: var(--text-secondary);
  }

  :deep(.van-picker-item--selected) {
    color: var(--primary-color);
    font-weight: 600;
  }
}
</style>
