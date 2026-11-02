import { readFileSync } from 'node:fs';

// Routing functions are deployed separately by Vercel. Keep native database
// engines out of this bundle; authoritative session checks run in the app.
const trace = JSON.parse(readFileSync('.next/server/middleware.js.nft.json', 'utf8'));
const forbidden = trace.files.filter(file => /(?:@prisma|\.prisma|query_engine|generated\/institutional)/.test(file));
if (forbidden.length) {
  throw new Error(`O Proxy não deve incluir clientes ou engines de banco: ${forbidden.join(', ')}`);
}
console.log('Proxy validado: nenhum cliente ou engine de banco no pacote de roteamento.');
