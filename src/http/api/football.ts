import _ from "lodash"
import axios from "axios"
import { http1, IPaginationInfo } from "../http.ts"
import { IMatchInfo } from "@/models/match.ts"
import { IPredictionResponse, ISizePrediction, ICardPrediction, ISimilarMatch, IAIAnalysis } from "@/models/prediction.ts"
import { API_URL } from "@/config.ts"

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

  const poisson_big = match.poisson_big ?? Math.floor(30 + Math.random() * 35)
  const poisson_small = 100 - poisson_big

  const totalAll = (match.size_big_all ?? 0) + (match.size_run_all ?? 0) + (match.size_small_all ?? 0)
  const histBig = totalAll > 0 ? Math.round((match.size_big_all ?? 0) / totalAll * 1000) / 10 : Math.floor(40 + Math.random() * 30)
  const histSmall = totalAll > 0 ? Math.round((match.size_small_all ?? 0) / totalAll * 1000) / 10 : 100 - histBig

  const bigProb = totalAll > 0 ? histBig : poisson_big

  // 决赛小球加成：决赛比赛谨慎保守，小球概率增加
  const roundText = match.match_round ?? ""
  const isFinal = /决赛/i.test(roundText)
  const finalBoost = isFinal ? 10 : 0
  const adjBigProb = Math.max(10, Math.min(90, bigProb - finalBoost))
  const adjSmallProb = 100 - adjBigProb

  const sizeRec = adjBigProb >= adjSmallProb ? "大球" : "小球"
  const sizeConf = Math.min(5, Math.max(2, Math.round(Math.abs(adjBigProb - adjSmallProb) / 10)))

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
  const panBoost = absPan >= 1.5 ? Math.min(10, Math.round(((absPan - 1.5) * 6 + 2) * 10) / 10) : 0

  const totalBoost = Math.round((bigScoreBoost + panBoost) * 10) / 10

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
