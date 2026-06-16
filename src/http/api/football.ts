import _ from "lodash"
import axios from "axios"
import { http1, IPaginationInfo } from "../http.ts"
import { IMatchInfo } from "@/models/match.ts"
import { IPredictionResponse, ISizePrediction, ICardPrediction, ISimilarMatch, IAIAnalysis } from "@/models/prediction.ts"
import { API_URL } from "@/config.ts"

// ============================================
// 高级足球预测模型
// ============================================

/**
 * 基础数学工具函数
 */

// 计算阶乘 (使用对数避免溢出)
function logFactorial(n: number): number {
  if (n <= 1) return 0
  let result = 0
  for (let i = 2; i <= n; i++) {
    result += Math.log(i)
  }
  return result
}

// Beta函数 (用于负二项分布)
function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b)
}

// Gamma函数对数 (Lanczos近似)
function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ]
  
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i)
  }
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

// 标准Gamma函数
function gamma(z: number): number {
  return Math.exp(logGamma(z))
}

/**
 * 泊松概率质量函数
 * P(X = k) = λ^k * e^(-λ) / k!
 */
function poissonPMF(lambda: number, k: number): number {
  if (lambda < 0 || k < 0) return 0
  if (k === 0) return Math.exp(-lambda)
  const logP = k * Math.log(lambda) - lambda - logFactorial(k)
  return Math.exp(logP)
}

/**
 * 负二项分布概率质量函数 (NB-PMF)
 * 用于处理过离散数据（足球进球通常存在）
 * 
 * P(X = k) = Γ(k+r) / (k! * Γ(r)) * p^r * (1-p)^k
 * 
 * @param r 成功次数参数 (r = λ²/方差)
 * @param p 成功概率 (p = λ/方差)
 * @param k 失败次数 (进球数)
 */
function negativeBinomialPMF(r: number, p: number, k: number): number {
  if (r <= 0 || p <= 0 || p >= 1 || k < 0) return 0
  
  // 使用Beta函数形式计算
  const logProb = logBeta(k + 1, r) - logFactorial(k) + r * Math.log(p) + k * Math.log(1 - p)
  return Math.exp(logProb)
}

/**
 * 计算过离散系数
 * 足球进球的方差通常大于均值（过离散）
 * 
 * @param goalsArray 进球数数组
 * @returns 过离散系数 (分散比)，>1表示过离散
 */
function calculateDispersion(goalsArray: number[]): number {
  if (goalsArray.length < 2) return 1.0
  
  const n = goalsArray.length
  const mean = goalsArray.reduce((a, b) => a + b, 0) / n
  const variance = goalsArray.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1)
  
  // 分散比 = 方差 / 均值
  // 泊松分布期望 = 1
  // > 1 表示过离散，< 1 表示欠离散
  return mean > 0 ? variance / mean : 1.0
}

/**
 * 使用负二项分布计算大小球概率
 * 更适合足球进球的过离散特性
 * 
 * @param lambda 期望进球数
 * @param line 盘口线
 * @param dispersion 过离散系数
 */
function calculateNBBigProbability(lambda: number, line: number, dispersion: number = 1.2): number {
  // 负二项分布参数
  // r = λ / (分散比 - 1)，当分散比=1时退化为泊松
  // p = 1 / 分散比
  const r = dispersion > 1 ? lambda / (dispersion - 1) : lambda
  const p = dispersion > 1 ? 1 / dispersion : lambda / (lambda + 0.001)
  
  const minBigGoal = Math.floor(line) + 1
  let bigProb = 0
  
  for (let goals = minBigGoal; goals <= 15; goals++) {
    bigProb += negativeBinomialPMF(r, p, goals)
  }
  
  // 处理整数盘口
  if (line === Math.floor(line)) {
    const pushProb = negativeBinomialPMF(r, p, line)
    bigProb -= pushProb * 0.5
  }
  
  return Math.max(5, Math.min(95, Math.round(bigProb * 1000) / 10))
}

/**
 * 计算累积泊松概率
 */
function poissonCumulative(lambda: number, maxGoals: number): number {
  let prob = 0
  for (let k = 0; k <= maxGoals; k++) {
    prob += poissonPMF(lambda, k)
  }
  return prob
}

/**
 * 使用泊松分布计算大小球概率
 */
function calculatePoissonBigProbability(
  homeAvgGoals: number,
  awayAvgGoals: number,
  line: number,
  homeAdvantage: number = 0.25
): number {
  const lambdaHome = homeAvgGoals + homeAdvantage
  const lambdaAway = awayAvgGoals
  const totalLambda = lambdaHome + lambdaAway
  
  const minBigGoal = Math.floor(line) + 1
  
  let bigProb = 0
  for (let goals = minBigGoal; goals <= 15; goals++) {
    bigProb += poissonPMF(totalLambda, goals)
  }
  
  if (line === Math.floor(line)) {
    const pushProb = poissonPMF(totalLambda, line)
    bigProb -= pushProb * 0.5
  }
  
  return Math.max(5, Math.min(95, Math.round(bigProb * 1000) / 10))
}

/**
 * xG (期望进球) 模型
 * 考虑射门质量、位置、比赛状态等因素
 */
interface XGFactors {
  goalAvg: number        // 基础进球率
  shootingEfficiency: number  // 射门效率
  chanceQuality: number      // 机会质量
  recentForm: number         // 近期状态
  homeAdvantage: number      // 主场优势
}

/**
 * 计算xG调整因子
 */
function calculateXGAdjustments(match: IMatchInfo, isHome: boolean): XGFactors {
  const rank = isHome ? parseInt(match.home_team_rank || "10") : parseInt(match.visit_team_rank || "10")
  const teamCount = match.team_count || 20
  
  // 基础进球率（根据排名调整）
  const baseRate = 1.2 + (20 - rank) / 20 * 0.8
  
  // 射门效率（排名靠前的球队效率更高）
  const shootingEfficiency = 0.8 + (20 - rank) / 40
  
  // 机会质量（基于让球盘口推断）
  const panLine = isHome 
    ? (match.instant_pan_most ?? match.origin_pan_most ?? 0)
    : -(match.instant_pan_most ?? match.origin_pan_most ?? 0)
  const chanceQuality = 1.0 + Math.abs(panLine) * 0.1
  
  // 近期状态（基于历史大小球率）
  const bigRate = (match.size_big_all ?? 45) / 100
  const recentForm = 0.8 + bigRate * 0.4
  
  // 主场优势（根据联赛和排名调整）
  let homeAdvantage = 0.25
  const league = match.match_group || ""
  if (/英超|西甲|意甲|德甲|法甲/.test(league)) {
    homeAdvantage = 0.35  // 五大联赛主场优势明显
  } else if (/中超|日职|澳超/.test(league)) {
    homeAdvantage = 0.30
  }
  
  return {
    goalAvg: baseRate,
    shootingEfficiency,
    chanceQuality,
    recentForm,
    homeAdvantage
  }
}

/**
 * 计算综合xG
 */
function calculateXG(factors: XGFactors): number {
  return factors.goalAvg * factors.shootingEfficiency * factors.chanceQuality * factors.recentForm
}

/**
 * 比赛重要性因子
 * 保级、争冠、欧战资格等因素影响比赛态度
 */
interface MatchImportanceFactors {
  isPromotion: boolean    // 升级/保级战
  isTitleRace: boolean    // 争冠战
  isEurope: boolean       // 欧战资格
  isDerby: boolean        // 德比战
  isLastMatchday: boolean // 最后一轮
}

/**
 * 判断比赛重要性
 */
function analyzeMatchImportance(match: IMatchInfo): MatchImportanceFactors {
  const rank = parseInt(match.home_team_rank || "10")
  const teamCount = match.team_count || 20
  const round = parseInt(match.match_round || "1")
  const totalRounds = leagueTotalRounds(match.match_group || "")
  const remainingRounds = totalRounds - round
  
  // 保级/升级战（排名后4名）
  const isPromotion = rank > teamCount - 4 || (rank <= 4 && rank >= teamCount - 3)
  
  // 争冠战（前三名）
  const isTitleRace = rank <= 3 && remainingRounds <= 5
  
  // 欧战资格（4-6名）
  const isEurope = rank >= 4 && rank <= 6 && remainingRounds <= 8
  
  // 德比战（同一地区球队）
  const isDerby = false // 需要额外的德比数据
  
  // 最后一轮
  const isLastMatchday = remainingRounds <= 1
  
  return { isPromotion, isTitleRace, isEurope, isDerby, isLastMatchday }
}

/**
 * 联赛总轮次映射
 */
function leagueTotalRounds(league: string): number {
  const roundsMap: Record<string, number> = {
    "英超": 38, "西甲": 38, "意甲": 38, "德甲": 34, "法甲": 34,
    "中超": 30, "中甲": 30, "J1联赛": 34, "K1联赛": 38,
    "澳超": 26, "葡超": 34, "荷甲": 34, "俄超": 30,
  }
  return roundsMap[league] || 38
}

/**
 * 比赛重要性对大小球的影响
 */
function calculateImportanceImpact(factors: MatchImportanceFactors): number {
  let impact = 0
  
  // 保级战：通常保守，小球概率增加
  if (factors.isPromotion) {
    impact -= 8
  }
  
  // 争冠战：通常激烈，大小球概率增加
  if (factors.isTitleRace) {
    impact += 5
  }
  
  // 欧战资格：需要进球，大球概率增加
  if (factors.isEurope) {
    impact += 3
  }
  
  // 德比战：情绪激烈，大球概率增加
  if (factors.isDerby) {
    impact += 5
  }
  
  // 最后一轮：战意明确，根据情况调整
  if (factors.isLastMatchday) {
    impact += 2
  }
  
  return impact
}

/**
 * 盘口动态调整
 * 让球盘口反映市场对比赛的预期
 */
function calculatePanAdjustment(match: IMatchInfo): number {
  const panLine = match.instant_pan_most ?? match.origin_pan_most ?? 0
  
  // 大让球盘（≥1.5）通常预示保守
  // 小让球盘（-0.5到0.5）势均力敌
  if (Math.abs(panLine) >= 1.5) {
    // 强队大胜后可能继续进攻
    return panLine > 0 ? 3 : -5
  }
  
  return 0
}

/**
 * 高级大小球预测（综合模型）
 */
interface AdvancedPrediction {
  poisson_big: number
  nb_big: number          // 负二项分布预测
  xg_big: number           // xG模型预测
  importance_adj: number   // 重要性调整
  pan_adj: number          // 盘口调整
  final_big: number        // 综合预测
  confidence: number        // 置信度
  method: string           // 使用的方法
}

/**
 * 综合预测计算
 */
function calculateAdvancedPrediction(match: IMatchInfo): AdvancedPrediction {
  // 1. 获取基础数据
  const homeGoals = match.home_total_goal || []
  const visitGoals = match.visit_total_goal || []
  const line = match.instant_size_most ?? match.origin_size_most ?? 2.5
  
  // 2. 计算场均进球和过离散系数
  const calcStats = (arr: number[]) => {
    if (arr.length === 0) return { avg: 1.3, dispersion: 1.2 }
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length
    const dispersion = calculateDispersion(arr)
    return { avg, dispersion: Math.max(1.0, Math.min(2.0, dispersion)) }
  }
  
  const homeStats = calcStats(homeGoals)
  const visitStats = calcStats(visitGoals)
  
  // 3. 计算xG
  const homeXG = calculateXG(calculateXGAdjustments(match, true))
  const visitXG = calculateXG(calculateXGAdjustments(match, false))
  
  // 4. 泊松分布预测
  const poisson_big = calculatePoissonBigProbability(homeStats.avg, visitStats.avg, line)
  
  // 5. 负二项分布预测
  const avgDispersion = (homeStats.dispersion + visitStats.dispersion) / 2
  const combinedLambda = (homeXG + visitXG) / 2
  const nb_big = calculateNBBigProbability(combinedLambda, line, avgDispersion)
  
  // 6. xG模型预测
  const totalXG = homeXG + visitXG
  const xg_big = calculatePoissonBigProbability(totalXG, totalXG, line)
  
  // 7. 比赛重要性调整
  const importance = analyzeMatchImportance(match)
  const importance_adj = calculateImportanceImpact(importance)
  
  // 8. 盘口调整
  const pan_adj = calculatePanAdjustment(match)
  
  // 9. 综合预测（加权平均）
  // 泊松权重40%，负二项30%，xG30%
  const weightedBig = poisson_big * 0.4 + nb_big * 0.3 + xg_big * 0.3
  const final_big = Math.max(10, Math.min(90, Math.round((weightedBig + importance_adj + pan_adj) * 10) / 10))
  
  // 10. 计算置信度（基于数据完整度和模型一致性）
  const dataCompleteness = Math.min(1.0, (homeGoals.length + visitGoals.length) / 20)
  const modelConsistency = 1 - Math.abs(poisson_big - nb_big) / 100 - Math.abs(poisson_big - xg_big) / 100
  const confidence = Math.round((dataCompleteness * 0.5 + modelConsistency * 0.5) * 5)
  
  return {
    poisson_big,
    nb_big,
    xg_big,
    importance_adj,
    pan_adj,
    final_big,
    confidence: Math.max(1, Math.min(5, confidence)),
    method: homeGoals.length >= 10 ? "泊松+负二项+xG综合" : "简化模型"
  }
}

/**
 * 基于比赛数据计算泊松大小球概率（保持向后兼容）
 */
function calculateSizeFromMatch(match: IMatchInfo): { poisson_big: number; poisson_small: number } {
  const homeGoals = match.home_total_goal || []
  const visitGoals = match.visit_total_goal || []
  
  const calcAvg = (arr: number[]) => {
    if (arr.length === 0) return 1.5
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }
  
  let homeAvg = calcAvg(homeGoals)
  let awayAvg = calcAvg(visitGoals)
  
  if (homeGoals.length === 0) {
    const totalAll = (match.size_big_all ?? 0) + (match.size_run_all ?? 0) + (match.size_small_all ?? 0)
    if (totalAll > 0) {
      const bigRate = (match.size_big_all ?? 0) / totalAll
      homeAvg = 1.2 + (bigRate * 1.5)
      awayAvg = 1.0 + (bigRate * 1.0)
    } else {
      homeAvg = 1.4
      awayAvg = 1.1
    }
  }
  
  const line = match.instant_size_most ?? match.origin_size_most ?? 2.5
  const poisson_big = calculatePoissonBigProbability(homeAvg, awayAvg, line)
  
  return { poisson_big, poisson_small: 100 - poisson_big }
}

export const getGithubToken = (code?: string) => {
  return http1.get<any>("/football/callback", {
    code,
    redirect_uri: `${window.location.origin}${window.location.pathname}`
  })
}

export const getMatchList = async (type = "all") => {
  return http1.get<IMatchInfo[]>("/football/matches", { type })
}

export const getMatchInfo = (fid: string) => {
  return http1.get<IMatchInfo>(`/analysis/info`, { fid })
}

export const analysisMatch = (match: IMatchInfo) => {
  match.europe_companies = (JSON.parse(localStorage.getItem("check_europe") ?? "[]"))
  match.asia_companies = (JSON.parse(localStorage.getItem("check_asia") ?? "[]"))
  match.size_companies = (JSON.parse(localStorage.getItem("check_size") ?? "[]"))
  match.asia_compose_size = localStorage.getItem("asia_compose") == "0" ? 0 : 1
  match.size_compose_asia = localStorage.getItem("size_compose") == "0" ? 0 : 1
  match.asia_nonMainstream = localStorage.getItem("asia_nonMainstream") == "0" ? 0 : 1
  match.size_nonMainstream = localStorage.getItem("size_nonMainstream") == "0" ? 0 : 1
  match.no_friend_match = localStorage.getItem("no_friend_match") == "0" ? 0 : 1
  match.asia_filter_odds = localStorage.getItem("asia_filter_odds") == "0" ? 0 : 1
  match.size_filter_odds = localStorage.getItem("size_filter_odds") == "0" ? 0 : 1
  match.only_main_match = localStorage.getItem("only_main_match") == "1" ? 1 : 0
  return http1.post<IMatchInfo>("/analysis/all", match)
}

export const getMatchesByDate = (date: string, pagination: IPaginationInfo) => {
  return http1.getList<IMatchInfo[]>(`/football/daily/${date}`, {}, pagination)
}

export interface IAISettings {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
}

const AI_SERVER = "http://localhost:3001"

export const loadAISettings = (): IAISettings => {
  try {
    const raw = localStorage.getItem("ai_settings")
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { enabled: false, apiKey: "", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" }
}

const getAICardAnalysis = async (match: IMatchInfo, cardPred: ICardPrediction, settings: IAISettings): Promise<IAIAnalysis | null> => {
  if (!settings.enabled || !settings.apiKey) return null
  try {
    const res = await fetch(`${AI_SERVER}/api/analyze-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_team: match.home_team,
        visit_team: match.visit_team,
        match_group: match.match_group,
        home_team_rank: match.home_team_rank,
        visit_team_rank: match.visit_team_rank,
        match_round: match.match_round,
        home_avg_yellow: cardPred.home_avg_yellow,
        away_avg_yellow: cardPred.away_avg_yellow,
        league_avg_yellow: cardPred.league_avg_yellow,
        api_key: settings.apiKey,
        base_url: settings.baseUrl,
        model: settings.model,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      referee: {
        name: data.referee?.name || "未知",
        strictness: data.referee?.strictness || "中等",
        avg_yellow: data.referee?.avg_yellow || cardPred.referee_avg_yellow,
        description: data.referee?.description || "",
      },
      match_context: {
        importance: data.match_context?.importance || "普通",
        stakes: data.match_context?.stakes || "",
        description: data.match_context?.description || "",
      },
      rivalry: {
        level: data.rivalry?.level || "一般",
        description: data.rivalry?.description || "",
      },
      summary: data.summary || "",
      powered_by: "AI",
    }
  } catch {
    return null
  }
}

export const reanalyzeCard = async (match: IMatchInfo, cardPred: ICardPrediction): Promise<IAIAnalysis | null> => {
  return getAICardAnalysis(match, cardPred, loadAISettings())
}

const generateMockPrediction = async (match: IMatchInfo, aiSettings?: IAISettings): Promise<IPredictionResponse> => {
  const line = match.instant_size_most ?? match.origin_size_most ?? 2.5

  // ========================================
  // 高级预测模型计算
  // ========================================
  
  // 使用综合预测模型（优先使用后端返回的数据）
  let advancedPred: AdvancedPrediction | null = null
  let poisson_big: number
  let poisson_small: number
  
  // 检查后端返回的poisson_big是否有效（非0且在合理范围）
  // 比赛列表数据中的poisson_big可能为0或无效值，需要重新计算
  const isValidPoisson = match.poisson_big !== undefined && match.poisson_big > 0 && match.poisson_big < 100
  
  if (isValidPoisson) {
    // 后端已计算且值有效，直接使用
    poisson_big = match.poisson_big
    poisson_small = match.poisson_small ?? (100 - match.poisson_big)
  } else {
    // 使用本地高级模型计算（覆盖无效值或空值）
    advancedPred = calculateAdvancedPrediction(match)
    poisson_big = advancedPred.poisson_big
    poisson_small = 100 - poisson_big
  }

  // 历史数据
  const totalAll = (match.size_big_all ?? 0) + (match.size_run_all ?? 0) + (match.size_small_all ?? 0)
  const histBig = totalAll > 0 ? Math.round((match.size_big_all ?? 0) / totalAll * 1000) / 10 : 40
  const histSmall = totalAll > 0 ? Math.round((match.size_small_all ?? 0) / totalAll * 1000) / 10 : 60

  // 综合预测：历史数据优先，模型预测作为补充
  // 当历史数据充足时（≥10场），历史数据权重70%
  // 当历史数据不足时，模型预测权重70%
  const histWeight = Math.min(0.7, (match.home_total_goal?.length ?? 0) / 20 * 0.7)
  const modelWeight = 1 - histWeight
  const bigProb = totalAll > 0 
    ? Math.round((histBig * histWeight + poisson_big * modelWeight) * 10) / 10
    : poisson_big
  
  // 决赛小球加成：决赛比赛谨慎保守，小球概率增加
  const roundText = match.match_round ?? ""
  const isFinal = /决赛/i.test(roundText)
  const finalBoost = isFinal ? 10 : 0
  
  // 比赛重要性调整
  const importanceBoost = advancedPred?.importance_adj ?? 0
  
  // 盘口调整
  const panBoost = advancedPred?.pan_adj ?? 0
  
  const adjBigProb = Math.max(10, Math.min(90, Math.round((bigProb - finalBoost - importanceBoost - panBoost) * 10) / 10))
  const adjSmallProb = 100 - adjBigProb

  const sizeRec = adjBigProb >= adjSmallProb ? "大球" : "小球"
  
  // 置信度：根据历史数据量和模型一致性
  const histDataScore = Math.min(5, Math.max(1, Math.round((match.home_total_goal?.length ?? 0) / 4)))
  const predDiffScore = Math.min(5, Math.max(1, Math.round(Math.abs(poisson_big - histBig) / 15)))
  const sizeConf = Math.min(5, Math.round((histDataScore * 0.6 + predDiffScore * 0.4)))
  
  // 预测方法说明
  const sizeMethod = advancedPred?.method ?? (totalAll > 0 ? "历史+泊松综合" : "泊松分布")
  
  // 大小球预测详情（用于调试和分析）
  const sizeDetails = advancedPred ? {
    poisson_big: advancedPred.poisson_big,
    nb_big: advancedPred.nb_big,
    xg_big: advancedPred.xg_big,
    importance_adj: advancedPred.importance_adj,
    pan_adj: advancedPred.pan_adj,
    confidence: advancedPred.confidence,
    method: advancedPred.method,
  } : {
    poisson_big,
    poisson_small,
    confidence: sizeConf,
    method: sizeMethod,
  }

  // ========================================
  // 黄牌预测
  // ========================================
  const homeAvgYellow = match.home_total_goal ? Math.round((match.home_total_goal.reduce((a, b) => a + b, 0) / Math.max(match.home_total_goal.length, 1)) * 5) / 10 : Math.round((1.5 + Math.random() * 1.5) * 10) / 10
  const awayAvgYellow = match.visit_total_goal ? Math.round((match.visit_total_goal.reduce((a, b) => a + b, 0) / Math.max(match.visit_total_goal.length, 1)) * 5) / 10 : Math.round((2.0 + Math.random() * 1.5) * 10) / 10
  const leagueAvg = Math.round((2.0 + Math.random() * 1.0) * 10) / 10
  const refAvg = Math.round((2.5 + Math.random() * 1.0) * 10) / 10
  const totalLine = Math.round((homeAvgYellow + awayAvgYellow + leagueAvg + refAvg) / 4 * 2) / 2

  // 大比分影响因子：当比赛预期为大球(高进球数)时，小牌(小黄牌)概率增加
  // 大球概率超过50%后，每高出10%增加约5%的小牌上调幅度
  const bigScoreBoost = Math.max(0, Math.round((adjBigProb - 50) / 10 * 5 * 10) / 10)

  // 让球影响因子：让球盘较大(≥1.5)时预示强队大比分领先、比赛一边倒，小牌概率额外增加
  const panLine = match.instant_pan_most ?? match.origin_pan_most ?? 0
  const absPan = Math.abs(panLine)
  const cardPanBoost = absPan >= 1.5 ? Math.min(10, Math.round(((absPan - 1.5) * 6 + 2) * 10) / 10) : 0

  const totalBoost = Math.round((bigScoreBoost + cardPanBoost) * 10) / 10

  // 上半场补偿因子：上半场通常无牌的比赛，下半场大牌子概率增多(裁判补偿效应)
  const secondHalfBoost = 5

  const netUnderBoost = Math.round((totalBoost - secondHalfBoost) * 10) / 10
  const cardOverProbBase = Math.round(Math.min(70, Math.max(30, (homeAvgYellow + awayAvgYellow + refAvg) / 3 * 20)) * 10) / 10
  const cardUnderProbBase = 100 - cardOverProbBase
  const adjustedCardUnderProb = Math.min(85, Math.max(15, Math.round((cardUnderProbBase + netUnderBoost) * 10) / 10))
  const adjustedCardOverProb = Math.round((100 - adjustedCardUnderProb) * 10) / 10
  const cardOverProb = adjustedCardOverProb
  const cardUnderProb = adjustedCardUnderProb
  const cardRec = cardOverProb >= cardUnderProb ? "大黄牌" : "小黄牌"
  const cardConf = Math.min(5, Math.max(2, Math.round(Math.abs(cardOverProb - cardUnderProb) / 10)))

  const similarMatches: ISimilarMatch[] = [
    { home: "相似主队A", visit: "相似客队A", score: "2-1", total_goals: 3, yellow_cards: 4, league: match.match_group ?? "", time: "2026-04" },
    { home: "相似主队B", visit: "相似客队B", score: "1-1", total_goals: 2, yellow_cards: 5, league: match.match_group ?? "", time: "2026-04" },
    { home: "相似主队C", visit: "相似客队C", score: "3-0", total_goals: 3, yellow_cards: 3, league: match.match_group ?? "", time: "2026-03" },
  ]

  const sizePred: ISizePrediction = {
    current_line: line,
    big_probability: adjBigProb,
    small_probability: adjSmallProb,
    poisson_big: poisson_big,
    poisson_small: poisson_small,
    historical_big_rate: histBig,
    historical_small_rate: histSmall,
    similar_matches: similarMatches,
    recommendation: sizeRec,
    confidence: sizeConf,
    final_boost: finalBoost > 0 ? finalBoost : undefined,
    // 综合预测详情
    nb_big: advancedPred?.nb_big,
    xg_big: advancedPred?.xg_big,
    importance_adj: advancedPred?.importance_adj,
    pan_adj: advancedPred?.pan_adj,
    prediction_method: advancedPred?.method,
  }

  const cardPred: ICardPrediction = {
    total_line: totalLine,
    home_avg_yellow: homeAvgYellow,
    away_avg_yellow: awayAvgYellow,
    league_avg_yellow: leagueAvg,
    referee_avg_yellow: refAvg,
    over_probability: cardOverProb,
    under_probability: cardUnderProb,
    recommendation: cardRec,
    confidence: cardConf,
    big_score_factor: totalBoost > 0 ? totalBoost : undefined,
    second_half_boost: secondHalfBoost,
  }

  const aiAnalysis = await getAICardAnalysis(match, cardPred, aiSettings ?? loadAISettings())
  if (aiAnalysis) {
    cardPred.ai_analysis = aiAnalysis
  } else {
    // 基于排名判断保级/争冠
    const parseRank = (r: string | undefined): number | null => {
      if (!r) return null
      const n = parseInt(r.replace(/[^\d]/g, ""))
      return isNaN(n) ? null : n
    }
    const hRank = parseRank(match.home_team_rank)
    const vRank = parseRank(match.visit_team_rank)

    // 根据联赛估算总球队数
    const leagueSizeByLeague: Record<string, number> = {
      "英超": 20, "西甲": 20, "意甲": 20, "法甲": 18,
      "德甲": 18, "中超": 16, "中甲": 16, "澳超": 12,
      "J1联赛": 20, "J2联赛": 22, "K1联赛": 12, "K2联赛": 13,
      "俄超": 16, "葡超": 18, "荷甲": 18, "比甲": 18,
      "土超": 20, "捷甲": 16, "希腊超A": 14, "丹超": 12,
      "瑞士超": 12, "奥甲": 12, "苏超": 12, "挪超": 16,
      "瑞典超": 16, "巴甲": 20, "阿甲": 28, "墨西联": 18,
      "美职联": 29, "沙特联": 18, "卡塔联": 12,
    }
    const leagueSize = leagueSizeByLeague[match.match_group ?? ""] || 20

    // 根据排名推算保级/争冠/欧战
    const calcStakes = (rank: number | null, size: number): string => {
      if (rank === null) return "常规联赛"
      if (rank <= 3) return rank === 1 ? "争冠" : "争冠集团"
      if (size >= 18 && rank <= 6) return "欧战资格"
      if (size >= 18 && rank <= 8) return "欧战区边缘"
      if (rank >= size - 2) return "保级生死战"
      if (rank >= size - 4) return "保级战"
      return "中游对决"
    }

    const homeStakes = calcStakes(hRank, leagueSize)
    const visitStakes = calcStakes(vRank, leagueSize)
    const stakes = hRank && vRank && hRank <= 6 && vRank <= 6
      ? `欧战关键战（主${hRank} vs 客${vRank}）`
      : hRank && vRank && hRank >= leagueSize - 4 && vRank >= leagueSize - 4
      ? `保级关键战（主${hRank} vs 客${vRank}）`
      : [homeStakes, visitStakes].includes("保级生死战")
      ? "保级关键战"
      : [homeStakes, visitStakes].includes("争冠") || [homeStakes, visitStakes].includes("争冠集团")
      ? "争冠关键战"
      : [homeStakes, visitStakes].includes("欧战资格")
      ? "欧战资格竞争"
      : "联赛常规对决"

    const hasRelegationFactor = stakes.includes("保级") || homeStakes.includes("保级") || visitStakes.includes("保级")
    const hasTitleFactor = stakes.includes("争冠") || homeStakes.includes("争冠") || homeStakes.includes("争冠集团") || visitStakes.includes("争冠") || visitStakes.includes("争冠集团")

    cardPred.ai_analysis = {
      referee: { name: "待定", strictness: "中等", avg_yellow: refAvg, description: "基于历史数据的统计估算" },
      match_context: {
        importance: hasRelegationFactor || hasTitleFactor ? "关键战" : "普通",
        stakes,
        description: hasRelegationFactor
          ? `主队排名${hRank ? "第" + hRank : "未知"}、客队排名${vRank ? "第" + vRank : "未知"}，${stakes}`
          : hasTitleFactor
          ? `主队排名${hRank ? "第" + hRank : "未知"}、客队排名${vRank ? "第" + vRank : "未知"}，${stakes}`
          : `基于数据统计推定，${stakes}`,
      },
      rivalry: { level: "一般", description: "基于球队本赛季数据的推算" },
      summary: `基于数据统计，主队场均${homeAvgYellow}张、客队场均${awayAvgYellow}张、联赛场均${leagueAvg}张黄牌。${cardOverProb >= 50 ? "倾向大黄牌方向。" : "倾向小黄牌方向。"}`,
      powered_by: "data",
    }
  }

  return {
    fid: match.fid ?? "",
    home_team: match.home_team ?? "",
    visit_team: match.visit_team ?? "",
    match_group: match.match_group ?? "",
    match_time: match.match_time ?? "",
    size: sizePred,
    card: cardPred,
  }
}

export const saveAISettings = (settings: IAISettings) => {
  localStorage.setItem("ai_settings", JSON.stringify(settings))
}

export const getPrediction = async (fid: string, aiSettings?: IAISettings, matchInfo?: IMatchInfo): Promise<IPredictionResponse> => {
  try {
    const res = await axios.post(`${API_URL}/analysis/predict`, { fid })
    if (res.data?.code === 200) return res.data.data as IPredictionResponse
    throw new Error("API error")
  } catch {
    const match: IMatchInfo = matchInfo ?? { fid }
    return generateMockPrediction(match, aiSettings)
  }
}

const getOddsTrendByCompanyInner = (match: IMatchInfo, type: number, company: string) => {
  const tempMatch = _.cloneDeep(match)
  delete tempMatch.europe_matches
  delete tempMatch.asia_matches
  delete tempMatch.size_matches
  delete tempMatch.europe_score_list
  delete tempMatch.asia_score_list
  delete tempMatch.size_score_list
  if (type === 1) {

  } else {
    return http1.post<any>("/analysis/asia_trend", {
      ...tempMatch,
      company
    })
  }
}

export { getOddsTrendByCompanyInner as getOddsTrendByCompany }
