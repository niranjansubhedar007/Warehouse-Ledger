-- RPC to update quotation
CREATE OR REPLACE FUNCTION update_quotation(
    p_quotation_id BIGINT,
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_date DATE,
    p_discount NUMERIC,
    p_tax NUMERIC,
    p_shipping_charge NUMERIC,
    p_items JSONB
) RETURNS BIGINT AS $$
DECLARE
    v_subtotal NUMERIC := 0;
    v_item RECORD;
BEGIN
    -- Calculate subtotal from items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.selling_price);
    END LOOP;

    -- Update quotation main record
    UPDATE quotations SET
        customer_name = p_customer_name,
        customer_mobile = p_customer_mobile,
        date = p_date,
        subtotal = v_subtotal,
        discount = p_discount,
        tax = p_tax,
        shipping_charge = p_shipping_charge,
        grand_total = (v_subtotal - p_discount + p_tax + p_shipping_charge)
    WHERE id = p_quotation_id;

    -- Remove old items and insert new ones (simple replacement)
    DELETE FROM quotation_items WHERE quotation_id = p_quotation_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        INSERT INTO quotation_items (quotation_id, item_id, quantity, selling_price, amount)
        VALUES (p_quotation_id, v_item.item_id, v_item.quantity, v_item.selling_price, v_item.quantity * v_item.selling_price);
    END LOOP;

    RETURN p_quotation_id;
END;
$$ LANGUAGE plpgsql;
