<template>
  <div class="app-container">
    <van-nav-bar title="详细分析" fixed left-arrow clickable @click-left="router.back()" class="w-full nav-bar" />
    <van-pull-refresh class="w-full min-h-screen" v-model="isLoading" @refresh="onGetMatchInfo">
      <div class="content-container">
        <span class="match-group">{{ matchStore.match.match_group }}</span>
        <span class="match-time">{{ matchStore.match.match_time }}</span>
        <div class="top-view">
          <div class="team-item">
            <span>{{ matchStore.match.home_team }}</span>
            <span class="rank" v-if="matchStore.match.home_team_rank">排名{{
                matchStore.match.home_team_rank
              }}，积分{{ matchStore.match.home_score }}</span>
          </div>
          <div class="score">{{ matchStore.match.field_score ?? "vs" }}</div>
          <div class="team-item">
            <span>{{ matchStore.match.visit_team }}</span>
            <span class="rank" v-if="matchStore.match.visit_team_rank">排名{{
                matchStore.match.visit_team_rank
              }}，积分{{ matchStore.match.visit_score }}</span>
          </div>
        </div>
        <div class="w-full flex justify-end items-center px-2"><a :href="`https://odds.500.com/fenxi/shuju-${matchStore.match.fid}.shtml`">查看原始数据</a><van-icon name="arrow-double-right" class="ms-1" color="#1890ff"/></div>
        <!--        <van-notice-bar wrapable :scrollable="false" text="请注意，本项目打法仅适用于滚球的亚盘和大小球，不适用于竞彩，（欧赔仅娱乐，准确率不高）建议在开场后一分钟查看分析最准确。" />-->
        <van-notice-bar v-if="matchStore.match.remark" color="#fff" background="#f00" class="w-full" :text="matchStore.match.remark" :scrollable="false" wrapable />
        <div class="panel" v-if="showEuropeAll">
          <div class="title">
            欧赔全网匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              胜：{{ matchStore.match.europe_win_all }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              平：{{ matchStore.match.europe_even_all }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              负：{{ matchStore.match.europe_lose_all }}场
            </div>
          </div>
          <div id="chart_europe_all" class="chart"></div>
        </div>
        <div class="panel" v-else>欧赔暂无匹配场次</div>
        <div class="panel" v-if="showEuropeLeague">
          <div class="title">
            欧赔本联赛匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              胜：{{ matchStore.match.europe_win_league }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              平：{{ matchStore.match.europe_even_league }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              负：{{ matchStore.match.europe_lose_league }}场
            </div>
          </div>
          <div id="chart_europe_league" class="chart"></div>
        </div>
        <div class="panel" v-if="showEuropeAll&&europe_score_list.length">比分概率前三:
          <div v-for="score in europe_score_list" :key="score" v-html="score"></div>
        </div>
        <div class="flex flex-row w-full justify-end mt-2" style="padding: 0 20px">
          <van-button type="primary" size="small" @click="currentOddsType=1;showOdds=true;">查看欧赔赔率</van-button>
          <van-button v-if="showEuropeAll" style="margin-left: 10px" type="primary" size="small" @click="currentOddsType=1;showMatching=true;">
            查看欧赔匹配详情
          </van-button>
        </div>
        <van-notice-bar v-if="matchStore.match.origin_pan_most!==undefined&&matchStore.match.instant_pan_most!==undefined" color="#67d5fe" background="rgba(103, 213, 254, 0.1)" class="w-full mt-4" :scrollable="false">
          亚盘初盘：{{ matchStore.match.origin_pan_most }}，亚盘即时盘：{{ matchStore.match.instant_pan_most }}
        </van-notice-bar>
        <div class="panel" v-if="showAsiaAll">
          <div class="title">
            亚盘全网匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              赢：{{ matchStore.match.asia_win_all }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              走：{{ matchStore.match.asia_run_all }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              输：{{ matchStore.match.asia_lose_all }}场
            </div>
          </div>
          <div id="chart_asia_all" class="chart"></div>
        </div>
        <div class="panel" v-else>亚盘暂无匹配场次</div>
        <div class="panel" v-if="showAsiaLeague">
          <div class="title">
            亚盘本联赛匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              赢：{{ matchStore.match.asia_win_league }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              走：{{ matchStore.match.asia_run_league }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              输：{{ matchStore.match.asia_lose_league }}场
            </div>
          </div>
          <div id="chart_asia_league" class="chart"></div>
        </div>
        <div class="panel" v-if="showAsiaAll&&asia_score_list.length">比分概率前三:
          <div v-for="score in asia_score_list" :key="score" v-html="score"></div>
        </div>
        <div class="flex flex-row w-full justify-end mt-2" style="padding: 0 20px">
          <van-button type="primary" size="small" @click="currentOddsType=2;showOdds=true;">查看亚盘赔率</van-button>
          <van-button style="margin-left: 10px" type="primary" size="small" @click="currentTrendType=2;showTrend=true">
            查看亚盘匹配趋势
          </van-button>
          <van-button v-if="showAsiaAll" style="margin-left: 10px" type="primary" size="small" @click="currentOddsType=2;showMatching=true;">
            查看亚盘匹配详情
          </van-button>
        </div>
        <div v-if="showTeamStatus" id="chart_team_status" class="chart" style="height: 250px"></div>
        <div class="infer-table-wrapper" v-if="matchStore.match.infer_data?.length">
          <table class="infer-table">
            <thead>
              <tr>
                <th>主队</th>
                <th>客队</th>
                <th>让初推导</th>
                <th>让终推导</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in matchStore.match.infer_data" :key="index">
                <td class="home-cell">
                  <div class="cell-content">
                    <span class="match-group">{{ row.home_match_group }}</span>
                    <span class="team-name home-name">{{ row.home }}</span>
                    <span class="vs-text">vs {{ row.infer }}</span>
                    <span class="score-info">比分：{{ row.home_field_score }}</span>
                    <span class="concede-info">让初：{{ row.home_concede_origin }}</span>
                    <span class="concede-info">让终：{{ row.home_concede_terminus }}</span>
                  </div>
                </td>
                <td class="visit-cell">
                  <div class="cell-content">
                    <span class="match-group">{{ row.visit_match_group }}</span>
                    <span class="team-name visit-name">{{ row.visit }}</span>
                    <span class="vs-text">{{ row.infer }} vs</span>
                    <span class="score-info">比分：{{ row.visit_field_score }}</span>
                    <span class="concede-info">让初：{{ row.visit_concede_origin }}</span>
                    <span class="concede-info">让终：{{ row.visit_concede_terminus }}</span>
                  </div>
                </td>
                <td>{{ row.origin_infer }}</td>
                <td>{{ row.instant_infer }}</td>
                <td class="result-cell">{{ row.home_concede_result }}{{ row.visit_concede_result }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <table v-if="matchStore.match.infer_data?.length" class="table2">
          <thead>
            <tr><th>让球推导</th><th>主队</th><th>客队</th>
          </tr>
          </thead>
          <tbody>
            <tr><td>让初平均</td><td>{{ matchStore.match.home_concede_origin_average }}</td><td>{{ matchStore.match.visit_concede_origin_average }}</td></tr>
            <tr><td>让终平均</td><td>{{ matchStore.match.home_concede_terminus_average }}</td><td>{{ matchStore.match.visit_concede_terminus_average }}</td></tr>
            <tr><td>进球平均</td><td>{{ matchStore.match.home_goal_average }}</td><td>{{ matchStore.match.visit_goal_average }}</td></tr>
            <tr><td>失球平均</td><td>{{ matchStore.match.home_loss_average }}</td><td>{{ matchStore.match.visit_loss_average }}</td></tr>
            <tr><td>净胜球平均</td><td>{{ matchStore.match.home_gd_average }}</td><td>{{ matchStore.match.visit_gd_average }}</td></tr>
            <tr><td>赢盘率</td><td>{{ matchStore.match.home_pan_percent }}%</td><td>{{ matchStore.match.visit_pan_percent }}%</td></tr>
          </tbody>
        </table>
        <div class="analysis-text" v-if="matchStore.match.infer_data?.length">
          <p class="text-red-500">
          让初推导平均值：{{ matchStore.match.origin_infer_average }} {{ Math.abs(matchStore.match!.origin_infer_average!) < Math.abs(matchStore.match!.origin_pan_most!) ? '<' : '>' }} 本场初始让球：{{ matchStore.match!.origin_pan_most! }}，
            {{ Math.abs(matchStore.match!.origin_infer_average!) - Math.abs(matchStore.match!.origin_pan_most!) < -0.5 ? '让初偏深。' : '' }}
            {{ Math.abs(matchStore.match!.origin_infer_average!) - Math.abs(matchStore.match!.origin_pan_most!) > 0.5 ? '让初偏浅。' : '' }}
          </p>
          <p class="text-red-500">
          让终推导平均值：{{ matchStore.match.instant_infer_average }} {{ Math.abs(matchStore.match!.instant_infer_average!) < Math.abs(matchStore.match!.instant_pan_most!) ? '<' : '>' }} 本场最终让球：{{ matchStore.match!.instant_pan_most! }}。
            {{ Math.abs(matchStore.match!.instant_infer_average!) - Math.abs(matchStore.match!.instant_pan_most!) < -0.5 ? '让终偏深。' : '' }}
            {{ Math.abs(matchStore.match!.instant_infer_average!) - Math.abs(matchStore.match!.instant_pan_most!) > 0.5 ? '让终偏浅。' : '' }}
          </p>
          <p class="text-red-500">
            比分均值计算：{{ matchStore.match.infer_score }}
          </p>
        </div>
        <van-notice-bar v-if="matchStore.match.origin_size_most&&matchStore.match.instant_size_most" color="#67d5fe" background="rgba(103, 213, 254, 0.1)" class="w-full mt-4" :scrollable="false">
          大小球初盘：{{ matchStore.match.origin_size_most }}，大小球即时盘：{{ matchStore.match.instant_size_most }}
        </van-notice-bar>
        <span class="size-title" v-if="matchStore.match.poisson_small&&matchStore.match.poisson_big">泊松分布全联赛分主客场计算大小球</span>
        <table v-if="matchStore.match.poisson_small&&matchStore.match.poisson_big" class="table-1">
          <thead>
          <tr>
            <th>泊松{{ matchStore.match.instant_size_most ?? 2.5 }}小球概率</th>
            <th>泊松{{ matchStore.match.instant_size_most ?? 2.5 }}大球概率</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ matchStore.match.poisson_small }}%</td>
            <td>{{ matchStore.match.poisson_big }}%</td>
          </tr>
          </tbody>
        </table>
        <span class="size-title" v-if="matchStore.match.poisson_small_limit&&matchStore.match.poisson_big_limit">泊松分布全联赛不分主客场取近5场计算大小球</span>
        <table v-if="matchStore.match.poisson_small_limit&&matchStore.match.poisson_big_limit" class="table-1">
          <thead>
          <tr>
            <th>泊松{{ matchStore.match.instant_size_most ?? 2.5 }}小球概率</th>
            <th>泊松{{ matchStore.match.instant_size_most ?? 2.5 }}大球概率</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ matchStore.match.poisson_small_limit }}%</td>
            <td>{{ matchStore.match.poisson_big_limit }}%</td>
          </tr>
          </tbody>
        </table>
        <div class="panel" v-if="showSizeAll">
          <div class="title">
            大小球全网匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              大：{{ matchStore.match.size_big_all }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              走：{{ matchStore.match.size_run_all }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              小：{{ matchStore.match.size_small_all }}场
            </div>
          </div>
          <div id="chart_size_all" class="chart"></div>
        </div>
        <div class="panel" v-else>大小球暂无匹配场次</div>
        <div class="panel" v-if="showSizeLeague">
          <div class="title">
            大小球本联赛匹配结果：
          </div>
          <div class="flex flex-row items-center w-full">
            <div class="flex-horizontal-1 win_count">
              大：{{ matchStore.match.size_big_league }}场
            </div>
            <div class="flex-horizontal-1 even_count">
              走：{{ matchStore.match.size_run_league }}场
            </div>
            <div class="flex-horizontal-1 lose_count">
              小：{{ matchStore.match.size_small_league }}场
            </div>
          </div>
          <div id="chart_size_league" class="chart"></div>
        </div>
        <div class="panel" v-if="showSizeAll&&size_score_list.length">比分概率前三:
          <div v-for="score in size_score_list" :key="score" v-html="score"></div>
        </div>
        <div class="panel" v-if="showSizeAll&&goal_number_list.length">进球数概率前三:
          <div v-for="score in goal_number_list" :key="score" v-html="score"></div>
        </div>
        <div class="panel" v-if="showSizeAll&&half_goal_number_list.length">上半场进球数概率前三:
          <div v-for="score in half_goal_number_list" :key="score" v-html="score"></div>
        </div>
        <div class="flex flex-row w-full justify-end mt-2 mb-4" style="padding: 0 20px">
          <van-button type="primary" size="small" @click="currentOddsType=3;showOdds=true;">查看大小球赔率</van-button>
          <van-button v-if="showSizeAll" style="margin-left: 10px" type="primary" size="small" @click="currentOddsType=3;showMatching=true;">
            查看大小球匹配详情
          </van-button>
        </div>
        <div v-if="showTotalGoal" id="chart_total_goal" class="chart" style="height: 300px"></div>
        <div class="flex w-full m-4 px-2">
          <van-button type="primary" class="grow" @click="onScreenShot">保存比赛截图</van-button>
        </div>
      </div>
    </van-pull-refresh>
    <van-popup v-model:show="showOdds" position="bottom" round close-on-popstate>
      <div class="w-full overflow-y-auto flex flex-col">
        <odds-list :match="matchStore.match" :type="currentOddsType" />
      </div>
    </van-popup>
    <van-popup v-model:show="showMatching" position="bottom" round close-on-popstate>
      <div class="w-full overflow-y-auto flex flex-col">
        <matching-list :match="matchStore.match" :type="currentOddsType" />
      </div>
    </van-popup>
    <van-popup v-model:show="showTrend" position="bottom" round close-on-popstate @opened="onLookTrend">
      <div class="w-full overflow-y-auto flex flex-col">
        <trend-list ref="xTrendList" :type="currentTrendType" />
      </div>
    </van-popup>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as echarts from "echarts"
import _ from "lodash"
import { useLocalStorage } from "@vueuse/core"
import { domToJpeg } from "modern-screenshot"
import OddsList from "@/pages/detail/src/OddsList.vue"
import MatchingList from "@/pages/detail/src/MatchingList.vue"
import TrendList from "@/pages/detail/src/TrendList.vue"
import { analysisMatch, getGithubToken, getMatchInfo } from "@/http/api/football.ts"
import { IMatchInfo } from "@/models/match.ts"
import { closeToast, showLoadingToast, showToast } from "vant"
import { defineChartOption, defineTeamStatusChartOption, defineTotalGoalChartOption, getDecimalPoint } from "@/utils/tools.ts"
import { useMatchStore } from "@/store/currentMatch.ts"

defineOptions({
  name: "MatchDetail"
})
const route = useRoute()
const router = useRouter()
const matchStore = useMatchStore()
const showEuropeAll = ref(true)
const showEuropeLeague = ref(true)
const showAsiaAll = ref(true)
const showAsiaLeague = ref(true)
const showTeamStatus = ref(true)
const showTotalGoal = ref(true)
const showSizeAll = ref(true)
const showSizeLeague = ref(true)
const showOdds = ref(false)
const showMatching = ref(false)
const showTrend = ref(false)
const isLoading = ref(false)
const currentOddsType = ref(1)
const currentTrendType = ref(2)
const xTrendList = ref<any>(undefined)
let chart_europe_all: echarts.EChartsType = {} as echarts.EChartsType
let chart_europe_league: echarts.EChartsType = {} as echarts.EChartsType
let chart_asia_all: echarts.EChartsType = {} as echarts.EChartsType
let chart_asia_league: echarts.EChartsType = {} as echarts.EChartsType
let chart_size_all: echarts.EChartsType = {} as echarts.EChartsType
let chart_size_league: echarts.EChartsType = {} as echarts.EChartsType
let chart_team_status: echarts.EChartsType = {} as echarts.EChartsType
let chart_total_goal: echarts.EChartsType = {} as echarts.EChartsType
const europe_score_list = ref<string[]>([])
const asia_score_list = ref<string[]>([])
const size_score_list = ref<string[]>([])
const goal_number_list = ref<string[]>([])
const half_goal_number_list = ref<string[]>([])
const clearAllData = () => {
  showEuropeAll.value = true
  showEuropeLeague.value = true
  showAsiaAll.value = true
  showAsiaLeague.value = true
  showSizeAll.value = true
  showSizeLeague.value = true
  europe_score_list.value = []
  asia_score_list.value = []
  size_score_list.value = []
  goal_number_list.value = []
  half_goal_number_list.value = []
  chart_europe_all?.clear()
  chart_europe_league?.clear()
  chart_asia_all?.clear()
  chart_asia_league?.clear()
  chart_size_all?.clear()
  chart_size_league?.clear()
  chart_team_status?.clear()
  chart_total_goal?.clear()
  matchStore.match = {}
}
let fid = route.query.fid
const onGetMatchInfo = async () => {
  if (route.query.code) {
    const data = await getGithubToken(route.query.code as string)
    if (data.access_token) {
      localStorage.setItem("token", data.access_token as string)
    }
    const urlParams = new URLSearchParams(window.location.search)
    const state = urlParams.get('state')
    if (state) {
      const params = new URLSearchParams(state)
      fid = params.get('fid')
    }
  }
  if (fid) {
    showLoadingToast({
      message: "加载基础数据...",
      duration: 0,
      forbidClick: true
    })
    clearAllData()
    getMatchInfo(fid as string).then((res: IMatchInfo) => {
      matchStore.match = res
      addHistoryMatch(res)
      if (res.is_redis) {
        closeToast()
        isLoading.value = false
        operateMatchData()
      } else {
        onAnalysisMatch()
      }
    }).catch(err => {
      if (err.code === 403) {
        localStorage.removeItem("code")
        localStorage.removeItem("token")
        window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv23li5sI6CczpWVGpaT&redirect_uri=${ window.location.origin }`
      } else if (err.code === 1001) {
        window.location.href = "https://github.com/czl0325/football_frontend"
      }
    })
  }
}
const onAnalysisMatch = () => {
  showLoadingToast({
    message: "比赛分析中...",
    duration: 0,
    forbidClick: true
  })
  analysisMatch(matchStore.match).then((res2: IMatchInfo) => {
    matchStore.match = res2
    operateMatchData()
    closeToast()
  }).catch(() => {
    closeToast()
    chart_europe_all?.clear()
    chart_europe_league?.clear()
    chart_asia_all?.clear()
    chart_asia_league?.clear()
    chart_size_all?.clear()
    chart_size_league?.clear()
    chart_team_status?.clear()
    europe_score_list.value = []
    asia_score_list.value = []
    size_score_list.value = []
    showToast({
      message: "请求失败，请稍后重试",
      position: "bottom"
    })
  }).catch(err => {
    if (err.code === 403) {
//      window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv23li5sI6CczpWVGpaT&redirect_uri=${ window.location.origin }${ window.location.pathname }&state=fid%3D${ fid }`
      localStorage.removeItem("code")
      localStorage.removeItem("token")
      window.location.href = `https://github.com/login/oauth/authorize?client_id=Iv23li5sI6CczpWVGpaT&redirect_uri=${ window.location.origin }`
    }
  }).finally(() => {
    isLoading.value = false
  })
}
const operateMatchData = () => {
  let home_score = 0
  let visit_score = 0
  matchStore.match.infer_data?.forEach(item => {
    const [homeHome, homeAway] = (item.home_field_score || '0:0').split(':').map(Number)
    const [visitHome, visitAway] = (item.visit_field_score || '0:0').split(':').map(Number)
    home_score += (homeHome || 0) + (visitHome || 0)
    visit_score += (homeAway || 0) + (visitAway || 0)
  })
  if (visit_score > 0) {
    const fixedRatio = Math.round(home_score / visit_score * 100) / 100;
    matchStore.match.infer_score = (fixedRatio === Math.floor(fixedRatio) ? Math.floor(fixedRatio) : fixedRatio) + ":1"
  } else {
    matchStore.match.infer_score = `${home_score}:${visit_score}`
  }
  showEuropeAll.value = (matchStore.match?.europe_win_all ?? 0) + (matchStore.match?.europe_even_all ?? 0) + (matchStore.match?.europe_lose_all ?? 0) > 0
  if (showEuropeAll.value) {
    const option1 = _.cloneDeep(defineChartOption(1, "欧赔全网"))
    const total1 = (matchStore.match.europe_win_all ?? 0) + (matchStore.match.europe_even_all ?? 0) + (matchStore.match.europe_lose_all ?? 0)
    if (total1 > 0) {
      // @ts-ignore
      option1.series[0].data = [(matchStore.match.europe_win_all ?? 0) / total1]
      // @ts-ignore
      option1.series[1].data = [(matchStore.match.europe_even_all ?? 0) / total1]
      // @ts-ignore
      option1.series[2].data = [(matchStore.match.europe_lose_all ?? 0) / total1]
      option1.legend = {
        top: '10%',
        formatter: (name: string) => {
          if (name === "胜") {
            return `胜：${ getDecimalPoint((matchStore.match.europe_win_all ?? 0) / total1 * 100) }%`
          } else if (name === "平") {
            return `平：${ getDecimalPoint((matchStore.match.europe_even_all ?? 0) / total1 * 100) }%`
          } else {
            return `负：${ getDecimalPoint((matchStore.match.europe_lose_all ?? 0) / total1 * 100) }%`
          }
        }
      }
      chart_europe_all.setOption(option1)
    }
    showEuropeLeague.value = (matchStore.match?.europe_win_league ?? 0) + (matchStore.match?.europe_even_league ?? 0) + (matchStore.match?.europe_lose_league ?? 0) > 0
    if (showEuropeLeague.value) {
      const option11: echarts.EChartsOption = _.cloneDeep(defineChartOption(1, "欧赔本联赛"))
      const total11 = (matchStore.match.europe_win_league ?? 0) + (matchStore.match.europe_even_league ?? 0) + (matchStore.match.europe_lose_league ?? 0)
      if (total11 > 0) {
        // @ts-ignore
        option11.series[0].data = [(matchStore.match.europe_win_league ?? 0) / total11]
        // @ts-ignore
        option11.series[1].data = [(matchStore.match.europe_even_league ?? 0) / total11]
        // @ts-ignore
        option11.series[2].data = [(matchStore.match.europe_lose_league ?? 0) / total11]
        option11.legend = {
          top: '10%',
          formatter: (name: string) => {
            if (name === "胜") {
              return `胜：${ getDecimalPoint((matchStore.match.europe_win_league ?? 0) / total11 * 100) }%`
            } else if (name === "平") {
              return `平：${ getDecimalPoint((matchStore.match.europe_even_league ?? 0) / total11 * 100) }%`
            } else {
              return `负：${ getDecimalPoint((matchStore.match.europe_lose_league ?? 0) / total11 * 100) }%`
            }
          }
        }
        chart_europe_league.setOption(option11)
      }
    }
    if ((matchStore.match.europe_score_list?.length || 0) > 0) {
      europe_score_list.value = []
      matchStore.match.europe_score_list?.some((item: any[]) => {
        europe_score_list.value.push(`<span style="color: #895b8a">${ item[0] }</span>：${ item[1] }场(${ (item[1] / total1 * 100).toFixed(2) }%)`)
        if (europe_score_list.value?.length >= 3) {
          return true
        }
      })
    }
  } else {
    showEuropeLeague.value = false
  }
  showAsiaAll.value = (matchStore.match.asia_win_all ?? 0) + (matchStore.match.asia_run_all ?? 0) + (matchStore.match.asia_lose_all ?? 0) > 0
  if (showAsiaAll.value) {
    const option2 = _.cloneDeep(defineChartOption(2, "亚盘全网")) as echarts.EChartsOption
    const total2 = (matchStore.match.asia_win_all ?? 0) + (matchStore.match.asia_run_all ?? 0) + (matchStore.match.asia_lose_all ?? 0)
    if (total2 > 0) {
      // @ts-ignore
      option2.series[0].data = [(matchStore.match.asia_win_all ?? 0) / total2]
      // @ts-ignore
      option2.series[1].data = [(matchStore.match.asia_run_all ?? 0) / total2]
      // @ts-ignore
      option2.series[2].data = [(matchStore.match.asia_lose_all ?? 0) / total2]
      option2.legend = {
        top: '10%',
        formatter: (name: string) => {
          if (name === "赢") {
            return `赢：${ getDecimalPoint((matchStore.match.asia_win_all ?? 0) / total2 * 100) }%`
          } else if (name === "走") {
            return `走：${ getDecimalPoint((matchStore.match.asia_run_all ?? 0) / total2 * 100) }%`
          } else {
            return `输：${ getDecimalPoint((matchStore.match.asia_lose_all ?? 0) / total2 * 100) }%`
          }
        }
      }
      chart_asia_all.setOption(option2)
    }
    showAsiaLeague.value = (matchStore.match.asia_win_league ?? 0) + (matchStore.match.asia_run_league ?? 0) + (matchStore.match.asia_lose_league ?? 0) > 0
    if (showAsiaLeague.value) {
      const option22 = _.cloneDeep(defineChartOption(2, "亚盘本联赛"))
      const total122 = (matchStore.match.asia_win_league ?? 0) + (matchStore.match.asia_run_league ?? 0) + (matchStore.match.asia_lose_league ?? 0)
      if (total122 > 0) {
        // @ts-ignore
        option22.series[0].data = [(matchStore.match.asia_win_league ?? 0) / total122]
        // @ts-ignore
        option22.series[1].data = [(matchStore.match.asia_run_league ?? 0) / total122]
        // @ts-ignore
        option22.series[2].data = [(matchStore.match.asia_lose_league ?? 0) / total122]
        option22.legend = {
          top: '10%',
          formatter: (name: string) => {
            if (name === "赢") {
              return `赢：${ getDecimalPoint((matchStore.match.asia_win_league ?? 0) / total122 * 100) }%`
            } else if (name === "走") {
              return `走：${ getDecimalPoint((matchStore.match.asia_run_league ?? 0) / total122 * 100) }%`
            } else {
              return `输：${ getDecimalPoint((matchStore.match.asia_lose_league ?? 0) / total122 * 100) }%`
            }
          }
        }
        chart_asia_league.setOption(option22)
      }
    }
    if ((matchStore.match.asia_score_list?.length || 0) > 0) {
      asia_score_list.value = []
      matchStore.match.asia_score_list?.some((item: any[]) => {
        asia_score_list.value.push(`<span style="color: #895b8a">${ item[0] }</span>：${ item[1] }场(${ (item[1] / total2 * 100).toFixed(2) }%)`)
        if (asia_score_list.value.length >= 3) {
          return true
        }
      })
    }
  } else {
    showAsiaLeague.value = false
  }
  showTeamStatus.value = (matchStore.match.home_status?.length || 0) > 0 && (matchStore.match.visit_status?.length || 0) > 0
  if (showTeamStatus.value) {
    const option4 :echarts.EChartsOption = _.cloneDeep(defineTeamStatusChartOption()) as echarts.EChartsOption
    // @ts-ignore
    option4.xAxis.data = matchStore.match.home_status?.map((_, index: number) => (index + 1))
    // @ts-ignore
    option4.series[0].data = matchStore.match.home_status
    // @ts-ignore
    option4.series[1].data = matchStore.match.visit_status
    chart_team_status.setOption(option4)
  }
  showSizeAll.value = (matchStore.match.size_big_all ?? 0) + (matchStore.match.size_run_all ?? 0) + (matchStore.match.size_small_all ?? 0) > 0
  if (showSizeAll.value) {
    const option3 = _.cloneDeep(defineChartOption(3, "大小球全网"))
    const total3 = (matchStore.match.size_big_all ?? 0) + (matchStore.match.size_run_all ?? 0) + (matchStore.match.size_small_all ?? 0)
    // @ts-ignore
    option3.series[0].data = [(matchStore.match.size_big_all ?? 0) / total3]
    // @ts-ignore
    option3.series[1].data = [(matchStore.match.size_run_all ?? 0) / total3]
    // @ts-ignore
    option3.series[2].data = [(matchStore.match.size_small_all ?? 0) / total3]
    option3.legend = {
      top: '10%',
      formatter: (name: string) => {
        if (name === "大") {
          return `大：${ getDecimalPoint((matchStore.match.size_big_all ?? 0) / total3 * 100) }%`
        } else if (name === "走") {
          return `走：${ getDecimalPoint((matchStore.match.size_run_all ?? 0) / total3 * 100) }%`
        } else {
          return `小：${ getDecimalPoint((matchStore.match.size_small_all ?? 0) / total3 * 100) }%`
        }
      }
    }
    chart_size_all.setOption(option3)
    showSizeLeague.value = (matchStore.match.size_big_league ?? 0) + (matchStore.match.size_run_league ?? 0) + (matchStore.match.size_small_league ?? 0) > 0
    if (showSizeLeague.value) {
      const option33 = _.cloneDeep(defineChartOption(3, "大小球本联赛"))
      const total33 = (matchStore.match.size_big_league ?? 0) + (matchStore.match.size_run_league ?? 0) + (matchStore.match.size_small_league ?? 0)
      if (total33 > 0) {
        // @ts-ignore
        option33.series[0].data = [(matchStore.match.size_big_league ?? 0) / total33]
        // @ts-ignore
        option33.series[1].data = [(matchStore.match.size_run_league ?? 0) / total33]
        // @ts-ignore
        option33.series[2].data = [(matchStore.match.size_small_league ?? 0) / total33]
        option33.legend = {
          top: '10%',
          formatter: (name: string) => {
            if (name === "大") {
              return `大：${ getDecimalPoint((matchStore.match.size_big_league ?? 0) / total33 * 100) }%`
            } else if (name === "走") {
              return `走：${ getDecimalPoint((matchStore.match.size_run_league ?? 0) / total33 * 100) }%`
            } else {
              return `小：${ getDecimalPoint((matchStore.match.size_small_league ?? 0) / total33 * 100) }%`
            }
          }
        }
        chart_size_league.setOption(option33)
      }
    }
    if ((matchStore.match.size_score_list?.length || 0) > 0) {
      size_score_list.value = []
      matchStore.match.size_score_list?.some((item: any[]) => {
        size_score_list.value.push(`<span style="color: #895b8a">${ item[0] }</span>：${ item[1] }场(${ (item[1] / total3 * 100).toFixed(2) }%)`)
        if (size_score_list.value.length >= 3) {
          return true
        }
      })
      goal_number_list.value = []
      matchStore.match.goal_number_list?.some((item: any[]) => {
        goal_number_list.value.push(`<span style="color: #895b8a">${ item[0] }球</span>：${ item[1] }场(${ (item[1] / total3 * 100).toFixed(2) }%)`)
        if (goal_number_list.value.length >= 3) {
          return true
        }
      })
      half_goal_number_list.value = []
      matchStore.match.half_goal_number_list?.some((item: any[]) => {
        half_goal_number_list.value.push(`<span style="color: #895b8a">${ item[0] }球</span>：${ item[1] }场(${ (item[1] / total3 * 100).toFixed(2) }%)`)
        if (half_goal_number_list.value.length >= 3) {
          return true
        }
      })
    }
  } else {
    showSizeLeague.value = false
  }
  showTotalGoal.value = (matchStore.match.home_total_goal?.length || 0) > 0 && (matchStore.match.visit_total_goal?.length || 0) > 0
  if (showTotalGoal.value) {
    const option5 :echarts.EChartsOption = _.cloneDeep(defineTotalGoalChartOption()) as echarts.EChartsOption
    // @ts-ignore
    option5.xAxis.data = matchStore.match.home_total_goal.map((_, index: number) => (index + 1))
    // @ts-ignore
    option5.series[0].data = matchStore.match.home_total_goal.map(item => {
      return item === 0 ? 0.2 : item
    })
    // @ts-ignore
    option5.series[1].data = matchStore.match.visit_total_goal.map(item => {
      return item === 0 ? 0.2 : item
    })
    // @ts-ignore
    option5.series[2].data = Array.from({ length: matchStore.match.home_total_goal!.length }, () => matchStore.match.instant_size_most)
    chart_total_goal.setOption(option5)
  }
}
const onLookTrend = () => {
  xTrendList.value.getData()
}
onMounted(() => {
  const dom1 = document.getElementById('chart_europe_all')
  if (dom1) {
    chart_europe_all = echarts.init(dom1)
  }
  const dom2 = document.getElementById("chart_europe_league")
  if (dom2) {
    chart_europe_league = echarts.init(dom2)
  }
  const dom3 = document.getElementById("chart_asia_all")
  if (dom3) {
    chart_asia_all = echarts.init(dom3)
  }
  const dom4 = document.getElementById("chart_asia_league")
  if (dom4) {
    chart_asia_league = echarts.init(dom4)
  }
  const dom5 = document.getElementById("chart_size_all")
  if (dom5) {
    chart_size_all = echarts.init(dom5)
  }
  const dom6 = document.getElementById("chart_size_league")
  if (dom6) {
    chart_size_league = echarts.init(dom6)
  }
  const dom7 = document.getElementById("chart_team_status")
  if (dom7) {
    chart_team_status = echarts.init(dom7)
  }
  const dom8 = document.getElementById("chart_total_goal")
  if (dom8) {
    chart_total_goal = echarts.init(dom8)
  }
  window.addEventListener("resize", onChartResize)
  onGetMatchInfo()
})
onBeforeUnmount(() => {
  window.removeEventListener("resize", onChartResize)
  chart_europe_all?.dispose()
  chart_europe_league?.dispose()
  chart_asia_all?.dispose()
  chart_asia_league?.dispose()
  chart_size_all?.dispose()
  chart_size_league?.dispose()
  chart_team_status?.dispose()
  chart_total_goal?.dispose()
})
const onChartResize = () => {
  chart_europe_all?.resize()
  chart_europe_league?.resize()
  chart_asia_all?.resize()
  chart_asia_league?.resize()
  chart_size_all?.resize()
  chart_size_league?.resize()
  chart_team_status?.resize()
  chart_total_goal?.resize()
}
const historyMatches = useLocalStorage<any[]>("history_matches", [])
const addHistoryMatch = (match: IMatchInfo) => {
  const existingIndex = historyMatches.value.findIndex(obj => obj.fid === match.fid)
  if (existingIndex !== -1) {
    historyMatches.value.splice(existingIndex, 1);
  }
  historyMatches.value.unshift({
    fid: match.fid,
    home: match.home_team,
    visit: match.visit_team,
    group: match.match_group,
    time: match.match_time,
  });
  if (historyMatches.value.length > 10) {
    historyMatches.value.pop()
  }
}
const onScreenShot = () => {
  showLoadingToast("保存截图中...")
  setTimeout(async () => {
    const dataUrl = await domToJpeg(<Node>document.querySelector(".content-container"), {
      filter(el:Node) {
        // @ts-ignore
        return !(el.classList?.contains('van-button'))
      }
    })
    const link = document.createElement('a')
    link.download = `${matchStore.match.match_group} ${matchStore.match.home_team}vs${matchStore.match.visit_team}.jpeg`
    link.href = dataUrl
    link.click()
    closeToast()
  })
}
</script>

<style lang="less" scoped>
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

.content-container {
  width: 100%;
  max-width: 90%;
  margin: 0 auto;
  padding: 0 5%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-primary);
  padding-bottom: 20px;
  box-sizing: border-box;
}

.match-group {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-tight);
}

.match-time {
  margin-top: 5px;
  margin-bottom: 10px;
  color: var(--danger-color);
  font-size: var(--font-size-xs);
  letter-spacing: var(--letter-spacing-normal);
}

.top-view {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20px;
  width: 100%;
  background: var(--bg-card);
  border-radius: 12px;
  margin: 10px 12px;
  border: 1px solid var(--border-color);

  .score {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xl);
    margin: 0 20px;
    color: var(--text-primary);
    letter-spacing: var(--letter-spacing-wide);
  }

  .team-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    color: var(--primary-color);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);

    .rank {
      color: var(--text-muted);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-normal);
      margin-top: 5px;
      letter-spacing: var(--letter-spacing-normal);
    }
  }
}

.panel {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: 12px;
  margin: 10px 12px;
  border: 1px solid var(--border-color);

  .title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--primary-color);
    margin-bottom: 10px;
    letter-spacing: var(--letter-spacing-tight);
  }
}

.size-title {
  font-size: var(--font-size-sm);
  color: var(--warning-color);
  margin-top: 10px;
  display: block;
  padding: 0 12px;
  letter-spacing: var(--letter-spacing-normal);
}

.flex-horizontal-1 {
  width: 0;
  flex: 1;
}

.win_count {
  color: var(--danger-color);
}

.even_count {
  color: var(--secondary-color);
}

.lose_count {
  color: var(--primary-color);
}

.chart {
  width: 100%;
  height: 100px;
}

/* 推理数据表格样式 - 完整显示文字 */
.infer-table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin: 16px 0;
  padding: 0 12px;
}

.infer-table {
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.infer-table thead {
  background: rgba(255, 255, 255, 0.03);
}

.infer-table th {
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold);
  padding: 14px 12px;
  font-size: var(--font-size-sm);
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  letter-spacing: var(--letter-spacing-tight);
}

.infer-table td {
  color: var(--text-primary);
  padding: 12px;
  font-size: var(--font-size-sm);
  text-align: center;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
  letter-spacing: var(--letter-spacing-normal);
}

.infer-table tr:last-child td {
  border-bottom: none;
}

.infer-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

.infer-table .cell-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.infer-table .match-group {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.infer-table .team-name {
  font-size: 14px;
  font-weight: 600;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.infer-table .home-name {
  color: #8B4513;
}

.infer-table .visit-name {
  color: #FF1493;
}

.infer-table .vs-text {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.infer-table .score-info {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
}

.infer-table .concede-info {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.infer-table .result-cell {
  font-weight: 600;
  color: var(--primary-color);
}

/* 分析文本样式 */
.analysis-text {
  width: 100%;
  margin: 16px 0;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  
  p {
    margin: 0 0 8px 0;
    line-height: var(--line-height-relaxed);
    font-size: var(--font-size-sm);
    letter-spacing: var(--letter-spacing-normal);
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

/* 表格容器样式，添加横向滚动 */
.table-container {
  width: 100%;
  overflow-x: auto;
  margin: 16px 0;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 101, 0, 0.5);
    border-radius: 12px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 101, 0, 0.8);
  }
}

:deep(.van-pull-refresh) {
  background: var(--bg-primary) !important;
}

:deep(.van-notice-bar__content) {
  white-space: pre-line;
}

.table2 {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);

  th {
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-secondary);
    font-weight: 600;
    padding: 12px 12px;
    font-size: 13px;
    border-bottom: 1px solid var(--border-color);
    white-space: normal;
    word-break: break-word;
    text-align: center;
  }

  td {
    color: var(--text-primary);
    padding: 10px 12px;
    font-size: 13px;
    border-bottom: 1px solid var(--border-color);
    white-space: normal;
    word-break: break-word;
    text-align: center;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .highlight-value {
    color: var(--primary-color);
    font-weight: 600;
  }
}

.table-1 {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);

  th {
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-secondary);
    font-weight: 600;
    padding: 10px 12px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-color);
    white-space: normal;
    word-break: break-word;
    text-align: center;
  }

  td {
    color: var(--text-primary);
    padding: 10px 12px;
    font-size: 14px;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
    white-space: normal;
    word-break: break-word;
  }

  tr:last-child td {
    border-bottom: none;
  }
}

:deep(.van-button--primary) {
  background: var(--primary-gradient);
  border: none;
}

:deep(.van-button) {
  border-radius: 8px;
}
</style>
