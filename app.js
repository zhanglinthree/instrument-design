const { createApp, ref, computed, reactive, watch, nextTick } = Vue;

/* ========== 物模型 Mock ========== */
const CATEGORIES = [
  { id: 'C001', name: '液位监测井', code: 'level_well', industry: '市政排水', aepBound: true, aepProductId: 'AEP-LW-1001', deviceCount: 128, modelVersion: 'v1.2.0', updatedAt: '2026-09-28 14:22', status: '启用' },
  { id: 'C002', name: '水质监测站', code: 'water_quality', industry: '环保监测', aepBound: true, aepProductId: 'AEP-WQ-2003', deviceCount: 56, modelVersion: 'v2.0.1', updatedAt: '2026-09-26 09:10', status: '启用' },
  { id: 'C003', name: '管网压力表', code: 'pipe_pressure', industry: '供水', aepBound: false, aepProductId: '', deviceCount: 0, modelVersion: 'v0.9.0', updatedAt: '2026-09-20 16:45', status: '草稿' },
  { id: 'C004', name: '泵站机组', code: 'pump_unit', industry: '市政排水', aepBound: true, aepProductId: 'AEP-PU-3012', deviceCount: 34, modelVersion: 'v1.0.3', updatedAt: '2026-09-18 11:30', status: '启用' },
  { id: 'C005', name: '雨量计', code: 'rain_gauge', industry: '气象水文', aepBound: false, aepProductId: '', deviceCount: 12, modelVersion: 'v1.1.0', updatedAt: '2026-09-12 08:05', status: '停用' },
];

const AEP_PRODUCTS = [
  { id: 'AEP-LW-1001', name: '液位监测井标准型', model: 'MF-LW-100' },
  { id: 'AEP-WQ-2003', name: '水质监测站标准型', model: 'MF-WQ-200' },
  { id: 'AEP-PP-4001', name: '管网压力表标准型', model: 'MF-PP-50' },
  { id: 'AEP-PU-3012', name: '泵站机组控制型', model: 'MF-PU-300' },
  { id: 'AEP-RG-5001', name: '雨量计基础型', model: 'MF-RG-10' },
];

const PROPERTIES = [
  { id: 'P1', identifier: 'liquid_level', name: '液位', dataType: 'float', unit: 'm', access: '只读', reportCycle: '60s', required: true },
  { id: 'P2', identifier: 'battery_voltage', name: '电池电压', dataType: 'float', unit: 'V', access: '只读', reportCycle: '300s', required: true },
  { id: 'P3', identifier: 'signal_rssi', name: '信号强度', dataType: 'int', unit: 'dBm', access: '只读', reportCycle: '300s', required: false },
  { id: 'P4', identifier: 'device_temp', name: '设备温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '120s', required: false },
];

const EVENTS = [
  { id: 'E1', identifier: 'overflow_alarm', name: '溢流报警', level: '报警', trigger: '液位 ≥ 报警上限', desc: '井内液位超过报警阈值' },
  { id: 'E2', identifier: 'low_battery', name: '低电量预警', level: '预警', trigger: '电池电压 < 3.4V', desc: '电量不足，需更换电池' },
  { id: 'E3', identifier: 'sensor_fault', name: '传感器故障', level: '故障', trigger: '连续 3 次采集失败', desc: '探头无响应或数据异常' },
];

const POINTS = [
  { id: 'M1', code: 'LL', name: '液位', unit: 'm', dataType: 'float', min: 0, max: 10, cycle: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: '', faultHigh: 9.5, desc: '井内水位高度' },
  { id: 'M2', code: 'BV', name: '电池电压', unit: 'V', dataType: 'float', min: 0, max: 5, cycle: 300, warnLow: 3.5, warnHigh: '', alarmLow: 3.3, alarmHigh: '', faultLow: 3.0, faultHigh: '', desc: '设备供电电压' },
  { id: 'M3', code: 'RSSI', name: '信号强度', unit: 'dBm', dataType: 'int', min: -120, max: 0, cycle: 300, warnLow: -100, warnHigh: '', alarmLow: -110, alarmHigh: '', faultLow: '', faultHigh: '', desc: '无线通信信号' },
  { id: 'M4', code: 'DT', name: '设备温度', unit: '℃', dataType: 'float', min: -40, max: 85, cycle: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: '', faultHigh: 80, desc: '主板温度' },
];

const INSTALL_FIELDS = [
  { id: 'I1', code: 'well_depth', name: '井深', dataType: 'float', unit: 'm', required: true, defaultVal: '', example: '8.5', desc: '检查井深度' },
  { id: 'I2', code: 'pipe_diameter', name: '管径', dataType: 'float', unit: 'mm', required: true, defaultVal: '', example: '600', desc: '进出水管管径' },
  { id: 'I3', code: 'install_height', name: '安装高度', dataType: 'float', unit: 'm', required: true, defaultVal: '0.3', example: '0.3', desc: '探头距井底高度' },
  { id: 'I4', code: 'well_no', name: '井号', dataType: 'string', unit: '-', required: true, defaultVal: '', example: 'JW-2026-001', desc: '现场井编号' },
  { id: 'I5', code: 'cover_type', name: '井盖类型', dataType: 'enum', unit: '-', required: false, defaultVal: '铸铁', example: '铸铁/复合材料', desc: '井盖材质类型' },
];

const FIRMWARES = [
  { id: 'F1', model: 'MF-LW-100', currentVersion: '1.2.0', upgradeVersion: '1.3.0', releaseDate: '2026-09-15', status: '可升级', changelog: '优化液位滤波算法；修复低电量误报' },
  { id: 'F2', model: 'MF-LW-100', currentVersion: '1.1.2', upgradeVersion: '1.2.0', releaseDate: '2026-07-01', status: '基线', changelog: '支持 AEP 物模型 v1.2' },
  { id: 'F3', model: 'MF-LW-200', currentVersion: '2.0.1', upgradeVersion: '', releaseDate: '2026-08-20', status: '最新', changelog: '新硬件平台首发固件' },
];

/* ========== 设备台账 Mock ========== */
const PROJECTS = [
  { id: 'PJ01', name: '城东排涝一期', status: '进行中', owner: '王建国', deviceCount: 86, region: '城东片区', startedAt: '2026-03-01', desc: '城东易涝点液位与泵站监测' },
  { id: 'PJ02', name: '南湖水质专项', status: '进行中', owner: '李敏', deviceCount: 42, region: '南湖流域', startedAt: '2026-05-12', desc: '南湖出入湖水质站建设' },
  { id: 'PJ03', name: '老城供水管网', status: '已完工', owner: '赵强', deviceCount: 118, region: '老城区', startedAt: '2025-11-01', desc: '老城压力表替换与接入' },
  { id: 'PJ04', name: '滨江泵站改造', status: '筹备中', owner: '陈芳', deviceCount: 0, region: '滨江新区', startedAt: '2026-09-01', desc: '滨江 3 座泵站机组台账预建' },
  { id: 'PJ05', name: '雨量站扩容', status: '已暂停', owner: '周伟', deviceCount: 12, region: '全市', startedAt: '2026-01-20', desc: '气象雨量计补充部署' },
];

const DEVICES = [
  { id: 'D001', sn: 'MF20260901001', name: '东湖路井-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', lifecycle: '在线', aepDeviceId: 'AEP-DEV-10001', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153576, lat: 30.287459, address: '杭州市上城区东湖路与环城东路交叉口东南侧检查井', installDate: '2026-04-12', installer: '张伟', masterId: '', masterSn: '', slaves: ['D002'], photos: ['现场全景', '井内安装', '铭牌特写'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.3', well_no: 'JW-2026-001', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D002', sn: 'MF20260901002', name: '东湖路井-01从机', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', lifecycle: '在线', aepDeviceId: 'AEP-DEV-10002', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153610, lat: 30.287480, address: '杭州市上城区东湖路检查井（从机）', installDate: '2026-04-12', installer: '张伟', masterId: 'D001', masterSn: 'MF20260901001', slaves: [], photos: ['从机安装'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.5', well_no: 'JW-2026-001-S', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D003', sn: 'MF20260520011', name: '南湖入口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', lifecycle: '离线', aepDeviceId: 'AEP-DEV-20011', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.148220, lat: 30.265110, address: '南湖公园北门入湖口', installDate: '2026-06-01', installer: '刘洋', masterId: '', masterSn: '', slaves: [], photos: ['站房外观', '采水口'], installParams: { sample_depth: '1.2', station_code: 'NH-IN-01' }, updatedAt: '2026-09-28 09:11' },
  { id: 'D004', sn: 'MF20251108088', name: '解放路压力-12', projectId: 'PJ03', projectName: '老城供水管网', categoryId: 'C003', categoryName: '管网压力表', lifecycle: '停用', aepDeviceId: '', model: 'MF-PP-50', firmware: '0.9.0', lng: 120.165001, lat: 30.274880, address: '解放路 88 号门前阀门井', installDate: '2025-12-05', installer: '孙磊', masterId: '', masterSn: '', slaves: [], photos: [], installParams: { pipe_diameter: '300', install_depth: '1.5' }, updatedAt: '2026-08-10 14:00' },
  { id: 'D005', sn: 'MF20260915030', name: '城东泵站1#机组', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C004', categoryName: '泵站机组', lifecycle: '在线', aepDeviceId: 'AEP-DEV-30120', model: 'MF-PU-300', firmware: '1.0.3', lng: 120.160100, lat: 30.291200, address: '城东排涝泵站泵房', installDate: '2026-05-20', installer: '赵强', masterId: '', masterSn: '', slaves: [], photos: ['机组铭牌', '控制柜'], installParams: { rated_power: '75', pump_no: '1#' }, updatedAt: '2026-09-30 08:05' },
  { id: 'D006', sn: 'MF20260120001', name: '气象局雨量-03', projectId: 'PJ05', projectName: '雨量站扩容', categoryId: 'C005', categoryName: '雨量计', lifecycle: '报废', aepDeviceId: 'AEP-DEV-RG-03', model: 'MF-RG-10', firmware: '1.0.0', lng: 120.172000, lat: 30.300000, address: '市气象局观测场', installDate: '2024-03-01', installer: '周伟', masterId: '', masterSn: '', slaves: [], photos: [], installParams: { mount_height: '1.2' }, updatedAt: '2026-07-01 10:00' },
  { id: 'D007', sn: 'MF20260928050', name: '望江路井-待接入', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', lifecycle: '待接入', aepDeviceId: '', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.155800, lat: 30.282100, address: '望江路与秋涛路交叉口', installDate: '2026-09-28', installer: '张伟', masterId: '', masterSn: '', slaves: [], photos: ['待装现场'], installParams: { well_depth: '7.2', pipe_diameter: '800', install_height: '0.3', well_no: 'JW-2026-050', cover_type: '复合材料' }, updatedAt: '2026-09-28 16:40' },
  { id: 'D008', sn: 'MF20260601022', name: '南湖出口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', lifecycle: '在线', aepDeviceId: 'AEP-DEV-20022', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.151100, lat: 30.258900, address: '南湖出水闸附近', installDate: '2026-06-08', installer: '刘洋', masterId: '', masterSn: '', slaves: [], photos: ['站房', '仪表盘'], installParams: { sample_depth: '0.8', station_code: 'NH-OUT-01' }, updatedAt: '2026-09-29 21:00' },
];

const AEP_DIFFS = [
  { id: 'AD1', type: 'extra', sn: 'AEP-ONLY-9001', aepDeviceId: 'AEP-DEV-9001', aepName: '未知液位设备-9001', productId: 'AEP-LW-1001', hint: 'AEP 有台账无：可能未导入或 SN 不一致', action: 'pending' },
  { id: 'AD2', type: 'extra', sn: 'AEP-ONLY-9008', aepDeviceId: 'AEP-DEV-9008', aepName: '测试压力点-9008', productId: 'AEP-PU-3012', hint: '疑似测试设备残留', action: 'pending' },
  { id: 'AD3', type: 'missing', sn: 'MF20260928050', aepDeviceId: '', aepName: '', productId: 'AEP-LW-1001', localName: '望江路井-待接入', localId: 'D007', hint: '本地已建档，AEP 尚未创建设备', action: 'pending' },
  { id: 'AD4', type: 'missing', sn: 'MF20251108088', aepDeviceId: '', aepName: '', productId: '', localName: '解放路压力-12', localId: 'D004', hint: '品类未绑定 AEP 产品，无法对账创建设备', action: 'pending' },
  { id: 'AD5', type: 'extra', sn: 'AEP-ONLY-7712', aepDeviceId: 'AEP-DEV-7712', aepName: '滨江临时终端', productId: 'AEP-LW-1001', hint: '不在本期项目范围', action: 'ignored' },
];

const LIFECYCLES = ['待接入', '在线', '离线', '停用', '报废'];
const LC_CLASS = { '待接入': 'lc-pending', '在线': 'lc-online', '离线': 'lc-offline', '停用': 'lc-disabled', '报废': 'lc-scrapped' };
const LC_TAG = { '待接入': 'tag-orange', '在线': 'tag-green', '离线': 'tag-gray', '停用': 'tag-gray', '报废': 'tag-red' };
const PJ_STATUS_TAG = { '进行中': 'tag-blue', '已完工': 'tag-green', '筹备中': 'tag-orange', '已暂停': 'tag-gray' };

/* ========== 在线监控 Mock ========== */
const TRUST_TAG = { T0: 'tag-red', T1: 'tag-orange', T2: 'tag-blue', T3: 'tag-green' };
const TRUST_LABEL = { T0: '不可信', T1: '低可信', T2: '中可信', T3: '高可信' };
const ONLINE_TAG = { '在线': 'tag-green', '离线': 'tag-gray', '未知': 'tag-orange' };

const MONITOR_ROWS = [
  { id: 'D001', sn: 'MF20260901001', name: '东湖路井-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', online: '在线', lastReportAt: '2026-09-30 16:42:18', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T3', trustScore: 96, warn: 1, alarm: 0, fault: 0, cycleSec: 60, missed24h: 0, expected24h: 1440, actual24h: 1438 },
  { id: 'D002', sn: 'MF20260901002', name: '东湖路井-01从机', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', online: '在线', lastReportAt: '2026-09-30 16:41:50', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T3', trustScore: 94, warn: 0, alarm: 0, fault: 0, cycleSec: 60, missed24h: 2, expected24h: 1440, actual24h: 1438 },
  { id: 'D003', sn: 'MF20260520011', name: '南湖入口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', online: '离线', lastReportAt: '2026-09-28 09:11:02', firmware: '2.0.1', model: 'MF-WQ-200', trustLevel: 'T1', trustScore: 42, warn: 0, alarm: 2, fault: 1, cycleSec: 300, missed24h: 48, expected24h: 288, actual24h: 240 },
  { id: 'D005', sn: 'MF20260915030', name: '城东泵站1#机组', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C004', categoryName: '泵站机组', online: '在线', lastReportAt: '2026-09-30 16:40:05', firmware: '1.0.3', model: 'MF-PU-300', trustLevel: 'T2', trustScore: 78, warn: 2, alarm: 1, fault: 0, cycleSec: 120, missed24h: 6, expected24h: 720, actual24h: 714 },
  { id: 'D008', sn: 'MF20260601022', name: '南湖出口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', online: '在线', lastReportAt: '2026-09-30 16:35:40', firmware: '2.0.1', model: 'MF-WQ-200', trustLevel: 'T3', trustScore: 91, warn: 0, alarm: 0, fault: 0, cycleSec: 300, missed24h: 1, expected24h: 288, actual24h: 287 },
  { id: 'D006', sn: 'MF20260120001', name: '气象局雨量-03', projectId: 'PJ05', projectName: '雨量站扩容', categoryId: 'C005', categoryName: '雨量计', online: '离线', lastReportAt: '2026-07-01 10:00:00', firmware: '1.0.0', model: 'MF-RG-10', trustLevel: 'T0', trustScore: 12, warn: 0, alarm: 0, fault: 1, cycleSec: 1800, missed24h: 48, expected24h: 48, actual24h: 0 },
  { id: 'D007', sn: 'MF20260928050', name: '望江路井-待接入', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '液位监测井', online: '未知', lastReportAt: '—', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T0', trustScore: 0, warn: 0, alarm: 0, fault: 0, cycleSec: 60, missed24h: 0, expected24h: 0, actual24h: 0 },
  { id: 'D004', sn: 'MF20251108088', name: '解放路压力-12', projectId: 'PJ03', projectName: '老城供水管网', categoryId: 'C003', categoryName: '管网压力表', online: '离线', lastReportAt: '2026-08-10 14:00:00', firmware: '0.9.0', model: 'MF-PP-50', trustLevel: 'T1', trustScore: 35, warn: 1, alarm: 0, fault: 0, cycleSec: 900, missed24h: 12, expected24h: 96, actual24h: 84 },
];

const MONITOR_POINTS = {
  D001: [
    { code: 'LL', name: '液位', unit: 'm', value: 3.42, trustLevel: 'T3', trustScore: 98, ts: '2026-09-30 16:42:18', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
    { code: 'BV', name: '电池电压', unit: 'V', value: 3.78, trustLevel: 'T3', trustScore: 95, ts: '2026-09-30 16:40:00', cycleSec: 300, warnLow: 3.5, warnHigh: null, alarmLow: 3.3, alarmHigh: null, faultLow: 3.0, faultHigh: null, ymin: 2.5, ymax: 5 },
    { code: 'RSSI', name: '信号强度', unit: 'dBm', value: -72, trustLevel: 'T2', trustScore: 82, ts: '2026-09-30 16:40:00', cycleSec: 300, warnLow: -100, warnHigh: null, alarmLow: -110, alarmHigh: null, faultLow: null, faultHigh: null, ymin: -120, ymax: 0 },
    { code: 'DT', name: '设备温度', unit: '℃', value: 28.6, trustLevel: 'T3', trustScore: 97, ts: '2026-09-30 16:41:00', cycleSec: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: null, faultHigh: 80, ymin: -40, ymax: 85 },
  ],
  D003: [
    { code: 'PH', name: 'pH', unit: '', value: 8.9, trustLevel: 'T1', trustScore: 40, ts: '2026-09-28 09:11:02', cycleSec: 300, warnLow: 6.5, warnHigh: 8.5, alarmLow: 6.0, alarmHigh: 9.0, faultLow: 5.0, faultHigh: 10.0, ymin: 0, ymax: 14 },
    { code: 'DO', name: '溶解氧', unit: 'mg/L', value: 2.1, trustLevel: 'T1', trustScore: 38, ts: '2026-09-28 09:11:02', cycleSec: 300, warnLow: 3.0, warnHigh: null, alarmLow: 2.0, alarmHigh: null, faultLow: 1.0, faultHigh: null, ymin: 0, ymax: 15 },
  ],
  D005: [
    { code: 'CUR', name: '运行电流', unit: 'A', value: 118, trustLevel: 'T2', trustScore: 76, ts: '2026-09-30 16:40:05', cycleSec: 120, warnLow: null, warnHigh: 130, alarmLow: null, alarmHigh: 145, faultLow: null, faultHigh: 160, ymin: 0, ymax: 200 },
    { code: 'VIB', name: '振动', unit: 'mm/s', value: 4.8, trustLevel: 'T2', trustScore: 80, ts: '2026-09-30 16:40:05', cycleSec: 120, warnLow: null, warnHigh: 4.5, alarmLow: null, alarmHigh: 7.0, faultLow: null, faultHigh: 10.0, ymin: 0, ymax: 15 },
  ],
  D006: [
    { code: 'RAIN', name: '雨量', unit: 'mm', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 1800, warnLow: null, warnHigh: 50, alarmLow: null, alarmHigh: 80, faultLow: null, faultHigh: null, ymin: 0, ymax: 100 },
  ],
  D004: [
    { code: 'P', name: '管网压力', unit: 'MPa', value: 0.28, trustLevel: 'T1', trustScore: 35, ts: '2026-08-10 14:00:00', cycleSec: 900, warnLow: 0.15, warnHigh: 0.45, alarmLow: 0.10, alarmHigh: 0.55, faultLow: null, faultHigh: 0.70, ymin: 0, ymax: 1 },
  ],
  D008: [
    { code: 'PH', name: 'pH', unit: '', value: 7.2, trustLevel: 'T3', trustScore: 93, ts: '2026-09-30 16:35:40', cycleSec: 300, warnLow: 6.5, warnHigh: 8.5, alarmLow: 6.0, alarmHigh: 9.0, faultLow: 5.0, faultHigh: 10.0, ymin: 0, ymax: 14 },
    { code: 'DO', name: '溶解氧', unit: 'mg/L', value: 6.4, trustLevel: 'T3', trustScore: 90, ts: '2026-09-30 16:35:40', cycleSec: 300, warnLow: 3.0, warnHigh: null, alarmLow: 2.0, alarmHigh: null, faultLow: 1.0, faultHigh: null, ymin: 0, ymax: 15 },
  ],
  D002: [
    { code: 'LL', name: '液位', unit: 'm', value: 3.38, trustLevel: 'T3', trustScore: 94, ts: '2026-09-30 16:41:50', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
  ],
  D007: [
    { code: 'LL', name: '液位', unit: 'm', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
  ],
};

function genCurveSeries(point, days) {
  const n = days === 30 ? 90 : 48;
  const ymin = point.ymin != null ? point.ymin : 0;
  const ymax = point.ymax != null ? point.ymax : 10;
  const mid = point.value != null ? point.value : (ymin + ymax) / 2;
  const amp = (ymax - ymin) * 0.18;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(t * Math.PI * 4 + mid) * amp + Math.cos(t * Math.PI * 1.7) * amp * 0.35;
    let v = mid + wave;
    if (i > n * 0.72 && point.warnHigh != null) v = Math.min(ymax, point.warnHigh + (ymax - point.warnHigh) * 0.15 * Math.sin(i));
    v = Math.max(ymin, Math.min(ymax, v));
    pts.push({ i, t, v: Math.round(v * 100) / 100 });
  }
  return pts;
}

createApp({
  setup() {
    const module = ref('thing'); // thing | ledger | monitor
    const screen = ref('list');
    const detailTab = ref('points');
    const searchKeyword = ref('');
    const filterIndustry = ref('');
    const filterAep = ref('');

    const showCategoryModal = ref(false);
    const categoryModalMode = ref('create');
    const categoryForm = reactive({ id: '', name: '', code: '', industry: '市政排水', desc: '', aepProductId: '', status: '启用' });

    const showAepModal = ref(false);
    const aepForm = reactive({ categoryId: '', aepProductId: '' });

    const showDeleteConfirm = ref(false);
    const deleteTarget = reactive({ type: '', id: '', name: '' });

    const currentCategory = ref(CATEGORIES[0]);

    const pointForm = reactive({
      id: '', code: '', name: '', unit: '', dataType: 'float', min: '', max: '', cycle: 60,
      warnLow: '', warnHigh: '', alarmLow: '', alarmHigh: '', faultLow: '', faultHigh: '', desc: ''
    });
    const pointFormMode = ref('create');

    const installForm = reactive({
      id: '', code: '', name: '', dataType: 'float', unit: '', required: true, defaultVal: '', example: '', desc: ''
    });
    const installFormMode = ref('create');

    const firmwareForm = reactive({
      id: '', model: '', currentVersion: '', upgradeVersion: '', releaseDate: '', status: '可升级', changelog: ''
    });
    const firmwareFormMode = ref('create');

    /* ---- 设备台账 state ---- */
    const projectSearch = ref('');
    const projectStatusFilter = ref('');
    const showProjectModal = ref(false);
    const projectModalMode = ref('create');
    const projectForm = reactive({ id: '', name: '', status: '筹备中', owner: '', region: '', startedAt: '2026-09-30', desc: '' });

    const deviceProjectFilter = ref('');
    const deviceCategoryFilter = ref('');
    const deviceLifecycleFilter = ref('');
    const deviceSnSearch = ref('');
    const currentDevice = ref(DEVICES[0]);

    const showImportModal = ref(false);
    const importMode = ref('import'); // import | export

    const showDisableConfirm = ref(false);

    const deviceFormMode = ref('edit');
    const deviceForm = reactive({
      id: '', sn: '', name: '', projectId: '', categoryId: '', lifecycle: '待接入',
      aepDeviceId: '', model: '', firmware: '', lng: '', lat: '', address: '',
      installDate: '', installer: '', masterId: '',
      installParamsText: '', photosText: ''
    });

    const aepDiffTab = ref('extra'); // extra | missing | ignored
    const aepDiffs = ref(AEP_DIFFS.map(d => ({ ...d })));

    /* ---- 在线监控 state ---- */
    const monProjectFilter = ref('');
    const monCategoryFilter = ref('');
    const monOnlineFilter = ref('');
    const monAlarmFilter = ref(''); // '' | warn | alarm | fault | none | any
    const monSearch = ref('');
    const currentMonitor = ref(MONITOR_ROWS[0]);
    const monCurveRange = ref(7); // 7 | 30
    const monCurvePointCode = ref('LL');

    const filteredCategories = computed(() => {
      return CATEGORIES.filter(c => {
        const kw = searchKeyword.value.trim();
        if (kw && !(c.name.includes(kw) || c.code.includes(kw) || c.id.includes(kw))) return false;
        if (filterIndustry.value && c.industry !== filterIndustry.value) return false;
        if (filterAep.value === 'bound' && !c.aepBound) return false;
        if (filterAep.value === 'unbound' && c.aepBound) return false;
        return true;
      });
    });

    const industries = ['市政排水', '环保监测', '供水', '气象水文'];

    const filteredProjects = computed(() => {
      return PROJECTS.filter(p => {
        const kw = projectSearch.value.trim();
        if (kw && !(p.name.includes(kw) || p.owner.includes(kw) || p.id.includes(kw))) return false;
        if (projectStatusFilter.value && p.status !== projectStatusFilter.value) return false;
        return true;
      });
    });

    const filteredDevices = computed(() => {
      return DEVICES.filter(d => {
        if (deviceProjectFilter.value && d.projectId !== deviceProjectFilter.value) return false;
        if (deviceCategoryFilter.value && d.categoryId !== deviceCategoryFilter.value) return false;
        if (deviceLifecycleFilter.value && d.lifecycle !== deviceLifecycleFilter.value) return false;
        const kw = deviceSnSearch.value.trim();
        if (kw && !(d.sn.includes(kw) || d.name.includes(kw) || (d.aepDeviceId || '').includes(kw))) return false;
        return true;
      });
    });

    const deviceStats = computed(() => {
      const all = filteredDevices.value;
      const count = (s) => all.filter(d => d.lifecycle === s).length;
      return {
        total: all.length,
        online: count('在线'),
        offline: count('离线'),
        pending: count('待接入'),
        disabled: count('停用') + count('报废'),
      };
    });

    const filteredAepDiffs = computed(() => {
      if (aepDiffTab.value === 'ignored') return aepDiffs.value.filter(d => d.action === 'ignored');
      return aepDiffs.value.filter(d => d.type === aepDiffTab.value && d.action === 'pending');
    });

    const aepCounts = computed(() => ({
      extra: aepDiffs.value.filter(d => d.type === 'extra' && d.action === 'pending').length,
      missing: aepDiffs.value.filter(d => d.type === 'missing' && d.action === 'pending').length,
      ignored: aepDiffs.value.filter(d => d.action === 'ignored').length,
    }));

    const filteredMonitorRows = computed(() => {
      return MONITOR_ROWS.filter(d => {
        if (monProjectFilter.value && d.projectId !== monProjectFilter.value) return false;
        if (monCategoryFilter.value && d.categoryId !== monCategoryFilter.value) return false;
        if (monOnlineFilter.value && d.online !== monOnlineFilter.value) return false;
        if (monAlarmFilter.value === 'warn' && !(d.warn > 0)) return false;
        if (monAlarmFilter.value === 'alarm' && !(d.alarm > 0)) return false;
        if (monAlarmFilter.value === 'fault' && !(d.fault > 0)) return false;
        if (monAlarmFilter.value === 'any' && !(d.warn + d.alarm + d.fault > 0)) return false;
        if (monAlarmFilter.value === 'none' && (d.warn + d.alarm + d.fault > 0)) return false;
        const kw = monSearch.value.trim();
        if (kw && !(d.sn.includes(kw) || d.name.includes(kw))) return false;
        return true;
      });
    });

    const monListStats = computed(() => {
      const all = filteredMonitorRows.value;
      return {
        total: all.length,
        online: all.filter(d => d.online === '在线').length,
        offline: all.filter(d => d.online === '离线').length,
        alarming: all.filter(d => d.warn + d.alarm + d.fault > 0).length,
        lowTrust: all.filter(d => d.trustLevel === 'T0' || d.trustLevel === 'T1').length,
      };
    });

    const monLatestPoints = computed(() => {
      const id = currentMonitor.value?.id;
      return (id && MONITOR_POINTS[id]) ? MONITOR_POINTS[id] : [];
    });

    const monSelectedPoint = computed(() => {
      const pts = monLatestPoints.value;
      if (!pts.length) return null;
      return pts.find(p => p.code === monCurvePointCode.value) || pts[0];
    });

    const monCurveSeries = computed(() => {
      const p = monSelectedPoint.value;
      if (!p) return [];
      return genCurveSeries(p, monCurveRange.value);
    });

    const monCurveSvg = computed(() => {
      const p = monSelectedPoint.value;
      const series = monCurveSeries.value;
      if (!p || !series.length) return { path: '', w: 1000, h: 320, pad: 40, lines: [], labels: [] };
      const w = 1000, h = 320, padL = 48, padR = 16, padT = 20, padB = 36;
      const ymin = p.ymin, ymax = p.ymax;
      const x = (t) => padL + t * (w - padL - padR);
      const y = (v) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - padT - padB);
      const path = series.map((pt, idx) => (idx ? 'L' : 'M') + x(pt.t).toFixed(1) + ',' + y(pt.v).toFixed(1)).join(' ');
      const mkLine = (val, color, label) => {
        if (val == null || val === '' || Number.isNaN(Number(val))) return null;
        const vv = Number(val);
        if (vv < ymin || vv > ymax) return null;
        const yy = y(vv);
        return { y: yy, color, label, val: vv };
      };
      const lines = [
        mkLine(p.warnHigh, '#E78212', '预警上限'),
        mkLine(p.warnLow, '#E78212', '预警下限'),
        mkLine(p.alarmHigh, '#DC3545', '报警上限'),
        mkLine(p.alarmLow, '#DC3545', '报警下限'),
        mkLine(p.faultHigh, '#0D6EFD', '故障上限'),
        mkLine(p.faultLow, '#0D6EFD', '故障下限'),
      ].filter(Boolean);
      const yTicks = [ymin, ymin + (ymax - ymin) / 2, ymax].map(v => ({ v: Math.round(v * 100) / 100, y: y(v) }));
      return { path, w, h, padL, padR, padT, padB, lines, yTicks, ymin, ymax };
    });

    const monCycleFullQueryTip = computed(() => {
      const p = monSelectedPoint.value;
      return !!(p && p.cycleSec > 15 * 60);
    });

    const monOnlineRateSummary = computed(() => {
      const rows = filteredMonitorRows.value.filter(d => d.expected24h > 0);
      const expected = rows.reduce((s, d) => s + d.expected24h, 0);
      const actual = rows.reduce((s, d) => s + d.actual24h, 0);
      const missed = rows.reduce((s, d) => s + d.missed24h, 0);
      const rate = expected ? Math.round(actual / expected * 1000) / 10 : 0;
      return { expected, actual, missed, rate, deviceCount: rows.length };
    });

    const monOnlineRateRows = computed(() => {
      return filteredMonitorRows.value
        .filter(d => d.expected24h > 0 || d.online !== '未知')
        .map(d => ({
          ...d,
          rate: d.expected24h ? Math.round(d.actual24h / d.expected24h * 1000) / 10 : 0,
        }));
    });

    const currentDeviceSlaves = computed(() => {
      const d = currentDevice.value;
      if (!d || !d.slaves || !d.slaves.length) return [];
      return DEVICES.filter(x => d.slaves.includes(x.id));
    });

    const currentDeviceMaster = computed(() => {
      const d = currentDevice.value;
      if (!d || !d.masterId) return null;
      return DEVICES.find(x => x.id === d.masterId) || null;
    });

    const installParamEntries = computed(() => {
      const d = currentDevice.value;
      if (!d || !d.installParams) return [];
      const labels = { well_depth: '井深', pipe_diameter: '管径', install_height: '安装高度', well_no: '井号', cover_type: '井盖类型', sample_depth: '采样深度', station_code: '站码', rated_power: '额定功率(kW)', pump_no: '机组号', install_depth: '埋深', mount_height: '安装高度' };
      const units = { well_depth: 'm', pipe_diameter: 'mm', install_height: 'm', sample_depth: 'm', install_depth: 'm', mount_height: 'm', rated_power: 'kW' };
      return Object.entries(d.installParams).map(([k, v]) => ({
        key: k, label: labels[k] || k, value: v, unit: units[k] || ''
      }));
    });

    const breadcrumb = computed(() => {
      if (module.value === 'monitor') {
        if (screen.value === 'monitorList') return { parent: '设备管控', current: '在线监控 · 监控列表' };
        if (screen.value === 'monitorDetail') return { parent: '在线监控', current: (currentMonitor.value?.name || '设备') + ' · 监控详情' };
        if (screen.value === 'monitorCurve') return { parent: currentMonitor.value?.name || '设备', current: '历史曲线' };
        if (screen.value === 'monitorOnlineRate') return { parent: '在线监控', current: '在线率统计' };
        return { parent: '设备管控', current: '在线监控' };
      }
      if (module.value === 'ledger') {
        if (screen.value === 'projects') return { parent: '设备管控', current: '设备台账 · 项目列表' };
        if (screen.value === 'devices') return { parent: '设备台账', current: '设备列表' };
        if (screen.value === 'deviceDetail') return { parent: '设备台账', current: (currentDevice.value?.name || '设备') + ' · 档案' };
        if (screen.value === 'editDevice') return { parent: currentDevice.value?.name || '设备', current: deviceFormMode.value === 'create' ? '新建设备档案' : '编辑设备档案' };
        if (screen.value === 'aepReconcile') return { parent: '设备台账', current: 'AEP 对账' };
        return { parent: '设备管控', current: '设备台账' };
      }
      if (screen.value === 'list') return { parent: '设备管控', current: '物模型 · 品类列表' };
      if (screen.value === 'detail') return { parent: '物模型', current: currentCategory.value.name + ' · 详情' };
      if (screen.value === 'editPoint') return { parent: currentCategory.value.name, current: pointFormMode.value === 'create' ? '添加测点' : '编辑测点' };
      if (screen.value === 'editInstall') return { parent: currentCategory.value.name, current: installFormMode.value === 'create' ? '添加安装字段' : '编辑安装字段' };
      if (screen.value === 'editFirmware') return { parent: currentCategory.value.name, current: firmwareFormMode.value === 'create' ? '登记固件版本' : '编辑固件版本' };
      return { parent: '设备管控', current: '物模型' };
    });

    const topbarHint = computed(() => {
      if (module.value === 'ledger') return '一期原型 · 设备台账';
      if (module.value === 'monitor') return '一期原型 · 在线监控';
      return '一期原型 · 物模型';
    });

    function goList() { module.value = 'thing'; screen.value = 'list'; }
    function openDetail(cat) {
      module.value = 'thing';
      currentCategory.value = cat;
      detailTab.value = 'points';
      screen.value = 'detail';
    }

    function openCreateCategory() {
      categoryModalMode.value = 'create';
      Object.assign(categoryForm, { id: '', name: '', code: '', industry: '市政排水', desc: '', aepProductId: '', status: '启用' });
      showCategoryModal.value = true;
    }
    function openEditCategory(cat) {
      categoryModalMode.value = 'edit';
      Object.assign(categoryForm, {
        id: cat.id, name: cat.name, code: cat.code, industry: cat.industry,
        desc: cat.desc || '', aepProductId: cat.aepProductId || '', status: cat.status
      });
      showCategoryModal.value = true;
    }
    function saveCategory() { showCategoryModal.value = false; }

    function aepProductDisplay(productId) {
      const product = AEP_PRODUCTS.find(p => p.id === productId);
      return product ? `${product.name}（${product.model}）` : (productId || '未绑定');
    }

    function openBindAep(cat) {
      aepForm.categoryId = cat.id;
      aepForm.aepProductId = cat.aepProductId || '';
      showAepModal.value = true;
    }
    function saveAep() { showAepModal.value = false; }

    function confirmDelete(type, id, name) {
      deleteTarget.type = type;
      deleteTarget.id = id;
      deleteTarget.name = name;
      showDeleteConfirm.value = true;
    }
    function doDelete() { showDeleteConfirm.value = false; }

    function openCreatePoint() {
      pointFormMode.value = 'create';
      Object.assign(pointForm, {
        id: '', code: '', name: '', unit: '', dataType: 'float', min: '', max: '', cycle: 60,
        warnLow: '', warnHigh: '', alarmLow: '', alarmHigh: '', faultLow: '', faultHigh: '', desc: ''
      });
      screen.value = 'editPoint';
    }
    function openEditPoint(p) {
      pointFormMode.value = 'edit';
      Object.assign(pointForm, { ...p });
      screen.value = 'editPoint';
    }
    function savePoint() { screen.value = 'detail'; detailTab.value = 'points'; }

    function openCreateInstall() {
      installFormMode.value = 'create';
      Object.assign(installForm, { id: '', code: '', name: '', dataType: 'float', unit: '', required: true, defaultVal: '', example: '', desc: '' });
      screen.value = 'editInstall';
    }
    function openEditInstall(f) {
      installFormMode.value = 'edit';
      Object.assign(installForm, { ...f });
      screen.value = 'editInstall';
    }
    function saveInstall() { screen.value = 'detail'; detailTab.value = 'install'; }

    function openCreateFirmware() {
      firmwareFormMode.value = 'create';
      Object.assign(firmwareForm, { id: '', model: 'MF-LW-100', currentVersion: '', upgradeVersion: '', releaseDate: '2026-09-30', status: '可升级', changelog: '' });
      screen.value = 'editFirmware';
    }
    function openEditFirmware(f) {
      firmwareFormMode.value = 'edit';
      Object.assign(firmwareForm, { ...f });
      screen.value = 'editFirmware';
    }
    function saveFirmware() { screen.value = 'detail'; detailTab.value = 'firmware'; }

    /* ---- 设备台账 actions ---- */
    function goProjects() { module.value = 'ledger'; screen.value = 'projects'; }
    function goDevices() { module.value = 'ledger'; screen.value = 'devices'; }
    function goAepReconcile() { module.value = 'ledger'; screen.value = 'aepReconcile'; aepDiffTab.value = 'extra'; }

    function openCreateProject() {
      projectModalMode.value = 'create';
      Object.assign(projectForm, { id: '', name: '', status: '筹备中', owner: '', region: '', startedAt: '2026-09-30', desc: '' });
      showProjectModal.value = true;
    }
    function openEditProject(p) {
      projectModalMode.value = 'edit';
      Object.assign(projectForm, { id: p.id, name: p.name, status: p.status, owner: p.owner, region: p.region, startedAt: p.startedAt, desc: p.desc || '' });
      showProjectModal.value = true;
    }
    function saveProject() { showProjectModal.value = false; }

    function openDevicesForProject(p) {
      deviceProjectFilter.value = p.id;
      goDevices();
    }

    function openDeviceDetail(d) {
      currentDevice.value = d;
      module.value = 'ledger';
      screen.value = 'deviceDetail';
    }

    function fillDeviceForm(d) {
      Object.assign(deviceForm, {
        id: d.id || '',
        sn: d.sn || '',
        name: d.name || '',
        projectId: d.projectId || '',
        categoryId: d.categoryId || '',
        lifecycle: d.lifecycle || '待接入',
        aepDeviceId: d.aepDeviceId || '',
        model: d.model || '',
        firmware: d.firmware || '',
        lng: d.lng != null ? String(d.lng) : '',
        lat: d.lat != null ? String(d.lat) : '',
        address: d.address || '',
        installDate: d.installDate || '',
        installer: d.installer || '',
        masterId: d.masterId || '',
        installParamsText: d.installParams ? Object.entries(d.installParams).map(([k, v]) => k + '=' + v).join('\\n') : '',
        photosText: (d.photos || []).join('、')
      });
    }

    function openEditDevice(d) {
      deviceFormMode.value = 'edit';
      fillDeviceForm(d || currentDevice.value);
      module.value = 'ledger';
      screen.value = 'editDevice';
    }
    function saveDevice() {
      screen.value = 'deviceDetail';
    }

    function openDisableDevice() { showDisableConfirm.value = true; }
    function doDisableDevice() {
      showDisableConfirm.value = false;
      if (currentDevice.value) currentDevice.value = { ...currentDevice.value, lifecycle: '停用' };
    }

    function openImportModal() { importMode.value = 'import'; showImportModal.value = true; }
    function openExportModal() { importMode.value = 'export'; showImportModal.value = true; }

    function resolveAepDiff(item, action) {
      const idx = aepDiffs.value.findIndex(d => d.id === item.id);
      if (idx >= 0) {
        const copy = { ...aepDiffs.value[idx], action };
        aepDiffs.value.splice(idx, 1, copy);
      }
    }

    function projectName(id) {
      const p = PROJECTS.find(x => x.id === id);
      return p ? p.name : id;
    }
    function categoryName(id) {
      const c = CATEGORIES.find(x => x.id === id);
      return c ? c.name : id;
    }

    /* ---- 在线监控 actions ---- */
    function goMonitorList() { module.value = 'monitor'; screen.value = 'monitorList'; }
    function goMonitorOnlineRate() { module.value = 'monitor'; screen.value = 'monitorOnlineRate'; }
    function openMonitorDetail(row) {
      currentMonitor.value = row;
      const pts = MONITOR_POINTS[row.id] || [];
      monCurvePointCode.value = pts.length ? pts[0].code : '';
      module.value = 'monitor';
      screen.value = 'monitorDetail';
    }
    function openMonitorCurve(row, pointCode) {
      if (row) currentMonitor.value = row;
      const pts = MONITOR_POINTS[currentMonitor.value.id] || [];
      monCurvePointCode.value = pointCode || (pts.length ? pts[0].code : '');
      monCurveRange.value = 7;
      module.value = 'monitor';
      screen.value = 'monitorCurve';
    }
    function alarmSummaryText(d) {
      if (!d.warn && !d.alarm && !d.fault) return '无告警';
      const parts = [];
      if (d.warn) parts.push('预警' + d.warn);
      if (d.alarm) parts.push('报警' + d.alarm);
      if (d.fault) parts.push('故障' + d.fault);
      return parts.join(' / ');
    }
    function formatCycle(sec) {
      if (sec >= 3600) return (sec / 3600) + ' 小时';
      if (sec >= 60) return (sec / 60) + ' 分钟';
      return sec + ' 秒';
    }

    function resetOverlays() {
      showCategoryModal.value = false;
      showAepModal.value = false;
      showDeleteConfirm.value = false;
      showProjectModal.value = false;
      showImportModal.value = false;
      showDisableConfirm.value = false;
    }

    function jump(hash) {
      resetOverlays();
      const map = {
        list: () => { module.value = 'thing'; screen.value = 'list'; },
        createCategory: () => { goList(); openCreateCategory(); },
        editCategory: () => { goList(); openEditCategory(CATEGORIES[0]); },
        detail: () => openDetail(CATEGORIES[0]),
        points: () => { openDetail(CATEGORIES[0]); detailTab.value = 'points'; },
        props: () => { openDetail(CATEGORIES[0]); detailTab.value = 'props'; },
        events: () => { openDetail(CATEGORIES[0]); detailTab.value = 'events'; },
        install: () => { openDetail(CATEGORIES[0]); detailTab.value = 'install'; },
        firmware: () => { openDetail(CATEGORIES[0]); detailTab.value = 'firmware'; },
        editPoint: () => { openDetail(CATEGORIES[0]); openEditPoint(POINTS[0]); },
        editInstall: () => { openDetail(CATEGORIES[0]); openEditInstall(INSTALL_FIELDS[0]); },
        editFirmware: () => { openDetail(CATEGORIES[0]); openCreateFirmware(); },
        deleteConfirm: () => { goList(); confirmDelete('品类', 'C003', '管网压力表'); },
        // ledger
        projects: () => goProjects(),
        createProject: () => { goProjects(); openCreateProject(); },
        editProject: () => { goProjects(); openEditProject(PROJECTS[0]); },
        devices: () => { deviceProjectFilter.value = ''; goDevices(); },
        deviceDetail: () => openDeviceDetail(DEVICES[0]),
        editDevice: () => { openDeviceDetail(DEVICES[0]); openEditDevice(DEVICES[0]); },
        aepReconcile: () => goAepReconcile(),
        importExport: () => { goDevices(); openImportModal(); },
        exportHelp: () => { goDevices(); openExportModal(); },
        // monitor
        monitor: () => goMonitorList(),
        monitorList: () => goMonitorList(),
        monitorDetail: () => openMonitorDetail(MONITOR_ROWS[0]),
        monitorCurve: () => openMonitorCurve(MONITOR_ROWS[0], 'LL'),
        monitorOnlineRate: () => goMonitorOnlineRate(),
        monitorCurveLong: () => openMonitorCurve(MONITOR_ROWS.find(r => r.id === 'D006') || MONITOR_ROWS[0], 'RAIN'),
      };
      if (map[hash]) map[hash]();
    }

    function applyHash() {
      const h = (location.hash || '#list').replace('#', '');
      jump(h || 'list');
    }
    window.addEventListener('hashchange', applyHash);
    nextTick(applyHash);

    window.__protoApp = {
      jump, screen, module, detailTab,
      showCategoryModal, showDeleteConfirm, showProjectModal, showImportModal, showDisableConfirm
    };

    return {
      module, screen, detailTab, searchKeyword, filterIndustry, filterAep,
      filteredCategories, industries, breadcrumb, topbarHint, currentCategory,
      CATEGORIES, AEP_PRODUCTS, PROPERTIES, EVENTS, POINTS, INSTALL_FIELDS, FIRMWARES,
      aepProductDisplay,
      showCategoryModal, categoryModalMode, categoryForm,
      showAepModal, aepForm,
      showDeleteConfirm, deleteTarget,
      pointForm, pointFormMode, installForm, installFormMode, firmwareForm, firmwareFormMode,
      goList, openDetail, openCreateCategory, openEditCategory, saveCategory,
      openBindAep, saveAep, confirmDelete, doDelete,
      openCreatePoint, openEditPoint, savePoint,
      openCreateInstall, openEditInstall, saveInstall,
      openCreateFirmware, openEditFirmware, saveFirmware,
      jump,
      // ledger
      PROJECTS, DEVICES, LIFECYCLES, LC_CLASS, LC_TAG, PJ_STATUS_TAG,
      projectSearch, projectStatusFilter, filteredProjects,
      showProjectModal, projectModalMode, projectForm,
      openCreateProject, openEditProject, saveProject, openDevicesForProject,
      goProjects, goDevices, goAepReconcile,
      deviceProjectFilter, deviceCategoryFilter, deviceLifecycleFilter, deviceSnSearch,
      filteredDevices, deviceStats, currentDevice, openDeviceDetail,
      currentDeviceSlaves, currentDeviceMaster, installParamEntries,
      deviceForm, deviceFormMode, openEditDevice, saveDevice,
      showDisableConfirm, openDisableDevice, doDisableDevice,
      showImportModal, importMode, openImportModal, openExportModal,
      aepDiffTab, filteredAepDiffs, aepCounts, resolveAepDiff,
      projectName, categoryName,
      // monitor
      MONITOR_ROWS, TRUST_TAG, TRUST_LABEL, ONLINE_TAG,
      monProjectFilter, monCategoryFilter, monOnlineFilter, monAlarmFilter, monSearch,
      filteredMonitorRows, monListStats, currentMonitor,
      monLatestPoints, monSelectedPoint, monCurveRange, monCurvePointCode,
      monCurveSeries, monCurveSvg, monCycleFullQueryTip,
      monOnlineRateSummary, monOnlineRateRows,
      goMonitorList, goMonitorOnlineRate, openMonitorDetail, openMonitorCurve,
      alarmSummaryText, formatCycle,
    };
  },
  template: `
  <div class="shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">MF</div>
        <span>设备管控平台</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-group-title">设备管理</div>
        <div class="nav-item" :class="{active: module==='ledger'}" @click="jump('projects')"><span class="dot"></span>设备台账</div>
        <div class="nav-item" :class="{active: module==='monitor'}" @click="jump('monitor')"><span class="dot"></span>在线监控</div>
        <div class="nav-item" :class="{active: module==='thing'}" @click="jump('list')"><span class="dot"></span>物模型</div>
        <div class="nav-group-title">运维</div>
        <div class="nav-item"><span class="dot"></span>告警中心</div>
        <div class="nav-item"><span class="dot"></span>固件仓</div>
        <div class="nav-group-title">系统</div>
        <div class="nav-item"><span class="dot"></span>组织权限</div>
        <div class="nav-item"><span class="dot"></span>系统设置</div>
      </nav>
    </aside>

    <div class="main-wrap">
      <header class="topbar">
        <div class="topbar-left">
          <div class="breadcrumb">
            <span>{{ breadcrumb.parent }}</span>
            <span> / </span>
            <span class="current">{{ breadcrumb.current }}</span>
          </div>
        </div>
        <div class="topbar-right">
          <span>{{ topbarHint }}</span>
          <div class="avatar">张</div>
        </div>
      </header>

      <main class="content">
        <!-- ===== 物模型：品类列表 ===== -->
        <div v-if="module==='thing' && screen==='list'" class="page-card" data-screen="category-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">物模型 · 品类管理</h1>
              <p class="page-desc">维护设备品类、按类型绑定 AEP 产品/型号，并配置测点字典 / 安装参数 / 固件基线</p><p class="page-desc">AEP 产品绑定是品类级配置，不选择设备或设备 SN；单台设备在台账由 AEP 绑定自动建档。</p>
            </div>
            <button class="btn btn-primary" @click="openCreateCategory">＋ 新建品类</button>
          </div>
          <div class="toolbar">
            <input class="input input-lg" v-model="searchKeyword" placeholder="搜索品类名称 / 编码 / ID" />
            <select class="select" v-model="filterIndustry">
              <option value="">全部行业</option>
              <option v-for="i in industries" :key="i" :value="i">{{ i }}</option>
            </select>
            <select class="select" v-model="filterAep">
              <option value="">AEP 产品绑定状态</option>
              <option value="bound">已绑定产品</option>
              <option value="unbound">未绑定产品</option>
            </select>
            <button class="btn" @click="searchKeyword=''; filterIndustry=''; filterAep=''">重置</button>
            <div class="spacer"></div>
            <button class="btn btn-orange" @click="openBindAep(CATEGORIES[2])">绑定 AEP 产品/型号</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>品类 ID</th><th>品类名称</th><th>编码</th><th>行业</th><th>AEP 产品/型号</th><th>设备数</th><th>物模型版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="c in filteredCategories" :key="c.id">
                  <td>{{ c.id }}</td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDetail(c)">{{ c.name }}</a></td>
                  <td><code>{{ c.code }}</code></td>
                  <td>{{ c.industry }}</td>
                  <td>
                    <span v-if="c.aepBound" class="badge-aep"><span class="dot-online"></span><span class="tag tag-green">{{ aepProductDisplay(c.aepProductId) }}</span></span>
                    <span v-else class="badge-aep"><span class="dot-offline"></span><span class="tag tag-gray">未绑定</span></span>
                  </td>
                  <td>{{ c.deviceCount }}</td>
                  <td>{{ c.modelVersion }}</td>
                  <td><span class="tag" :class="c.status==='启用'?'tag-blue':(c.status==='草稿'?'tag-orange':'tag-gray')">{{ c.status }}</span></td>
                  <td>{{ c.updatedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDetail(c)">物模型</button>
                    <button class="btn-link btn" @click="openEditCategory(c)">编辑</button>
                    <button class="btn-link btn" @click="openBindAep(c)">{{ c.aepBound ? '更换 AEP 产品/型号' : '绑定 AEP 产品/型号' }}</button>
                    <button class="btn-link btn danger" @click="confirmDelete('品类', c.id, c.name)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination"><span>共 {{ filteredCategories.length }} 条</span><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">›</button></div>
        </div>

        <!-- ===== 物模型：详情 ===== -->
        <div v-else-if="module==='thing' && screen==='detail'" class="page-card detail-shell" data-screen="thing-detail">
          <button class="back-link" @click="goList">← 返回品类列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentCategory.name }}</h1>
              <div class="detail-meta">
                <span>品类 ID：<b>{{ currentCategory.id }}</b></span>
                <span>编码：<b>{{ currentCategory.code }}</b></span>
                <span>行业：<b>{{ currentCategory.industry }}</b></span>
                <span>物模型：<b>{{ currentCategory.modelVersion }}</b></span>
                <span>AEP 产品：<b v-if="currentCategory.aepBound">{{ aepProductDisplay(currentCategory.aepProductId) }}</b><b v-else style="color:#E78212">未绑定</b></span>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="openEditCategory(currentCategory)">编辑品类</button>
              <button class="btn btn-orange" @click="openBindAep(currentCategory)">绑定 AEP 产品/型号</button>
            </div>
          </div>
          <div class="tabs">
            <div class="tab" :class="{active: detailTab==='props'}" @click="detailTab='props'">上报属性</div>
            <div class="tab" :class="{active: detailTab==='events'}" @click="detailTab='events'">异常事件</div>
            <div class="tab" :class="{active: detailTab==='points'}" @click="detailTab='points'">测点字典</div>
            <div class="tab" :class="{active: detailTab==='install'}" @click="detailTab='install'">安装参数模板</div>
            <div class="tab" :class="{active: detailTab==='firmware'}" @click="detailTab='firmware'">固件基线</div>
          </div>
          <div v-if="detailTab==='props'">
            <div class="toolbar"><span style="color:#666;font-size:13px">设备按周期上报的属性定义（与 AEP 物模型属性对齐）</span><div class="spacer"></div><button class="btn btn-primary btn-sm">＋ 添加属性</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>标识符</th><th>名称</th><th>数据类型</th><th>单位</th><th>访问</th><th>上报周期</th><th>必报</th><th>操作</th></tr></thead>
              <tbody><tr v-for="p in PROPERTIES" :key="p.id"><td><code>{{ p.identifier }}</code></td><td>{{ p.name }}</td><td>{{ p.dataType }}</td><td>{{ p.unit }}</td><td>{{ p.access }}</td><td>{{ p.reportCycle }}</td><td><span class="tag" :class="p.required?'tag-blue':'tag-gray'">{{ p.required?'是':'否' }}</span></td><td class="actions"><button class="btn-link btn">编辑</button><button class="btn-link btn danger" @click="confirmDelete('上报属性', p.id, p.name)">删除</button></td></tr></tbody></table></div>
          </div>
          <div v-else-if="detailTab==='events'">
            <div class="toolbar"><span style="color:#666;font-size:13px">预警 / 报警 / 故障事件定义</span><div class="spacer"></div><button class="btn btn-primary btn-sm">＋ 添加事件</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>标识符</th><th>事件名称</th><th>级别</th><th>触发条件</th><th>说明</th><th>操作</th></tr></thead>
              <tbody><tr v-for="e in EVENTS" :key="e.id"><td><code>{{ e.identifier }}</code></td><td>{{ e.name }}</td><td><span class="tag" :class="e.level==='报警'?'tag-red':(e.level==='预警'?'tag-orange':'tag-gray')">{{ e.level }}</span></td><td>{{ e.trigger }}</td><td>{{ e.desc }}</td><td class="actions"><button class="btn-link btn">编辑</button><button class="btn-link btn danger" @click="confirmDelete('异常事件', e.id, e.name)">删除</button></td></tr></tbody></table></div>
          </div>
          <div v-else-if="detailTab==='points'">
            <div class="toolbar"><span style="color:#666;font-size:13px">测点含单位、范围、采集周期、预警/报警/故障阈值（一期核心）</span><div class="spacer"></div><button class="btn btn-primary btn-sm" @click="openCreatePoint">＋ 添加测点</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>编码</th><th>名称</th><th>单位</th><th>类型</th><th>范围</th><th>采集周期(s)</th><th>预警</th><th>报警</th><th>故障</th><th>操作</th></tr></thead>
              <tbody><tr v-for="m in POINTS" :key="m.id"><td><code>{{ m.code }}</code></td><td>{{ m.name }}</td><td>{{ m.unit }}</td><td>{{ m.dataType }}</td><td>{{ m.min }} ~ {{ m.max }}</td><td>{{ m.cycle }}</td>
                <td><span class="tag tag-orange">{{ m.warnLow !== '' ? '↓'+m.warnLow : '' }}{{ (m.warnLow!==''&&m.warnHigh!=='')?' / ':'' }}{{ m.warnHigh !== '' ? '↑'+m.warnHigh : '' }}{{ m.warnLow===''&&m.warnHigh===''?'—':'' }}</span></td>
                <td><span class="tag tag-red">{{ m.alarmLow !== '' ? '↓'+m.alarmLow : '' }}{{ (m.alarmLow!==''&&m.alarmHigh!=='')?' / ':'' }}{{ m.alarmHigh !== '' ? '↑'+m.alarmHigh : '' }}{{ m.alarmLow===''&&m.alarmHigh===''?'—':'' }}</span></td>
                <td><span class="tag tag-gray">{{ m.faultLow !== '' ? '↓'+m.faultLow : '' }}{{ (m.faultLow!==''&&m.faultHigh!=='')?' / ':'' }}{{ m.faultHigh !== '' ? '↑'+m.faultHigh : '' }}{{ m.faultLow===''&&m.faultHigh===''?'—':'' }}</span></td>
                <td class="actions"><button class="btn-link btn" @click="openEditPoint(m)">编辑</button><button class="btn-link btn danger" @click="confirmDelete('测点', m.id, m.name)">删除</button></td></tr></tbody></table></div>
          </div>
          <div v-else-if="detailTab==='install'">
            <div class="toolbar"><span style="color:#666;font-size:13px">现场安装登记字段模板，如井深、管径、安装高度等</span><div class="spacer"></div><button class="btn btn-primary btn-sm" @click="openCreateInstall">＋ 添加字段</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>字段编码</th><th>字段名称</th><th>数据类型</th><th>单位</th><th>必填</th><th>默认值</th><th>示例</th><th>说明</th><th>操作</th></tr></thead>
              <tbody><tr v-for="f in INSTALL_FIELDS" :key="f.id"><td><code>{{ f.code }}</code></td><td>{{ f.name }}</td><td>{{ f.dataType }}</td><td>{{ f.unit }}</td><td><span class="tag" :class="f.required?'tag-blue':'tag-gray'">{{ f.required?'是':'否' }}</span></td><td>{{ f.defaultVal || '—' }}</td><td>{{ f.example }}</td><td>{{ f.desc }}</td><td class="actions"><button class="btn-link btn" @click="openEditInstall(f)">编辑</button><button class="btn-link btn danger" @click="confirmDelete('安装字段', f.id, f.name)">删除</button></td></tr></tbody></table></div>
          </div>
          <div v-else-if="detailTab==='firmware'">
            <div class="toolbar"><span style="color:#666;font-size:13px">固件型号、当前版本、可升级版本登记</span><div class="spacer"></div><button class="btn btn-primary btn-sm" @click="openCreateFirmware">＋ 登记固件版本</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>型号</th><th>当前版本</th><th>可升版</th><th>发布日期</th><th>状态</th><th>变更说明</th><th>操作</th></tr></thead>
              <tbody><tr v-for="f in FIRMWARES" :key="f.id"><td><code>{{ f.model }}</code></td><td>{{ f.currentVersion }}</td><td>{{ f.upgradeVersion || '—' }}</td><td>{{ f.releaseDate }}</td><td><span class="tag" :class="f.status==='可升级'?'tag-orange':(f.status==='最新'?'tag-green':'tag-blue')">{{ f.status }}</span></td><td style="max-width:240px;white-space:normal">{{ f.changelog }}</td><td class="actions"><button class="btn-link btn" @click="openEditFirmware(f)">编辑</button><button class="btn-link btn danger" @click="confirmDelete('固件版本', f.id, f.model+' '+f.currentVersion)">删除</button></td></tr></tbody></table></div>
          </div>
        </div>

        <!-- ===== 物模型：编辑测点 ===== -->
        <div v-else-if="module==='thing' && screen==='editPoint'" class="page-card">
          <button class="back-link" @click="screen='detail'; detailTab='points'">← 返回测点字典</button>
          <div class="page-header"><div><h1 class="page-title">{{ pointFormMode==='create'?'添加测点':'编辑测点' }}</h1><p class="page-desc">品类：{{ currentCategory.name }} · 配置单位、范围、采集周期与预警/报警/故障阈值</p></div></div>
          <div class="form-section-title">基本信息</div>
          <div class="form-row"><div class="form-item"><label><span class="req">*</span>测点编码</label><input class="input input-full" v-model="pointForm.code" /></div><div class="form-item"><label><span class="req">*</span>测点名称</label><input class="input input-full" v-model="pointForm.name" /></div></div>
          <div class="form-row"><div class="form-item"><label><span class="req">*</span>数据类型</label><select class="select input-full" v-model="pointForm.dataType"><option value="float">float</option><option value="int">int</option><option value="bool">bool</option><option value="string">string</option></select></div><div class="form-item"><label><span class="req">*</span>单位</label><input class="input input-full" v-model="pointForm.unit" /></div></div>
          <div class="form-row"><div class="form-item"><label>量程下限</label><input class="input input-full" v-model="pointForm.min" type="number" /></div><div class="form-item"><label>量程上限</label><input class="input input-full" v-model="pointForm.max" type="number" /></div><div class="form-item"><label><span class="req">*</span>采集周期 (秒)</label><input class="input input-full" v-model="pointForm.cycle" type="number" /></div></div>
          <div class="form-section-title">阈值配置（预警 / 报警 / 故障）</div>
          <div class="alert-levels">
            <div class="alert-card warn"><h4>预警阈值</h4><div class="form-row"><div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.warnLow" type="number" /></div><div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.warnHigh" type="number" /></div></div></div>
            <div class="alert-card alarm"><h4>报警阈值</h4><div class="form-row"><div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.alarmLow" type="number" /></div><div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.alarmHigh" type="number" /></div></div></div>
            <div class="alert-card fault"><h4>故障阈值</h4><div class="form-row"><div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.faultLow" type="number" /></div><div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.faultHigh" type="number" /></div></div></div>
            <div class="alert-card info"><h4>说明</h4><p style="margin:0;font-size:12px;color:#666;line-height:1.6">优先级：故障 &gt; 报警 &gt; 预警。留空表示不启用该侧阈值。</p></div>
          </div>
          <div class="form-item" style="margin-top:16px"><label>备注说明</label><textarea class="textarea input-full" v-model="pointForm.desc"></textarea></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn" @click="screen='detail'; detailTab='points'">取消</button><button class="btn btn-primary" @click="savePoint">保存</button></div>
        </div>

        <!-- ===== 物模型：编辑安装 / 固件（精简保留） ===== -->
        <div v-else-if="module==='thing' && screen==='editInstall'" class="page-card">
          <button class="back-link" @click="screen='detail'; detailTab='install'">← 返回安装参数模板</button>
          <div class="page-header"><div><h1 class="page-title">{{ installFormMode==='create'?'添加安装字段':'编辑安装字段' }}</h1><p class="page-desc">品类：{{ currentCategory.name }}</p></div></div>
          <div class="form-row"><div class="form-item"><label><span class="req">*</span>字段编码</label><input class="input input-full" v-model="installForm.code" /></div><div class="form-item"><label><span class="req">*</span>字段名称</label><input class="input input-full" v-model="installForm.name" /></div></div>
          <div class="form-row"><div class="form-item"><label><span class="req">*</span>数据类型</label><select class="select input-full" v-model="installForm.dataType"><option value="float">float</option><option value="int">int</option><option value="string">string</option><option value="enum">enum</option></select></div><div class="form-item"><label>单位</label><input class="input input-full" v-model="installForm.unit" /></div></div>
          <div class="form-row"><div class="form-item"><label>是否必填</label><select class="select input-full" v-model="installForm.required"><option :value="true">是</option><option :value="false">否</option></select></div><div class="form-item"><label>默认值</label><input class="input input-full" v-model="installForm.defaultVal" /></div><div class="form-item"><label>示例值</label><input class="input input-full" v-model="installForm.example" /></div></div>
          <div class="form-item"><label>字段说明</label><textarea class="textarea input-full" v-model="installForm.desc"></textarea></div>
          <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" @click="screen='detail'; detailTab='install'">取消</button><button class="btn btn-primary" @click="saveInstall">保存</button></div>
        </div>

        <div v-else-if="module==='thing' && screen==='editFirmware'" class="page-card">
          <button class="back-link" @click="screen='detail'; detailTab='firmware'">← 返回固件基线</button>
          <div class="page-header"><div><h1 class="page-title">{{ firmwareFormMode==='create'?'登记固件版本':'编辑固件版本' }}</h1><p class="page-desc">品类：{{ currentCategory.name }}</p></div></div>
          <div class="form-row"><div class="form-item"><label><span class="req">*</span>硬件型号</label><input class="input input-full" v-model="firmwareForm.model" /></div><div class="form-item"><label><span class="req">*</span>当前版本</label><input class="input input-full" v-model="firmwareForm.currentVersion" /></div></div>
          <div class="form-row"><div class="form-item"><label>可升级版本</label><input class="input input-full" v-model="firmwareForm.upgradeVersion" /></div><div class="form-item"><label>发布日期</label><input class="input input-full" v-model="firmwareForm.releaseDate" type="date" /></div><div class="form-item"><label>状态</label><select class="select input-full" v-model="firmwareForm.status"><option>可升级</option><option>基线</option><option>最新</option><option>废弃</option></select></div></div>
          <div class="form-item"><label>变更说明</label><textarea class="textarea input-full" v-model="firmwareForm.changelog"></textarea></div>
          <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" @click="screen='detail'; detailTab='firmware'">取消</button><button class="btn btn-primary" @click="saveFirmware">保存</button></div>
        </div>


        <!-- ===== 设备台账：项目列表 ===== -->
        <div v-else-if="module==='ledger' && screen==='projects'" class="page-card" data-screen="ledger-projects">
          <div class="page-header">
            <div>
              <h1 class="page-title">设备台账 · 项目列表</h1>
              <p class="page-desc">按项目组织设备档案；一期轻量字段，不做设施树与地图</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="goDevices">全部设备</button>
              <button class="btn btn-primary" @click="openCreateProject">＋ 新建项目</button>
            </div>
          </div>
          <div class="toolbar">
            <input class="input input-lg" v-model="projectSearch" placeholder="搜索项目名称 / 负责人 / ID" />
            <select class="select" v-model="projectStatusFilter">
              <option value="">全部状态</option>
              <option>进行中</option>
              <option>筹备中</option>
              <option>已完工</option>
              <option>已暂停</option>
            </select>
            <button class="btn" @click="projectSearch=''; projectStatusFilter=''">重置</button>
            <div class="spacer"></div>
            <button class="btn btn-orange" @click="goAepReconcile">AEP 对账</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>项目 ID</th><th>项目名称</th><th>状态</th><th>负责人</th><th>所属区域</th><th>设备数</th><th>启动日期</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredProjects" :key="p.id">
                  <td>{{ p.id }}</td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDevicesForProject(p)">{{ p.name }}</a></td>
                  <td><span class="tag" :class="PJ_STATUS_TAG[p.status] || 'tag-gray'">{{ p.status }}</span></td>
                  <td>{{ p.owner }}</td>
                  <td>{{ p.region }}</td>
                  <td>{{ p.deviceCount }}</td>
                  <td>{{ p.startedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDevicesForProject(p)">设备</button>
                    <button class="btn-link btn" @click="openEditProject(p)">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredProjects.length }} 个项目</span>
            <button class="page-btn active">1</button>
          </div>
        </div>

        <!-- ===== 设备台账：设备列表 ===== -->
        <div v-else-if="module==='ledger' && screen==='devices'" class="page-card" data-screen="ledger-devices">
          <div class="page-header">
            <div>
              <button class="back-link" @click="goProjects">← 返回项目列表</button>
              <h1 class="page-title">设备列表</h1>
              <p class="page-desc">按项目 / 品类 / 生命周期筛选；支持导入导出与 AEP 对账</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="openImportModal">导入</button>
              <button class="btn" @click="openExportModal">导出</button>
              <button class="btn btn-orange" @click="goAepReconcile">AEP 对账</button>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-chip accent"><div class="sc-label">筛选结果</div><div class="sc-value">{{ deviceStats.total }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">在线</div><div class="sc-value">{{ deviceStats.online }}</div></div>
            <div class="stat-chip"><div class="sc-label">离线</div><div class="sc-value">{{ deviceStats.offline }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">待接入</div><div class="sc-value">{{ deviceStats.pending }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">停用/报废</div><div class="sc-value">{{ deviceStats.disabled }}</div></div>
          </div>
          <div class="toolbar">
            <select class="select" v-model="deviceProjectFilter">
              <option value="">全部项目</option>
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select class="select" v-model="deviceCategoryFilter">
              <option value="">全部品类</option>
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select class="select" v-model="deviceLifecycleFilter">
              <option value="">全部生命周期</option>
              <option v-for="s in LIFECYCLES" :key="s" :value="s">{{ s }}</option>
            </select>
            <input class="input input-md" v-model="deviceSnSearch" placeholder="SN / 名称 / AEP ID" />
            <button class="btn" @click="deviceProjectFilter=''; deviceCategoryFilter=''; deviceLifecycleFilter=''; deviceSnSearch=''">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SN</th><th>设备名称</th><th>项目</th><th>品类</th><th>生命周期</th><th>AEP 设备 ID</th><th>型号</th><th>更新时间</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredDevices" :key="d.id">
                  <td><code>{{ d.sn }}</code></td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDeviceDetail(d)">{{ d.name }}</a></td>
                  <td>{{ d.projectName }}</td>
                  <td>{{ d.categoryName }}</td>
                  <td>
                    <span class="lifecycle-dot">
                      <i :class="LC_CLASS[d.lifecycle]"></i>
                      <span class="tag" :class="LC_TAG[d.lifecycle]">{{ d.lifecycle }}</span>
                    </span>
                  </td>
                  <td>{{ d.aepDeviceId || '—' }}</td>
                  <td>{{ d.model }}</td>
                  <td>{{ d.updatedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDeviceDetail(d)">档案</button>
                    <button class="btn-link btn" @click="openEditDevice(d)">编辑</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredDevices.length }} 台</span>
            <button class="page-btn active">1</button>
            <button class="page-btn">›</button>
          </div>
          <div class="table-note">一期不做设施树、地图与通用指令；坐标仅作档案字段展示。</div>
        </div>

        <!-- ===== 设备台账：设备档案详情 ===== -->
        <div v-else-if="module==='ledger' && screen==='deviceDetail'" class="page-card detail-shell" data-screen="ledger-device-detail">
          <button class="back-link" @click="goDevices">← 返回设备列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentDevice.name }}</h1>
              <div class="detail-meta">
                <span>SN：<b>{{ currentDevice.sn }}</b></span>
                <span>项目：<b>{{ currentDevice.projectName }}</b></span>
                <span>品类：<b>{{ currentDevice.categoryName }}</b></span>
                <span>生命周期：
                  <span class="lifecycle-dot" style="display:inline-flex">
                    <i :class="LC_CLASS[currentDevice.lifecycle]"></i>
                    <b>{{ currentDevice.lifecycle }}</b>
                  </span>
                </span>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="openEditDevice(currentDevice)">编辑档案</button>
              <button class="btn btn-danger" @click="openDisableDevice" :disabled="currentDevice.lifecycle==='停用'||currentDevice.lifecycle==='报废'">停用</button>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">基础信息</div>
            <div class="kv-grid">
              <div class="k">设备 ID</div><div class="v">{{ currentDevice.id }}</div>
              <div class="k">AEP 设备 ID</div><div class="v">{{ currentDevice.aepDeviceId || '—' }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentDevice.model }}</div>
              <div class="k">固件版本</div><div class="v">{{ currentDevice.firmware }}</div>
              <div class="k">安装日期</div><div class="v">{{ currentDevice.installDate }}</div>
              <div class="k">安装人</div><div class="v">{{ currentDevice.installer }}</div>
              <div class="k">安装地址</div><div class="v">{{ currentDevice.address }}</div>
              <div class="k">最近更新</div><div class="v">{{ currentDevice.updatedAt }}</div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">坐标 <span class="sub-nav-hint">一期无地图，仅展示经纬度</span></div>
            <div class="coord-row">
              <span>经度：<b>{{ currentDevice.lng }}</b></span>
              <span>纬度：<b>{{ currentDevice.lat }}</b></span>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">安装参数</div>
            <div class="table-wrap" v-if="installParamEntries.length">
              <table class="data-table">
                <thead><tr><th>参数编码</th><th>名称</th><th>值</th><th>单位</th></tr></thead>
                <tbody>
                  <tr v-for="e in installParamEntries" :key="e.key">
                    <td><code>{{ e.key }}</code></td>
                    <td>{{ e.label }}</td>
                    <td>{{ e.value }}</td>
                    <td>{{ e.unit || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无安装参数</div>
          </div>

          <div class="info-section">
            <div class="info-section-title">现场照片 <span class="sub-nav-hint">占位示意</span></div>
            <div class="photo-grid">
              <div v-for="(ph, idx) in (currentDevice.photos && currentDevice.photos.length ? currentDevice.photos : ['待上传'])" :key="idx"
                   class="photo-slot" :class="{'has-img': currentDevice.photos && currentDevice.photos.length}">
                <div class="ph-icon">图</div>
                <div>{{ ph }}</div>
              </div>
              <div class="photo-slot" v-if="!currentDevice.photos || currentDevice.photos.length < 4">
                <div class="ph-icon">＋</div>
                <div>添加照片</div>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">主从关系</div>
            <div class="relation-card">
              <div class="relation-node" v-if="currentDeviceMaster">
                <span class="rn-role">主机</span>
                <span class="rn-name" @click="openDeviceDetail(currentDeviceMaster)">{{ currentDeviceMaster.name }}</span>
                <span style="font-size:12px;color:#888">{{ currentDeviceMaster.sn }}</span>
              </div>
              <div class="relation-node" v-else>
                <span class="rn-role">本机角色</span>
                <span class="rn-name" style="color:#1f1f1f;cursor:default">{{ currentDeviceSlaves.length ? '主机' : '独立设备' }}</span>
                <span style="font-size:12px;color:#888">{{ currentDevice.sn }}</span>
              </div>
              <div class="relation-arrow" v-if="currentDeviceMaster || currentDeviceSlaves.length">→</div>
              <div class="relation-node" v-for="s in currentDeviceSlaves" :key="s.id">
                <span class="rn-role">从机</span>
                <span class="rn-name" @click="openDeviceDetail(s)">{{ s.name }}</span>
                <span style="font-size:12px;color:#888">{{ s.sn }}</span>
              </div>
              <div v-if="currentDeviceMaster && !currentDeviceSlaves.length" class="relation-node">
                <span class="rn-role">本机</span>
                <span class="rn-name" style="color:#1f1f1f;cursor:default">{{ currentDevice.name }}（从机）</span>
              </div>
              <div v-if="!currentDeviceMaster && !currentDeviceSlaves.length" style="font-size:13px;color:#999">无主从关联</div>
            </div>
          </div>
        </div>

        <!-- ===== 设备台账：编辑设备档案 ===== -->
        <div v-else-if="module==='ledger' && screen==='editDevice'" class="page-card" data-screen="ledger-edit-device">
          <button class="back-link" @click="screen='deviceDetail'">← 返回设备档案</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">{{ deviceFormMode==='create'?'新建设备档案':'编辑设备档案' }}</h1>
              <p class="page-desc">维护基础信息、坐标、安装参数与主从关系；照片一期仅文本占位</p>
            </div>
          </div>
          <div class="form-section-title">基础信息</div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>设备 SN</label><input class="input input-full" v-model="deviceForm.sn" :disabled="deviceFormMode==='edit'" /></div>
            <div class="form-item"><label><span class="req">*</span>设备名称</label><input class="input input-full" v-model="deviceForm.name" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>所属项目</label>
              <select class="select input-full" v-model="deviceForm.projectId">
                <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-item"><label><span class="req">*</span>品类</label>
              <select class="select input-full" v-model="deviceForm.categoryId">
                <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-item"><label>生命周期</label>
              <select class="select input-full" v-model="deviceForm.lifecycle">
                <option v-for="s in LIFECYCLES" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>AEP 设备 ID</label><input class="input input-full" v-model="deviceForm.aepDeviceId" placeholder="对账接入后自动回填" /></div>
            <div class="form-item"><label>硬件型号</label><input class="input input-full" v-model="deviceForm.model" /></div>
            <div class="form-item"><label>固件版本</label><input class="input input-full" v-model="deviceForm.firmware" /></div>
          </div>
          <div class="form-section-title">坐标与地址</div>
          <div class="form-row">
            <div class="form-item"><label>经度</label><input class="input input-full" v-model="deviceForm.lng" /></div>
            <div class="form-item"><label>纬度</label><input class="input input-full" v-model="deviceForm.lat" /></div>
            <div class="form-item"><label>安装日期</label><input class="input input-full" v-model="deviceForm.installDate" type="date" /></div>
          </div>
          <div class="form-row">
            <div class="form-item" style="flex:2"><label>安装地址</label><input class="input input-full" v-model="deviceForm.address" /></div>
            <div class="form-item"><label>安装人</label><input class="input input-full" v-model="deviceForm.installer" /></div>
          </div>
          <div class="form-section-title">安装参数（键值，每行 key=value）</div>
          <div class="form-item">
            <textarea class="textarea input-full" v-model="deviceForm.installParamsText" rows="5" placeholder="well_depth=8.5&#10;pipe_diameter=600"></textarea>
            <div class="hint">与物模型安装参数模板对齐；一期用文本编辑键值</div>
          </div>
          <div class="form-section-title">主从与照片</div>
          <div class="form-row">
            <div class="form-item"><label>主机设备 ID</label>
              <select class="select input-full" v-model="deviceForm.masterId">
                <option value="">无（独立 / 主机）</option>
                <option v-for="d in DEVICES.filter(x => x.id !== deviceForm.id)" :key="d.id" :value="d.id">{{ d.name }}（{{ d.sn }}）</option>
              </select>
            </div>
            <div class="form-item"><label>照片说明</label><input class="input input-full" v-model="deviceForm.photosText" placeholder="用顿号分隔，如 现场全景、井内安装" /></div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn" @click="screen='deviceDetail'">取消</button>
            <button class="btn btn-primary" @click="saveDevice">保存</button>
          </div>
        </div>

        <!-- ===== 设备台账：AEP 对账 ===== -->
        <div v-else-if="module==='ledger' && screen==='aepReconcile'" class="page-card" data-screen="ledger-aep-reconcile">
          <button class="back-link" @click="goDevices">← 返回设备列表</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">AEP 对账</h1>
              <p class="page-desc">对比本地台账与电信 AEP 设备清单：多出可忽略或接入，缺失可创建接入</p>
            </div>
            <button class="btn btn-orange">重新拉取 AEP</button>
          </div>
          <div class="stat-row">
            <div class="stat-chip warn"><div class="sc-label">AEP 多出</div><div class="sc-value">{{ aepCounts.extra }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">本地缺失</div><div class="sc-value">{{ aepCounts.missing }}</div></div>
            <div class="stat-chip"><div class="sc-label">已忽略</div><div class="sc-value">{{ aepCounts.ignored }}</div></div>
          </div>
          <div class="diff-tabs">
            <div class="diff-tab" :class="{active: aepDiffTab==='extra'}" @click="aepDiffTab='extra'">AEP 多出 <span class="cnt">{{ aepCounts.extra }}</span></div>
            <div class="diff-tab" :class="{active: aepDiffTab==='missing'}" @click="aepDiffTab='missing'">本地缺失 <span class="cnt">{{ aepCounts.missing }}</span></div>
            <div class="diff-tab" :class="{active: aepDiffTab==='ignored'}" @click="aepDiffTab='ignored'">已忽略 <span class="cnt">{{ aepCounts.ignored }}</span></div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>类型</th><th>SN</th><th>AEP / 本地名称</th><th>AEP 设备 ID</th><th>产品 ID</th><th>说明</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredAepDiffs" :key="item.id">
                  <td>
                    <span class="tag" :class="item.type==='extra'?'tag-orange':'tag-red'">{{ item.type==='extra'?'多出':'缺失' }}</span>
                  </td>
                  <td><code>{{ item.sn }}</code></td>
                  <td>{{ item.type==='extra' ? item.aepName : item.localName }}</td>
                  <td>{{ item.aepDeviceId || '—' }}</td>
                  <td>{{ item.productId || '—' }}</td>
                  <td style="max-width:260px;white-space:normal">{{ item.hint }}</td>
                  <td class="actions">
                    <template v-if="item.action==='pending'">
                      <button v-if="item.type==='extra'" class="btn-link btn" @click="resolveAepDiff(item, 'connected')">接入台账</button>
                      <button v-if="item.type==='missing'" class="btn-link btn" @click="resolveAepDiff(item, 'connected')">创建接入</button>
                      <button class="btn-link btn" @click="resolveAepDiff(item, 'ignored')">忽略</button>
                    </template>
                    <span v-else class="tag tag-gray">已忽略</span>
                  </td>
                </tr>
                <tr v-if="!filteredAepDiffs.length">
                  <td colspan="7"><div class="empty-hint">当前分类无待处理差异</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-note">「接入台账」将 AEP 多出设备写入本地；「创建接入」在 AEP 侧创建设备并回填 ID。一期为交互示意。</div>
        </div>

        <!-- ===== 在线监控：监控列表 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorList'" class="page-card" data-screen="monitor-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">在线监控 · 设备列表</h1>
              <p class="page-desc">查看设备在线态、告警摘要与数据可信度（T0～T3 / 分数）；测点时序为 PostgreSQL 示意数据</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="goMonitorOnlineRate">在线率统计</button>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-chip accent"><div class="sc-label">监控设备</div><div class="sc-value">{{ monListStats.total }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">在线</div><div class="sc-value">{{ monListStats.online }}</div></div>
            <div class="stat-chip"><div class="sc-label">离线</div><div class="sc-value">{{ monListStats.offline }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">有告警</div><div class="sc-value">{{ monListStats.alarming }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">低可信 (T0/T1)</div><div class="sc-value">{{ monListStats.lowTrust }}</div></div>
          </div>
          <div class="toolbar">
            <input class="input input-lg" v-model="monSearch" placeholder="搜索设备名称 / SN" />
            <select class="select" v-model="monProjectFilter">
              <option value="">全部项目</option>
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select class="select" v-model="monCategoryFilter">
              <option value="">全部品类</option>
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select class="select" v-model="monOnlineFilter">
              <option value="">在线态</option>
              <option value="在线">在线</option>
              <option value="离线">离线</option>
              <option value="未知">未知</option>
            </select>
            <select class="select" v-model="monAlarmFilter">
              <option value="">告警筛选</option>
              <option value="any">有告警</option>
              <option value="warn">有预警</option>
              <option value="alarm">有报警</option>
              <option value="fault">有故障</option>
              <option value="none">无告警</option>
            </select>
            <button class="btn" @click="monSearch=''; monProjectFilter=''; monCategoryFilter=''; monOnlineFilter=''; monAlarmFilter=''">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>设备</th><th>项目</th><th>品类</th><th>在线态</th><th>告警摘要</th><th>可信度</th><th>最近上报</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredMonitorRows" :key="d.id" class="row-clickable" @click="openMonitorDetail(d)">
                  <td>
                    <div class="cell-title">{{ d.name }}</div>
                    <div class="cell-sub"><code>{{ d.sn }}</code></div>
                  </td>
                  <td>{{ d.projectName }}</td>
                  <td>{{ d.categoryName }}</td>
                  <td>
                    <span class="lifecycle-dot">
                      <i :class="d.online==='在线'?'lc-online':(d.online==='离线'?'lc-offline':'lc-pending')"></i>
                      <span class="tag" :class="ONLINE_TAG[d.online]">{{ d.online }}</span>
                    </span>
                  </td>
                  <td>
                    <span v-if="!d.warn && !d.alarm && !d.fault" class="tag tag-gray">无告警</span>
                    <span v-else class="alarm-pills">
                      <span v-if="d.warn" class="pill pill-warn">预警 {{ d.warn }}</span>
                      <span v-if="d.alarm" class="pill pill-alarm">报警 {{ d.alarm }}</span>
                      <span v-if="d.fault" class="pill pill-fault">故障 {{ d.fault }}</span>
                    </span>
                  </td>
                  <td>
                    <span class="trust-cell">
                      <span class="tag" :class="TRUST_TAG[d.trustLevel]">{{ d.trustLevel }}</span>
                      <span class="trust-score">{{ d.trustScore }}</span>
                      <span class="trust-label">{{ TRUST_LABEL[d.trustLevel] }}</span>
                    </span>
                  </td>
                  <td>{{ d.lastReportAt }}</td>
                  <td class="actions" @click.stop>
                    <button class="btn-link btn" @click="openMonitorDetail(d)">详情</button>
                    <button class="btn-link btn" @click="openMonitorCurve(d)">曲线</button>
                  </td>
                </tr>
                <tr v-if="!filteredMonitorRows.length">
                  <td colspan="8"><div class="empty-hint">无匹配监控设备</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredMonitorRows.length }} 台</span>
            <button class="page-btn active">1</button>
            <button class="page-btn">›</button>
          </div>
          <div class="table-note">一期不做设施树、地图与通用指令；可信度 T0～T3 及分数为示意规则。</div>
        </div>

        <!-- ===== 在线监控：设备监控详情 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorDetail'" class="page-card detail-shell" data-screen="monitor-detail">
          <button class="back-link" @click="goMonitorList">← 返回监控列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentMonitor.name }}</h1>
              <div class="detail-meta">
                <span>SN：<b>{{ currentMonitor.sn }}</b></span>
                <span>项目：<b>{{ currentMonitor.projectName }}</b></span>
                <span>品类：<b>{{ currentMonitor.categoryName }}</b></span>
                <span>在线：
                  <span class="lifecycle-dot" style="display:inline-flex">
                    <i :class="currentMonitor.online==='在线'?'lc-online':(currentMonitor.online==='离线'?'lc-offline':'lc-pending')"></i>
                    <b>{{ currentMonitor.online }}</b>
                  </span>
                </span>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" @click="openMonitorCurve(currentMonitor)">历史曲线</button>
              <button class="btn" @click="goMonitorOnlineRate">在线率</button>
            </div>
          </div>

          <div class="stat-row">
            <div class="stat-chip" :class="currentMonitor.trustLevel==='T3'||currentMonitor.trustLevel==='T2'?'ok':(currentMonitor.trustLevel==='T1'?'warn':'danger')">
              <div class="sc-label">近 24h 可信分</div>
              <div class="sc-value">{{ currentMonitor.trustScore }} <span class="sc-unit">{{ currentMonitor.trustLevel }}</span></div>
            </div>
            <div class="stat-chip warn"><div class="sc-label">预警</div><div class="sc-value">{{ currentMonitor.warn }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">报警</div><div class="sc-value">{{ currentMonitor.alarm }}</div></div>
            <div class="stat-chip accent"><div class="sc-label">故障</div><div class="sc-value">{{ currentMonitor.fault }}</div></div>
            <div class="stat-chip"><div class="sc-label">采集周期</div><div class="sc-value" style="font-size:16px">{{ formatCycle(currentMonitor.cycleSec) }}</div></div>
          </div>

          <div class="info-section">
            <div class="info-section-title">设备与固件</div>
            <div class="kv-grid">
              <div class="k">设备 ID</div><div class="v">{{ currentMonitor.id }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentMonitor.model }}</div>
              <div class="k">固件版本</div><div class="v">{{ currentMonitor.firmware }}</div>
              <div class="k">最近上报</div><div class="v">{{ currentMonitor.lastReportAt }}</div>
              <div class="k">告警摘要</div><div class="v">{{ alarmSummaryText(currentMonitor) }}</div>
              <div class="k">可信说明</div><div class="v">{{ TRUST_LABEL[currentMonitor.trustLevel] }}（{{ currentMonitor.trustLevel }} / {{ currentMonitor.trustScore }} 分）</div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">最新测点 <span class="sub-nav-hint">PG 时序示意 · 点击行可进曲线</span></div>
            <div class="table-wrap" v-if="monLatestPoints.length">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>编码</th><th>名称</th><th>最新值</th><th>单位</th><th>可信</th><th>采集时间</th><th>周期</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in monLatestPoints" :key="p.code" class="row-clickable" @click="openMonitorCurve(currentMonitor, p.code)">
                    <td><code>{{ p.code }}</code></td>
                    <td>{{ p.name }}</td>
                    <td><b>{{ p.value == null ? '—' : p.value }}</b></td>
                    <td>{{ p.unit || '—' }}</td>
                    <td>
                      <span class="tag" :class="TRUST_TAG[p.trustLevel]">{{ p.trustLevel }}</span>
                      <span class="trust-score">{{ p.trustScore }}</span>
                    </td>
                    <td>{{ p.ts }}</td>
                    <td>{{ formatCycle(p.cycleSec) }}</td>
                    <td class="actions" @click.stop>
                      <button class="btn-link btn" @click="openMonitorCurve(currentMonitor, p.code)">曲线</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无测点数据</div>
          </div>
          <div class="table-note">测点数值与可信分为 PostgreSQL 时序库示意，非实时接入。</div>
        </div>

        <!-- ===== 在线监控：历史曲线 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorCurve'" class="page-card" data-screen="monitor-curve">
          <button class="back-link" @click="screen='monitorDetail'">← 返回监控详情</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">历史曲线 · {{ currentMonitor.name }}</h1>
              <p class="page-desc">测点时序示意（PG）；参考线：预警 orange / 报警 error / 故障 primary</p>
            </div>
          </div>
          <div class="toolbar">
            <select class="select" v-model="monCurvePointCode">
              <option v-for="p in monLatestPoints" :key="p.code" :value="p.code">{{ p.name }}（{{ p.code }}）</option>
            </select>
            <div class="seg-group">
              <button class="seg-btn" :class="{active: monCurveRange===7}" @click="monCurveRange=7">近 7 天</button>
              <button class="seg-btn" :class="{active: monCurveRange===30}" @click="monCurveRange=30">近 30 天</button>
            </div>
            <div class="spacer"></div>
            <span class="tag tag-gray" v-if="monSelectedPoint">周期 {{ formatCycle(monSelectedPoint.cycleSec) }}</span>
          </div>
          <div v-if="monCycleFullQueryTip" class="banner-tip">
            采集周期 &gt; 15 分钟：历史全量查、不分段
          </div>
          <div class="chart-card" v-if="monSelectedPoint">
            <div class="chart-legend">
              <span class="leg"><i class="lg-line" style="background:#0D6EFD"></i>测点值</span>
              <span class="leg"><i class="lg-dash" style="border-color:#E78212"></i>预警</span>
              <span class="leg"><i class="lg-dash" style="border-color:#DC3545"></i>报警</span>
              <span class="leg"><i class="lg-dash" style="border-color:#0D6EFD"></i>故障</span>
              <span class="leg muted">示意数据 · {{ monCurveRange }} 天</span>
            </div>
            <svg class="curve-svg" :viewBox="'0 0 ' + monCurveSvg.w + ' ' + monCurveSvg.h" preserveAspectRatio="none">
              <rect :x="monCurveSvg.padL" :y="monCurveSvg.padT" :width="monCurveSvg.w - monCurveSvg.padL - monCurveSvg.padR" :height="monCurveSvg.h - monCurveSvg.padT - monCurveSvg.padB" fill="#fafcff" stroke="#eef2f8" />
              <g v-for="(tk, i) in monCurveSvg.yTicks" :key="'yt'+i">
                <line :x1="monCurveSvg.padL" :x2="monCurveSvg.w - monCurveSvg.padR" :y1="tk.y" :y2="tk.y" stroke="#edf0f5" />
                <text :x="monCurveSvg.padL - 8" :y="tk.y + 4" text-anchor="end" font-size="11" fill="#8c8c8c">{{ tk.v }}</text>
              </g>
              <g v-for="(ln, i) in monCurveSvg.lines" :key="'ln'+i">
                <line :x1="monCurveSvg.padL" :x2="monCurveSvg.w - monCurveSvg.padR" :y1="ln.y" :y2="ln.y" :stroke="ln.color" stroke-width="1.5" stroke-dasharray="6 4" />
                <text :x="monCurveSvg.w - monCurveSvg.padR - 4" :y="ln.y - 4" text-anchor="end" font-size="10" :fill="ln.color">{{ ln.label }} {{ ln.val }}</text>
              </g>
              <path :d="monCurveSvg.path" fill="none" stroke="#0D6EFD" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
              <text :x="(monCurveSvg.padL + monCurveSvg.w - monCurveSvg.padR)/2" :y="monCurveSvg.h - 10" text-anchor="middle" font-size="11" fill="#8c8c8c">时间 →（{{ monCurveRange }} 天 · PG 时序示意）</text>
            </svg>
            <div class="chart-meta" v-if="monSelectedPoint">
              <span>当前测点：<b>{{ monSelectedPoint.name }}</b>（{{ monSelectedPoint.code }}）</span>
              <span>最新值：<b>{{ monSelectedPoint.value == null ? '—' : monSelectedPoint.value }}</b> {{ monSelectedPoint.unit }}</span>
              <span>单位量程：{{ monSelectedPoint.ymin }} ~ {{ monSelectedPoint.ymax }}</span>
            </div>
          </div>
          <div v-else class="empty-hint">请选择测点</div>
        </div>

        <!-- ===== 在线监控：在线率 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorOnlineRate'" class="page-card" data-screen="monitor-online-rate">
          <button class="back-link" @click="goMonitorList">← 返回监控列表</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">在线率 · 该报没报</h1>
              <p class="page-desc">按采集周期统计近 24h 应报 / 实报 / 漏报；跟随列表筛选条件</p>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-chip accent"><div class="sc-label">纳入设备</div><div class="sc-value">{{ monOnlineRateSummary.deviceCount }}</div></div>
            <div class="stat-chip"><div class="sc-label">应报次数</div><div class="sc-value">{{ monOnlineRateSummary.expected }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">实报次数</div><div class="sc-value">{{ monOnlineRateSummary.actual }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">漏报（该报没报）</div><div class="sc-value">{{ monOnlineRateSummary.missed }}</div></div>
            <div class="stat-chip" :class="monOnlineRateSummary.rate >= 95 ? 'ok' : (monOnlineRateSummary.rate >= 80 ? 'warn' : 'danger')">
              <div class="sc-label">整体在线率</div>
              <div class="sc-value">{{ monOnlineRateSummary.rate }}<span class="sc-unit">%</span></div>
            </div>
          </div>
          <div class="toolbar">
            <select class="select" v-model="monProjectFilter">
              <option value="">全部项目</option>
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select class="select" v-model="monCategoryFilter">
              <option value="">全部品类</option>
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <select class="select" v-model="monOnlineFilter">
              <option value="">在线态</option>
              <option value="在线">在线</option>
              <option value="离线">离线</option>
              <option value="未知">未知</option>
            </select>
            <button class="btn" @click="monProjectFilter=''; monCategoryFilter=''; monOnlineFilter=''">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>设备</th><th>项目</th><th>在线态</th><th>采集周期</th><th>应报</th><th>实报</th><th>漏报</th><th>在线率</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in monOnlineRateRows" :key="d.id">
                  <td>
                    <div class="cell-title">{{ d.name }}</div>
                    <div class="cell-sub"><code>{{ d.sn }}</code></div>
                  </td>
                  <td>{{ d.projectName }}</td>
                  <td><span class="tag" :class="ONLINE_TAG[d.online]">{{ d.online }}</span></td>
                  <td>{{ formatCycle(d.cycleSec) }}</td>
                  <td>{{ d.expected24h }}</td>
                  <td>{{ d.actual24h }}</td>
                  <td>
                    <span :class="d.missed24h ? 'miss-bad' : 'miss-ok'">{{ d.missed24h }}</span>
                  </td>
                  <td>
                    <div class="rate-bar-wrap">
                      <div class="rate-bar"><i :style="{width: Math.min(100, d.rate) + '%', background: d.rate>=95?'#198754':(d.rate>=80?'#E78212':'#DC3545')}"></i></div>
                      <span>{{ d.rate }}%</span>
                    </div>
                  </td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openMonitorDetail(d)">详情</button>
                  </td>
                </tr>
                <tr v-if="!monOnlineRateRows.length">
                  <td colspan="9"><div class="empty-hint">无统计数据</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-note">应报 = 24h ÷ 采集周期；漏报 = 该报没报。一期为示意统计。</div>
        </div>

      </main>
    </div>


    <!-- 物模型：品类模态 -->
    <div v-if="showCategoryModal" class="overlay" @click.self="showCategoryModal=false">
      <div class="modal">
        <div class="modal-header"><span>{{ categoryModalMode==='create'?'新建品类':'编辑品类' }}</span><button class="close-x" @click="showCategoryModal=false">×</button></div>
        <div class="modal-body">
          <div class="form-item"><label><span class="req">*</span>品类名称</label><input class="input input-full" v-model="categoryForm.name" /></div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>品类编码</label><input class="input input-full" v-model="categoryForm.code" :disabled="categoryModalMode==='edit'" /><div class="hint" v-if="categoryModalMode==='edit'">编码创建后不可修改</div></div>
            <div class="form-item"><label><span class="req">*</span>所属行业</label><select class="select input-full" v-model="categoryForm.industry"><option v-for="i in industries" :key="i" :value="i">{{ i }}</option></select></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>绑定 AEP 产品/型号</label>
              <select class="select input-full" v-model="categoryForm.aepProductId">
                <option value="">暂不绑定</option>
                <option v-for="p in AEP_PRODUCTS" :key="p.id" :value="p.id">{{ p.name }}（{{ p.model }}）</option>
              </select>
            </div>
            <div class="form-item"><label>状态</label><select class="select input-full" v-model="categoryForm.status"><option>启用</option><option>草稿</option><option>停用</option></select></div>
          </div>
          <div class="form-item"><label>品类说明</label><textarea class="textarea input-full" v-model="categoryForm.desc"></textarea></div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showCategoryModal=false">取消</button><button class="btn btn-primary" @click="saveCategory">确定</button></div>
      </div>
    </div>

    <div v-if="showAepModal" class="overlay drawer-mode" @click.self="showAepModal=false">
      <div class="drawer">
        <div class="drawer-header"><span>绑定 AEP 产品/型号</span><button class="close-x" @click="showAepModal=false">×</button></div>
        <div class="drawer-body">
          <div class="form-item"><label>品类 ID</label><input class="input input-full" :value="aepForm.categoryId" disabled /></div>
          <div class="form-item"><label><span class="req">*</span>绑定 AEP 产品/型号</label>
            <select class="select input-full" v-model="aepForm.aepProductId">
              <option value="">请选择产品</option>
              <option v-for="p in AEP_PRODUCTS" :key="p.id" :value="p.id">{{ p.name }}（{{ p.model }}）</option>
            </select>
          </div>
          <div class="hint">按品类绑定产品/型号，不选择设备 SN；单台设备在台账由 AEP 绑定自动建档。</div>
        </div>
        <div class="drawer-footer"><button class="btn" @click="showAepModal=false">取消</button><button class="btn btn-orange" @click="saveAep">确认绑定产品/型号</button></div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="overlay" @click.self="showDeleteConfirm=false">
      <div class="modal confirm-box">
        <div class="modal-header"><span>确认删除</span><button class="close-x" @click="showDeleteConfirm=false">×</button></div>
        <div class="modal-body">
          <div class="confirm-icon">!</div>
          <div>
            <div style="font-weight:500;margin-bottom:6px">确定删除{{ deleteTarget.type }}「{{ deleteTarget.name }}」吗？</div>
            <div style="font-size:13px;color:#666">删除后不可恢复，已关联设备将失去对应配置引用。</div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showDeleteConfirm=false">取消</button><button class="btn btn-danger" @click="doDelete">删除</button></div>
      </div>
    </div>

    <!-- 设备台账：项目新建/编辑 -->
    <div v-if="showProjectModal" class="overlay" data-screen="ledger-project-modal" @click.self="showProjectModal=false">
      <div class="modal">
        <div class="modal-header">
          <span>{{ projectModalMode==='create'?'新建项目':'编辑项目' }}</span>
          <button class="close-x" @click="showProjectModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item"><label><span class="req">*</span>项目名称</label><input class="input input-full" v-model="projectForm.name" placeholder="如 城东排涝一期" /></div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>负责人</label><input class="input input-full" v-model="projectForm.owner" placeholder="姓名" /></div>
            <div class="form-item"><label>状态</label>
              <select class="select input-full" v-model="projectForm.status">
                <option>筹备中</option><option>进行中</option><option>已完工</option><option>已暂停</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>所属区域</label><input class="input input-full" v-model="projectForm.region" /></div>
            <div class="form-item"><label>启动日期</label><input class="input input-full" v-model="projectForm.startedAt" type="date" /></div>
          </div>
          <div class="form-item"><label>项目说明</label><textarea class="textarea input-full" v-model="projectForm.desc" placeholder="建设范围与目标"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showProjectModal=false">取消</button>
          <button class="btn btn-primary" @click="saveProject">确定</button>
        </div>
      </div>
    </div>

    <!-- 导入 / 导出说明 -->
    <div v-if="showImportModal" class="overlay" data-screen="ledger-import-export" @click.self="showImportModal=false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span>{{ importMode==='import'?'设备导入':'设备导出' }}</span>
          <button class="close-x" @click="showImportModal=false">×</button>
        </div>
        <div class="modal-body">
          <template v-if="importMode==='import'">
            <div class="form-section-title">导入说明</div>
            <ol class="import-steps">
              <li>下载 Excel 模板，按列填写 SN、名称、项目、品类、经纬度、安装参数等。</li>
              <li>SN 全局唯一；已存在 SN 将更新档案（生命周期为「报废」的跳过）。</li>
              <li>品类须已在物模型中启用；项目须已创建。</li>
              <li>一期不校验 AEP 是否已存在，导入后可去「AEP 对账」处理差异。</li>
            </ol>
            <div class="import-box">
              <div style="font-weight:500;margin-bottom:8px">拖拽文件到此处，或点击选择 .xlsx</div>
              <div style="color:#8c8c8c;margin-bottom:12px">单次建议不超过 2000 行</div>
              <button class="btn btn-primary btn-sm">选择文件</button>
              <button class="btn btn-sm" style="margin-left:8px">下载模板</button>
            </div>
          </template>
          <template v-else>
            <div class="form-section-title">导出说明</div>
            <ol class="import-steps">
              <li>导出范围跟随当前列表筛选条件（项目 / 品类 / 生命周期 / SN）。</li>
              <li>字段含基础信息、坐标、安装参数扁平列、主从 SN。</li>
              <li>照片仅导出文件名占位，不含二进制。</li>
            </ol>
            <div class="form-item" style="margin-top:12px">
              <label>导出格式</label>
              <select class="select input-full"><option>Excel (.xlsx)</option><option>CSV (.csv)</option></select>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showImportModal=false">关闭</button>
          <button class="btn btn-primary" @click="showImportModal=false">{{ importMode==='import'?'开始导入':'开始导出' }}</button>
        </div>
      </div>
    </div>

    <!-- 停用确认 -->
    <div v-if="showDisableConfirm" class="overlay" @click.self="showDisableConfirm=false">
      <div class="modal confirm-box">
        <div class="modal-header"><span>确认停用</span><button class="close-x" @click="showDisableConfirm=false">×</button></div>
        <div class="modal-body">
          <div class="confirm-icon">!</div>
          <div>
            <div style="font-weight:500;margin-bottom:6px">确定停用设备「{{ currentDevice.name }}」吗？</div>
            <div style="font-size:13px;color:#666">停用后不再参与在线监控与告警；可在编辑档案中改回。</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDisableConfirm=false">取消</button>
          <button class="btn btn-danger" @click="doDisableDevice">停用</button>
        </div>
      </div>
    </div>

  </div>
  `
}).mount('#app');
