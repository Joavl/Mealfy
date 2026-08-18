-- Habilita pagamento por cartão (base para Google Pay / Apple Pay, que são
-- carteiras entregando um cartão tokenizado ao gateway — não meios próprios).
-- PG 12+ aceita ADD VALUE dentro de transação desde que o valor não seja
-- usado na mesma transação, que é o caso aqui.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'card';
