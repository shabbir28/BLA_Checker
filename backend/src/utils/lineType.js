// Use the saved BLA classification; never guess a type for unclassified rows.
export const LINE_TYPE_SQL = `CASE
  WHEN bla_response_raw->>'line' IN ('Wireless', 'Landline') THEN bla_response_raw->>'line'
  WHEN reason = 'Good - Wireless' THEN 'Wireless'
  WHEN reason = 'Good - Landline' THEN 'Landline'
  ELSE 'Unknown' END`;
