const fs = require("fs");

const csvPath = "data/heatmap_day_hour_values.csv";
const jsonPath = "data/black_nov_2025_dashboard.json";

const weekRanges = {
  1: { start: "2025-11-01", end: "2025-11-07", label: "Semana 1" },
  2: { start: "2025-11-08", end: "2025-11-14", label: "Semana 2" },
  3: { start: "2025-11-15", end: "2025-11-21", label: "Semana 3" },
  4: { start: "2025-11-22", end: "2025-11-30", label: "Semana 4" },
};

const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function parseLine(line) {
  const out = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  out.push(current);
  return out;
}

function ptNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  return Number(text.replace(/\./g, "").replace(",", ".")) || 0;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function weekForDay(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function summarize(rows) {
  return rows.reduce(
    (total, row) => {
      total.orders += Number(row.orders) || 0;
      total.units += Number(row.units) || 0;
      total.rawRevenue += Number(row.rawRevenue) || 0;
      total.revenue += Number(row.revenue) || 0;
      return total;
    },
    { orders: 0, units: 0, rawRevenue: 0, revenue: 0 }
  );
}

function topByOrders(rows, fallbackSort) {
  return [...rows].sort((a, b) => b.orders - a.orders || fallbackSort(a, b))[0];
}

function readHeatmapCsv() {
  const lines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
  const header = parseLine(lines.shift());

  return lines.filter(Boolean).map((line) => {
    const parts = parseLine(line);
    const row = Object.fromEntries(header.map((key, index) => [key, parts[index] ?? ""]));
    return {
      day: Number(row.data),
      week: Number(row.semana),
      hour: Number(row.hora),
      orders: Number(row.pedidos_pagos) || 0,
      units: Number(row.unidades_pagas) || 0,
      rawRevenue: ptNumber(row.receita_paga),
    };
  });
}

function buildCells(rows, data) {
  const rowsByDayHour = new Map(rows.map((row) => [`${row.day}|${row.hour}`, row]));
  const rawTotal = rows.reduce((total, row) => total + row.rawRevenue, 0);
  const targetRevenue = Number(data.totals?.paidRevenue) || rawTotal;
  const revenueFactor = rawTotal ? targetRevenue / rawTotal : 1;
  const orderTotal = rows.reduce((total, row) => total + row.orders, 0);
  const unitTotal = rows.reduce((total, row) => total + row.units, 0);

  const cells = [];
  for (let day = 1; day <= 30; day += 1) {
    const week = weekForDay(day);
    const date = `2025-11-${String(day).padStart(2, "0")}`;
    const dayLabel = `${String(day).padStart(2, "0")}/11`;
    const weekday = weekdays[new Date(`${date}T12:00:00-03:00`).getDay()];

    for (let hour = 0; hour < 24; hour += 1) {
      const source = rowsByDayHour.get(`${day}|${hour}`) || { orders: 0, units: 0, rawRevenue: 0 };
      cells.push({
        date,
        day,
        dayLabel,
        weekday,
        week,
        label: weekRanges[week].label,
        hour,
        orders: source.orders,
        units: source.units,
        rawRevenue: source.rawRevenue,
        revenue: source.rawRevenue * revenueFactor,
      });
    }
  }

  const maxOrders = Math.max(...cells.map((cell) => cell.orders), 0);
  cells.forEach((cell) => {
    cell.orderShare = ratio(cell.orders, orderTotal);
    cell.unitShare = ratio(cell.units, unitTotal);
    cell.revenueShare = ratio(cell.revenue, targetRevenue);
    cell.ticket = ratio(cell.revenue, cell.orders);
    cell.intensity = ratio(cell.orders, maxOrders);
  });

  return { cells, revenueFactor };
}

function buildSummaries(cells, data) {
  const targetRevenue = Number(data.totals?.paidRevenue) || 0;
  const heatmapTotals = summarize(cells);
  const orderTotal = heatmapTotals.orders;
  const unitTotal = heatmapTotals.units;

  const weeklySummary = Object.entries(weekRanges).map(([weekNumber, week]) => {
    const weekCells = cells.filter((cell) => cell.week === Number(weekNumber));
    const totals = summarize(weekCells);
    const peak = topByOrders(weekCells, (a, b) => a.day - b.day || a.hour - b.hour);
    return {
      week: Number(weekNumber),
      label: week.label,
      start: week.start,
      end: week.end,
      orders: totals.orders,
      units: totals.units,
      rawRevenue: round2(totals.rawRevenue),
      revenue: round2(totals.revenue),
      orderShare: ratio(totals.orders, orderTotal),
      unitShare: ratio(totals.units, unitTotal),
      revenueShare: ratio(totals.revenue, targetRevenue),
      peakDate: peak.date,
      peakDay: peak.day,
      peakDayLabel: peak.dayLabel,
      peakHour: peak.hour,
      peakOrders: peak.orders,
    };
  });

  const dailySummary = [];
  for (let day = 1; day <= 30; day += 1) {
    const dayCells = cells.filter((cell) => cell.day === day);
    const totals = summarize(dayCells);
    const peak = topByOrders(dayCells, (a, b) => a.hour - b.hour);
    dailySummary.push({
      date: peak.date,
      day,
      dayLabel: peak.dayLabel,
      weekday: peak.weekday,
      week: peak.week,
      label: `${peak.dayLabel} (${peak.weekday})`,
      orders: totals.orders,
      units: totals.units,
      rawRevenue: round2(totals.rawRevenue),
      revenue: round2(totals.revenue),
      orderShare: ratio(totals.orders, orderTotal),
      unitShare: ratio(totals.units, unitTotal),
      revenueShare: ratio(totals.revenue, targetRevenue),
      peakHour: peak.hour,
      peakOrders: peak.orders,
    });
  }

  const hourSummary = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const hourCells = cells.filter((cell) => cell.hour === hour);
    const totals = summarize(hourCells);
    hourSummary.push({
      hour,
      orders: totals.orders,
      units: totals.units,
      rawRevenue: round2(totals.rawRevenue),
      revenue: round2(totals.revenue),
      orderShare: ratio(totals.orders, orderTotal),
      unitShare: ratio(totals.units, unitTotal),
      revenueShare: ratio(totals.revenue, targetRevenue),
    });
  }

  const topSlots = [...cells]
    .sort((a, b) => b.orders - a.orders || a.day - b.day || a.hour - b.hour)
    .slice(0, 10)
    .map((cell) => ({
      week: cell.week,
      label: `${cell.dayLabel} | ${cell.label}`,
      date: cell.date,
      day: cell.day,
      dayLabel: cell.dayLabel,
      weekday: cell.weekday,
      hour: cell.hour,
      orders: cell.orders,
      units: cell.units,
      rawRevenue: cell.rawRevenue,
      revenue: cell.revenue,
    }));

  return { weeklySummary, dailySummary, hourSummary, topSlots };
}

function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const rows = readHeatmapCsv();
  const { cells, revenueFactor } = buildCells(rows, data);
  const { weeklySummary, dailySummary, hourSummary, topSlots } = buildSummaries(cells, data);
  const totals = summarize(cells);
  const topSlot = topSlots[0];
  const topWeek = [...weeklySummary].sort((a, b) => b.orders - a.orders || a.week - b.week)[0];
  const topHour = [...hourSummary].sort((a, b) => b.orders - a.orders || a.hour - b.hour)[0];

  data.source.notes = (data.source.notes || []).filter((note) => !String(note).toLowerCase().includes("heat map"));
  data.source.notes.push(
    "Heat map recalculado na aba heatmap_calc e exportado em heatmap_day_hour_values: semana fixa de novembro, dia do mes e hora local Sao Paulo."
  );

  data.salesHeatmap = {
    sourceSheet: "heatmap_calc",
    sourceValueSheet: "heatmap_day_hour_values",
    sourceValueSpreadsheetId: "1LgeuVZlnN1yDg7MNW6kMF1wmyFLXHDvABF35Ffij-Hc",
    sourceValueSpreadsheetUrl: "https://docs.google.com/spreadsheets/d/1LgeuVZlnN1yDg7MNW6kMF1wmyFLXHDvABF35Ffij-Hc/edit?usp=drivesdk",
    localCsv: csvPath,
    grain: "day_hour",
    basis: "Pedidos com item pago no periodo; exclui brindes oficiais e itens com desconto quase integral fora da lista oficial.",
    timezone: "America/Sao_Paulo; hora local derivada de paid_at/created_at UTC menos 3h.",
    weekDefinition: Object.entries(weekRanges).map(([week, value]) => ({
      week: Number(week),
      label: value.label,
      start: value.start,
      end: value.end,
    })),
    metric: "orders",
    discountCutoff: 0.9846,
    totals: {
      orders: totals.orders,
      units: totals.units,
      rawRevenue: round2(totals.rawRevenue),
      revenue: round2(totals.revenue),
      revenueReconciliationFactor: revenueFactor,
      peakWeek: topSlot.week,
      peakDate: topSlot.date,
      peakDay: topSlot.day,
      peakDayLabel: topSlot.dayLabel,
      peakHour: topSlot.hour,
      peakOrders: topSlot.orders,
      topWeek: topWeek.week,
      topWeekOrders: topWeek.orders,
      topAggregateHour: topHour.hour,
      topAggregateHourOrders: topHour.orders,
    },
    weeklySummary,
    dailySummary,
    hourSummary,
    topSlots,
    cells,
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        csvRows: rows.length,
        cells: cells.length,
        orders: totals.orders,
        units: totals.units,
        rawRevenue: round2(totals.rawRevenue),
        revenue: round2(totals.revenue),
        revenueFactor,
        peak: topSlot,
        topHour,
        topWeek,
      },
      null,
      2
    )
  );
}

main();
