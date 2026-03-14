import fs from 'fs';
import path from 'path';

// Parse a simple CSV without quotes
function parseCSV(content: string) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const record: any = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    records.push(record);
  }
  return records;
}

const csvPath = path.resolve(__dirname, '../../dataset/cecb_proponent_dataset_large.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`Dataset not found at ${csvPath}`);
  process.exit(1);
}

const content = fs.readFileSync(csvPath, 'utf-8');
const data = parseCSV(content);

console.log(`Loaded ${data.length} records.`);

let totalApps = data.length;
let approvedApps = 0;
let totalApprovalDays = 0;

const sectorStats: Record<string, { total: number, approved: number, days: number }> = {};
const districtStats: Record<string, { total: number, approved: number, days: number }> = {};

// We define area buckets
const areaStats = {
  '<3': { total: 0, approved: 0 },
  '3-6': { total: 0, approved: 0 },
  '6-10': { total: 0, approved: 0 },
  '>10': { total: 0, approved: 0 }
};

// We define risk buckets
const riskStats = {
  'Low (<0.3)': { total: 0, approved: 0, days: 0 },
  'Medium (0.3-0.5)': { total: 0, approved: 0, days: 0 },
  'High (0.5-0.7)': { total: 0, approved: 0, days: 0 },
  'Very High (>0.7)': { total: 0, approved: 0, days: 0 }
};

// EDS stats
const edsStats: Record<string, { total: number, days: number, approved: number }> = {};

for (const row of data) {
  const isApproved = row.approval_status === 'Approved' && row.approval_date;
  const sector = row.project_type;
  const district = row.project_location;
  const area = parseFloat(row.area_hectare);
  const risk = parseFloat(row.environmental_risk_score);
  const eds = parseInt(row.eds_count);

  let days = 0;
  if (isApproved) {
    const subDate = new Date(row.submission_date);
    const appDate = new Date(row.approval_date);
    days = Math.round((appDate.getTime() - subDate.getTime()) / (1000 * 3600 * 24));
    
    approvedApps++;
    totalApprovalDays += days;
  }

  // Sector
  if (!sectorStats[sector]) sectorStats[sector] = { total: 0, approved: 0, days: 0 };
  sectorStats[sector].total++;
  if (isApproved) {
    sectorStats[sector].approved++;
    sectorStats[sector].days += days;
  }

  // District
  if (!districtStats[district]) districtStats[district] = { total: 0, approved: 0, days: 0 };
  districtStats[district].total++;
  if (isApproved) {
    districtStats[district].approved++;
    districtStats[district].days += days;
  }

  // Area
  if (area < 3) areaStats['<3'].total++;
  else if (area <= 6) areaStats['3-6'].total++;
  else if (area <= 10) areaStats['6-10'].total++;
  else areaStats['>10'].total++;
  
  if (isApproved) {
    if (area < 3) areaStats['<3'].approved++;
    else if (area <= 6) areaStats['3-6'].approved++;
    else if (area <= 10) areaStats['6-10'].approved++;
    else areaStats['>10'].approved++;
  }

  // Risk
  let rKey = '';
  if (risk < 0.3) rKey = 'Low (<0.3)';
  else if (risk <= 0.5) rKey = 'Medium (0.3-0.5)';
  else if (risk <= 0.7) rKey = 'High (0.5-0.7)';
  else rKey = 'Very High (>0.7)';
  
  riskStats[rKey].total++;
  if (isApproved) {
    riskStats[rKey].approved++;
    riskStats[rKey].days += days;
  }

  // EDS
  const edsKey = eds >= 3 ? '3+' : eds.toString();
  if (!edsStats[edsKey]) edsStats[edsKey] = { total: 0, approved: 0, days: 0 };
  edsStats[edsKey].total++;
  if (isApproved) {
    edsStats[edsKey].approved++;
    edsStats[edsKey].days += days;
  }
}

const baseApprovalRate = (approvedApps / totalApps) * 100;
const baseAvgDays = approvedApps > 0 ? (totalApprovalDays / approvedApps) : 0;

console.log(`Base Approval Rate: ${baseApprovalRate.toFixed(2)}%`);
console.log(`Base Average Days: ${baseAvgDays.toFixed(1)} days`);

const weights: any = {
  dataPoints: totalApps,
  baseRate: baseApprovalRate,
  baseDays: baseAvgDays,
  sectors: {},
  districts: {},
  areas: {},
  risks: {},
  eds: {}
};

// Calculate Sector Offsets
for (const [s, stats] of Object.entries(sectorStats)) {
  const rate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
  const days = stats.approved > 0 ? stats.days / stats.approved : baseAvgDays;
  weights.sectors[s.toLowerCase()] = {
    rateOffset: rate - baseApprovalRate,
    daysOffset: days - baseAvgDays,
    approvedCount: stats.approved
  };
}

// Calculate District Offsets
for (const [d, stats] of Object.entries(districtStats)) {
  const rate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
  const days = stats.approved > 0 ? stats.days / stats.approved : baseAvgDays;
  weights.districts[d.toLowerCase()] = {
    rateOffset: rate - baseApprovalRate,
    daysOffset: days - baseAvgDays,
    approvedCount: stats.approved
  };
}

// area offsets
for (const [key, val] of Object.entries(areaStats)) {
  const rate = val.total > 0 ? (val.approved / val.total) * 100 : 0;
  weights.areas[key] = {
    rateOffset: rate - baseApprovalRate
  };
}

// risk offsets
for (const [key, val] of Object.entries(riskStats)) {
  const rate = val.total > 0 ? (val.approved / val.total) * 100 : 0;
  const days = val.approved > 0 ? val.days / val.approved : baseAvgDays;
  weights.risks[key] = {
    rateOffset: rate - baseApprovalRate,
    daysOffset: days - baseAvgDays
  };
}

// eds offsets
for (const [key, val] of Object.entries(edsStats)) {
  const days = val.approved > 0 ? val.days / val.approved : baseAvgDays;
  weights.eds[key] = {
    daysOffset: days - baseAvgDays
  };
}

const outPath = path.resolve(__dirname, '../src/services/modelWeights.json');
fs.writeFileSync(outPath, JSON.stringify(weights, null, 2));

console.log(`Model weights dynamically successfully written to ${outPath}`);
