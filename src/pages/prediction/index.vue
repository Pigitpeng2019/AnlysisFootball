<template>
  <div class="app-container prediction-page">
    <div class="page-background"></div>

    <van-nav-bar title="📊 数据预测" fixed class="nav-bar">
      <template #right>
        <div class="ai-toggle-btn" :class="{ active: aiSettings.enabled }" @click="showAISettings = true">
          <span class="ai-toggle-dot"></span>
          <span class="ai-toggle-label">AI</span>
        </div>
      </template>
    </van-nav-bar>

    <div class="content-wrapper" :class="{ 'has-result': predictionResult }">
      <!-- 模式切换 -->
      <div v-if="!predictionResult && !loading" class="mode-switcher">
        <div class="mode-tabs">
          <span class="mode-tab" :class="{ active: mode === 'list' }" @click="switchMode('list')">比赛列表</span>
          <span class="mode-tab" :class="{ active: mode === 'fid' }" @click="switchMode('fid')">FID输入</span>
        </div>
      </div>

      <!-- 比赛列表模式 -->
      <div v-if="!predictionResult && !loading && !error && mode === 'list'" class="list-container">
        <van-sticky class="sticky-filter" :offset-top="100">
          <div class="filter-btn" @click="showMatchTypes = true">
            <div class="filter-left">
              <span class="filter-icon">🔍</span>
              <span class="filter-text">比赛筛选</span>
            </div>
            <div class="filter-right">
              <span class="filter-count">{{ selectMatchTypes.length }}/{{ matchGroups.length }}</span>
              <van-icon name="arrow" class="arrow-icon" />
            </div>
          </div>
        </van-sticky>

        <van-pull-refresh class="match-list-wrapper" v-model="refreshing" @refresh="loadMatchList">
          <div class="match-list">
            <div
              v-for="(match, index) in filteredMatchList"
              :key="match.fid"
              class="match-card"
              :style="{ animationDelay: `${index * 0.05}s` }"
              @click="onSelectMatch(match.fid)"
            >
              <div class="match-card-header">
                <span class="match-card-league">{{ match.match_group }}</span>
                <span class="match-card-time">{{ match.match_time }}</span>
              </div>
              <div class="match-card-body">
                <div class="match-card-team home">
                  <span class="team-name">{{ match.home_team }}</span>
                  <span v-if="match.home_team_rank" class="team-rank">#{{ match.home_team_rank }}</span>
                </div>
                <div class="match-card-vs">
                  <span class="vs-score">{{ match.field_score ?? "VS" }}</span>
                </div>
                <div class="match-card-team away">
                  <span class="team-name">{{ match.visit_team }}</span>
                  <span v-if="match.visit_team_rank" class="team-rank">#{{ match.visit_team_rank }}</span>
                </div>
              </div>
              <div class="match-card-footer">
                <span class="predict-hint">点击预测 →</span>
              </div>
            </div>
          </div>
          <div v-if="filteredMatchList.length === 0 && !refreshing" class="empty-state">
            <span class="empty-icon">⚽</span>
            <div class="empty-text">暂无比赛数据</div>
          </div>
        </van-pull-refresh>

        <van-popup v-model:show="showMatchTypes" position="bottom" round class="filter-popup">
          <div class="popup-header">
            <span class="popup-title">选择联赛</span>
            <van-icon name="cross" class="popup-close" @click="showMatchTypes = false" />
          </div>
          <div class="filter-actions">
            <van-button size="small" plain round @click="onSelectType(1)" class="action-btn">全选</van-button>
            <van-button size="small" plain round @click="onSelectType(2)" class="action-btn">全不选</van-button>
            <van-button size="small" plain round @click="onSelectType(3)" class="action-btn accent">五大联赛</van-button>
            <van-button size="small" plain round @click="onSelectType(4)" class="action-btn accent">热门</van-button>
          </div>
          <div class="league-grid">
            <van-checkbox-group v-model="selectMatchTypes" @change="onChangeMatchType">
              <van-checkbox v-for="item in matchGroups" :key="item" :name="item" class="league-item">
                {{ item }}
              </van-checkbox>
            </van-checkbox-group>
          </div>
        </van-popup>
      </div>

      <!-- FID 输入模式 -->
      <div v-if="!predictionResult && !loading && !error && mode === 'fid'" class="input-section">
        <div class="input-glow"></div>
        <div class="input-content">
          <div class="input-icon-wrapper">
            <span class="input-icon">🔮</span>
          </div>
          <h2 class="input-title">FID 预测</h2>
          <p class="input-desc">输入 500.com 比赛 FID，快速获取大小球和大小黄牌预测</p>

          <van-form @submit="onPredict">
            <div class="fid-input-wrapper">
              <van-field v-model="fid" name="fid" placeholder="请输入比赛FID" class="fid-field" clearable />
            </div>
            <van-button type="primary" block class="predict-btn" native-type="submit">
              <span>开始预测</span>
              <span class="arrow">→</span>
            </van-button>
          </van-form>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-section">
        <van-loading type="spinner" color="#8b5cf6" size="36" />
        <p class="loading-text">正在获取预测数据...</p>
      </div>

      <!-- 错误状态 -->
      <div v-if="error && !loading" class="error-section">
        <div class="error-icon-wrapper">
          <span class="error-icon">⚠️</span>
        </div>
        <p class="error-text">{{ errorMessage }}</p>
        <van-button size="small" round class="retry-btn" @click="onRetry">重新尝试</van-button>
        <van-button size="small" plain round class="back-btn" @click="goBack">返回选择</van-button>
      </div>

      <!-- 预测结果 -->
      <div v-if="predictionResult && !loading" class="result-section">
        <!-- 返回按钮 -->
        <div class="result-header">
          <van-button size="small" plain round class="result-back-btn" @click="goBack">
            <van-icon name="arrow-left" /> 返回选择
          </van-button>
        </div>

        <!-- 比赛基本信息 -->
        <div class="match-info-card">
          <div class="match-badge">{{ predictionResult.match_group }}</div>
          <div class="match-teams">
            <div class="team home">
              <span class="team-name">{{ predictionResult.home_team }}</span>
            </div>
            <div class="vs-wrapper">
              <span class="vs-text">VS</span>
            </div>
            <div class="team away">
              <span class="team-name">{{ predictionResult.visit_team }}</span>
            </div>
          </div>
          <div class="match-meta">
            <span class="meta-time">{{ predictionResult.match_time }}</span>
            <span class="meta-fid">FID: {{ predictionResult.fid }}</span>
          </div>
        </div>

        <!-- 大小球预测 -->
        <div class="prediction-card size-card">
          <div class="card-header">
            <div class="card-icon">⚽</div>
            <div class="card-title-group">
              <h3 class="card-title">大小球预测</h3>
              <span class="card-subtitle">Over/Under Goals</span>
            </div>
          </div>

          <div class="probability-bar">
            <div class="prob-item big" :style="{ flex: predictionResult.size.big_probability }">
              <span class="prob-label">大球</span>
              <span class="prob-value">{{ getDecimal(predictionResult.size.big_probability) }}%</span>
            </div>
            <div class="prob-divider"></div>
            <div class="prob-item small" :style="{ flex: predictionResult.size.small_probability }">
              <span class="prob-value">{{ getDecimal(predictionResult.size.small_probability) }}%</span>
              <span class="prob-label">小球</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">盘口线</span>
              <span class="stat-value">{{ predictionResult.size.current_line }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">泊松大球</span>
              <span class="stat-value">{{ predictionResult.size.poisson_big }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">泊松小球</span>
              <span class="stat-value">{{ predictionResult.size.poisson_small }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">历史大球率</span>
              <span class="stat-value">{{ getDecimal(predictionResult.size.historical_big_rate) }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">历史小球率</span>
              <span class="stat-value">{{ getDecimal(predictionResult.size.historical_small_rate) }}%</span>
            </div>
            <div class="stat-item" v-if="predictionResult.size.final_boost !== undefined">
              <span class="stat-label">决赛加成</span>
              <span class="stat-value" style="color: #22c55e;">+{{ predictionResult.size.final_boost }}%</span>
            </div>
          </div>

          <div class="prediction-chart" ref="sizeChartRef"></div>

          <div class="recommendation" :class="predictionResult.size.recommendation === '大球' ? 'rec-big' : 'rec-small'">
            <span class="rec-label">推荐</span>
            <span class="rec-value">{{ predictionResult.size.recommendation }}</span>
            <div class="confidence-stars">
              <span v-for="i in 5" :key="i" class="star" :class="{ active: i <= predictionResult.size.confidence }">★</span>
            </div>
          </div>
        </div>

        <!-- 大小黄牌预测 -->
        <div class="prediction-card card-card">
          <div class="card-header">
            <div class="card-icon">🟨</div>
            <div class="card-title-group">
              <h3 class="card-title">大小黄牌预测</h3>
              <span class="card-subtitle">Over/Under Yellow Cards</span>
            </div>
          </div>

          <div class="probability-bar">
            <div class="prob-item big" :style="{ flex: predictionResult.card.over_probability }">
              <span class="prob-label">大黄牌</span>
              <span class="prob-value">{{ getDecimal(predictionResult.card.over_probability) }}%</span>
            </div>
            <div class="prob-divider"></div>
            <div class="prob-item small" :style="{ flex: predictionResult.card.under_probability }">
              <span class="prob-value">{{ getDecimal(predictionResult.card.under_probability) }}%</span>
              <span class="prob-label">小黄牌</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">黄牌盘口</span>
              <span class="stat-value">{{ predictionResult.card.total_line }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">主队场均</span>
              <span class="stat-value">{{ predictionResult.card.home_avg_yellow }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">客队场均</span>
              <span class="stat-value">{{ predictionResult.card.away_avg_yellow }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">联赛场均</span>
              <span class="stat-value">{{ predictionResult.card.league_avg_yellow }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">裁判场均</span>
              <span class="stat-value">{{ predictionResult.card.referee_avg_yellow }}</span>
            </div>
            <div class="stat-item" v-if="predictionResult.card.big_score_factor !== undefined">
              <span class="stat-label">小牌加成</span>
              <span class="stat-value" style="color: #60a5fa;">+{{ predictionResult.card.big_score_factor }}%</span>
            </div>
            <div class="stat-item" v-if="predictionResult.card.second_half_boost !== undefined">
              <span class="stat-label">上半场补偿</span>
              <span class="stat-value" style="color: #ef4444;">+{{ predictionResult.card.second_half_boost }}%</span>
            </div>
          </div>

          <!-- AI 增强分析 -->
          <div class="ai-analysis-section" v-if="predictionResult.card.ai_analysis">
            <div class="ai-header">
              <span class="ai-badge">{{ predictionResult.card.ai_analysis.powered_by === 'AI' ? 'AI 增强' : '数据统计' }}</span>
              <span class="ai-title">综合研判</span>
              <span class="ai-refresh-btn" :class="{ loading: reanalyzing }" @click.stop="onReanalyze" title="点击重新分析">
                <van-icon name="replay" />
              </span>
            </div>

            <div class="ai-grid">
              <div class="ai-item">
                <span class="ai-item-icon">🤖</span>
                <span class="ai-item-label">裁判姓名</span>
                <span class="ai-item-value-name">{{ predictionResult.card.ai_analysis.referee.name }}</span>
              </div>

              <div class="ai-item">
                <span class="ai-item-icon">🏆</span>
                <span class="ai-item-label">保级/争冠</span>
                <span class="ai-item-value-stakes">{{ predictionResult.card.ai_analysis.match_context.stakes || '常规' }}</span>
              </div>

              <div class="ai-item">
                <span class="ai-item-icon">⚔️</span>
                <span class="ai-item-label">交锋激烈程度</span>
                <span class="ai-item-value-rivalry" :class="predictionResult.card.ai_analysis.rivalry.level === '激烈' ? 'fierce' : predictionResult.card.ai_analysis.rivalry.level === '平和' ? 'calm' : ''">
                  {{ predictionResult.card.ai_analysis.rivalry.level }}
                </span>
              </div>
            </div>

            <div class="ai-summary">
              <span class="ai-summary-icon">💡</span>
              <span class="ai-summary-text">{{ predictionResult.card.ai_analysis.summary }}</span>
            </div>
          </div>

          <div class="prediction-chart" ref="cardChartRef"></div>

          <div class="recommendation" :class="predictionResult.card.recommendation === '大黄牌' ? 'rec-big' : 'rec-small'">
            <span class="rec-label">推荐</span>
            <span class="rec-value">{{ predictionResult.card.recommendation }}</span>
            <div class="confidence-stars">
              <span v-for="i in 5" :key="i" class="star" :class="{ active: i <= predictionResult.card.confidence }">★</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 设置弹窗 -->
    <van-popup v-model:show="showAISettings" position="bottom" round class="ai-settings-popup">
      <div class="popup-header">
        <span class="popup-title">AI 增强设置</span>
        <van-icon name="cross" class="popup-close" @click="showAISettings = false" />
      </div>
      <div class="ai-settings-body">
        <div class="settings-toggle-row">
          <span class="settings-toggle-label">启用 AI 增强分析</span>
          <van-switch v-model="aiSettings.enabled" size="22" active-color="#8b5cf6" @change="onSaveAISettings" />
        </div>
        <p class="settings-hint">启用后将调用大模型（DeepSeek/OpenAI）分析裁判风格、比赛重要性和历史交锋激烈程度</p>

        <div class="settings-field">
          <span class="settings-field-label">API Key</span>
          <van-field
            v-model="aiSettings.apiKey"
            placeholder="sk-xxx"
            :type="showApiKey ? 'text' : 'password'"
            class="settings-input"
            clearable
            @update:model-value="onSaveAISettings"
          >
            <template #button>
              <van-icon :name="showApiKey ? 'eye-o' : 'closed-eye'" class="field-icon-btn" @click="showApiKey = !showApiKey" />
            </template>
          </van-field>
        </div>

        <div class="settings-field">
          <span class="settings-field-label">Base URL</span>
          <van-field
            v-model="aiSettings.baseUrl"
            placeholder="https://api.deepseek.com/v1"
            class="settings-input"
            clearable
            @update:model-value="onSaveAISettings"
          />
        </div>

        <div class="settings-field">
          <span class="settings-field-label">模型</span>
          <van-field
            v-model="aiSettings.model"
            placeholder="deepseek-chat"
            class="settings-input"
            clearable
            @update:model-value="onSaveAISettings"
          />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue"
import { nextTick, onMounted } from "vue"
import { closeToast, showLoadingToast } from "vant"
import { getMatchList, getPrediction, loadAISettings, saveAISettings, reanalyzeCard } from "@/http/api/football.ts"
import type { IAISettings } from "@/http/api/football.ts"
import { IMatchInfo } from "@/models/match.ts"
import { IPredictionResponse } from "@/models/prediction.ts"
import { getAllMatchGroup } from "@/utils/tools.ts"
import * as echarts from "echarts"

defineOptions({
  name: "Prediction"
})

// --- 模式 ---
const mode = ref<"list" | "fid">("list")
const switchMode = (m: "list" | "fid") => {
  mode.value = m
  error.value = false
  errorMessage.value = ""
}

// --- 比赛列表 ---
const matchList = ref<IMatchInfo[]>([])
const refreshing = ref(false)
const showMatchTypes = ref(false)
const matchGroups = ref<string[]>([])
const selectMatchTypes = ref<string[]>([])

const filteredMatchList = computed(() => {
  if (selectMatchTypes.value.length === 0) return []
  return matchList.value.filter((m) => m.match_category && selectMatchTypes.value.includes(m.match_category))
})

const MAJOR_LEAGUES = new Set([
  "英超", "意甲", "德甲", "西甲", "法甲",
  "澳超", "世界杯", "欧洲杯", "欧冠", "欧罗巴", "亚冠",
])

const loadMatchList = async () => {
  refreshing.value = true
  try {
    const res = await getMatchList("all")
    matchList.value = res
    matchGroups.value = getAllMatchGroup(res) as string[]
    if (selectMatchTypes.value.length === 0) {
      selectMatchTypes.value = matchGroups.value.filter(g => MAJOR_LEAGUES.has(g))
      if (selectMatchTypes.value.length === 0) {
        selectMatchTypes.value = [...matchGroups.value]
      }
    }
  } catch {
    // silent fail
  } finally {
    refreshing.value = false
  }
}

const onChangeMatchType = () => {
  // reactive via computed
}

const onSelectType = (type: number) => {
  if (type === 1) {
    selectMatchTypes.value = matchGroups.value
  } else if (type === 2) {
    selectMatchTypes.value = []
  } else if (type === 3) {
    selectMatchTypes.value = ["英超", "意甲", "德甲", "西甲", "法甲"]
  } else if (type === 4) {
    selectMatchTypes.value = ["英超", "意甲", "德甲", "西甲", "法甲", "澳超", "世界杯", "欧洲杯", "欧冠", "欧罗巴", "亚冠"]
  }
}

// --- FID ---
const fid = ref("")

// --- 状态 ---
const loading = ref(false)
const error = ref(false)
const errorMessage = ref("")
const predictionResult = ref<IPredictionResponse | null>(null)
const lastSelectedFid = ref("")

// --- AI 设置 ---
const showAISettings = ref(false)
const showApiKey = ref(false)
const aiSettings = ref<IAISettings>(loadAISettings())
const onSaveAISettings = () => {
  saveAISettings(aiSettings.value)
}

const reanalyzing = ref(false)
const onReanalyze = async () => {
  if (!predictionResult.value || reanalyzing.value) return
  reanalyzing.value = true
  try {
    const matched = matchList.value.find(m => m.fid === predictionResult.value!.fid)
    const match: IMatchInfo = {
      fid: predictionResult.value.fid,
      home_team: predictionResult.value.home_team,
      visit_team: predictionResult.value.visit_team,
      match_group: predictionResult.value.match_group,
      match_round: matched?.match_round ?? predictionResult.value.match_time,
      home_team_rank: matched?.home_team_rank,
      visit_team_rank: matched?.visit_team_rank,
    }
    const analysis = await reanalyzeCard(match, predictionResult.value.card)
    if (analysis) {
      predictionResult.value = { ...predictionResult.value, card: { ...predictionResult.value.card, ai_analysis: analysis } }
    }
  } finally {
    reanalyzing.value = false
  }
}

// --- 图表 ---
const sizeChartRef = ref<HTMLDivElement | null>(null)
const cardChartRef = ref<HTMLDivElement | null>(null)
let sizeChart: echarts.EChartsType | null = null
let cardChart: echarts.EChartsType | null = null

const getDecimal = (num: number) => {
  if (num === 0) return "0"
  if (num >= 100) return "100"
  return num.toFixed(1)
}

const renderSizeChart = () => {
  if (!sizeChartRef.value || !predictionResult.value) return
  sizeChart?.dispose()
  sizeChart = echarts.init(sizeChartRef.value)

  const data = predictionResult.value.size
  sizeChart.setOption({
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: ["55%", "75%"],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: "rgba(15,15,20,0.8)",
        borderWidth: 3
      },
      label: {
        show: true,
        formatter: "{b}: {d}%",
        color: "#94a3b8",
        fontSize: 12
      },
      data: [
        { value: data.poisson_big, name: "泊松大球", itemStyle: { color: "#ef4444" } },
        { value: data.poisson_small, name: "泊松小球", itemStyle: { color: "#3b82f6" } }
      ]
    }]
  })
}

const renderCardChart = () => {
  if (!cardChartRef.value || !predictionResult.value) return
  cardChart?.dispose()
  cardChart = echarts.init(cardChartRef.value)

  const data = predictionResult.value.card
  cardChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: "8%", right: "8%", top: "15%", bottom: "12%" },
    xAxis: {
      type: "category",
      data: ["主队场均", "客队场均", "联赛场均", "裁判场均"],
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } }
    },
    series: [{
      type: "bar",
      data: [
        { value: data.home_avg_yellow, itemStyle: { color: "#8b5cf6" } },
        { value: data.away_avg_yellow, itemStyle: { color: "#6366f1" } },
        { value: data.league_avg_yellow, itemStyle: { color: "#f59e0b" } },
        { value: data.referee_avg_yellow, itemStyle: { color: "#06b6d4" } }
      ],
      barWidth: "40%",
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      label: {
        show: true,
        position: "top",
        color: "#94a3b8",
        fontSize: 11,
        formatter: (params: any) => params.value
      }
    }]
  })
}

// --- 预测 ---
const doPredict = async (fidValue: string, matchInfo?: IMatchInfo) => {
  if (!fidValue.trim()) {
    errorMessage.value = "请输入比赛FID"
    error.value = true
    return
  }

  loading.value = true
  error.value = false
  errorMessage.value = ""

  showLoadingToast({
    message: "正在获取预测数据...",
    duration: 0,
    forbidClick: true
  })

  try {
    const result = await getPrediction(fidValue.trim(), aiSettings.value.enabled ? aiSettings.value : undefined, matchInfo)
    predictionResult.value = result
    closeToast()

    await nextTick()
    renderSizeChart()
    renderCardChart()
  } catch (err: any) {
    closeToast()
    error.value = true
    errorMessage.value = typeof err === "string" ? err : "预测请求失败，请检查FID是否正确"
  } finally {
    loading.value = false
  }
}

const onPredict = () => doPredict(fid.value)

const onSelectMatch = (fidValue: string | undefined) => {
  if (!fidValue) return
  lastSelectedFid.value = fidValue
  const matched = matchList.value.find(m => m.fid === fidValue)
  doPredict(fidValue, matched)
}

const onRetry = () => {
  if (mode.value === "list" && lastSelectedFid.value) {
    const matched = matchList.value.find(m => m.fid === lastSelectedFid.value)
    doPredict(lastSelectedFid.value, matched)
  } else {
    doPredict(fid.value)
  }
}

const goBack = () => {
  predictionResult.value = null
  error.value = false
  errorMessage.value = ""
  fid.value = ""
  sizeChart?.dispose()
  cardChart?.dispose()
}

// --- 初始化 ---
onMounted(() => {
  loadMatchList()
})
</script>

<style lang="less" scoped>
.prediction-page {
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
  background: linear-gradient(180deg, #0f0f14 0%, #12121a 50%, #0f0f14 100%);
  z-index: -1;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    left: -20%;
    width: 130%;
    height: 130%;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 45%);
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -20%;
    right: -15%;
    width: 100%;
    height: 100%;
    background: radial-gradient(ellipse at 50% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%);
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
    font-weight: 600;
    font-size: 18px;
    letter-spacing: 0.25px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :deep(.van-nav-bar__content) {
    padding: 0 16px;
  }
}

@keyframes shimmerLine {
  0%, 100% { transform: translateX(0); opacity: 0.5; }
  50% { transform: translateX(20%); opacity: 1; }
}

.content-wrapper {
  padding-top: 56px;
  width: 100%;
  max-width: 90%;
  margin: 0 auto;
  padding-left: 5%;
  padding-right: 5%;
  box-sizing: border-box;
  min-height: 90vh;

  &.has-result {
    padding-bottom: 40px;
  }
}

/* ============ 模式切换 ============ */
.mode-switcher {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}

.mode-tabs {
  display: inline-flex;
  background: rgba(30, 30, 42, 0.7);
  border-radius: 12px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mode-tab {
  padding: 8px 24px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;

  &.active {
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
    color: #fff;
    box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
  }
}

/* ============ 比赛列表 ============ */
.list-container {
  animation: fadeInUp 0.5s ease-out;
}

.sticky-filter {
  z-index: 100;
  margin-top: 4px;
}

.filter-btn {
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
  margin-bottom: 12px;

  &:active {
    background: rgba(30, 30, 42, 0.95);
    transform: scale(0.99);
    border-color: rgba(139, 92, 246, 0.25);
  }
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-icon {
  font-size: 16px;
}

.filter-text {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-count {
  color: #a78bfa;
  font-size: 12px;
  font-weight: 600;
  background: rgba(139, 92, 246, 0.15);
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.arrow-icon {
  color: #a78bfa;
  font-size: 14px;
}

.match-list-wrapper {
  min-height: 60vh;
}

.match-list {
  padding-bottom: 20px;
}

.match-card {
  background: rgba(22, 22, 32, 0.75);
  border-radius: 16px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  backdrop-filter: blur(24px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  animation: fadeInUp 0.5s ease-out backwards;

  &:active {
    transform: scale(0.98);
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(30, 30, 42, 0.85);
  }
}

.match-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.match-card-league {
  font-size: 11px;
  font-weight: 600;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.12);
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.match-card-time {
  font-size: 11px;
  color: #64748b;
}

.match-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.match-card-team {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &.home {
    align-items: flex-start;
  }

  &.away {
    align-items: flex-end;
  }

  .team-name {
    color: #f8fafc;
    font-size: 14px;
    font-weight: 600;
  }

  .team-rank {
    color: #64748b;
    font-size: 11px;
  }
}

.match-card-vs {
  padding: 0 8px;
}

.vs-score {
  color: #8b5cf6;
  font-size: 16px;
  font-weight: 700;
}

.match-card-footer {
  display: flex;
  justify-content: flex-end;
}

.predict-hint {
  font-size: 11px;
  color: #8b5cf6;
  opacity: 0.7;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  color: #94a3b8;
  font-size: 14px;
}

/* ============ 联赛筛选弹窗 ============ */
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
  background: rgba(30, 30, 42, 0.9) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: #94a3b8 !important;

  &.accent {
    border-color: rgba(139, 92, 246, 0.3) !important;
    color: #a78bfa !important;
    background: rgba(139, 92, 246, 0.1) !important;
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
    background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
    border-color: #8b5cf6 !important;
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

/* ============ FID 输入 ============ */
.input-section {
  position: relative;
  padding: 40px 16px;
  min-height: 50vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

.input-content {
  position: relative;
  z-index: 1;
  text-align: center;
  width: 100%;
  max-width: 360px;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.input-icon-wrapper {
  margin-bottom: 24px;
}

.input-icon {
  font-size: 56px;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.input-title {
  color: #f8fafc;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.input-desc {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.fid-input-wrapper {
  margin-bottom: 16px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(30, 30, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);

  :deep(.van-field__control) {
    color: #f8fafc;
    font-size: 15px;
    &::placeholder {
      color: #64748b;
    }
  }
}

.predict-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
  border: none !important;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  height: 48px;
  box-shadow: 0 4px 24px rgba(139, 92, 246, 0.4);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
  }

  .arrow {
    transition: transform 0.3s ease;
  }

  &:hover .arrow {
    transform: translateX(4px);
  }
}

/* ============ 加载/错误 ============ */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 20px;
}

.loading-text {
  color: #94a3b8;
  font-size: 15px;
  margin-top: 8px;
}

.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  text-align: center;
  padding: 0 20px;
}

.error-icon-wrapper {
  margin-bottom: 8px;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  color: #ef4444;
  font-size: 15px;
  margin-bottom: 8px;
}

.retry-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
  border: none !important;
  color: #fff !important;
  padding: 0 24px;
}

.back-btn {
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: #94a3b8 !important;
}

/* ============ 预测结果 ============ */
.result-section {
  animation: fadeInUp 0.6s ease-out;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 10px;
}

.result-header {
  display: flex;
  justify-content: flex-start;
  padding: 4px 0;
}

.result-back-btn {
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: #94a3b8 !important;
  font-size: 12px;
  padding: 0 14px;
}

.match-info-card {
  background: linear-gradient(135deg, rgba(30, 30, 42, 0.9) 0%, rgba(22, 22, 30, 0.85) 100%);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 24px 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.06) 0%, transparent 50%);
    pointer-events: none;
  }
}

.match-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  color: #a78bfa;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
}

.match-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.team {
  flex: 1;
}

.team-name {
  color: #f8fafc;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.3px;
}

.vs-wrapper {
  padding: 8px 16px;
}

.vs-text {
  color: #8b5cf6;
  font-size: 20px;
  font-weight: 800;
  text-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
}

.match-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: #64748b;
  font-size: 13px;
}

/* ============ 预测卡片 ============ */
.prediction-card {
  background: rgba(30, 30, 42, 0.85);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  overflow: hidden;
  position: relative;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.card-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.12);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.card-title-group {
  flex: 1;
}

.card-title {
  color: #f8fafc;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.card-subtitle {
  color: #64748b;
  font-size: 12px;
  letter-spacing: 0.3px;
}

/* 概率条 */
.probability-bar {
  display: flex;
  align-items: center;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
  background: rgba(15, 15, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.prob-item {
  display: flex;
  align-items: center;
  padding: 0 14px;
  transition: flex 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  gap: 6px;

  &.big {
    justify-content: flex-start;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.1) 100%);
  }

  &.small {
    justify-content: flex-end;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.25) 100%);
  }
}

.prob-divider {
  width: 2px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.prob-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.prob-value {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;

  .big & { color: #ef4444; }
  .small & { color: #60a5fa; }
}

/* 数据网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(15, 15, 20, 0.5);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.stat-value {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 图表 */
.prediction-chart {
  height: 200px;
  margin-bottom: 20px;
}

/* 推荐 */
.recommendation {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid;

  &.rec-big {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  &.rec-small {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

.rec-label {
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
}

.rec-value {
  font-size: 16px;
  font-weight: 700;
  flex: 1;

  .rec-big & { color: #ef4444; }
  .rec-small & { color: #60a5fa; }
}

.confidence-stars {
  display: flex;
  gap: 2px;
}

.star {
  color: rgba(255, 255, 255, 0.1);
  font-size: 18px;
  letter-spacing: 2px;

  &.active {
    color: #f59e0b;
    text-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
  }
}

/* ============ AI 增强分析 ============ */
.ai-analysis-section {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.ai-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #fff;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.ai-title {
  font-size: 14px;
  font-weight: 600;
  color: #c4b5fd;
  letter-spacing: 0.3px;
}

.ai-refresh-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;

  &:active { background: rgba(139, 92, 246, 0.25); transform: scale(0.9); }

  &.loading {
    animation: spin 0.8s linear infinite;
    pointer-events: none;
    opacity: 0.6;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.ai-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(15, 15, 20, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.ai-item-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.ai-item-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  min-width: 72px;
  flex-shrink: 0;
}

.ai-item-value-name {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
  margin-left: auto;
}

.ai-item-value-stakes {
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  margin-left: auto;
  text-align: right;
}

.ai-item-value-rivalry {
  font-size: 13px;
  font-weight: 700;
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(100, 116, 139, 0.15);
  color: #94a3b8;

  &.fierce {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  &.calm {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }
}

.ai-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.ai-summary-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.ai-summary-text {
  font-size: 13px;
  line-height: 1.6;
  color: #c4b5fd;
}

/* ============ AI 开关按钮 ============ */
.ai-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;

  &.active {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%);
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
  }

  &:active { transform: scale(0.96); }
}

.ai-toggle-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64748b;
  transition: all 0.25s ease;

  .ai-toggle-btn.active & {
    background: #8b5cf6;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.6);
  }
}

.ai-toggle-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.5px;

  .ai-toggle-btn.active & {
    color: #a78bfa;
  }
}

/* ============ AI 设置弹窗 ============ */
.ai-settings-popup {
  :deep(.van-popup) {
    background: rgba(18, 18, 26, 0.98) !important;
    backdrop-filter: blur(32px);
    border-radius: 20px 20px 0 0 !important;
  }
}

.ai-settings-body {
  padding: 0 20px 40px;
}

.settings-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 12px;
}

.settings-toggle-label {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 600;
}

.settings-hint {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 20px;
  padding: 10px 12px;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.settings-field {
  margin-bottom: 16px;
}

.settings-field-label {
  display: block;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.settings-input {
  background: rgba(30, 30, 42, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  overflow: hidden;

  :deep(.van-field__control) {
    color: #f8fafc !important;
    font-size: 14px !important;
    &::placeholder { color: #475569 !important; }
  }
}

.field-icon-btn {
  color: #64748b;
  font-size: 18px;
  padding: 4px;
}
</style>
