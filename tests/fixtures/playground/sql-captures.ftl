<#-- Compare SQL colors in the first two captures with the last capture.
     Check the bind parameter, doubled quote and FTL tags. Expect no diagnostics. -->
<#assign includeArchived = false>
<#assign sqlOrders>
SELECT id, customer_name
FROM orders
WHERE customer_id = @customerId
<#if !includeArchived>
  AND status = 'open'
</#if>
</#assign>

<#-- @lang sql -->
<#assign updateQuery>
UPDATE orders SET note = 'Customer''s copy' WHERE id = @orderId
</#assign>

<#assign plainText>
SELECT is ordinary template text in this block.
</#assign>
