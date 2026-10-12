const context = createContext(window.APP_DATA);
initIndicators(context);
const interestView = initInterest(context);
const repaymentView = initRepayment(context);
const fiscalTimeline = createFiscalTimeline(context.data);
const financesView = initFinances(context, fiscalTimeline);
const debtView = initDebtChart(context, fiscalTimeline);
initSpending(context);
const budgetView = initBudget(context);
const growthView = initGrowthChart(context);
const housingView = initHousing(context);
const resizeCharts = () => { interestView.resize(); repaymentView.resize(); debtView.resize(); budgetView.resize(); financesView.resize(); growthView.resize(); housingView.resize(); };
context.charts.subscribe(() => { interestView.refresh(); repaymentView.refresh(); debtView.refresh(); budgetView.refresh(); financesView.refresh(); growthView.refresh(); housingView.refresh(); });
// Coalesce layout changes; keep chart instances and their selected state.
let resizeFrame=0;
const scheduleChartResize=()=>{
  if(resizeFrame)return;
  resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resizeCharts();});
};
const chartSizeObserver=new ResizeObserver(scheduleChartResize);
document.querySelectorAll('[_echarts_instance_]').forEach(element=>chartSizeObserver.observe(element));
window.addEventListener('resize',scheduleChartResize,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleChartResize,{passive:true});
window.addEventListener('pageshow',scheduleChartResize);
context.reducedMotion.addEventListener('change', () => { interestView.refresh(); repaymentView.refresh(); debtView.refresh(); budgetView.refresh(); financesView.refresh(); growthView.refresh(); housingView.refresh(); });

initSharing(context);
