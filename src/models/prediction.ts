export interface ISizePrediction {
  current_line: number
  big_probability: number
  small_probability: number
  poisson_big: number
  poisson_small: number
  historical_big_rate: number
  historical_small_rate: number
  similar_matches: ISimilarMatch[]
  recommendation: string
  confidence: number
  /** 决赛小球加成: 决赛比赛小球概率的额外上调幅度 */
  final_boost?: number
}

export interface ICardPrediction {
  total_line: number
  home_avg_yellow: number
  away_avg_yellow: number
  league_avg_yellow: number
  referee_avg_yellow: number
  over_probability: number
  under_probability: number
  recommendation: string
  confidence: number
  ai_analysis?: IAIAnalysis
  /** 大小牌综合影响因子(大比分+让球盘): 基于进球预期和让球盘对小牌(黄牌)概率的调整幅度 */
  big_score_factor?: number
  /** 上半场补偿因子: 上半场无牌时下半场大牌概率的统计补偿值 */
  second_half_boost?: number
}

export interface IAIAnalysis {
  referee: {
    name: string
    strictness: string
    avg_yellow: number
    description: string
  }
  match_context: {
    importance: string
    stakes: string
    description: string
  }
  rivalry: {
    level: string
    description: string
  }
  summary: string
  powered_by: "AI" | "data"
}

export interface ISimilarMatch {
  home: string
  visit: string
  score: string
  total_goals: number
  yellow_cards: number
  league: string
  time: string
}

export interface IPredictionResponse {
  fid: string
  home_team: string
  visit_team: string
  match_group: string
  match_time: string
  size: ISizePrediction
  card: ICardPrediction
}
