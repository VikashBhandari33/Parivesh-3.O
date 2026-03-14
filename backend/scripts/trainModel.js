"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
// Parse a simple CSV without quotes
function parseCSV(content) {
    var lines = content.trim().split('\n');
    var headers = lines[0].split(',').map(function (h) { return h.trim(); });
    var records = [];
    var _loop_1 = function (i) {
        var values = lines[i].split(',').map(function (v) { return v.trim(); });
        if (values.length !== headers.length)
            return "continue";
        var record = {};
        headers.forEach(function (header, index) {
            record[header] = values[index];
        });
        records.push(record);
    };
    for (var i = 1; i < lines.length; i++) {
        _loop_1(i);
    }
    return records;
}
var csvPath = path_1.default.resolve(__dirname, '../../dataset/cecb_proponent_dataset_large.csv');
if (!fs_1.default.existsSync(csvPath)) {
    console.error("Dataset not found at ".concat(csvPath));
    process.exit(1);
}
var content = fs_1.default.readFileSync(csvPath, 'utf-8');
var data = parseCSV(content);
console.log("Loaded ".concat(data.length, " records."));
var totalApps = data.length;
var approvedApps = 0;
var totalApprovalDays = 0;
var sectorStats = {};
var districtStats = {};
// We define area buckets
var areaStats = {
    '<3': { total: 0, approved: 0 },
    '3-6': { total: 0, approved: 0 },
    '6-10': { total: 0, approved: 0 },
    '>10': { total: 0, approved: 0 }
};
// We define risk buckets
var riskStats = {
    'Low (<0.3)': { total: 0, approved: 0, days: 0 },
    'Medium (0.3-0.5)': { total: 0, approved: 0, days: 0 },
    'High (0.5-0.7)': { total: 0, approved: 0, days: 0 },
    'Very High (>0.7)': { total: 0, approved: 0, days: 0 }
};
// EDS stats
var edsStats = {};
for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
    var row = data_1[_i];
    var isApproved = row.approval_status === 'Approved' && row.approval_date;
    var sector = row.project_type;
    var district = row.project_location;
    var area = parseFloat(row.area_hectare);
    var risk = parseFloat(row.environmental_risk_score);
    var eds = parseInt(row.eds_count);
    var days = 0;
    if (isApproved) {
        var subDate = new Date(row.submission_date);
        var appDate = new Date(row.approval_date);
        days = Math.round((appDate.getTime() - subDate.getTime()) / (1000 * 3600 * 24));
        approvedApps++;
        totalApprovalDays += days;
    }
    // Sector
    if (!sectorStats[sector])
        sectorStats[sector] = { total: 0, approved: 0, days: 0 };
    sectorStats[sector].total++;
    if (isApproved) {
        sectorStats[sector].approved++;
        sectorStats[sector].days += days;
    }
    // District
    if (!districtStats[district])
        districtStats[district] = { total: 0, approved: 0, days: 0 };
    districtStats[district].total++;
    if (isApproved) {
        districtStats[district].approved++;
        districtStats[district].days += days;
    }
    // Area
    if (area < 3)
        areaStats['<3'].total++;
    else if (area <= 6)
        areaStats['3-6'].total++;
    else if (area <= 10)
        areaStats['6-10'].total++;
    else
        areaStats['>10'].total++;
    if (isApproved) {
        if (area < 3)
            areaStats['<3'].approved++;
        else if (area <= 6)
            areaStats['3-6'].approved++;
        else if (area <= 10)
            areaStats['6-10'].approved++;
        else
            areaStats['>10'].approved++;
    }
    // Risk
    var rKey = '';
    if (risk < 0.3)
        rKey = 'Low (<0.3)';
    else if (risk <= 0.5)
        rKey = 'Medium (0.3-0.5)';
    else if (risk <= 0.7)
        rKey = 'High (0.5-0.7)';
    else
        rKey = 'Very High (>0.7)';
    riskStats[rKey].total++;
    if (isApproved) {
        riskStats[rKey].approved++;
        riskStats[rKey].days += days;
    }
    // EDS
    var edsKey = eds >= 3 ? '3+' : eds.toString();
    if (!edsStats[edsKey])
        edsStats[edsKey] = { total: 0, approved: 0, days: 0 };
    edsStats[edsKey].total++;
    if (isApproved) {
        edsStats[edsKey].approved++;
        edsStats[edsKey].days += days;
    }
}
var baseApprovalRate = (approvedApps / totalApps) * 100;
var baseAvgDays = approvedApps > 0 ? (totalApprovalDays / approvedApps) : 0;
console.log("Base Approval Rate: ".concat(baseApprovalRate.toFixed(2), "%"));
console.log("Base Average Days: ".concat(baseAvgDays.toFixed(1), " days"));
var weights = {
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
for (var _a = 0, _b = Object.entries(sectorStats); _a < _b.length; _a++) {
    var _c = _b[_a], s = _c[0], stats = _c[1];
    var rate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
    var days = stats.approved > 0 ? stats.days / stats.approved : baseAvgDays;
    weights.sectors[s.toLowerCase()] = {
        rateOffset: rate - baseApprovalRate,
        daysOffset: days - baseAvgDays,
        approvedCount: stats.approved
    };
}
// Calculate District Offsets
for (var _d = 0, _e = Object.entries(districtStats); _d < _e.length; _d++) {
    var _f = _e[_d], d = _f[0], stats = _f[1];
    var rate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;
    var days = stats.approved > 0 ? stats.days / stats.approved : baseAvgDays;
    weights.districts[d.toLowerCase()] = {
        rateOffset: rate - baseApprovalRate,
        daysOffset: days - baseAvgDays,
        approvedCount: stats.approved
    };
}
// area offsets
for (var _g = 0, _h = Object.entries(areaStats); _g < _h.length; _g++) {
    var _j = _h[_g], key = _j[0], val = _j[1];
    var rate = val.total > 0 ? (val.approved / val.total) * 100 : 0;
    weights.areas[key] = {
        rateOffset: rate - baseApprovalRate
    };
}
// risk offsets
for (var _k = 0, _l = Object.entries(riskStats); _k < _l.length; _k++) {
    var _m = _l[_k], key = _m[0], val = _m[1];
    var rate = val.total > 0 ? (val.approved / val.total) * 100 : 0;
    var days = val.approved > 0 ? val.days / val.approved : baseAvgDays;
    weights.risks[key] = {
        rateOffset: rate - baseApprovalRate,
        daysOffset: days - baseAvgDays
    };
}
// eds offsets
for (var _o = 0, _p = Object.entries(edsStats); _o < _p.length; _o++) {
    var _q = _p[_o], key = _q[0], val = _q[1];
    var days = val.approved > 0 ? val.days / val.approved : baseAvgDays;
    weights.eds[key] = {
        daysOffset: days - baseAvgDays
    };
}
var outPath = path_1.default.resolve(__dirname, '../src/services/modelWeights.json');
fs_1.default.writeFileSync(outPath, JSON.stringify(weights, null, 2));
console.log("Model weights dynamically successfully written to ".concat(outPath));
