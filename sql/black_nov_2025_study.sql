-- ============================================================
-- Estudo Black 2025 - consultas topico por topico
-- Periodo: novembro completo de 2025
-- Fonte recomendada para novembro/2025: reise-ssot.mart_shared.fct_order_item
--
-- Observacao:
-- A tabela Vendas_pedidos_Linha nao apareceu no projeto anexado.
-- Se ela for a base oficial no seu BigQuery, adapte apenas source_rows.
-- Para periodo historico com Shoppub, use mart_shared.ssot_order_items.
-- ============================================================

DECLARE start_date DATE DEFAULT DATE '2025-11-01';
DECLARE end_date_exclusive DATE DEFAULT DATE '2025-12-01';

CREATE TEMP TABLE black_nov_items AS
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
  FROM `reise-ssot.mart_shared.fct_order_item`
  WHERE is_valid_order
    AND DATE(order_partition_date_brt) >= start_date
    AND DATE(order_partition_date_brt) < end_date_exclusive
),
normalized AS (
  SELECT
    *,
    LOWER(CONCAT(IFNULL(item_name, ''), ' ', IFNULL(sku, ''))) AS token,
    COALESCE(
      line_net_amount,
      line_gross_amount,
      SAFE_CAST(quantity AS NUMERIC) * unit_price,
      0
    ) AS line_value_effective,
    SAFE_DIVIDE(
      COALESCE(line_net_amount, line_gross_amount, SAFE_CAST(quantity AS NUMERIC) * unit_price, 0),
      NULLIF(SAFE_CAST(quantity AS NUMERIC), 0)
    ) AS unit_value_effective
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
    line_value_effective,
    unit_value_effective,
    CASE
      WHEN REGEXP_CONTAINS(token, r'mochila|backpack') THEN 'Mochilas'
      WHEN REGEXP_CONTAINS(token, r'rs\s*8\s*avant|rs8.*avant') THEN 'RS8 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\s*6\s*avant|rs6.*avant') THEN 'RS6 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\s*6\s*gt|rs6.*gt') THEN 'RS6 GT'
      WHEN REGEXP_CONTAINS(token, r'rs\s*7\s*avant|rs7.*avant') THEN 'RS7 Avant'
      WHEN REGEXP_CONTAINS(token, r'rs\s*knit\s*gt|rsknit.*gt') THEN 'RS Knit GT'
      WHEN REGEXP_CONTAINS(token, r'rs\s*knit|rsknit') THEN 'RS Knit'
      WHEN REGEXP_CONTAINS(token, r'911\s*gt|911gt') THEN '911 GT'
      WHEN REGEXP_CONTAINS(token, r'911\s*carrera|911carrera') THEN '911 Carrera'
      WHEN REGEXP_CONTAINS(token, r'\b911\b') THEN '911'
      WHEN REGEXP_CONTAINS(token, r'\brs\s*8\b|\brs8\b') THEN 'RS8'
      WHEN REGEXP_CONTAINS(token, r'\brs\s*7\b|\brs7\b') THEN 'RS7'
      WHEN REGEXP_CONTAINS(token, r'\brs\s*6\b|\brs6\b') THEN 'RS6'
      WHEN REGEXP_CONTAINS(token, r'\brsx\b|rs\s*x') THEN 'RSX'
      WHEN REGEXP_CONTAINS(token, r'\brs\s*3\b|\brs3\b') THEN 'RS3'
      WHEN REGEXP_CONTAINS(token, r'macan') THEN 'Macan'
      WHEN REGEXP_CONTAINS(token, r'oculos|óculos|sunglass') THEN 'Óculos'
      WHEN REGEXP_CONTAINS(token, r'chinelo|sandalia|sandália') THEN 'Chinelo e Sandálias'
      WHEN REGEXP_CONTAINS(token, r'camiseta|t-?shirt|moletom|vestuario|vestuário|bone|boné') THEN 'Vestuário'
      WHEN REGEXP_CONTAINS(token, r'acessorio|acessório|meia|cinto|chaveiro|necessaire|carteira|limpa|palmilha|cadarc|lace|tag') THEN 'Acessórios'
      ELSE 'Outros'
    END AS product_line,
    CASE
      WHEN REGEXP_CONTAINS(token, r'brinde|gift|presente|gratuit|cortesia')
        OR IFNULL(line_value_effective, 0) <= 0 THEN TRUE
      ELSE FALSE
    END AS is_gift,
    CASE
      WHEN unit_value_effective IS NULL OR unit_value_effective <= 0 THEN 'Sem valor'
      WHEN unit_value_effective < 400 THEN 'Abaixo de 400'
      WHEN unit_value_effective < 500 THEN '400 a 500'
      WHEN unit_value_effective < 600 THEN '500 a 600'
      WHEN unit_value_effective < 700 THEN '600 a 700'
      ELSE 'Acima de 700'
    END AS value_band
  FROM normalized
)
SELECT * FROM classified;

-- 0) Sanity check do periodo
SELECT
  MIN(order_date) AS min_order_date,
  MAX(order_date) AS max_order_date,
  COUNT(*) AS linhas_item,
  SUM(quantity) AS unidades_totais,
  SUM(IF(is_gift, quantity, 0)) AS unidades_brinde,
  SUM(IF(NOT is_gift, quantity, 0)) AS unidades_pagas,
  SUM(IF(NOT is_gift, line_value_effective, 0)) AS receita_paga
FROM black_nov_items;

-- 1) Ranking de linhas mais vendidas
SELECT
  product_line,
  SUM(quantity) AS unidades,
  COUNT(DISTINCT IFNULL(order_id, CONCAT(CAST(order_date AS STRING), '|', IFNULL(sku, ''), '|', IFNULL(item_name, '')))) AS pedidos_ou_linhas,
  SUM(line_value_effective) AS receita,
  SAFE_DIVIDE(SUM(quantity), SUM(SUM(quantity)) OVER()) AS pct_unidades,
  SAFE_DIVIDE(SUM(line_value_effective), SUM(SUM(line_value_effective)) OVER()) AS pct_receita,
  SAFE_DIVIDE(SUM(line_value_effective), NULLIF(SUM(quantity), 0)) AS preco_medio_unitario
FROM black_nov_items
WHERE NOT is_gift
GROUP BY product_line
ORDER BY unidades DESC;

-- 2) Faixa de valor que mais vendeu
SELECT
  value_band,
  SUM(quantity) AS unidades,
  SUM(line_value_effective) AS receita,
  SAFE_DIVIDE(SUM(quantity), SUM(SUM(quantity)) OVER()) AS pct_unidades,
  SAFE_DIVIDE(SUM(line_value_effective), SUM(SUM(line_value_effective)) OVER()) AS pct_receita
FROM black_nov_items
WHERE NOT is_gift
GROUP BY value_band
ORDER BY
  CASE value_band
    WHEN 'Abaixo de 400' THEN 1
    WHEN '400 a 500' THEN 2
    WHEN '500 a 600' THEN 3
    WHEN '600 a 700' THEN 4
    WHEN 'Acima de 700' THEN 5
    ELSE 6
  END;

-- 3) Representatividade e volume de acessorios, com Mochilas em destaque
SELECT
  product_line,
  SUM(quantity) AS unidades,
  SUM(line_value_effective) AS receita,
  SAFE_DIVIDE(SUM(quantity), (SELECT SUM(quantity) FROM black_nov_items WHERE NOT is_gift)) AS pct_unidades_pagas,
  SAFE_DIVIDE(SUM(line_value_effective), (SELECT SUM(line_value_effective) FROM black_nov_items WHERE NOT is_gift)) AS pct_receita_paga
FROM black_nov_items
WHERE NOT is_gift
  AND product_line IN ('Mochilas', 'Acessórios', 'Vestuário', 'Óculos', 'Chinelo e Sandálias')
GROUP BY product_line
ORDER BY unidades DESC;

-- 3.1) Ranking de Mochilas
SELECT
  COALESCE(NULLIF(item_name, ''), sku, 'Sem nome') AS produto,
  sku,
  SUM(quantity) AS unidades,
  SUM(line_value_effective) AS receita,
  SAFE_DIVIDE(SUM(quantity), (SELECT SUM(quantity) FROM black_nov_items WHERE NOT is_gift AND product_line = 'Mochilas')) AS pct_unidades_mochilas
FROM black_nov_items
WHERE NOT is_gift
  AND product_line = 'Mochilas'
GROUP BY produto, sku
ORDER BY unidades DESC;

-- 4) Percentual de vendas por valor de produto
SELECT
  value_band,
  SUM(quantity) AS unidades,
  SUM(line_value_effective) AS receita,
  SAFE_DIVIDE(SUM(quantity), SUM(SUM(quantity)) OVER()) AS pct_unidades,
  SAFE_DIVIDE(SUM(line_value_effective), SUM(SUM(line_value_effective)) OVER()) AS pct_receita,
  SAFE_DIVIDE(SUM(line_value_effective), NULLIF(SUM(quantity), 0)) AS preco_medio_unitario
FROM black_nov_items
WHERE NOT is_gift
GROUP BY value_band
ORDER BY pct_unidades DESC;

-- 5) Brindes que mais sairam: volume e percentual
SELECT
  COALESCE(NULLIF(item_name, ''), sku, 'Sem nome') AS brinde,
  sku,
  SUM(quantity) AS unidades,
  SAFE_DIVIDE(SUM(quantity), SUM(SUM(quantity)) OVER()) AS pct_unidades_brinde,
  SAFE_DIVIDE(SUM(quantity), (SELECT SUM(quantity) FROM black_nov_items)) AS pct_unidades_total
FROM black_nov_items
WHERE is_gift
GROUP BY brinde, sku
ORDER BY unidades DESC;
