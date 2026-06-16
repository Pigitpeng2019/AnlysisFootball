import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import OpenAI from "openai"

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
})

const ANALYSIS_PROMPT = `你是一个专业的足球比赛分析师。请基于以下信息，分析这场比赛的大小黄牌可能性。

比赛信息：
- 主队：{home_team}（排名：{home_rank}）
- 客队：{visit_team}（排名：{visit_rank}）
- 联赛：{league}
- 联赛剩余轮次：剩余 {remain_rounds} 轮
- 主队场均黄牌：{home_yellow}
- 客队场均黄牌：{away_yellow}
- 联赛场均黄牌：{league_avg}

请从以下三个维度进行专业分析，并以 JSON 格式返回结果（不要包含其他文字，只返回 JSON）：

1. 裁判执法风格：推测本场可能的裁判执法风格（严格/中等/宽松），给出合理的场均黄牌数和风格描述
2. 比赛重要性：分析比赛的关键程度（关键战/重要/普通），说明是否涉及保级、争冠、欧战资格、德比等因素。
   **特别注意**：根据球队排名判断是否涉及保级或争冠。例如意甲20队取后3名降级，
   如果球队排名在后5名且剩余轮次不多，则很可能是保级关键战。排名靠前则可能是争冠或欧战关键战。
3. 历史交锋：根据球队特点和联赛背景，分析两队交锋的可能激烈程度（激烈/一般/平和）

返回格式：
{
  "referee": {
    "name": "裁判名",
    "strictness": "严格|中等|宽松",
    "avg_yellow": 数字,
    "description": "风格描述，50字以内"
  },
  "match_context": {
    "importance": "关键战|重要|普通",
    "stakes": "保级/争冠/欧战资格/德比/中游对决等",
    "description": "比赛背景分析，50字以内，重点说明排名和保级/争冠关系"
  },
  "rivalry": {
    "level": "激烈|一般|平和",
    "description": "交锋分析，50字以内"
  },
  "summary": "综合分析总结，80字以内"
}`

const buildPrompt = (data: { home_team: string; visit_team: string; league: string; home_rank: string; visit_rank: string; remain_rounds: number; home_yellow: number; away_yellow: number; league_avg: number }) => {
  return ANALYSIS_PROMPT
    .replace("{home_team}", data.home_team)
    .replace("{visit_team}", data.visit_team)
    .replace("{league}", data.league)
    .replace("{home_rank}", data.home_rank || "未知")
    .replace("{visit_rank}", data.visit_rank || "未知")
    .replace("{remain_rounds}", String(data.remain_rounds))
    .replace("{home_yellow}", String(data.home_yellow))
    .replace("{away_yellow}", String(data.away_yellow))
    .replace("{league_avg}", String(data.league_avg))
}

const callLLMwithClient = async (client: OpenAI, prompt: string, modelOverride?: string) => {
  const model = modelOverride || process.env.LLM_MODEL || "deepseek-chat"
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "你是一个足球数据分析专家。只返回JSON，不要包含其他文字。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })
  return response.choices[0]?.message?.content || ""
}

app.post("/api/analyze-cards", async (req, res) => {
  const { home_team, visit_team, match_group, home_avg_yellow, away_avg_yellow, league_avg_yellow, home_team_rank, visit_team_rank, match_round, api_key, base_url, model } = req.body

  if (!home_team || !visit_team) {
    return res.status(400).json({ error: "缺少必要的比赛信息" })
  }

  // 根据联赛估算总轮次，推算剩余轮次
  const totalRoundsByLeague: Record<string, number> = {
    "英超": 38, "西甲": 38, "意甲": 38, "法甲": 34,
    "德甲": 34, "中超": 30, "中甲": 30, "澳超": 26,
    "J1联赛": 34, "J2联赛": 42, "K1联赛": 38, "K2联赛": 36,
    "俄超": 30, "葡超": 34, "荷甲": 34, "比甲": 30,
    "土超": 38, "捷甲": 30, "希腊超": 26, "丹超": 32,
    "瑞士超": 36, "奥甲": 32, "苏超": 38, "挪超": 30,
    "瑞典超": 30, "芬超": 27, "爱超": 36, "冰岛超": 27,
    "罗甲": 30, "保超": 30, "匈甲": 33, "斯伐超": 32,
    "塞甲联": 30, "克罗甲": 36, "斯洛文甲": 36, "立甲": 36,
    "拉脱甲": 36, "波黑超": 33, "乌克兰超": 30, "哈萨超": 33,
    "阿塞超": 36, "格超": 36, "亚美联": 36, "马其甲": 33,
    "黑山甲": 36, "摩尔甲": 28, "科索沃超": 36, "卢森甲": 30,
    "马耳他超": 26, "爱沙甲": 36, "法罗甲": 27, "威尔士超": 32,
    "北爱超": 38, "直布陀超": 23,
    "巴甲": 38, "阿甲": 27, "乌拉超": 37, "巴拉甲": 44,
    "智甲": 30, "秘鲁甲": 38, "哥伦甲": 40, "厄甲": 30,
    "玻甲": 34, "委内超": 38, "哥斯甲": 44, "洪都甲": 38,
    "萨尔甲": 36, "尼加甲": 38, "巴拿马甲": 40,
    "墨西联": 34, "美职联": 34,
    "摩洛超": 30, "埃及超": 34, "阿尔及甲": 30, "突尼斯甲": 30,
    "南非超": 30, "尼日超": 38, "肯尼亚超": 34, "坦桑超": 30,
    "加纳超": 34, "塞内甲": 26, "赞比亚超": 34,
    "沙特联": 34, "卡塔联": 22, "阿联超": 26, "伊朗超": 30,
    "乌兹超": 26, "伊拉克联": 38, "约旦超": 22, "阿曼超": 26,
    "巴林超": 22, "科威特超": 24, "黎巴嫩超": 22, "叙利亚超": 26,
    "也门甲": 22,
    "印度超": 22, "泰超": 30, "印尼超": 34, "越南联": 26, "马来超": 26,
    "新加坡联": 28, "菲联": 24, "缅甸联": 22, "尼泊甲": 26,
    "蒙古超": 18, "不丹联": 18,
    "澳维超": 28, "澳南超": 22, "澳昆超": 26, "澳西超": 22,
  }
  const total = totalRoundsByLeague[match_group] || 38
  const curRound = parseInt(match_round) || Math.floor(total / 2)
  const remainRounds = Math.max(0, total - curRound + 1)

  // 使用请求中的 API 配置（优先级高于 .env）
  const effectiveApiKey = api_key || process.env.LLM_API_KEY
  const effectiveBaseURL = base_url || process.env.LLM_BASE_URL

  if (!effectiveApiKey) {
    return res.status(400).json({ error: "未配置 API Key" })
  }

  // 每次请求创建独立的 OpenAI 实例，支持用户自定义配置
  const client = new OpenAI({
    apiKey: effectiveApiKey,
    baseURL: effectiveBaseURL,
  })

  try {
    const prompt = buildPrompt({
      home_team,
      visit_team,
      league: match_group || "未知联赛",
      home_rank: home_team_rank || "未知",
      visit_rank: visit_team_rank || "未知",
      remain_rounds: remainRounds,
      home_yellow: home_avg_yellow || 2.0,
      away_yellow: away_avg_yellow || 2.0,
      league_avg: league_avg_yellow || 2.5,
    })

    const content = await callLLMwithClient(client, prompt, model)

    let analysis
    try {
      analysis = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("LLM 返回格式异常")
      }
    }

    res.json(analysis)
  } catch (err: any) {
    console.error("分析失败:", err.message)
    res.status(500).json({ error: err.message || "分析请求失败" })
  }
})

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: process.env.LLM_MODEL || "deepseek-chat" })
})

app.listen(PORT, () => {
  console.log(`🤖 预测服务已启动: http://localhost:${PORT}`)
  console.log(`  模型: ${process.env.LLM_MODEL || "deepseek-chat"}`)
  console.log(`  API Base: ${process.env.LLM_BASE_URL || "https://api.deepseek.com/v1"}`)
})
