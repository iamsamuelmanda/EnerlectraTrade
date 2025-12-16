// scripts/seed-kabwe.js

const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(__dirname, '..', 'store');
const CONTRIBUTIONS_FILE = path.join(STORE_DIR, 'contributions.json');

const KABWE_CLUSTER_ID = 'clu_kabwe_demo';

const seedContributions = [
  { clusterId: KABWE_CLUSTER_ID, userId: 'coop_001', amountZMW: 2000 },
  { clusterId: KABWE_CLUSTER_ID, userId: 'coop_002', amountZMW: 1500 },
  { clusterId: KABWE_CLUSTER_ID, userId: 'coop_003', amountZMW: 1000 },
  { clusterId: KABWE_CLUSTER_ID, userId: 'coop_004', amountZMW: 500 }
];

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function main() {
  let contributions = loadJson(CONTRIBUTIONS_FILE, []);

  // Remove any existing Kabwe demo contributions to avoid duplicates
  contributions = contributions.filter(
    (c) => c.clusterId !== KABWE_CLUSTER_ID
  );

  contributions = contributions.concat(seedContributions);

  saveJson(CONTRIBUTIONS_FILE, contributions);

  console.log('Seeded Kabwe demo contributions for', KABWE_CLUSTER_ID);
}

main();
