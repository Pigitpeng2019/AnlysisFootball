<template>
  <div class="app-container padding-tabbar setting-page">
    <div class="page-background"></div>
    
    <van-nav-bar title="⚙️ 设置" fixed class="nav-bar"/>
    
    <div class="content-wrapper">
      <van-cell-group title="赔率公司配置" class="settings-group">
        <van-cell title="欧赔公司配置" is-link @click="showEuropePopover=true" class="setting-cell"/>
        <van-cell title="亚盘公司配置" is-link @click="showAsiaPopover=true" class="setting-cell"/>
        <van-cell title="大小球公司配置" is-link @click="showSizePopover=true" class="setting-cell"/>
      </van-cell-group>
      
      <van-cell-group title="组合配置" class="settings-group">
        <van-cell title="亚盘组合大小球" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="asiaCompose" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="大小球组合亚盘" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="sizeCompose" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
      </van-cell-group>
      
      <van-cell-group title="优化方案" class="settings-group">
        <van-cell title="亚盘剔除非主流赔率" label="个别公司开出的让球数和主流不一致，不匹配这些公司" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="asiaNonMainstream" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="亚盘剔除偏差过大的水位" label="个别公司的水位和中位数水位差距偏大，剔除掉，阈值暂时设置为1.2" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="asiaFilterOdds" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="大小球剔除非主流赔率" label="个别公司开出的大小球数和主流不一致，不匹配这些公司" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="sizeNonMainstream" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="大小球剔除偏差过大的水位" label="个别公司的水位和中位数水位差距偏大，剔除掉，阈值暂时设置为1.2" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="sizeFilterOdds" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="不匹配友谊赛" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="noFriendMatch" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
        <van-cell title="只匹配主流联赛" label="法甲|法乙|德甲|德乙|英超|英冠|意甲|意乙|西甲|西乙|荷甲|荷乙|葡超|法国杯|德国杯|英足总杯|意杯|西班牙杯|荷杯|葡杯|欧冠|欧联|欧罗巴|欧会杯|亚冠|世界杯|欧洲杯|美洲杯" class="setting-cell">
          <template #right-icon>
            <van-switch v-model="onlyMainMatch" :active-value="1" :inactive-value="0" class="custom-switch"/>
          </template>
        </van-cell>
      </van-cell-group>
      
      <van-cell-group title="帮助反馈" class="settings-group">
        <div class="feedback-content">
          <div class="feedback-item">
            <div class="feedback-icon">📢</div>
            <div class="feedback-text">
              请在GitHub上提交Issue，告知不准确的联赛和具体场次，以便我改进算法。有什么好的思路也可以提出。
            </div>
            <a class="github-link" href="https://github.com/czl0325/football_frontend" target="_blank">
              <span class="link-icon">⭐</span>
              <span>跳转链接，给个Star</span>
              <span class="arrow">→</span>
            </a>
          </div>
          
          <div class="feedback-item">
            <div class="feedback-icon">🧠</div>
            <div class="feedback-text">
              <div class="feedback-title">分析思路</div>
              <div class="analysis-text">
                以23/24英超第22轮利物浦主场对阵切尔西为例，利物浦赛前排名第一，积分48，切尔西赛前排名第10，积分31，每家公司开出初赔，初赔主队水位，客队水位，以及即时赔率，即时赔率主队水位，客队水位。<br><br>
                通过大数据找出历史比赛中，初赔同样让球，主客队水位相同的比赛(误差±0.015)，即时赔率同样让球，主客队水位相同的比赛，如果是联赛，且联赛赛程已经超过1/4，因为利物浦排名比切尔西高，再加入筛选条件主队排名高于客队的比赛，以及主队积分>=客队积分+(48-31)的比赛，最终将找到的所有比赛计算赢盘输盘的场次，来得出赢盘输盘的概率。
              </div>
              <div class="update-text">
                <span class="update-icon">🔄</span>
                <span>更新让球推导：查找出本赛季主队主场和客队客场都对阵的同一支球队，获取这两场比赛各自的让初和让终，通过两场比赛让初+让初，让终+让终，计算出合理的让初和让终，最后把所有让初和让终取平均值，对比本场的让初和让终。</span>
              </div>
            </div>
          </div>
        </div>
      </van-cell-group>
    </div>
    
    <div class="version-info">
      <span class="version-text">当前版本: {{ APP_VERSION }}</span>
    </div>
    
    <van-popup v-model:show="showEuropePopover" position="bottom" class="company-popup">
      <div class="popup-header">
        <span class="popup-title">欧赔公司配置</span>
        <van-icon name="cross" class="popup-close" @click="showEuropePopover=false"/>
      </div>
      <div class="company-list">
        <van-checkbox-group v-model="checkEuropeCompanies" shape="square">
          <van-checkbox v-for="item in europeCompanies" :key="item.value" :name="item.value" class="company-item">{{ item.name }}</van-checkbox>
        </van-checkbox-group>
      </div>
    </van-popup>
    
    <van-popup v-model:show="showAsiaPopover" position="bottom" class="company-popup">
      <div class="popup-header">
        <span class="popup-title">亚盘公司配置</span>
        <van-icon name="cross" class="popup-close" @click="showAsiaPopover=false"/>
      </div>
      <div class="company-list">
        <van-checkbox-group v-model="checkAsiaCompanies" shape="square">
          <van-checkbox v-for="item in asiaCompanies" :key="item.value" :name="item.value" class="company-item">{{ item.name }}</van-checkbox>
        </van-checkbox-group>
      </div>
    </van-popup>
    
    <van-popup v-model:show="showSizePopover" position="bottom" class="company-popup">
      <div class="popup-header">
        <span class="popup-title">大小球公司配置</span>
        <van-icon name="cross" class="popup-close" @click="showSizePopover=false"/>
      </div>
      <div class="company-list">
        <van-checkbox-group v-model="checkSizeCompanies" shape="square">
          <van-checkbox v-for="item in sizeCompanies" :key="item.value" :name="item.value" class="company-item">{{ item.name }}</van-checkbox>
        </van-checkbox-group>
      </div>
    </van-popup>
    
    <van-popup v-model:show="showMatchPopover" position="bottom">
      <div class="match-popup-content">
        <no-compare-match />
      </div>
    </van-popup>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue"
import { useLocalStorage } from "@vueuse/core"
import { APP_VERSION, ASIA_COMPANY, EUROPE_COMPANY, SIZE_COMPANY } from "@/config.ts"
import NoCompareMatch from "@/pages/setting/src/NoCompareMatch.vue"

defineOptions({
  name: "Setting"
})
const showEuropePopover = ref(false)
const showAsiaPopover = ref(false)
const showSizePopover = ref(false)
const showMatchPopover = ref(false)
const europeCompanies = useLocalStorage("europe", EUROPE_COMPANY)
const checkEuropeCompanies = useLocalStorage("check_europe", EUROPE_COMPANY.map((item: any) => item.value))
const asiaCompanies = useLocalStorage("asia", ASIA_COMPANY)
const checkAsiaCompanies = useLocalStorage("check_asia", ASIA_COMPANY.map((item: any) => item.value))
const sizeCompanies = useLocalStorage("size", SIZE_COMPANY)
const checkSizeCompanies = useLocalStorage("check_size", SIZE_COMPANY.map((item: any) => item.value))
const asiaCompose = useLocalStorage("asia_compose", 0)
const sizeCompose = useLocalStorage("size_compose", 0)
const asiaNonMainstream = useLocalStorage("asia_nonMainstream", 1)
const sizeNonMainstream = useLocalStorage("size_nonMainstream", 1)
const asiaFilterOdds = useLocalStorage("asia_filter_odds", 1)
const sizeFilterOdds = useLocalStorage("size_filter_odds", 1)
const noFriendMatch = useLocalStorage("no_friend_match", 1)
const onlyMainMatch = useLocalStorage("only_main_match", 0)
</script>

<style lang="less" scoped>
.setting-page {
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

.settings-group {
  margin-bottom: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  
  :deep(.van-cell-group__title) {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 12px 16px 8px;
    background: transparent;
  }
}

.setting-cell {
  background: transparent;
  padding: 14px 16px;
  
  :deep(.van-cell__title) {
    color: var(--text-primary);
    font-size: 15px;
  }
  
  :deep(.van-cell__label) {
    color: var(--text-muted);
    font-size: 12px;
    margin-top: 4px;
    line-height: 1.4;
  }
  
  :deep(.van-cell__right-icon) {
    color: var(--text-muted);
  }
  
  &::after {
    left: 16px;
    right: 16px;
    border-color: var(--border-color);
  }
}

.custom-switch {
  :deep(.van-switch--on) {
    background: var(--primary-gradient);
  }
}

.feedback-content {
  padding: 16px;
}

.feedback-item {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feedback-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.feedback-text {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.feedback-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.analysis-text {
  margin-bottom: 12px;
  line-height: 1.7;
}

.update-text {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.update-icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--primary-gradient);
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  margin-top: 8px;
  
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
}

.version-info {
  padding: 20px;
  text-align: center;
}

.version-text {
  color: var(--text-muted);
  font-size: 13px;
}

.company-popup {
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

.company-list {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.company-item {
  padding: 10px 12px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  margin-bottom: 8px;
  transition: all 0.2s ease;
  
  &:active {
    background: var(--bg-card-hover);
  }
  
  :deep(.van-checkbox__label) {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    margin-left: 8px;
  }
  
  :deep(.van-checkbox__icon--checked .van-icon) {
    background: var(--primary-gradient) !important;
    border-color: var(--primary-color) !important;
  }
}

.match-popup-content {
  height: 80vh;
  background: var(--bg-secondary);
}

.company-list::-webkit-scrollbar {
  width: 4px;
}

.company-list::-webkit-scrollbar-track {
  background: transparent;
}

.company-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

:deep(.van-checkbox-group) {
  .van-checkbox + .van-checkbox {
    margin-top: 0;
  }
}
</style>
