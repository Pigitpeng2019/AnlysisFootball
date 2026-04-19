<template>
  <div class="flex flex-col w-full">
    <van-nav-bar title="查看水位走势" right-text="刷新" @click-right="onGetMatchTrend"/>
<!--    <van-cell title="博彩公司" :value="currentCompany" clickable @click="showCompanyList=true"/>-->
    <div id="trend_chart" class="chart"></div>
    <van-dialog v-model:show="showCompanyList" title="" :showConfirmButton="false">
      <van-picker title="选择博彩公司" :columns="columns" @confirm="onConfirmCompany" @cancel="showCompanyList=false"/>
    </van-dialog>
<!--    <van-popup v-model="showCompanyList" >-->
<!--      <van-picker title="选择博彩公司" :columns="columns" @confirm="onConfirmCompany" />-->
<!--    </van-popup>-->
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from "vue"
import { closeToast, PickerOption, showLoadingToast } from "vant"
import * as echarts from "echarts"
import { IAsiaOddsInfo, IEuropeOddsInfo, IMatchInfo, ISizeOddsInfo } from "@/models/match.ts"
import { useMatchStore } from "@/store/currentMatch.ts"
import { getOddsTrendByCompany } from "@/http/api/football.ts"
import { defineTrendChartOption } from "@/utils/tools.ts"

defineOptions({
  name: "TrendList"
})
const props = withDefaults(defineProps<{
  type?: number,
}>(), {
  type: 2,
})
const match: IMatchInfo = useMatchStore().match
const columns = ref<PickerOption[]>([])
const showCompanyList = ref(false)
const currentCompany = ref("")
let trend_chart: any = undefined
const onConfirmCompany = ({ selectedValues }: { selectedValues: string[] }) => {
  currentCompany.value = selectedValues[0]
  showCompanyList.value = false
  onGetMatchTrend()
}
const onGetMatchTrend = () => {
  if (!currentCompany.value || !match || !trend_chart) {
    return
  }
  showLoadingToast({
    message: "趋势加载中...",
    duration: 0,
    forbidClick: true
  })
  // 确保match对象有效
  const safeMatch = match as Required<IMatchInfo>
  const promise = getOddsTrendByCompany(safeMatch, props.type || 2, currentCompany.value)
  if (promise) {
    promise.then((res: any) => {
      if (!res) {
        return
      }
      const options = defineTrendChartOption(props.type || 2)
      if (options && options.xAxis && typeof options.xAxis === 'object') {
        (options.xAxis as any).data = res.x
      }
      if (options && options.series && Array.isArray(options.series)) {
        options.series[0].data = res.y_win
        options.series[1].data = res.y_run
        options.series[2].data = res.y_lose
      }
      trend_chart.setOption(options)
      trend_chart.resize()
    }).finally(() => {
      closeToast()
    })
  } else {
    closeToast()
  }
}
onMounted(() => {
  if (props.type === 1 && match.europe_odds_items) {
    columns.value = match.europe_odds_items.map((item: IEuropeOddsInfo) => {
      return {
        text: item.company_zh || '',
        value: item.company_zh || ''
      }
    })
  } else if (props.type === 3 && match.size_odds_items) {
    columns.value = match.size_odds_items.map((item: IAsiaOddsInfo) => {
      return {
        text: item.company_zh || '',
        value: item.company_zh || ''
      }
    })
  } else if (match.asia_odds_items) {
    columns.value = match.asia_odds_items.map((item: ISizeOddsInfo) => {
      return {
        text: item.company_zh || '',
        value: item.company_zh || ''
      }
    })
  }
  if (columns.value.length > 0) {
    currentCompany.value = columns.value[0].text as string
  }
  const dom = document.getElementById("trend_chart")
  if (dom) {
    trend_chart = echarts.init(dom)
  }
  window.addEventListener("resize", onChartResize)
})
onBeforeUnmount(() => {
  window.removeEventListener("resize", onChartResize)
})
const onChartResize = () => {
  trend_chart?.resize()
}
defineExpose({
  getData: () => {
    onGetMatchTrend()
  }
})
</script>

<style lang="less" scoped>
.chart {
  width: 100%;
  height: 400px;
  background: var(--bg-card);
  border-radius: 12px;
  margin: 12px;
}

:deep(.van-nav-bar) {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

:deep(.van-nav-bar__title) {
  color: var(--text-primary);
}

:deep(.van-nav-bar__text) {
  color: var(--primary-color);
}

:deep(.van-picker) {
  background: var(--bg-secondary);
}

:deep(.van-picker__toolbar) {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

:deep(.van-picker__title) {
  color: var(--text-primary);
  font-weight: 600;
}

:deep(.van-picker-item) {
  color: var(--text-secondary);
  &--selected {
    color: var(--primary-color);
    font-weight: 600;
  }
}

:deep(.van-dialog) {
  background: var(--bg-secondary);
}

:deep(.van-dialog__header) {
  color: var(--text-primary);
}
</style>
