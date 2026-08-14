const DATA_URL = "data/black_nov_2025_dashboard.json";
const BLACK_FRIDAY_DATE = "2025-11-28";
const BLACK_WEEK_NUMBER = 4;

const state = {
  data: null,
  rawData: null,
  limits: {
    line: 20,
    backpack: 10,
    gift: 6,
  },
  selectedHeatmapWeek: 4,
};

const numberFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimalFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const percentFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});
const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const compactCurrencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindControls();
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawData = await response.json();
    state.rawData = rawData;
    state.data = hydrate(rawData);
    document.getElementById("loadError").hidden = true;
    updateSourceStatus("Base Google Sheets validada", true);
    render();
  } catch (error) {
    updateSourceStatus("Erro ao carregar base local", false);
    document.getElementById("loadError").hidden = false;
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((node) => node.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add("active");
    });
  });
}

function bindControls() {
  document.getElementById("lineLimit").addEventListener("change", (event) => {
    state.limits.line = Number(event.target.value);
    renderLineRanking();
  });
  document.getElementById("backpackLimit").addEventListener("change", (event) => {
    state.limits.backpack = Number(event.target.value);
    renderBackpackRanking();
  });
  document.getElementById("giftLimit").addEventListener("change", (event) => {
    state.limits.gift = Number(event.target.value);
    renderGiftRanking();
  });
  document.getElementById("heatmapWeekSelect").addEventListener("change", (event) => {
    state.selectedHeatmapWeek = Number(event.target.value);
    renderSalesHeatmap();
  });
  document.getElementById("downloadSummary").addEventListener("click", () => {
    if (!state.rawData) return;
    const blob = new Blob([JSON.stringify(state.rawData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "black_nov_2025_dashboard.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function hydrate(rawData) {
  const data = cloneData(rawData);
  const totals = data.totals;
  const scope = data.analysisScope || {
    label: "Todos os itens pagos",
    paidUnits: totals.paidUnits,
    paidRevenue: totals.paidRevenue,
    footwearUnits: totals.paidUnits,
    footwearRevenue: totals.paidRevenue,
    excludedPaidLines: [],
  };

  totals.analysisPaidUnits = scope.paidUnits;
  totals.analysisPaidRevenue = scope.paidRevenue;
  totals.avgPaidPrice = ratio(scope.paidRevenue, scope.paidUnits);
  totals.giftShareTotal = ratio(totals.giftUnits, totals.totalUnits);

  data.lineRanking = data.lineRanking.map((row) => ({
    ...row,
    pctUnits: ratio(row.units, scope.paidUnits),
    pctRevenue: ratio(row.revenue, scope.paidRevenue),
    avgPrice: ratio(row.revenue, row.units),
  }));
  const excludedPaidLines = scope.excludedPaidLines || [
    "Mochilas",
    "Acessórios",
    "Vestuário",
    "Óculos",
    "Chinelo e Sandálias",
    "Outros",
  ];
  const isScopedLine = (line) => line === "Mochilas" || !excludedPaidLines.includes(line);
  data.footwearLineRanking = data.lineRanking
    .filter((row) => row.line !== "Mochilas" && !excludedPaidLines.includes(row.line))
    .map((row) => ({
      ...row,
      pctUnits: ratio(row.units, scope.footwearUnits),
      pctRevenue: ratio(row.revenue, scope.footwearRevenue),
    }));

  const lineTotals = new Map(data.footwearLineRanking.map((row) => [row.line, row]));
  const lineColorRows = (data.lineColorBreakdown || [])
    .filter((row) => lineTotals.has(row.line))
    .map((row) => {
      const lineTotal = lineTotals.get(row.line);
      return {
        ...row,
        pctLineUnits: ratio(row.units, lineTotal.units),
        pctLineRevenue: ratio(row.revenue, lineTotal.revenue),
        avgPrice: ratio(row.revenue, row.units),
      };
    });
  const lineColorByLine = new Map();
  lineColorRows.forEach((row) => {
    const current = lineColorByLine.get(row.line) || [];
    current.push(row);
    lineColorByLine.set(row.line, current);
  });
  data.lineColorBreakdown = lineColorRows;
  data.footwearLineRanking = data.footwearLineRanking.map((row) => ({
    ...row,
    colorRows: lineColorByLine.get(row.line) || [],
  }));

  const topProductByBand = new Map(
    (data.priceBandTopProducts || []).map((row) => [
      row.band,
      {
        ...row,
        avgPrice: ratio(row.revenue, row.units),
      },
    ])
  );
  data.valueBands = data.valueBands.map((row) => ({
    ...row,
    pctUnits: ratio(row.units, scope.paidUnits),
    pctRevenue: ratio(row.revenue, scope.paidRevenue),
    avgPrice: ratio(row.revenue, row.units),
    topProduct: topProductByBand.get(row.band) || null,
  }));
  data.priceBandTopProducts = data.valueBands.map((row) => row.topProduct).filter(Boolean);

  data.priceDistribution = [...data.valueBands].sort((a, b) => b.pctUnits - a.pctUnits);

  data.accessorySummary = data.accessorySummary.map((row) => ({
    ...row,
    pctUnits: ratio(row.units, scope.paidUnits),
    pctRevenue: ratio(row.revenue, scope.paidRevenue),
    avgPrice: ratio(row.revenue, row.units),
  }));

  const coreAccessories = data.accessorySummary.filter((row) => row.category === "Mochilas" || row.coreAccessory);
  data.coreAccessories = {
    label: "Mochilas",
    units: sum(coreAccessories, "units"),
    revenue: sum(coreAccessories, "revenue"),
  };
  data.coreAccessories.pctUnits = ratio(data.coreAccessories.units, scope.paidUnits);
  data.coreAccessories.pctRevenue = ratio(data.coreAccessories.revenue, scope.paidRevenue);

  const backpackUnits = sum(data.backpackRanking, "units");
  data.backpackRanking = data.backpackRanking.map((row) => ({
    ...row,
    pctBackpacks: ratio(row.units, backpackUnits),
    avgPrice: ratio(row.revenue, row.units),
  }));

  data.giftRanking = data.giftRanking.map((row) => ({
    ...row,
    pctGiftUnits: ratio(row.units, totals.giftUnits),
    pctTotalUnits: ratio(row.units, totals.totalUnits),
    discountRate: ratio(row.discount, row.gross),
  }));

  if (data.repurchaseAnalysis) {
    const repurchase = data.repurchaseAnalysis;
    const repurchaseTotals = repurchase.totals;
    repurchaseTotals.avgProductsPerPaidOrder = repurchaseTotals.avgProductsPerPaidOrder || ratio(totals.paidUnits, repurchaseTotals.paidOrders);

    repurchase.topMultiProductProducts = repurchase.topMultiProductProducts.filter((row) => isScopedLine(row.line));
    const multiProductUnits = sum(repurchase.topMultiProductProducts, "units");
    const multiProductRevenue = sum(repurchase.topMultiProductProducts, "revenue");
    repurchase.topMultiProductProducts = repurchase.topMultiProductProducts.map((row) => ({
      ...row,
      pctMultiUnits: ratio(row.units, multiProductUnits),
      pctMultiRevenue: ratio(row.revenue, multiProductRevenue),
      avgPrice: ratio(row.revenue, row.units),
    }));

    repurchase.topMultiProductLines = repurchase.topMultiProductLines.filter((row) => isScopedLine(row.line));
    const multiLineUnits = sum(repurchase.topMultiProductLines, "units");
    const multiLineRevenue = sum(repurchase.topMultiProductLines, "revenue");
    repurchase.topMultiProductLines = repurchase.topMultiProductLines.map((row) => ({
      ...row,
      pctMultiUnits: ratio(row.units, multiLineUnits),
      pctMultiRevenue: ratio(row.revenue, multiLineRevenue),
      avgPrice: ratio(row.revenue, row.units),
    }));

    repurchase.topRepeatCustomerProducts = repurchase.topRepeatCustomerProducts.filter((row) => isScopedLine(row.line));
    const repeatUnits = sum(repurchase.topRepeatCustomerProducts, "units");
    const repeatRevenue = sum(repurchase.topRepeatCustomerProducts, "revenue");
    repurchase.topRepeatCustomerProducts = repurchase.topRepeatCustomerProducts.map((row) => ({
      ...row,
      pctRepeatUnits: ratio(row.units, repeatUnits),
      pctRepeatRevenue: ratio(row.revenue, repeatRevenue),
      avgPrice: ratio(row.revenue, row.units),
    }));
  }

  if (data.salesHeatmap) {
    const heatmap = data.salesHeatmap;
    const heatmapTotals = heatmap.totals || {};

    heatmap.cells = (heatmap.cells || []).map((row) => ({
      ...row,
      dayLabel: row.dayLabel || formatShortDate(row.date),
      dayDisplay: `${row.dayLabel || formatShortDate(row.date)} (${row.weekday || "-"})`,
      hourLabel: formatHour(row.hour),
      orderShare: ratio(row.orders, heatmapTotals.orders),
      unitShare: ratio(row.units, heatmapTotals.units),
      revenueShare: ratio(row.revenue, heatmapTotals.revenue),
      intensity: Number(row.intensity) || ratio(row.orders, heatmapTotals.peakOrders),
    }));

    heatmap.weeklySummary = (heatmap.weeklySummary || []).map((row) => ({
      ...row,
      dateRange: formatDateRange(row.start, row.end),
      peakDayLabel: row.peakDayLabel || formatShortDate(row.peakDate),
      peakHourLabel: formatHour(row.peakHour),
    }));

    heatmap.dailySummary = (heatmap.dailySummary || []).map((row) => ({
      ...row,
      dayLabel: row.dayLabel || formatShortDate(row.date),
      dayDisplay: `${row.dayLabel || formatShortDate(row.date)} (${row.weekday || "-"})`,
      peakHourLabel: formatHour(row.peakHour),
    }));

    heatmap.hourSummary = (heatmap.hourSummary || []).map((row) => ({
      ...row,
      hourLabel: formatHour(row.hour),
    }));

    heatmap.topSlots = (heatmap.topSlots || []).map((row) => ({
      ...row,
      dayLabel: row.dayLabel || formatShortDate(row.date),
      hourLabel: formatHour(row.hour),
    }));
  }

  return data;
}

function render() {
  if (!state.data) return;
  renderSource();
  renderExecutiveBrief();
  renderKpis();
  renderAnalysisBoard();
  renderRepurchaseBoard();
  renderExpandedRecurrence();
  renderLineRanking();
  renderBandCards();
  renderValueBands();
  renderAccessoryCards();
  renderAccessorySummary();
  renderBackpackRanking();
  renderPriceDistribution();
  renderGiftRanking();
  renderRepurchaseTables();
  renderSalesHeatmap();
  renderAudit();
  document.getElementById("downloadSummary").disabled = false;
}

function renderSource() {
  const link = document.getElementById("sourceLink");
  link.href = state.data.source.spreadsheetUrl;
}

function renderExecutiveBrief() {
  const data = state.data;
  const heatmap = data.salesHeatmap || {};
  const heatmapTotals = heatmap.totals || {};
  const weeklyRows = heatmap.weeklySummary || [];
  const topWeek = [...weeklyRows].sort((a, b) => (b.orders || 0) - (a.orders || 0))[0];
  const blackDayCells = (heatmap.cells || []).filter((cell) => isBlackFridayDate(cell.date));
  const blackDayOrders = sum(blackDayCells, "orders");
  const blackDayUnits = sum(blackDayCells, "units");
  const topLine = data.footwearLineRanking[0];
  const topBand = data.valueBands[0];

  setText(
    "briefThesis",
    "Demanda concentrada no fim de novembro: priorizar estoque, disponibilidade e operacao para a Semana 4, com foco nas linhas lideres, mochilas e brindes oficiais."
  );
  setText("briefWeekSignal", topWeek ? `${topWeek.label} | ${percentFmt.format(topWeek.orderShare || ratio(topWeek.orders, heatmapTotals.orders))}` : "-");
  setText("briefWeekDetail", topWeek ? `${numberFmt.format(topWeek.orders)} pedidos pagos no periodo mais forte.` : "-");
  setText("briefBlackDaySignal", `${formatShortDate(BLACK_FRIDAY_DATE)} | ${numberFmt.format(blackDayOrders)}`);
  setText("briefBlackDayDetail", `${numberFmt.format(blackDayUnits)} unidades pagas no dia da Black.`);
  setText("briefLineSignal", topLine ? `${topLine.line} | ${percentFmt.format(topLine.pctUnits)}` : "-");
  setText("briefLineDetail", topLine ? `${numberFmt.format(topLine.units)} unidades | ${currencyFmt.format(topLine.revenue)}.` : "-");
  setText("briefBandSignal", topBand ? `${formatBandLabel(topBand.band)} | ${percentFmt.format(topBand.pctUnits)}` : "-");
  setText("briefBandDetail", topBand ? `${numberFmt.format(topBand.units)} unidades | top: ${formatTopProduct(topBand.topProduct, 34)}.` : "-");
}

function renderKpis() {
  const { totals, period } = state.data;
  const scope = state.data.analysisScope;
  setText("kpiRevenue", compactCurrencyFmt.format(totals.analysisPaidRevenue));
  setText("kpiAvgPrice", `Preço médio analisado: ${currencyFmt.format(totals.avgPaidPrice)}`);
  setText("kpiPaidUnits", numberFmt.format(totals.analysisPaidUnits));
  setText("kpiOrders", scope ? `${scope.label} | exclui ${numberFmt.format(scope.excludedPaidUnits)} unid.` : `${numberFmt.format(totals.orders)} pedidos totais na base`);
  setText("kpiGiftUnits", numberFmt.format(totals.giftUnits));
  setText("kpiGiftValue", `${currencyFmt.format(totals.giftListValue)} em valor de tabela oficial`);
  setText("kpiRows", numberFmt.format(totals.itemRows));
  setText("kpiPeriod", `${formatDate(period.start)} a ${formatDate(period.end)}`);
}

function renderAnalysisBoard() {
  const data = state.data;
  const scope = data.analysisScope || data.totals;
  const lineRows = data.footwearLineRanking;
  const topLine = lineRows[0];
  const topBand = data.valueBands[0];
  const topBackpack = data.backpackRanking[0];
  const topGift = data.giftRanking[0];
  const valueRowsWithTotal = [
    ...data.valueBands,
    {
      band: "Total analisado",
      units: scope.paidUnits,
      revenue: scope.paidRevenue,
      pctUnits: 1,
      pctRevenue: 1,
      avgPrice: data.totals.avgPaidPrice,
      isTotal: true,
    },
  ];
  const accessoryRowsWithTotal = [
    data.coreAccessories,
    {
      category: "Total analisado",
      units: scope.paidUnits,
      revenue: scope.paidRevenue,
      pctUnits: 1,
      pctRevenue: 1,
      isTotal: true,
    },
  ];

  setText("mainLineSignal", topLine ? `${topLine.line} | ${percentFmt.format(topLine.pctUnits)}` : "-");
  setText("mainBandSignal", topBand ? `${formatBandLabel(topBand.band)} | ${percentFmt.format(topBand.pctUnits)}` : "-");
  setText("mainAccessorySignal", `${numberFmt.format(data.coreAccessories.units)} unid. | ${percentFmt.format(data.coreAccessories.pctUnits)}`);
  setText("mainBackpackSignal", topBackpack ? `${numberFmt.format(topBackpack.units)} unid.` : "-");
  setText("mainValueShareSignal", topBand ? `${percentFmt.format(topBand.pctRevenue)} da receita` : "-");
  setText("mainGiftSignal", topGift ? `${numberFmt.format(topGift.units)} unid. | ${percentFmt.format(topGift.pctGiftUnits)}` : "-");

  renderCompactList("mainLineRanking", lineRows.slice(0, 6), {
    name: (row) => row.line,
    meta: (row) => `${numberFmt.format(row.units)} unid. | ${percentFmt.format(row.pctUnits)} volume | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctUnits,
  });

  renderCompactList("mainBandRanking", valueRowsWithTotal, {
    name: (row) => row.isTotal ? row.band : formatBandLabel(row.band),
    meta: (row) => row.isTotal
      ? `${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.revenue)} receita`
      : `${numberFmt.format(row.units)} unid. | ${percentFmt.format(row.pctUnits)} volume | top: ${formatTopProduct(row.topProduct, 26)}`,
    pct: (row) => row.pctUnits,
  });

  renderCompactList("mainAccessoryRanking", accessoryRowsWithTotal, {
    name: (row) => row.label || row.category,
    meta: (row) => row.isTotal
      ? `${numberFmt.format(row.units)} unid. | base analisada`
      : `${numberFmt.format(row.units)} unid. | ${percentFmt.format(row.pctUnits)} volume analisado | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctUnits,
  });

  renderCompactList("mainBackpackRanking", data.backpackRanking.slice(0, 6), {
    name: (row) => row.product,
    meta: (row) => `${numberFmt.format(row.units)} unid. | ${percentFmt.format(row.pctBackpacks)} mochilas | ${row.sku || "sem SKU"}`,
    pct: (row) => row.pctBackpacks,
  });

  renderCompactList("mainValueShare", valueRowsWithTotal, {
    name: (row) => row.isTotal ? row.band : formatBandLabel(row.band),
    meta: (row) => row.isTotal
      ? `${currencyFmt.format(row.revenue)} receita analisada | ${numberFmt.format(row.units)} unid.`
      : `${percentFmt.format(row.pctUnits)} das unidades | ${percentFmt.format(row.pctRevenue)} da receita`,
    pct: (row) => row.pctRevenue,
  });

  renderCompactList("mainGiftRanking", data.giftRanking.slice(0, 6), {
    name: (row) => row.gift,
    meta: (row) => `${numberFmt.format(row.units)} unid. | ${compactCurrencyFmt.format(row.gross)} tabela`,
    pct: (row) => row.pctGiftUnits,
  });
}

function renderRepurchaseBoard() {
  const repurchase = state.data.repurchaseAnalysis;
  if (!repurchase) return;

  const { totals } = repurchase;
  const topMultiProduct = repurchase.topMultiProductProducts[0];
  const topMultiLine = repurchase.topMultiProductLines[0];
  const topRepeatProduct = repurchase.topRepeatCustomerProducts[0];

  setText(
    "repurchaseBaseNote",
    `Base: ${numberFmt.format(totals.paidOrders)} pedidos pagos e ${numberFmt.format(totals.paidCustomers)} clientes pagos; mede novembro, sem recorrência histórica.`
  );
  setText("multiOrderShare", percentFmt.format(totals.multiProductOrderShare));
  setText(
    "multiOrderDetail",
    `${numberFmt.format(totals.multiProductOrders)} de ${numberFmt.format(totals.paidOrders)} pedidos pagos.`
  );
  setText("multiRevenueShare", percentFmt.format(totals.multiProductRevenueShare));
  setText(
    "multiRevenueDetail",
    `${compactCurrencyFmt.format(totals.multiProductRevenue)} de ${compactCurrencyFmt.format(state.data.totals.paidRevenue)} pagos | média só desses pedidos: ${decimalFmt.format(totals.avgUnitsPerMultiProductOrder)} itens.`
  );
  setText("repeatCustomers", numberFmt.format(totals.repeatCustomers));
  setText(
    "repeatCustomersDetail",
    `${percentFmt.format(totals.repeatCustomerShare)} dos clientes pagos fizeram 2+ pedidos na Black.`
  );
  setText("repeatOrderShare", percentFmt.format(totals.repeatOrderShare));
  setText(
    "repeatOrderDetail",
    `${numberFmt.format(totals.repeatOrders)} pedidos desses clientes | ${compactCurrencyFmt.format(totals.repeatRevenue)}.`
  );
  setText("avgCartAllBlack", `${decimalFmt.format(totals.avgProductsPerPaidOrder)} itens`);
  setText(
    "avgCartAllBlackDetail",
    `${numberFmt.format(state.data.totals.paidUnits)} itens pagos / ${numberFmt.format(totals.paidOrders)} pedidos pagos.`
  );

  setText("topMultiProductSignal", topMultiProduct ? `${numberFmt.format(topMultiProduct.units)} unid.` : "-");
  setText("topMultiLineSignal", topMultiLine ? `${topMultiLine.line} | ${numberFmt.format(topMultiLine.units)} unid.` : "-");
  setText("topRepeatProductSignal", topRepeatProduct ? `${numberFmt.format(topRepeatProduct.units)} unid.` : "-");

  renderMiniList("multiProductProductsMini", repurchase.topMultiProductProducts.slice(0, 6), {
    name: (row) => shortText(row.product, 38),
    detail: (row) => `${row.line} | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctMultiUnits,
  });

  renderMiniList("multiProductLinesMini", repurchase.topMultiProductLines.slice(0, 6), {
    name: (row) => row.line,
    detail: (row) => `${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctMultiUnits,
  });

  renderMiniList("repeatProductsMini", repurchase.topRepeatCustomerProducts.slice(0, 6), {
    name: (row) => shortText(row.product, 38),
    detail: (row) => `${row.line} | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctRepeatUnits,
  });
}

function renderExpandedRecurrence() {
  const recurrence = state.data.recurrenceExpanded;
  const container = document.getElementById("recurrenceExpandedCards");
  if (!recurrence || !container) return;

  const periods = recurrence.periods || [];
  const cohort = recurrence.postBlackCohort;
  const maxRepeatRate = Math.max(...periods.map((row) => Number(row.repeatCustomerRate) || 0), 0.01);
  const black = periods.find((row) => row.key === "black");
  const after = periods.find((row) => row.key === "after_3m");
  const deltaAfterBlack = after && black ? after.repeatCustomerRate - black.repeatCustomerRate : 0;
  const direction = deltaAfterBlack >= 0 ? "acima" : "abaixo";

  setText(
    "recurrenceExpandedInsight",
    cohort?.totals
      ? `${numberFmt.format(cohort.totals.returningCustomers)} clientes de novembro voltaram nos 3 meses seguintes (${percentFmt.format(cohort.totals.returnRate)} da base Black).`
      : after && black
      ? `Depois da Black, a recorrência agregada ficou ${decimalFmt.format(Math.abs(deltaAfterBlack) * 100)} p.p. ${direction} de novembro; isso ainda não prova retorno da coorte nova.`
      : recurrence.insights?.[0] || "Comparação agregada entre antes, Black e depois."
  );
  setText(
    "recurrenceExpandedNote",
    recurrence.cohortLimitation ||
      "Leitura agregada: para medir cashback, precisa cruzar os clientes novos da Black contra os pedidos de dezembro, janeiro e fevereiro em uma base unificada."
  );
  renderPostBlackCohort(cohort);

  container.innerHTML = periods
    .map((row) => {
      const repeatRate = Number(row.repeatCustomerRate) || 0;
      const width = clamp((repeatRate / maxRepeatRate) * 100, 2, 100);
      const isBlack = row.key === "black";
      const title = isBlack ? "Clientes que compraram 2+ vezes na Black" : "Clientes com 2+ pedidos no período";
      const range = `${formatDate(row.start)} a ${formatDate(row.end)}`;

      return `
        <article class="recurrence-card${isBlack ? " is-black" : ""}">
          <div class="recurrence-card-head">
            <span>${escapeHtml(row.label)}</span>
            <small>${escapeHtml(range)}</small>
          </div>
          <strong>${percentFmt.format(repeatRate)}</strong>
          <div class="recurrence-bar" aria-hidden="true">
            <span style="width: ${width}%"></span>
          </div>
          <dl>
            <div>
              <dt>${escapeHtml(title)}</dt>
              <dd>${numberFmt.format(row.repeatCustomers)} de ${numberFmt.format(row.customers)}</dd>
            </div>
            <div>
              <dt>Pedidos desses clientes</dt>
              <dd>${numberFmt.format(row.repeatOrders)} (${percentFmt.format(row.repeatOrderShare)})</dd>
            </div>
            <div>
              <dt>Carrinho médio geral</dt>
              <dd>${decimalFmt.format(row.avgProductsPerOrder)} itens/pedido</dd>
            </div>
          </dl>
        </article>
      `;
    })
    .join("");
}

function renderPostBlackCohort(cohort) {
  const el = document.getElementById("postBlackCohort");
  if (!el) return;

  if (!cohort?.totals) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }

  const t = cohort.totals;
  const firstMonths = cohort.firstReturnMonths || [];
  const purchaseMonths = cohort.purchaseMonths || [];

  const renderMonthRows = (rows, mode) =>
    rows
      .map((row) => {
        const isFirstReturn = mode === "first";
        const pct = Number(isFirstReturn ? row.pctReturning : row.pctPostRevenue) || 0;
        const width = clamp(pct * 100, 2, 100);
        const detail = isFirstReturn
          ? `${percentFmt.format(row.pctReturning)} dos retornos | ${percentFmt.format(row.pctBlackCustomers)} da base Black`
          : `${numberFmt.format(row.orders)} pedidos | ${currencyFmt.format(row.revenue)}`;

        return `
          <article class="cohort-month-row">
            <header>
              <span>${escapeHtml(row.label)}</span>
              <strong>${numberFmt.format(row.customers)} clientes</strong>
            </header>
            <div class="cohort-month-bar" aria-hidden="true">
              <span style="width: ${width}%"></span>
            </div>
            <small>${escapeHtml(detail)}</small>
          </article>
        `;
      })
      .join("");

  el.hidden = false;
  el.innerHTML = `
    <div class="post-cohort-head">
      <div>
        <p class="eyebrow">Coorte pos-Black</p>
        <h4>Clientes de novembro que recompraram nos 3 meses seguintes</h4>
      </div>
      <strong>${numberFmt.format(t.returningCustomers)} de ${numberFmt.format(t.blackCustomers)} | ${percentFmt.format(t.returnRate)}</strong>
    </div>
    <div class="post-cohort-kpis">
      <div>
        <span>Pedidos no pos-Black</span>
        <strong>${numberFmt.format(t.postOrders)}</strong>
        <small>${currencyFmt.format(t.postRevenue)} | ${numberFmt.format(t.postUnits)} unid.</small>
      </div>
      <div>
        <span>1 pedido na Black</span>
        <strong>${percentFmt.format(t.blackSingleOrderReturnRate)}</strong>
        <small>${numberFmt.format(t.blackSingleOrderReturningCustomers)} de ${numberFmt.format(t.blackSingleOrderCustomers)} voltaram</small>
      </div>
      <div>
        <span>2+ pedidos na Black</span>
        <strong>${percentFmt.format(t.blackMultiOrderReturnRate)}</strong>
        <small>${numberFmt.format(t.blackMultiOrderReturningCustomers)} de ${numberFmt.format(t.blackMultiOrderCustomers)} voltaram; ${decimalFmt.format(t.multiVsSingleReturnRate)}x a taxa</small>
      </div>
    </div>
    <div class="post-cohort-columns">
      <section>
        <h4>Primeiro retorno</h4>
        <div class="cohort-month-list">${renderMonthRows(firstMonths, "first")}</div>
      </section>
      <section>
        <h4>Compras no mes</h4>
        <div class="cohort-month-list">${renderMonthRows(purchaseMonths, "purchase")}</div>
      </section>
    </div>
  `;
}

function renderOverview() {
  const data = state.data;
  const topLine = data.footwearLineRanking[0];
  const topBand = data.valueBands[0];
  const topGift = data.giftRanking[0];
  const topBackpack = data.backpackRanking[0];
  const top3Lines = data.footwearLineRanking.slice(0, 3);
  const top3LineUnits = sum(top3Lines, "units");
  const top5GiftUnits = sum(data.giftRanking.slice(0, 5), "units");

  setText("overviewTopLine", `${topLine.line} | ${percentFmt.format(topLine.pctUnits)}`);
  setText("overviewTopBand", `${formatBandLabel(topBand.band)} | ${percentFmt.format(topBand.pctUnits)}`);
  setText("overviewPurchaseSignal", `${percentFmt.format(ratio(top3LineUnits, data.analysisScope?.footwearUnits || data.totals.paidUnits))} no Top 3`);
  setText("overviewAccessoriesSignal", `${percentFmt.format(data.coreAccessories.pctUnits)} do volume analisado`);
  setText("overviewBackpackSignal", `${numberFmt.format(topBackpack.units)} unid. líder`);
  setText("overviewGiftSignal", `${numberFmt.format(topGift.units)} unid. líder`);

  renderMiniList("overviewLines", data.footwearLineRanking.slice(0, 5), {
    name: (row) => row.line,
    detail: (row) => `${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctUnits,
  });

  renderMiniList("overviewBands", data.valueBands, {
    name: (row) => formatBandLabel(row.band),
    detail: (row) => `${numberFmt.format(row.units)} unid. | top: ${formatTopProduct(row.topProduct, 34)}`,
    pct: (row) => row.pctUnits,
  });

  renderMiniList("overviewAccessories", [data.coreAccessories], {
    name: (row) => row.label || row.category,
    detail: (row) => `${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.revenue)}`,
    pct: (row) => row.pctUnits,
  });

  renderMiniList("overviewBackpacks", data.backpackRanking.slice(0, 5), {
    name: (row) => shortText(row.product, 36),
    detail: (row) => `${numberFmt.format(row.units)} unid. | ${row.sku || "sem SKU"}`,
    pct: (row) => row.pctBackpacks,
  });

  renderMiniList("overviewGifts", data.giftRanking.slice(0, 5), {
    name: (row) => shortText(row.gift, 36),
    detail: (row) => `${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.gross)} tabela`,
    pct: (row) => row.pctGiftUnits,
  });

  renderTakeaways([
    {
      label: "Top 3 linhas",
      value: percentFmt.format(ratio(top3LineUnits, data.analysisScope?.footwearUnits || data.totals.paidUnits)),
      detail: `${top3Lines.map((row) => row.line).join(", ")} somam ${numberFmt.format(top3LineUnits)} unidades.`,
    },
    {
      label: "Preço dominante",
      value: formatBandLabel(topBand.band),
      detail: `${percentFmt.format(topBand.pctUnits)} das unidades analisadas; top: ${formatTopProduct(topBand.topProduct, 34)}.`,
    },
    {
      label: "Mochilas",
      value: numberFmt.format(data.coreAccessories.units),
      detail: `Mochilas somam ${currencyFmt.format(data.coreAccessories.revenue)} no escopo analisado.`,
    },
    {
      label: "Top 5 brindes",
      value: percentFmt.format(ratio(top5GiftUnits, data.totals.giftUnits)),
      detail: `${numberFmt.format(top5GiftUnits)} unidades concentram os principais brindes.`,
    },
  ]);
}

function renderRepurchaseTables() {
  const repurchase = state.data.repurchaseAnalysis;
  if (!repurchase) return;

  renderTable("multiProductProducts", repurchase.topMultiProductProducts, [
    column("Produto", "product", "name"),
    column("Linha", "line", "text"),
    column("Unidades", "units", "number"),
    column("% pedidos 2+", "pctMultiUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("Preço médio", "avgPrice", "currency"),
  ]);

  renderTable("repeatCustomerProducts", repurchase.topRepeatCustomerProducts, [
    column("Produto", "product", "name"),
    column("Linha", "line", "text"),
    column("Unidades", "units", "number"),
    column("% clientes Black 2+", "pctRepeatUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("Preço médio", "avgPrice", "currency"),
  ]);

  renderTable("multiProductLines", repurchase.topMultiProductLines, [
    column("Linha", "line", "name"),
    column("Unidades", "units", "number"),
    column("% pedidos 2+", "pctMultiUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("% receita", "pctMultiRevenue", "percent"),
    column("Preço médio", "avgPrice", "currency"),
  ]);
}

function renderSalesHeatmap() {
  const heatmap = state.data.salesHeatmap;
  if (!heatmap) return;

  const topWeek = [...(heatmap.weeklySummary || [])].sort((a, b) => b.orders - a.orders)[0];
  const weeks = heatmap.weekDefinition || heatmap.weeklySummary || [];
  const weekSummaryByNumber = new Map((heatmap.weeklySummary || []).map((row) => [Number(row.week), row]));
  const selectedWeekNumber = Number(state.selectedHeatmapWeek || topWeek?.week || weeks[0]?.week || 1);
  const selectedWeek = weeks.find((week) => Number(week.week) === selectedWeekNumber);
  const selectedSummary = weekSummaryByNumber.get(selectedWeekNumber);
  const selectedCells = heatmap.cells.filter((cell) => Number(cell.week) === selectedWeekNumber);
  const selectedTopHour = getTopHeatmapHour(selectedCells);
  const selectedTopSlot = [...selectedCells].sort((a, b) => b.orders - a.orders || a.day - b.day || a.hour - b.hour)[0];
  const totals = heatmap.totals || {};
  const weekSelect = document.getElementById("heatmapWeekSelect");
  if (weekSelect) weekSelect.value = String(selectedWeekNumber);

  const summaryRows = [
    {
      label: "Base do heat map",
      value: `${numberFmt.format(totals.orders)} pedidos`,
      detail: `${numberFmt.format(totals.units)} unidades pagas | 30 dias x 24 horas`,
    },
    {
      label: "Semana selecionada",
      value: selectedSummary ? selectedSummary.label : "-",
      detail: selectedSummary ? `${numberFmt.format(selectedSummary.orders)} pedidos | ${percentFmt.format(selectedSummary.orderShare)} do volume pago` : "-",
    },
    {
      label: "Horario lider na semana",
      value: selectedTopHour ? selectedTopHour.hourLabel : "-",
      detail: selectedTopHour ? `${numberFmt.format(selectedTopHour.orders)} pedidos nos dias selecionados` : "-",
    },
    {
      label: "Pico dia/hora",
      value: selectedTopSlot ? `${selectedTopSlot.dayLabel} | ${selectedTopSlot.hourLabel}` : "-",
      detail: selectedTopSlot ? `${numberFmt.format(selectedTopSlot.orders)} pedidos | ${numberFmt.format(selectedTopSlot.units)} unidades` : "-",
    },
  ];

  const summaryNode = document.getElementById("heatmapSummary");
  if (summaryNode) {
    summaryNode.innerHTML = summaryRows
      .map((row) => `
        <article class="heatmap-card">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
          <p>${escapeHtml(row.detail)}</p>
        </article>
      `)
      .join("");
  }

  const heatmapNode = document.getElementById("salesHeatmap");
  if (heatmapNode) {
    const weekNumber = selectedWeekNumber;
    const isBlackWeek = weekNumber === BLACK_WEEK_NUMBER;
    const cellsByDayHour = new Map(selectedCells.map((cell) => [`${Number(cell.day)}|${Number(cell.hour)}`, cell]));
    const days = [...new Map([...selectedCells].sort((a, b) => Number(a.day) - Number(b.day)).map((cell) => [Number(cell.day), cell])).values()];
    const hours = Array.from({ length: 24 }, (_, hour) => hour);
    const dailyTotalsByDay = new Map(
      days.map((day) => {
        const dayCells = selectedCells.filter((cell) => Number(cell.day) === Number(day.day));
        return [
          Number(day.day),
          {
            orders: sum(dayCells, "orders"),
            units: sum(dayCells, "units"),
            revenue: sum(dayCells, "revenue"),
          },
        ];
      })
    );
    const dateRange = selectedWeek ? formatDateRange(selectedWeek.start, selectedWeek.end) : "-";
    heatmapNode.innerHTML = `
      <article class="heatmap-week ${isBlackWeek ? "is-black-week" : ""}">
        <div class="heatmap-week-head">
          <div>
            <div class="heatmap-week-title">
              <strong>${escapeHtml(selectedWeek?.label || `Semana ${weekNumber}`)}</strong>
              ${isBlackWeek ? `<span class="heatmap-week-badge">Semana da Black</span>` : ""}
            </div>
            <span>${escapeHtml(dateRange)}</span>
          </div>
          <p>${numberFmt.format(selectedSummary?.orders || 0)} pedidos | pico ${escapeHtml(selectedSummary?.peakDayLabel || "-")} ${escapeHtml(selectedSummary?.peakHourLabel || "-")}</p>
        </div>
        <div class="heatmap-grid" role="table" aria-label="${escapeHtml(selectedWeek?.label || `Semana ${weekNumber}`)} por dia e hora">
          <div class="heatmap-corner" role="columnheader">Dia</div>
          ${hours.map((hour) => `<div class="heatmap-hour-head" role="columnheader">${formatHour(hour)}</div>`).join("")}
          <div class="heatmap-total-head" role="columnheader">Total</div>
          ${days
            .map((day) => `
              <div class="heatmap-day-label ${isBlackFridayDate(day.date) ? "is-black-day" : ""}" role="rowheader">
                <strong>${escapeHtml(day.dayLabel)}</strong>
                <span>${escapeHtml(day.weekday || "")}</span>
                ${isBlackFridayDate(day.date) ? `<em class="heatmap-day-chip">Black</em>` : ""}
              </div>
              ${hours.map((hour) => heatmapCell(cellsByDayHour.get(`${Number(day.day)}|${hour}`))).join("")}
              ${heatmapDayTotalCell(day, dailyTotalsByDay.get(Number(day.day)))}
            `)
            .join("")}
        </div>
      </article>
    `;
  }

  const tableRows = [...selectedCells].sort((a, b) => Number(a.day) - Number(b.day) || Number(a.hour) - Number(b.hour));
  renderTable("heatmapTable", tableRows, [
    column("Semana", "label", "name"),
    column("Dia", "dayDisplay", "text"),
    column("Hora", "hourLabel", "text"),
    column("Pedidos", "orders", "number"),
    column("Unidades", "units", "number"),
    column("% pedidos", "orderShare", "bar"),
    column("Receita", "revenue", "currency"),
    column("% receita", "revenueShare", "percent"),
  ]);
}

function renderInsights() {
  const data = state.data;
  const topLine = data.footwearLineRanking[0];
  const topBand = data.valueBands[0];
  const topGift = data.giftRanking[0];

  setText("insightTopLine", topLine.line);
  setText(
    "insightTopLineDetail",
    `${numberFmt.format(topLine.units)} unidades, ${percentFmt.format(topLine.pctUnits)} do volume de tênis.`
  );
  setText("insightTopBand", formatBandLabel(topBand.band));
  setText(
    "insightTopBandDetail",
    `${numberFmt.format(topBand.units)} unidades, ${percentFmt.format(topBand.pctUnits)} do volume analisado; top: ${formatTopProduct(topBand.topProduct, 36)}.`
  );
  setText("insightAccessories", percentFmt.format(data.coreAccessories.pctUnits));
  setText(
    "insightAccessoriesDetail",
    `${numberFmt.format(data.coreAccessories.units)} unidades de mochilas no escopo analisado.`
  );
  setText("insightGift", shortText(topGift.gift, 42));
  setText(
    "insightGiftDetail",
    `${numberFmt.format(topGift.units)} unidades, ${percentFmt.format(topGift.pctGiftUnits)} dos brindes.`
  );
}

function renderLineRanking() {
  if (!state.data) return;
  renderLineDropdowns("lineRanking", state.data.footwearLineRanking.slice(0, state.limits.line));
}

function renderBandCards() {
  const rows = state.data.valueBands;
  document.getElementById("bandCards").innerHTML = rows
    .map((row) => metricCard(formatBandLabel(row.band), numberFmt.format(row.units), `${percentFmt.format(row.pctUnits)} do volume | top: ${formatTopProduct(row.topProduct, 34)}`, row.pctUnits))
    .join("");
}

function renderValueBands() {
  renderTable("valueBands", state.data.valueBands, [
    { label: "Faixa em R$", value: (row) => formatBandLabel(row.band), type: "text" },
    { label: "Top 1 produto", value: (row) => row.topProduct?.product || "-", type: "name" },
    { label: "Top unid.", value: (row) => row.topProduct?.units || 0, type: "number", align: "right" },
    column("Unidades", "units", "number"),
    column("% unidades", "pctUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("% receita", "pctRevenue", "percent"),
    column("Preço médio", "avgPrice", "currency"),
  ]);
}

function renderAccessoryCards() {
  const rows = [state.data.coreAccessories];
  document.getElementById("accessoryCards").innerHTML = rows
    .map((row) => metricCard(row.label || row.category, numberFmt.format(row.units), `${percentFmt.format(row.pctUnits)} do volume analisado`, row.pctUnits))
    .join("");
}

function renderAccessorySummary() {
  renderTable("accessorySummary", state.data.accessorySummary, [
    column("Categoria", "category", "text"),
    column("Unidades", "units", "number"),
    column("% unidades", "pctUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("% receita", "pctRevenue", "percent"),
    column("Preço médio", "avgPrice", "currency"),
  ]);
}

function renderBackpackRanking() {
  if (!state.data) return;
  renderTable("backpackRanking", state.data.backpackRanking.slice(0, state.limits.backpack), [
    column("Produto", "product", "name"),
    column("SKU", "sku", "text"),
    column("Unidades", "units", "number"),
    column("% mochilas", "pctBackpacks", "bar"),
    column("Receita", "revenue", "currency"),
    column("Preço médio", "avgPrice", "currency"),
  ]);
}

function renderPriceDistribution() {
  renderTable("priceDistribution", state.data.priceDistribution, [
    { label: "Faixa em R$", value: (row) => formatBandLabel(row.band), type: "text" },
    { label: "Top 1 produto", value: (row) => row.topProduct?.product || "-", type: "name" },
    column("Unidades", "units", "number"),
    column("% unidades", "pctUnits", "bar"),
    column("Receita", "revenue", "currency"),
    column("% receita", "pctRevenue", "percent"),
    column("Preço médio", "avgPrice", "currency"),
  ]);
}

function renderGiftRanking() {
  if (!state.data) return;
  renderTable("giftRanking", state.data.giftRanking.slice(0, state.limits.gift), [
    column("Brinde", "gift", "name"),
    column("SKU", "sku", "text"),
    column("Unidades", "units", "number"),
    column("% brindes oficiais", "pctGiftUnits", "bar"),
    column("% total", "pctTotalUnits", "percent"),
    column("Valor tabela", "gross", "currency"),
    column("Desconto", "discount", "currency"),
  ]);
}

function renderAudit() {
  const { source, totals, period } = state.data;
  const scope = state.data.analysisScope;
  const repurchaseTotals = state.data.repurchaseAnalysis?.totals;
  const heatmapTotals = state.data.salesHeatmap?.totals;
  const totalUnitDetail = [
    `${numberFmt.format(totals.paidUnits)} pagas`,
    `${numberFmt.format(totals.giftUnits)} brindes oficiais`,
  ];

  if (totals.discountedNonOfficialUnits) {
    totalUnitDetail.push(`${numberFmt.format(totals.discountedNonOfficialUnits)} descontadas fora da lista`);
  }

  const cards = [
    { label: "Período validado", value: `${formatDate(period.start)} a ${formatDate(period.end)}`, detail: `${source.minDate} até ${source.maxDate}` },
    { label: "Planilha original", value: source.title, detail: source.sourceSheet, href: source.spreadsheetUrl },
    { label: "Cópia de cálculo", value: source.calcSheet, detail: source.workSpreadsheetId, href: source.workSpreadsheetUrl },
    { label: "Linhas de item", value: numberFmt.format(totals.itemRows), detail: `${numberFmt.format(totals.orders)} pedidos totais na base` },
    { label: "Unidades totais", value: numberFmt.format(totals.totalUnits), detail: totalUnitDetail.join(" + ") },
    ...(scope
      ? [{ label: "Escopo principal", value: `${numberFmt.format(scope.paidUnits)} unid.`, detail: `${scope.label}; exclui ${numberFmt.format(scope.excludedPaidUnits)} unid. pagas de outras linhas` }]
      : []),
    { label: "Fora da análise", value: scope ? numberFmt.format(scope.excludedPaidUnits) : numberFmt.format(totals.unknownLineRows), detail: "Vestuário, acessórios pagos, óculos, chinelos/sandálias e outros" },
    { label: "Sem SKU", value: numberFmt.format(totals.missingSkuRows), detail: "Mantidos no cálculo pelo nome do produto" },
    { label: "Regra de brinde", value: "Lista oficial", detail: "Relógio, Sneaker Bag, Case, Óculos Suzuka, Necessaire e Deskpad" },
    ...(repurchaseTotals
      ? [{ label: "Base de comportamento Black", value: `${numberFmt.format(repurchaseTotals.paidOrders)} pedidos pagos`, detail: "Cesta e clientes 2+ pedidos usam itens pagos de novembro" }]
      : []),
    ...(heatmapTotals
      ? [{ label: "Base do heat map", value: `${numberFmt.format(heatmapTotals.orders)} pedidos pagos`, detail: "heatmap_calc | 30 dias x 24 horas por semana" }]
      : []),
  ];

  document.getElementById("auditGrid").innerHTML = cards
    .map((card) => `
      <article class="audit-card">
        <span>${escapeHtml(card.label)}</span>
        ${card.href ? `<a href="${escapeHtml(card.href)}" target="_blank" rel="noreferrer">${escapeHtml(card.value)}</a>` : `<strong>${escapeHtml(card.value)}</strong>`}
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `)
    .join("");
}

function renderMiniList(id, rows, config) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = rows
    .map((row, index) => {
      const pct = Number(config.pct(row)) || 0;
      const width = clamp(pct * 100, 0, 100);
      return `
        <div class="mini-row">
          <span class="mini-rank">${index + 1}</span>
          <div class="mini-row-copy">
            <strong>${escapeHtml(config.name(row))}</strong>
            <small>${escapeHtml(config.detail(row))}</small>
            <div class="mini-row-bar"><span style="width:${width}%"></span></div>
          </div>
          <b>${percentFmt.format(pct)}</b>
        </div>
      `;
    })
    .join("");
}

function renderCompactList(id, rows, config) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = rows
    .map((row, index) => {
      const pct = Number(config.pct(row)) || 0;
      const width = clamp(pct * 100, 0, 100);
      return `
        <div class="compact-row">
          <span class="compact-rank">${index + 1}</span>
          <div class="compact-copy">
            <strong>${escapeHtml(config.name(row))}</strong>
            <small>${escapeHtml(config.meta(row))}</small>
            <div class="compact-bar"><span style="width:${width}%"></span></div>
          </div>
          <b>${percentFmt.format(pct)}</b>
        </div>
      `;
    })
    .join("");
}

function renderTakeaways(rows) {
  const container = document.getElementById("overviewTakeaways");
  if (!container) return;
  container.innerHTML = rows
    .map((row) => `
      <div class="takeaway-row">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.value)}</strong>
        <p>${escapeHtml(row.detail)}</p>
      </div>
    `)
    .join("");
}

function renderLineDropdowns(id, rows) {
  const container = document.getElementById(id);
  if (!container) return;
  container.classList.add("line-ranking-wrap");
  if (!rows.length) {
    container.innerHTML = '<div class="empty-table">Sem dados para este tópico.</div>';
    return;
  }

  container.innerHTML = `
    <div class="line-dropdown-list">
      ${rows
        .map((row, index) => {
          const colorRows = row.colorRows || [];
          const topColor = colorRows[0];
          const width = clamp((Number(row.pctUnits) || 0) * 100, 0, 100);
          return `
            <details class="line-dropdown" ${index === 0 ? "open" : ""}>
              <summary>
                <span class="line-summary-rank">${index + 1}</span>
                <span class="line-summary-main">
                  <strong>${escapeHtml(row.line)}</strong>
                  <small>${numberFmt.format(row.units)} unid. | ${currencyFmt.format(row.revenue)} | ticket ${currencyFmt.format(row.avgPrice)}</small>
                </span>
                <span class="line-summary-signal">
                  <span>${percentFmt.format(row.pctUnits)} do volume</span>
                  <b style="width:${width}%"></b>
                </span>
                <span class="line-summary-top">${topColor ? `Top: ${escapeHtml(topColor.color)} | ${numberFmt.format(topColor.units)} unid.` : "Sem detalhe de cor"}</span>
              </summary>
              <div class="line-color-list">
                ${colorRows.length
                  ? colorRows.map((colorRow) => renderLineColorRow(colorRow)).join("")
                  : '<div class="line-color-empty">Sem detalhe de produto/cor para esta linha.</div>'}
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderLineColorRow(row) {
  const width = clamp((Number(row.pctLineUnits) || 0) * 100, 0, 100);
  const color = getSwatchColor(row.color);
  return `
    <div class="line-color-row">
      <span class="color-swatch" style="--swatch-color:${color}"></span>
      <span class="line-color-product">
        <strong>${escapeHtml(row.product)}</strong>
        <small>${escapeHtml(row.color || "Sem cor")} | ${currencyFmt.format(row.revenue)} | ticket ${currencyFmt.format(row.avgPrice)}</small>
      </span>
      <span class="line-color-units">${numberFmt.format(row.units)} unid.</span>
      <span class="line-color-share">
        <i><b style="width:${width}%"></b></i>
        <em>${percentFmt.format(row.pctLineUnits)}</em>
      </span>
    </div>
  `;
}

function renderTable(id, rows, columns) {
  const container = document.getElementById(id);
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="empty-table">Sem dados para este tópico.</div>';
    return;
  }

  const headers = columns
    .map((col) => `<th class="${col.align === "right" ? "num" : ""}">${escapeHtml(col.label)}</th>`)
    .join("");
  const body = rows
    .map((row) => `<tr>${columns.map((col) => renderCell(row, col)).join("")}</tr>`)
    .join("");

  container.innerHTML = `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function renderCell(row, col) {
  const value = typeof col.value === "function" ? col.value(row) : row[col.key];

  if (col.type === "number") return `<td class="num">${numberFmt.format(value || 0)}</td>`;
  if (col.type === "currency") return `<td class="num">${currencyFmt.format(value || 0)}</td>`;
  if (col.type === "percent") return `<td class="num">${percentFmt.format(value || 0)}</td>`;
  if (col.type === "bar") {
    const width = clamp((Number(value) || 0) * 100, 0, 100);
    return `
      <td class="bar-cell">
        <div class="bar-track">
          <span class="bar-fill" style="width:${width}%"></span>
          <span class="bar-label">${percentFmt.format(value || 0)}</span>
        </div>
      </td>
    `;
  }
  if (col.type === "name") return `<td class="name-cell">${escapeHtml(value || "-")}</td>`;
  return `<td>${escapeHtml(value || "-")}</td>`;
}

function column(label, key, type) {
  return {
    label,
    key,
    type,
    align: ["number", "currency", "percent"].includes(type) ? "right" : "left",
  };
}

function metricCard(label, value, detail, pct) {
  const width = clamp((Number(pct) || 0) * 100, 0, 100);
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
      <div class="mini-bar"><span style="width:${width}%"></span></div>
    </article>
  `;
}

function heatmapDayTotalCell(day, totals) {
  const orders = Number(totals?.orders) || 0;
  const units = Number(totals?.units) || 0;
  const revenue = Number(totals?.revenue) || 0;
  const className = `heatmap-total-cell ${isBlackFridayDate(day.date) ? "is-black-day" : ""}`.trim();
  const title = [
    `Total ${day.dayLabel} (${day.weekday || "-"})`,
    `${numberFmt.format(orders)} pedidos`,
    `${numberFmt.format(units)} unidades`,
    currencyFmt.format(revenue),
  ].join(" - ");

  return `
    <div class="${className}" role="cell" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <strong>${numberFmt.format(orders)}</strong>
    </div>
  `;
}

function heatmapCell(cell) {
  if (!cell) return "";
  const intensity = clamp(Number(cell.intensity) || 0, 0, 1);
  const color = heatmapColor(intensity);
  const className = [
    "heatmap-cell",
    cell.orders ? "" : "is-empty",
    isBlackFridayDate(cell.date) ? "is-black-day" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const title = [
    `${cell.dayLabel} (${cell.weekday || "-"}) | ${cell.label} | ${cell.hourLabel}`,
    `${numberFmt.format(cell.orders)} pedidos`,
    `${numberFmt.format(cell.units)} unidades`,
    currencyFmt.format(cell.revenue || 0),
  ].join(" - ");

  return `
    <div
      class="${className}"
      role="cell"
      style="--heat-bg: ${color.background}; --heat-border: ${color.border}; --heat-fg: ${color.text};"
      title="${escapeHtml(title)}"
      aria-label="${escapeHtml(title)}"
    >
      <strong>${numberFmt.format(cell.orders)}</strong>
    </div>
  `;
}

function heatmapColor(intensity) {
  if (intensity <= 0) {
    return {
      background: "rgba(255, 255, 255, 0.045)",
      border: "rgba(255, 255, 255, 0.07)",
      text: "rgba(255, 255, 255, 0.42)",
    };
  }

  const stops = [
    { at: 0, rgb: [42, 188, 177] },
    { at: 0.52, rgb: [238, 196, 78] },
    { at: 1, rgb: [246, 107, 45] },
  ];
  const upper = stops.find((stop) => intensity <= stop.at) || stops[stops.length - 1];
  const lower = stops[Math.max(0, stops.indexOf(upper) - 1)];
  const span = upper.at - lower.at || 1;
  const mix = clamp((intensity - lower.at) / span, 0, 1);
  const rgb = lower.rgb.map((value, index) => Math.round(value + (upper.rgb[index] - value) * mix));
  const alpha = 0.24 + intensity * 0.76;

  return {
    background: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`,
    border: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.min(1, alpha + 0.16).toFixed(3)})`,
    text: intensity > 0.42 ? "#1d1d19" : "#ffffff",
  };
}

function updateSourceStatus(label, ready) {
  const node = document.getElementById("sourceStatus");
  node.textContent = label;
  node.classList.toggle("ready", ready);
  node.classList.toggle("warn", !ready);
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function cloneData(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatShortDate(value) {
  if (!value) return "-";
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatDateRange(start, end) {
  return `${formatShortDate(start)} a ${formatShortDate(end)}`;
}

function isBlackFridayDate(value) {
  return String(value || "") === BLACK_FRIDAY_DATE;
}

function formatHour(value) {
  return `${String(Number(value)).padStart(2, "0")}h`;
}

function formatBandLabel(band) {
  const text = String(band || "-");
  if (/^Abaixo de\s+(\d+)/i.test(text)) return text.replace(/^Abaixo de\s+(\d+)/i, "Abaixo de R$ $1");
  if (/^Acima de\s+(\d+)/i.test(text)) return text.replace(/^Acima de\s+(\d+)/i, "Acima de R$ $1");
  const match = text.match(/^(\d+)\s+a\s+(\d+)$/i);
  return match ? `R$ ${match[1]} a R$ ${match[2]}` : text;
}

function formatTopProduct(row, maxLength = 32) {
  if (!row) return "sem produto";
  return `${shortText(row.product, maxLength)} (${numberFmt.format(row.units)} unid.)`;
}

function getSwatchColor(value) {
  const key = normalizeText(value);
  const colors = {
    "all black": "#050505",
    "azul-marinho": "#17375e",
    branco: "#f1eee5",
    camurca: "#c39a5e",
    cinza: "#858883",
    marrom: "#7a5035",
    offwhite: "#ebe3d1",
    "off white": "#ebe3d1",
    oliva: "#66724a",
    preto: "#111111",
    verde: "#496a43",
    "sem cor": "#767872",
  };
  return colors[key] || "#8b8d87";
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getTopHeatmapHour(rows) {
  const byHour = new Map();
  rows.forEach((row) => {
    const hour = Number(row.hour);
    const current = byHour.get(hour) || { hour, orders: 0, units: 0, revenue: 0 };
    current.orders += Number(row.orders) || 0;
    current.units += Number(row.units) || 0;
    current.revenue += Number(row.revenue) || 0;
    byHour.set(hour, current);
  });
  const top = [...byHour.values()].sort((a, b) => b.orders - a.orders)[0];
  return top ? { ...top, hourLabel: formatHour(top.hour) } : null;
}

function shortText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
