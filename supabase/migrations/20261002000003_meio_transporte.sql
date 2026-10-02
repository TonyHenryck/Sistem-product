-- Como o colaborador vai trabalhar: usado pra saber quem tem veiculo proprio
-- (moto/carro) e quem depende de aplicativo ou transporte publico.

alter table colaborador add column meio_transporte text
  check (meio_transporte in ('Moto', 'Carro', 'Aplicativo', 'Transporte público'));
