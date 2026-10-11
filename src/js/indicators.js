function initIndicators({ data, format, signed, reducedMotion }) {
  const latest = data.latest;
  const annualFlowEuros = (latest.euros - data.previous.euros) * 1e12;
  const perSecond = annualFlowEuros / (365.25 * 86400);
  const lastObservation = Date.UTC(latest.year + 1, 0, 1);
  const liveDebt = document.querySelector('#live-debt');
  const counterButton = document.querySelector('#counter-pause');
  let counterPaused = reducedMotion.matches;
  const updateCounter = () => {
    const value = latest.euros * 1e12 + perSecond * Math.max(0, (Date.now() - lastObservation) / 1000);
    liveDebt.textContent = `${format(Math.round(value), 0)} €`;
  };
  document.querySelector('#live-per-second').textContent = signed(perSecond) + ' €';
  document.querySelector('#live-per-minute').textContent = signed(perSecond * 60) + ' €';
  document.querySelector('#live-per-day').textContent = signed(perSecond * 86400 / 1e6) + ' M€';
  const updatePause = () => {
    counterButton.textContent = counterPaused ? 'Reanudar contador' : 'Pausar contador';
    counterButton.setAttribute('aria-pressed', String(counterPaused));
  };
  counterButton.addEventListener('click', () => { counterPaused = !counterPaused; updatePause(); if (!counterPaused) updateCounter(); });
  reducedMotion.addEventListener('change', event => { counterPaused = event.matches; updatePause(); });
  updateCounter(); updatePause();
  setInterval(() => { if (!counterPaused && !document.hidden) updateCounter(); }, 1000);
  const ratioChange = latest.ratio - data.previous.ratio;
  document.querySelector('#ratio-change').classList.toggle('down', ratioChange > 0);
  document.querySelector('#debt-change').classList.toggle('down', annualFlowEuros > 0);

}
