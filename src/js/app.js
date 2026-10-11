const context = createContext(window.APP_DATA);
initIndicators(context);
const debtView = initDebtChart(context);
initSpending(context);
const budgetView = initBudget(context);
const resizeCharts = () => { debtView.resize(); budgetView.resize(); };
new ResizeObserver(resizeCharts).observe(document.querySelector('main'));
window.addEventListener('resize', resizeCharts);
context.reducedMotion.addEventListener('change', () => { debtView.refresh(); budgetView.refresh(); });
