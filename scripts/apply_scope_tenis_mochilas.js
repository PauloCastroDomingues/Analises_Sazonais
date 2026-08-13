const fs = require("fs");

const jsonPath = "data/black_nov_2025_dashboard.json";

const excludedPaidLines = ["Acessórios", "Vestuário", "Óculos", "Chinelo e Sandálias", "Outros"];
const scopedValueBands = [
  { band: "Abaixo de 400", units: 8769, revenue: 2745969.81 },
  { band: "400 a 500", units: 2510, revenue: 949640.69 },
  { band: "500 a 600", units: 1242, revenue: 550705.79 },
  { band: "600 a 700", units: 925, revenue: 493407.1 },
  { band: "Acima de 700", units: 579, revenue: 369747.88 },
];

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function sum(rows, field) {
  return round2(rows.reduce((total, row) => total + (Number(row[field]) || 0), 0));
}

function main() {
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const backpackLine = data.lineRanking.find((row) => row.line === "Mochilas");
  const footwearLines = data.lineRanking.filter(
    (row) => row.line !== "Mochilas" && !excludedPaidLines.includes(row.line)
  );

  const footwearUnits = sum(footwearLines, "units");
  const footwearRevenue = sum(footwearLines, "revenue");
  const backpackUnits = Number(backpackLine?.units) || 0;
  const backpackRevenue = round2(backpackLine?.revenue || 0);
  const scopedPaidUnits = sum(scopedValueBands, "units");
  const scopedPaidRevenue = sum(scopedValueBands, "revenue");

  data.analysisScope = {
    label: "Tênis + Mochilas",
    basis: "Somente itens pagos de linhas de tênis classificadas + Mochilas; exclui Vestuário, Acessórios pagos, Óculos, Chinelo e Sandálias e Outros da análise principal.",
    paidUnits: scopedPaidUnits,
    paidRevenue: scopedPaidRevenue,
    footwearUnits,
    footwearRevenue,
    backpackUnits,
    backpackRevenue,
    excludedPaidUnits: (Number(data.totals?.paidUnits) || 0) - scopedPaidUnits,
    excludedPaidRevenue: round2((Number(data.totals?.paidRevenue) || 0) - scopedPaidRevenue),
    includedLines: ["Mochilas", ...footwearLines.map((row) => row.line)],
    excludedPaidLines,
    sourceSheet: "scope_calc",
    sourceRange: "I1:O25",
  };

  data.valueBands = scopedValueBands;
  data.accessorySummary = [
    {
      category: "Mochilas",
      units: backpackUnits,
      revenue: backpackRevenue,
      coreAccessory: true,
    },
  ];

  data.source.notes = (data.source.notes || []).filter(
    (note) => !String(note).toLowerCase().includes("escopo principal")
  );
  data.source.notes.push(
    "Escopo principal ajustado pelo usuario: analisar somente Tenis, Mochilas e Brindes oficiais; demais linhas pagas ficam fora da analise principal."
  );

  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        scope: data.analysisScope.label,
        paidUnits: scopedPaidUnits,
        paidRevenue: scopedPaidRevenue,
        footwearUnits,
        backpackUnits,
        excludedPaidUnits: data.analysisScope.excludedPaidUnits,
        valueBands: scopedValueBands,
      },
      null,
      2
    )
  );
}

main();
