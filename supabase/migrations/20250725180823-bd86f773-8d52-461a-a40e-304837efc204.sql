-- Insert sample channel partners
INSERT INTO channel_partners (id, partner_code, partner_name, partner_type, region, country, contact_information, performance_metrics, status) VALUES
('a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', 'CP001', 'MegaRetail Solutions', 'distributor', 'North America', 'USA', '{"email": "contact@megaretail.com", "phone": "+1-555-0101", "address": "123 Commerce St, New York, NY"}', '{"avg_sell_through": 85.5, "days_inventory": 25.3, "payment_terms": "Net 30"}', 'active'),
('b2c3d4e5-f6a7-4890-b2c3-d4e5f6a78901', 'CP002', 'Global Distribution Network', 'wholesaler', 'Europe', 'Germany', '{"email": "info@gdn-europe.com", "phone": "+49-30-12345678", "address": "Hauptstr. 45, Berlin, Germany"}', '{"avg_sell_through": 78.2, "days_inventory": 32.1, "payment_terms": "Net 45"}', 'active'),
('c3d4e5f6-a7b8-4901-c3d4-e5f6a7b89012', 'CP003', 'Pacific Retail Partners', 'retailer', 'Asia Pacific', 'Australia', '{"email": "sales@pacificretail.au", "phone": "+61-2-9876-5432", "address": "88 Market St, Sydney, NSW"}', '{"avg_sell_through": 92.1, "days_inventory": 18.7, "payment_terms": "Net 15"}', 'active'),
('d4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123', 'CP004', 'Latin America Distributors', 'distributor', 'Latin America', 'Mexico', '{"email": "ventas@ladist.mx", "phone": "+52-55-1234-5678", "address": "Av. Reforma 100, Mexico City"}', '{"avg_sell_through": 73.8, "days_inventory": 28.9, "payment_terms": "Net 30"}', 'active'),
('e5f6a7b8-c9d0-4123-e5f6-a7b8c9d01234', 'CP005', 'Premium Beauty Chain', 'retailer', 'North America', 'Canada', '{"email": "procurement@premiumbeauty.ca", "phone": "+1-416-555-0199", "address": "456 Queen St, Toronto, ON"}', '{"avg_sell_through": 88.9, "days_inventory": 22.4, "payment_terms": "Net 20"}', 'active');

-- Insert sample sell-in data
INSERT INTO sell_in_data (id, product_id, location_id, channel_partner_id, transaction_date, quantity, unit_price, total_value, invoice_number, payment_terms) VALUES
(gen_random_uuid(), '103275', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-11-15', 500, 12.50, 6250.00, 'INV-2024-001', 'Net 30'),
(gen_random_uuid(), '103276', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-11-15', 300, 13.00, 3900.00, 'INV-2024-002', 'Net 30'),
(gen_random_uuid(), '103249', 'WH001', 'b2c3d4e5-f6a7-4890-b2c3-d4e5f6a78901', '2024-11-20', 750, 11.80, 8850.00, 'INV-2024-003', 'Net 45'),
(gen_random_uuid(), '103247', 'WH001', 'c3d4e5f6-a7b8-4901-c3d4-e5f6a7b89012', '2024-11-25', 400, 12.25, 4900.00, 'INV-2024-004', 'Net 15'),
(gen_random_uuid(), '103164', 'WH001', 'd4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123', '2024-12-01', 600, 15.75, 9450.00, 'INV-2024-005', 'Net 30'),
(gen_random_uuid(), '103165', 'WH001', 'e5f6a7b8-c9d0-4123-e5f6-a7b8c9d01234', '2024-12-05', 350, 16.20, 5670.00, 'INV-2024-006', 'Net 20'),
-- Previous month data
(gen_random_uuid(), '103275', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-10-15', 480, 12.50, 6000.00, 'INV-2024-101', 'Net 30'),
(gen_random_uuid(), '103276', 'WH001', 'b2c3d4e5-f6a7-4890-b2c3-d4e5f6a78901', '2024-10-20', 720, 13.00, 9360.00, 'INV-2024-102', 'Net 45'),
(gen_random_uuid(), '103249', 'WH001', 'c3d4e5f6-a7b8-4901-c3d4-e5f6a7b89012', '2024-10-25', 390, 11.80, 4602.00, 'INV-2024-103', 'Net 15'),
(gen_random_uuid(), '103247', 'WH001', 'd4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123', '2024-10-28', 550, 12.25, 6737.50, 'INV-2024-104', 'Net 30');

-- Insert sample sell-out data  
INSERT INTO sell_out_data (id, product_id, location_id, channel_partner_id, transaction_date, quantity, unit_price, total_value, end_customer_id, inventory_on_hand) VALUES
(gen_random_uuid(), '103275', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-11-20', 420, 18.99, 7975.80, 'CUST001', 80),
(gen_random_uuid(), '103276', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-11-22', 280, 19.50, 5460.00, 'CUST002', 20),
(gen_random_uuid(), '103249', 'WH001', 'b2c3d4e5-f6a7-4890-b2c3-d4e5f6a78901', '2024-11-25', 585, 17.85, 10441.25, 'CUST003', 165),
(gen_random_uuid(), '103247', 'WH001', 'c3d4e5f6-a7b8-4901-c3d4-e5f6a7b89012', '2024-11-28', 370, 18.50, 6845.00, 'CUST004', 30),
(gen_random_uuid(), '103164', 'WH001', 'd4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123', '2024-12-05', 445, 24.99, 11119.55, 'CUST005', 155),
(gen_random_uuid(), '103165', 'WH001', 'e5f6a7b8-c9d0-4123-e5f6-a7b8c9d01234', '2024-12-08', 320, 25.50, 8160.00, 'CUST006', 30),
-- Previous month data
(gen_random_uuid(), '103275', 'WH001', 'a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890', '2024-10-20', 410, 18.99, 7785.90, 'CUST007', 70),
(gen_random_uuid(), '103276', 'WH001', 'b2c3d4e5-f6a7-4890-b2c3-d4e5f6a78901', '2024-10-25', 650, 19.50, 12675.00, 'CUST008', 70),
(gen_random_uuid(), '103249', 'WH001', 'c3d4e5f6-a7b8-4901-c3d4-e5f6a7b89012', '2024-10-28', 355, 17.85, 6336.75, 'CUST009', 35),
(gen_random_uuid(), '103247', 'WH001', 'd4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123', '2024-10-30', 480, 18.50, 8880.00, 'CUST010', 70);

-- Insert forecast data for reconciliation
INSERT INTO forecast_data (id, product_id, location_id, postdate, sell_in_forecast, sell_out_forecast, collaboration_status) VALUES
(gen_random_uuid(), '103275', 'WH001', '2024-11-01', 500, 425, 'completed'),
(gen_random_uuid(), '103276', 'WH001', '2024-11-01', 300, 285, 'completed'),
(gen_random_uuid(), '103249', 'WH001', '2024-11-01', 750, 590, 'completed'),
(gen_random_uuid(), '103247', 'WH001', '2024-11-01', 400, 375, 'completed'),
(gen_random_uuid(), '103164', 'WH001', '2024-12-01', 600, 450, 'in_progress'),
(gen_random_uuid(), '103165', 'WH001', '2024-12-01', 350, 325, 'in_progress'),
-- Previous month forecasts
(gen_random_uuid(), '103275', 'WH001', '2024-10-01', 480, 415, 'completed'),
(gen_random_uuid(), '103276', 'WH001', '2024-10-01', 720, 655, 'completed'),
(gen_random_uuid(), '103249', 'WH001', '2024-10-01', 390, 360, 'completed'),
(gen_random_uuid(), '103247', 'WH001', '2024-10-01', 550, 485, 'completed');

-- Generate reconciliation records using the reconcile_forecasts function
SELECT reconcile_forecasts('103275', 'WH001', '2024-11-01');
SELECT reconcile_forecasts('103276', 'WH001', '2024-11-01');
SELECT reconcile_forecasts('103249', 'WH001', '2024-11-01');
SELECT reconcile_forecasts('103247', 'WH001', '2024-11-01');
SELECT reconcile_forecasts('103275', 'WH001', '2024-10-01');
SELECT reconcile_forecasts('103276', 'WH001', '2024-10-01');
SELECT reconcile_forecasts('103249', 'WH001', '2024-10-01');
SELECT reconcile_forecasts('103247', 'WH001', '2024-10-01');

-- Add some action items to reconciliation records
UPDATE forecast_reconciliation 
SET action_items = ARRAY['Review channel partner inventory levels', 'Investigate demand drivers'], 
    reconciliation_status = 'in_progress'
WHERE ABS(sell_in_variance) > 50 OR ABS(sell_out_variance) > 50;

UPDATE forecast_reconciliation 
SET reconciliation_status = 'critical'
WHERE ABS(sell_in_variance) > 100 OR ABS(sell_out_variance) > 100;