/** Every route the site serves, with the mock API's deterministic identifiers. */
export const FOUNDER = 'hash13t8v5nnghrvgcuuqcrt9k5wyhtqwq7fl3ynjpy';
export const VAL1 = 'hashvaloper127zemcfnxd3jrldpjzzgcckek4dswyw0l7rfcq';

export const ROUTES: string[] = [
  '/',
  '/blocks',
  '/blocks/100',
  '/txs',
  '/txs?type=Send',
  '/accounts',
  `/accounts/${FOUNDER}`,
  '/validators',
  `/validators/${VAL1}`,
  '/rewards',
  '/founder',
  '/governance',
  '/governance/1',
  '/network',
  '/docs',
  '/docs/run-a-node',
  '/docs/api',
  '/status',
  '/brand',
  '/this-does-not-exist',
];
