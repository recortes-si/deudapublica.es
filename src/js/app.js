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
const chartViews = [interestView, repaymentView, debtView, budgetView, financesView, growthView, housingView];
const resizeCharts = () => chartViews.forEach(view => view.resize());
const refreshCharts = () => chartViews.forEach(view => view.refresh());
context.charts.subscribe(refreshCharts);
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
context.reducedMotion.addEventListener('change', refreshCharts);

initSharing(context);
