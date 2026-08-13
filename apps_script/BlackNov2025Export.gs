/**
 * Exporta a base granular do estudo Black novembro/2025 para uma aba de planilha.
 *
 * Uso:
 * 1) Abra uma Google Sheet.
 * 2) Extensoes > Apps Script.
 * 3) Cole este arquivo e habilite o servico avancado BigQuery.
 * 4) Rode BLACK_NOV_2025_exportToActiveSheet().
 */

const BLACK_NOV_2025_CFG = {
  projectId: "reise-ssot",
  location: "southamerica-east1",
  sheetName: "black_nov_2025_rows",
};

function BLACK_NOV_2025_exportToActiveSheet() {
  const rows = BLACK_NOV_2025_queryRows_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BLACK_NOV_2025_CFG.sheetName) || ss.insertSheet(BLACK_NOV_2025_CFG.sheetName);

  sheet.clearContents();
  const headers = [
    "order_date",
    "source",
    "order_id",
    "sku",
    "item_name",
    "quantity",
    "unit_price",
    "line_gross_amount",
    "line_discount_amount",
    "line_net_amount",
    "product_line",
    "item_type",
    "value_band",
    "is_gift",
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows.map(function(row) {
      return headers.map(function(header) {
        return row[header] == null ? "" : row[header];
      });
    }));
  }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log("Export concluido: %s linhas em %s", rows.length, BLACK_NOV_2025_CFG.sheetName);
}

function BLACK_NOV_2025_queryRows_() {
  const sql = BLACK_NOV_2025_sql_();
  const request = {
    query: sql,
    useLegacySql: false,
    location: BLACK_NOV_2025_CFG.location,
    timeoutMs: 30000,
  };

  const start = BigQuery.Jobs.query(request, BLACK_NOV_2025_CFG.projectId);
  if (start.errors && start.errors.length) {
    throw new Error("BigQuery query error: " + JSON.stringify(start.errors));
  }

  const jobId = start.jobReference.jobId;
  let pageToken = null;
  const out = [];

  do {
    const page = BigQuery.Jobs.getQueryResults(BLACK_NOV_2025_CFG.projectId, jobId, {
      location: BLACK_NOV_2025_CFG.location,
      maxResults: 10000,
      pageToken: pageToken || undefined,
    });

    if (page.errors && page.errors.length) {
      throw new Error("BigQuery getQueryResults error: " + JSON.stringify(page.errors));
    }

    if (!page.jobComplete) {
      Utilities.sleep(1500);
      continue;
    }

    const fields = page.schema && page.schema.fields ? page.schema.fields.map(function(f) { return f.name; }) : [];
    (page.rows || []).forEach(function(r) {
      const obj = {};
      r.f.forEach(function(cell, idx) {
        obj[fields[idx]] = cell.v;
      });
      out.push(obj);
    });

    pageToken = page.pageToken || null;
  } while (pageToken);

  return out;
}

function BLACK_NOV_2025_sql_() {
  return `
DECLARE start_date DATE DEFAULT DATE '2025-11-01';
DECLARE end_date_exclusive DATE DEFAULT DATE '2025-12-01';

WITH source_rows AS (
  SELECT
    DATE(order_partition_date_brt) AS order_date,
    CAST('shopify' AS STRING) AS source,
    CAST(order_sk AS STRING) AS order_id,
    CAST(sku AS STRING) AS sku,
    CAST(item_name AS STRING) AS item_name,
    SAFE_CAST(quantity AS INT64) AS quantity,
    SAFE_CAST(unit_price AS NUMERIC) AS unit_price,
    SAFE_CAST(line_gross_amount AS NUMERIC) AS line_gross_amount,
    SAFE_CAST(line_discount_amount AS NUMERIC) AS line_discount_amount,
    SAFE_CAST(line_net_amount AS NUMERIC) AS line_net_amount,
    CAST(is_valid_order AS BOOL) AS is_valid_order
  FROM \`reise-ssot.mart_shared.fct_order_item\`
  WHERE is_valid_order
    AND DATE(order_partition_date_brt) >= start_date
    AND DATE(order_partition_date_brt) < end_date_exclusive
),
normalized AS (
  SELECT
    *,
    LOWER(CONCAT(IFNULL(item_name, ''), ' ', IFNULL(sku, ''))) AS token,
    COALESCE(line_net_amount, line_gross_amount, SAFE_CAST(quantity AS NUMERIC) * unit_price, 0) AS line_value_effective,
    SAFE_DIVIDE(COALESCE(line_net_amount, line_gross_amount, SAFE_CAST(quantity AS NUMERIC) * unit_price, 0), NULLIF(SAFE_CAST(quantity AS NUMERIC), 0)) AS unit_value_effective
  FROM source_rows
  WHERE IFNULL(quantity, 0) > 0
),
classified AS (
  SELECT
    order_date,
    source,
    order_id,
    sku,
    item_name,
    quantity,
    unit_price,
    line_gross_amount,
    line_discount_amount,
    line_net_amount,
    CASE
      WHEN REGEXP_CONTAINS(token, r'mochila|backpack') THEN 'Mochilas'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*8\\s*avant|rs8.*avant') THEN 'RS8 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*6\\s*avant|rs6.*avant') THEN 'RS6 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*6\\s*gt|rs6.*gt') THEN 'RS6 GT'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*7\\s*avant|rs7.*avant') THEN 'RS7 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*knit\\s*gt|rsknit.*gt') THEN 'RS Knit GT'
      WHEN REGEXP_CONTAINS(token, r'rs\\s*knit|rsknit') THEN 'RS Knit'
      WHEN REGEXP_CONTAINS(token, r'911\\s*gt|911gt') THEN '911 GT'
      WHEN REGEXP_CONTAINS(token, r'911\\s*carrera|911carrera') THEN '911 Carrera'
      WHEN REGEXP_CONTAINS(token, r'\\b911\\b') THEN '911'
      WHEN REGEXP_CONTAINS(token, r'\\brs\\s*8\\b|\\brs8\\b') THEN 'RS8'
      WHEN REGEXP_CONTAINS(token, r'\\brs\\s*7\\b|\\brs7\\b') THEN 'RS7'
      WHEN REGEXP_CONTAINS(token, r'\\brs\\s*6\\b|\\brs6\\b') THEN 'RS6'
      WHEN REGEXP_CONTAINS(token, r'\\brsx\\b|rs\\s*x') THEN 'RSX'
      WHEN REGEXP_CONTAINS(token, r'\\brs\\s*3\\b|\\brs3\\b') THEN 'RS3'
      WHEN REGEXP_CONTAINS(token, r'macan') THEN 'Macan'
      WHEN REGEXP_CONTAINS(token, r'oculos|óculos|sunglass') THEN 'Óculos'
      WHEN REGEXP_CONTAINS(token, r'chinelo|sandalia|sandália') THEN 'Chinelo e Sandálias'
      WHEN REGEXP_CONTAINS(token, r'camiseta|t-?shirt|moletom|vestuario|vestuário|bone|boné') THEN 'Vestuário'
      WHEN REGEXP_CONTAINS(token, r'acessorio|acessório|meia|cinto|chaveiro|necessaire|carteira|limpa|palmilha|cadarc|lace|tag') THEN 'Acessórios'
      ELSE 'Outros'
    END AS product_line,
    CASE
      WHEN REGEXP_CONTAINS(token, r'brinde|gift|presente|gratuit|cortesia') OR IFNULL(line_value_effective, 0) <= 0 THEN 'Brinde'
      WHEN REGEXP_CONTAINS(token, r'mochila|backpack') THEN 'Mochila'
      WHEN REGEXP_CONTAINS(token, r'acessorio|acessório|meia|cinto|chaveiro|necessaire|carteira|limpa|palmilha|cadarc|lace|tag') THEN 'Acessório'
      ELSE 'Produto pago'
    END AS item_type,
    CASE
      WHEN unit_value_effective IS NULL OR unit_value_effective <= 0 THEN 'Sem valor'
      WHEN unit_value_effective < 400 THEN 'Abaixo de 400'
      WHEN unit_value_effective < 500 THEN '400 a 500'
      WHEN unit_value_effective < 600 THEN '500 a 600'
      WHEN unit_value_effective < 700 THEN '600 a 700'
      ELSE 'Acima de 700'
    END AS value_band,
    REGEXP_CONTAINS(token, r'brinde|gift|presente|gratuit|cortesia') OR IFNULL(line_value_effective, 0) <= 0 AS is_gift
  FROM normalized
)
SELECT
  order_date,
  source,
  order_id,
  sku,
  item_name,
  quantity,
  unit_price,
  line_gross_amount,
  line_discount_amount,
  line_net_amount,
  product_line,
  item_type,
  value_band,
  is_gift
FROM classified
ORDER BY order_date, product_line, item_name, sku
`;
}
