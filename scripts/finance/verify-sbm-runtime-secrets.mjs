const status = (value) => (value ? 'AVAILABLE' : 'MISSING');

console.log(JSON.stringify({
  SBM_STATEMENT_PASSWORD: status(process.env.SBM_STATEMENT_PASSWORD),
  SBM_GMAIL_ACCESS_TOKEN: status(process.env.SBM_GMAIL_ACCESS_TOKEN),
}, null, 2));
