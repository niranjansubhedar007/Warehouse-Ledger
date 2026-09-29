CREATE OR REPLACE FUNCTION public.update_bill_discount(
    p_sale_id BIGINT,
    p_discount NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_sale RECORD;
    v_grand_total NUMERIC;
BEGIN
    IF p_discount IS NULL OR p_discount < 0 THEN
        RAISE EXCEPTION 'Discount must be zero or greater.';
    END IF;

    SELECT subtotal, tax, shipping_charge
    INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found.';
    END IF;

    IF p_discount > v_sale.subtotal THEN
        RAISE EXCEPTION 'Discount cannot be more than the bill subtotal.';
    END IF;

    v_grand_total := v_sale.subtotal - p_discount + v_sale.tax + v_sale.shipping_charge;
    IF v_grand_total < 0 THEN
        RAISE EXCEPTION 'Grand total cannot be negative.';
    END IF;

    UPDATE public.sales
    SET discount = p_discount,
        grand_total = v_grand_total
    WHERE id = p_sale_id;

    RETURN v_grand_total;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.update_bill_discount(BIGINT, NUMERIC)
TO anon, authenticated;
