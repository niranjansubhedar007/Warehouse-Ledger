CREATE OR REPLACE FUNCTION public.convert_quotation_to_sale(
    p_quotation_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_quotation RECORD;
    v_sale_id BIGINT;
    v_q_item RECORD;
    v_item_details RECORD;
    v_required_stock NUMERIC;
BEGIN
    SELECT * INTO v_quotation
    FROM public.quotations
    WHERE id = p_quotation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found.';
    END IF;

    IF v_quotation.status != 'done' THEN
        RAISE EXCEPTION 'Only quotations marked as "done" can be converted to a bill.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sales WHERE quotation_id = p_quotation_id
    ) THEN
        RAISE EXCEPTION 'This quotation has already been converted to a bill.';
    END IF;

    FOR v_q_item IN
        SELECT item_id, SUM(quantity) AS quantity
        FROM public.quotation_items
        WHERE quotation_id = p_quotation_id
        GROUP BY item_id
        ORDER BY item_id
    LOOP
        SELECT current_stock INTO v_item_details
        FROM public.items
        WHERE id = v_q_item.item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item % no longer exists.', v_q_item.item_id;
        END IF;

        v_required_stock := v_q_item.quantity;
        IF v_item_details.current_stock IS NULL
            OR v_item_details.current_stock < v_required_stock THEN
            RAISE EXCEPTION 'Insufficient stock for item %: available %, required %.',
                v_q_item.item_id, v_item_details.current_stock, v_required_stock;
        END IF;
    END LOOP;

    INSERT INTO public.sales (
        bill_number,
        date,
        customer_name,
        customer_mobile,
        subtotal,
        discount,
        tax,
        shipping_charge,
        grand_total,
        quotation_id
    ) VALUES (
        'BILL-' || to_char(now(), 'YYYYMMDD') || '-' ||
            lpad(cast(floor(random() * 10000) as text), 4, '0'),
        v_quotation.date,
        v_quotation.customer_name,
        v_quotation.customer_mobile,
        v_quotation.subtotal,
        v_quotation.discount,
        v_quotation.tax,
        v_quotation.shipping_charge,
        v_quotation.grand_total,
        p_quotation_id
    ) RETURNING id INTO v_sale_id;

    FOR v_q_item IN
        SELECT * FROM public.quotation_items
        WHERE quotation_id = p_quotation_id
    LOOP
        SELECT purchase_price, shipping_weight INTO v_item_details
        FROM public.items
        WHERE id = v_q_item.item_id;

        INSERT INTO public.sale_items (
            sale_id,
            item_id,
            quantity,
            selling_price,
            purchase_price,
            shipping_weight,
            amount,
            profit
        ) VALUES (
            v_sale_id,
            v_q_item.item_id,
            v_q_item.quantity,
            v_q_item.selling_price,
            v_item_details.purchase_price,
            v_item_details.shipping_weight,
            v_q_item.amount,
            (v_q_item.selling_price - v_item_details.purchase_price) * v_q_item.quantity
        );

        UPDATE public.items
        SET current_stock = current_stock - v_q_item.quantity
        WHERE id = v_q_item.item_id;
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;
