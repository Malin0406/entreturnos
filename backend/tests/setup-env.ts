import 'dotenv/config';

// Os testes de integração usam um schema separado ("test") para não afetar os dados de desenvolvimento.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'segredo-de-teste-com-tamanho-suficiente';
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
