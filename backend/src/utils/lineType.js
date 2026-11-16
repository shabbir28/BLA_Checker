// Use the saved BLA classification; never guess a type for unclassified rows.
export const LINE_TYPE_SQL = `CASE
  WHEN bla_response_raw->>'line' IN ('Wireless', 'Landline') THEN bla_response_raw->>'line'
  WHEN (bla_response_raw->'observations'->0->>'line') IN ('Wireless', 'Landline') THEN bla_response_raw->'observations'->0->>'line'
  WHEN (bla_response_raw->'observations'->1->>'line') IN ('Wireless', 'Landline') THEN bla_response_raw->'observations'->1->>'line'
  WHEN reason = 'Good - Wireless' THEN 'Wireless'
  WHEN reason = 'Good - Landline' THEN 'Landline'
  ELSE 'Unknown' END`;
