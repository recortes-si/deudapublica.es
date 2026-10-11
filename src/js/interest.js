function initInterest({ data, format }) {
  const { interest } = data;
  const choices = document.querySelector('.tax-choices');
  const checkboxes = [...choices.querySelectorAll('input[type="checkbox"]')];
  const adjustments = document.querySelector('.tax-adjustments');
  const sliders = [...adjustments.querySelectorAll('input[type="range"]')];
  const editButtons = [...adjustments.querySelectorAll('[data-edit]')];
  let activeEditor = sliders.find(input => interest.example.ids.includes(input.dataset.measure))?.dataset.measure;
  const summary = document.querySelector('.tax-summary');
  function updateExample() {
    const parameters = Object.fromEntries(sliders.map(input => [input.dataset.measure, Number(input.value)]));
    const ids = checkboxes.filter(input => input.checked).map(input => input.value);
    const result = taxComparison(interest.value, interest.taxes.items, ids, parameters);
    for (const item of interest.taxes.items) {
      document.querySelector(`[data-cost="${item.id}"]`).textContent = `${format(measureCost(item, parameters[item.id]),0)} M€`;
      const slider = sliders.find(input => input.dataset.measure === item.id);
      if (slider) {
        const value = parameters[item.id];
        const text = item.control.type === 'vat' ? `${item.control.from}% → ${value}%` : `−${value}%`;
        document.querySelector(`[data-output="${item.id}"]`).textContent = `${value}%`;
        document.querySelector(`[data-rate="${item.id}"]`).textContent = text;
        slider.setAttribute('aria-valuetext', item.control.type === 'vat' ? `IVA general del ${item.control.from} al ${value} por ciento; todos los tipos bajan proporcionalmente` : `Rebaja proporcional del ${value} por ciento${item.excludeIds?.length ? ", excluyendo RETA" : " de recaudación"}`);
        slider.disabled = !ids.includes(item.id);
      }
    }
    if (!ids.includes(activeEditor)) activeEditor = sliders.find(input => ids.includes(input.dataset.measure))?.dataset.measure;
    adjustments.hidden = !activeEditor;
    adjustments.querySelectorAll('[data-editor]').forEach(panel => { panel.hidden = panel.dataset.editor !== activeEditor; });
    editButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.edit === activeEditor)));
    const share = interest.value ? result.total / interest.value * 100 : 0;
    document.querySelector('#tax-count').textContent = result.count;
    document.querySelector('#tax-total').textContent = `${format(result.total, 0)} M€`;
    summary.classList.toggle('over-budget', !result.covered);
    document.querySelector('#tax-meter-fill').style.width = `${Math.min(100, share)}%`;
    document.querySelector('#tax-meter').setAttribute('aria-label', `La selección equivale al ${format(share)}% del ahorro en intereses`);
    document.querySelector('#tax-status').textContent = result.count === 0 ? `Selecciona medidas. El ahorro anual disponible sería de ${format(interest.value, 0)} M€.` : !result.covered ? `Esta selección no se cubriría: faltarían ${format(-result.remaining, 0)} M€ al año.` : `Se cubrirían las medidas y quedarían ${format(result.remaining, 0)} M€ de ahorro anual.`;
  }
  function selectExample(ids) {
    checkboxes.forEach(input => { input.checked = ids.includes(input.value); });
    sliders.forEach(input => { input.value = interest.taxes.items.find(item => item.id === input.dataset.measure).control.default; });
    activeEditor = sliders.find(input => ids.includes(input.dataset.measure))?.dataset.measure;
    updateExample();
  }
  choices.addEventListener('input', updateExample);
  choices.addEventListener('change', event => {
    if (event.target.checked && sliders.some(input => input.dataset.measure === event.target.value)) activeEditor = event.target.value;
    updateExample();
  });
  adjustments.addEventListener('input', updateExample);
  editButtons.forEach(button => button.addEventListener('click', () => {
    activeEditor = button.dataset.edit;
    checkboxes.find(input => input.value === activeEditor).checked = true;
    updateExample();
  }));
  document.querySelector('#tax-reset').addEventListener('click', () => selectExample(interest.example.ids));
  document.querySelector('#tax-only').addEventListener('click', () => selectExample(data.config.taxOnlyExampleIds));
  updateExample();
}
