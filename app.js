const { createApp, ref, computed, reactive, watch, nextTick } = Vue;

/* ========== 物模型 Mock ========== */
const CATEGORIES = [
  { id: 'C001', name: '积水仪地埋', code: 'flood_buried', icon: 'mdi:pipe', industry: '市政排水', deviceCount: 128, modelVersion: 'v1.2.0', updatedAt: '2026-09-28 14:22', status: '启用', ruleCount: 3, upgradeSupported: 0 },
  { id: 'C006', name: '积水仪侧壁', code: 'flood_sidewall', icon: 'mdi:wall', industry: '市政排水', deviceCount: 64, modelVersion: 'v1.0.0', updatedAt: '2026-10-08 10:15', status: '启用', ruleCount: 1, upgradeSupported: 0 },
  { id: 'C002', name: '水质监测站', code: 'water_quality', icon: 'mdi:water-check', industry: '环保监测', deviceCount: 56, modelVersion: 'v2.0.1', updatedAt: '2026-09-26 09:10', status: '启用', ruleCount: 2, upgradeSupported: 0 },
  { id: 'C003', name: '管网压力表', code: 'pipe_pressure', icon: 'mdi:gauge', industry: '供水', deviceCount: 0, modelVersion: 'v0.9.0', updatedAt: '2026-09-20 16:45', status: '草稿', ruleCount: 2, upgradeSupported: 0 },
  { id: 'C004', name: '泵站机组', code: 'pump_unit', icon: 'mdi:pump', industry: '市政排水', deviceCount: 34, modelVersion: 'v1.0.3', updatedAt: '2026-09-18 11:30', status: '启用', ruleCount: 2, upgradeSupported: 0 },
  { id: 'C005', name: '雨量计', code: 'rain_gauge', icon: 'mdi:weather-pouring', industry: '气象水文', deviceCount: 12, modelVersion: 'v1.1.0', updatedAt: '2026-09-12 08:05', status: '停用', ruleCount: 2, upgradeSupported: 0 },
  { id: 'C007', name: '智能井盖', code: 'manhole_cover', icon: 'mdi:cylinder', industry: '市政排水', deviceCount: 0, modelVersion: 'v0.1.0', updatedAt: '2026-10-30 18:00', status: '草稿', ruleCount: 1, upgradeSupported: 0 },
];

/* ========== 品类图标（Iconify）==========
 * 详见 docs/ICON_SPEC.md
 * - category.icon 直接存 Iconify id（如 mdi:water）；空则走 DEFAULT_CODE_TO_ICONIFY[code]
 * - 短期 FE：本地 DEFAULT_CODE_TO_ICONIFY + 推荐表；中期 BE：iot_category.icon
 * - 库：Iconify（本 mock 用 iconify-icon Web Component + Material Design Icons `mdi`）
 */
/** code → Iconify id 兜底（icon 为空时）
 * 含真实 BE 品类 code；旧 mock / 工业角色 code 作别名。
 * 与 FE resolveCategoryIcon.ts 工业默认对齐（pipe-leak / water-pump / gauge-full / sine-wave / test-tube 等）。
 */
const DEFAULT_CODE_TO_ICONIFY = {
  // —— 真实 BE category.code ——
  aio: 'mdi:monitor-dashboard',
  flow_doppler: 'mdi:sine-wave',
  flow_vel_level: 'mdi:waves-arrow-up',
  level_pressure: 'mdi:gauge-full',
  level_static: 'mdi:hydraulic-oil-level',
  manhole_cover: 'mdi:cylinder',
  ng_flood_buried: 'mdi:pipe-leak',
  ng_flood_sidewall: 'mdi:waves-arrow-up',
  water_cod: 'mdi:test-tube',
  water_nh3n: 'mdi:molecule',
  water_ph: 'mdi:ph',
  water_sdt: 'mdi:water-opacity',
  // —— 旧 mock 别名（与 FE 工业默认同图） ——
  flood_buried: 'mdi:pipe-leak',
  flood_sidewall: 'mdi:waves-arrow-up',
  water_quality: 'mdi:water-opacity',
  pipe_pressure: 'mdi:gauge-full',
  pump_unit: 'mdi:water-pump',
  rain_gauge: 'mdi:weather-pouring',
  probe: 'mdi:thermometer-lines',
  uncategorized: 'mdi:help-box-outline',
  device: 'mdi:chip',
  // —— FE 工业角色别名 ——
  gateway: 'mdi:router-wireless',
  valve: 'mdi:pipe-valve',
  meter: 'mdi:meter-electric',
  sensor: 'mdi:access-point',
  camera: 'mdi:cctv',
  cabinet: 'mdi:server',
  fan: 'mdi:fan',
  boiler: 'mdi:water-boiler',
  tank: 'mdi:barrel',
  generator: 'mdi:engine',
};

/** 名称 → code 短尾兼容（无 code / 合成桶时） */
const CATEGORY_CODE_BY_NAME = {
  '一体机': 'aio',
  '积水仪地埋': 'flood_buried',
  '积水仪侧壁': 'flood_sidewall',
  '新一代积水仪地埋': 'ng_flood_buried',
  '新一代积水仪侧壁': 'ng_flood_sidewall',
  '水质监测站': 'water_quality',
  '管网压力表': 'pipe_pressure',
  '泵站机组': 'pump_unit',
  '雨量计': 'rain_gauge',
  '多普勒流量计': 'flow_doppler',
  '流速水位计': 'flow_vel_level',
  '压力液位': 'level_pressure',
  '静压液位': 'level_static',
  '井盖监测': 'manhole_cover',
  'COD 水质': 'water_cod',
  '氨氮水质': 'water_nh3n',
  'pH 水质': 'water_ph',
  '浊度水质': 'water_sdt',
  '未分类': 'uncategorized',
};

/**
 * 推荐图标目录（品类新建/编辑 IconPicker 网格）。
 * id = Iconify 完整 id（prefix:name）；无业务 key 白名单层——落库即此字符串。
 */
const ICON_CATALOG = [
  { id: 'mdi:devices', labelZh: '通用设备' },
  { id: 'mdi:monitor-dashboard', labelZh: '一体机/仪表盘' },
  { id: 'mdi:pipe', labelZh: '管道/地埋' },
  { id: 'mdi:wall', labelZh: '侧壁/墙装' },
  { id: 'mdi:water', labelZh: '水' },
  { id: 'mdi:water-check', labelZh: '水质' },
  { id: 'mdi:gauge', labelZh: '压力表' },
  { id: 'mdi:pump', labelZh: '泵站/泵' },
  { id: 'mdi:weather-pouring', labelZh: '雨量' },
  { id: 'mdi:waves', labelZh: '流量/波' },
  { id: 'mdi:flask-outline', labelZh: 'COD/化验' },
  { id: 'mdi:antenna', labelZh: '探头/天线' },
  { id: 'mdi:help-box-outline', labelZh: '未分类' },
  { id: 'mdi:valve', labelZh: '阀门' },
  { id: 'mdi:gate', labelZh: '闸门' },
  { id: 'mdi:cctv', labelZh: '摄像头' },
  { id: 'mdi:weather-partly-cloudy', labelZh: '气象站' },
  { id: 'mdi:battery-outline', labelZh: '电池' },
  { id: 'mdi:signal', labelZh: '信号' },
  { id: 'mdi:thermometer', labelZh: '温度' },
  { id: 'mdi:hydraulic-oil-level', labelZh: '液位' },
  { id: 'mdi:server-network', labelZh: '网关' },
  { id: 'mdi:access-point', labelZh: '接入点' },
  { id: 'mdi:chip', labelZh: '传感器芯片' },
  { id: 'mdi:map-marker-radius', labelZh: '位置/井点' },
  { id: 'mdi:alert-circle-outline', labelZh: '告警' },
  { id: 'mdi:lightning-bolt', labelZh: '电力' },
  { id: 'mdi:fan', labelZh: '风机' },
  // —— 工业 / 市政 / IoT 扩展 ——
  { id: 'mdi:pipe-valve', labelZh: '管道阀门' },
  { id: 'mdi:pipe-disconnected', labelZh: '管道断开' },
  { id: 'mdi:pipe-leak', labelZh: '管道泄漏' },
  { id: 'mdi:leak', labelZh: '泄漏' },
  { id: 'mdi:water-pump', labelZh: '水泵' },
  { id: 'mdi:water-boiler', labelZh: '锅炉' },
  { id: 'mdi:water-well', labelZh: '水井' },
  { id: 'mdi:waves-arrow-up', labelZh: '流速/水位升' },
  { id: 'mdi:fire-hydrant', labelZh: '消防栓' },
  { id: 'mdi:hydraulic-oil-temperature', labelZh: '油温/液压温' },
  { id: 'mdi:meter-electric', labelZh: '电表' },
  { id: 'mdi:speedometer', labelZh: '转速/流速表' },
  { id: 'mdi:turbine', labelZh: '涡轮' },
  { id: 'mdi:air-filter', labelZh: '过滤器' },
  { id: 'mdi:smoke-detector', labelZh: '烟感' },
  { id: 'mdi:electric-switch', labelZh: '电气开关' },
  { id: 'mdi:current-ac', labelZh: '交流电' },
  { id: 'mdi:sine-wave', labelZh: '波形' },
  { id: 'mdi:transmission-tower', labelZh: '输电塔' },
  { id: 'mdi:router-wireless', labelZh: '无线路由' },
  { id: 'mdi:access-point-network', labelZh: '网络接入点' },
  { id: 'mdi:radio-tower', labelZh: '无线电塔' },
  { id: 'mdi:camera-outline', labelZh: '摄像头(线框)' },
  { id: 'mdi:chart-timeline-variant', labelZh: '时序曲线' },
  { id: 'mdi:database', labelZh: '数据库' },
  { id: 'mdi:cloud-sync', labelZh: '云同步' },
  { id: 'mdi:robot-industrial', labelZh: '工业机器人' },
  { id: 'mdi:factory', labelZh: '工厂' },
  { id: 'mdi:warehouse', labelZh: '仓库' },
  { id: 'mdi:barrel', labelZh: '桶罐' },
  { id: 'mdi:propane-tank', labelZh: '储罐' },
  { id: 'mdi:cylinder', labelZh: '井盖/柱体' },
  { id: 'mdi:molecule', labelZh: '分子/氨氮' },
  { id: 'mdi:ph', labelZh: 'pH' },
  { id: 'mdi:water-opacity', labelZh: '浊度/透明度' },
  // —— 与 FE INDUSTRIAL_ICON_PRESETS 对齐补齐 ——
  { id: 'mdi:gauge-full', labelZh: '满量程压力表' },
  { id: 'mdi:test-tube', labelZh: '试管/COD' },
  { id: 'mdi:thermometer-lines', labelZh: '多路温度探头' },
  { id: 'mdi:server', labelZh: '机柜/服务器' },
  { id: 'mdi:engine', labelZh: '发电机/引擎' },
  { id: 'mdi:battery-charging-wireless', labelZh: '无线充电/电池' },
  { id: 'mdi:water-alert', labelZh: '水质告警' },
];

const FALLBACK_ICONIFY = DEFAULT_CODE_TO_ICONIFY.device;

/* 归属规则：通用规则默认匹配；特殊处理规则优先级更高。AEP 侧已完成解析，本侧只做品类自动挂靠。 */
const CATEGORY_RULES = [
  { id: 'R101', categoryId: 'C001', name: '积水仪地埋 · 标准产品通用匹配', type: '通用', matchAepProduct: 'AEP-LW-1001', matchProtocol: 'MQTT / level-proto-v2', priority: 100, enabled: true, note: '默认：AEP 解析后按产品 ID 挂靠本品类' },
  { id: 'R102', categoryId: 'C001', name: '旧 CoAP 协议例外', type: '特殊', matchAepProduct: 'AEP-LW-1001', matchProtocol: 'CoAP / legacy-level', priority: 10, enabled: true, note: '特殊协议优先于通用规则' },
  { id: 'R103', categoryId: 'C001', name: '双探头定制型号', type: '特殊', matchAepProduct: 'AEP-LW-1001-D', matchProtocol: 'MQTT / dual-probe', priority: 20, enabled: true, note: '双探头设备强制挂靠积水仪地埋' },
  { id: 'R601', categoryId: 'C006', name: '积水仪侧壁 · 标准产品通用匹配', type: '通用', matchAepProduct: 'AEP-FS-6001', matchProtocol: 'MQTT / flood-sidewall-v1', priority: 100, enabled: true, note: '默认：AEP 解析后按产品 ID 挂靠积水仪侧壁' },
  { id: 'R201', categoryId: 'C002', name: '水质站通用匹配', type: '通用', matchAepProduct: 'AEP-WQ-2003', matchProtocol: 'MQTT / wq-proto-v1', priority: 100, enabled: true, note: '默认匹配水质 AEP 产品' },
  { id: 'R202', categoryId: 'C002', name: '临时测试产品例外', type: '特殊', matchAepProduct: 'AEP-WQ-TEST', matchProtocol: '任意', priority: 5, enabled: false, note: '已停用：测试产品不再自动归属' },
  { id: 'R301', categoryId: 'C003', name: '管网压力通用匹配', type: '通用', matchAepProduct: 'AEP-PP-4001', matchProtocol: 'MQTT / pressure-v1', priority: 100, enabled: true, note: '草稿品类规则，启用后生效' },
  { id: 'R302', categoryId: 'C003', name: '低压区定制协议', type: '特殊', matchAepProduct: 'AEP-PP-4001', matchProtocol: 'NB-IoT / low-pressure', priority: 15, enabled: true, note: '低压区特殊处理' },
  { id: 'R401', categoryId: 'C004', name: '泵站机组通用匹配', type: '通用', matchAepProduct: 'AEP-PU-3012', matchProtocol: 'Modbus-TCP / pump-ctrl', priority: 100, enabled: true, note: '默认挂靠泵站机组' },
  { id: 'R402', categoryId: 'C004', name: '变频柜例外', type: '特殊', matchAepProduct: 'AEP-PU-3012-VFD', matchProtocol: 'Modbus-TCP / vfd', priority: 12, enabled: true, note: '变频柜优先特殊规则' },
  { id: 'R501', categoryId: 'C005', name: '雨量计通用匹配', type: '通用', matchAepProduct: 'AEP-RG-5001', matchProtocol: 'MQTT / rain-gauge', priority: 100, enabled: true, note: '默认匹配雨量产品' },
  { id: 'R502', categoryId: 'C005', name: '翻斗式例外', type: '特殊', matchAepProduct: 'AEP-RG-5001-T', matchProtocol: 'RS485 / tipping-bucket', priority: 18, enabled: true, note: '翻斗式雨量计特殊处理' },
  { id: 'R701', categoryId: 'C007', name: '智能井盖 · 标准产品通用匹配', type: '通用', matchAepProduct: 'AEP-MC-7001', matchProtocol: 'MQTT / manhole-cmd-v1', priority: 100, enabled: true, note: '智能井盖命令包（含开启角度/改号/补偿姿态/BOOT）' },
];

/* 上报属性（kind=property）：按品类挂靠，在线监控动态列取自本品类定义 */
const PROPERTIES = [
  /* 积水仪地埋 C001；showInMonitor 默认 true，关闭后不进监控详情最新值/曲线/上报明细 */
  { id: 'P1', categoryId: 'C001', kind: 'property', identifier: 'yewei', name: '液位', dataType: 'float', unit: 'm', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P2', categoryId: 'C001', kind: 'property', identifier: 'wendu', name: '温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '120s', required: true, showInMonitor: true },
  { id: 'P3', categoryId: 'C001', kind: 'property', identifier: 'yaqiang', name: '压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P4', categoryId: 'C001', kind: 'property', identifier: 'dianya', name: '电池电压', dataType: 'float', unit: 'V', access: '只读', reportCycle: '300s', required: false, showInMonitor: false },
  /* 积水仪侧壁 C006：同测点标识，独立品类物模型 */
  { id: 'P61', categoryId: 'C006', kind: 'property', identifier: 'yewei', name: '液位', dataType: 'float', unit: 'm', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P62', categoryId: 'C006', kind: 'property', identifier: 'wendu', name: '温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '120s', required: true, showInMonitor: true },
  { id: 'P63', categoryId: 'C006', kind: 'property', identifier: 'yaqiang', name: '压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  /* 水质监测站 C002：测点集与积水仪不同 */
  { id: 'P21', categoryId: 'C002', kind: 'property', identifier: 'ph', name: 'pH', dataType: 'float', unit: '', access: '只读', reportCycle: '300s', required: true, showInMonitor: true },
  { id: 'P22', categoryId: 'C002', kind: 'property', identifier: 'do', name: '溶解氧', dataType: 'float', unit: 'mg/L', access: '只读', reportCycle: '300s', required: true, showInMonitor: true },
  { id: 'P23', categoryId: 'C002', kind: 'property', identifier: 'turb', name: '浊度', dataType: 'float', unit: 'NTU', access: '只读', reportCycle: '300s', required: false, showInMonitor: true },
  /* 管网压力表 C003 */
  { id: 'P31', categoryId: 'C003', kind: 'property', identifier: 'yaqiang', name: '管网压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '900s', required: true, showInMonitor: true },
  /* 泵站机组 C004 */
  { id: 'P41', categoryId: 'C004', kind: 'property', identifier: 'cur', name: '运行电流', dataType: 'float', unit: 'A', access: '只读', reportCycle: '120s', required: true, showInMonitor: true },
  { id: 'P42', categoryId: 'C004', kind: 'property', identifier: 'vib', name: '振动', dataType: 'float', unit: 'mm/s', access: '只读', reportCycle: '120s', required: true, showInMonitor: true },
  /* 雨量计 C005 */
  { id: 'P51', categoryId: 'C005', kind: 'property', identifier: 'rain', name: '雨量', dataType: 'float', unit: 'mm', access: '只读', reportCycle: '1800s', required: true, showInMonitor: true },
  /* 智能井盖 C007：属性较多，次要字段演示 showInMonitor=false 收列 */
  { id: 'P71', categoryId: 'C007', kind: 'property', identifier: 'openAngle', name: '开启角度', dataType: 'float', unit: '°', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P72', categoryId: 'C007', kind: 'property', identifier: 'openStatus', name: '开盖状态', dataType: 'enum', unit: '-', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P73', categoryId: 'C007', kind: 'property', identifier: 'tiltX', name: '倾角 X', dataType: 'float', unit: '°', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P74', categoryId: 'C007', kind: 'property', identifier: 'tiltY', name: '倾角 Y', dataType: 'float', unit: '°', access: '只读', reportCycle: '60s', required: true, showInMonitor: true },
  { id: 'P75', categoryId: 'C007', kind: 'property', identifier: 'dianya', name: '电池电压', dataType: 'float', unit: 'V', access: '只读', reportCycle: '300s', required: false, showInMonitor: true },
  { id: 'P76', categoryId: 'C007', kind: 'property', identifier: 'rssi', name: '信号强度', dataType: 'int', unit: 'dBm', access: '只读', reportCycle: '300s', required: false, showInMonitor: false },
  { id: 'P77', categoryId: 'C007', kind: 'property', identifier: 'humidity', name: '腔内湿度', dataType: 'float', unit: '%RH', access: '只读', reportCycle: '600s', required: false, showInMonitor: false },
  { id: 'P78', categoryId: 'C007', kind: 'property', identifier: 'wendu', name: '腔内温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '600s', required: false, showInMonitor: false },
];

const EVENTS = [
  { id: 'E1', identifier: 'overflow_alarm', name: '溢流报警', level: '报警', trigger: '液位 ≥ 报警上限', desc: '井内液位超过报警阈值' },
  { id: 'E2', identifier: 'low_battery', name: '低电量预警', level: '预警', trigger: '电池电压 < 3.4V', desc: '电量不足，需更换电池' },
  { id: 'E3', identifier: 'sensor_fault', name: '传感器故障', level: '故障', trigger: '连续 3 次采集失败', desc: '探头无响应或数据异常' },
];

const POINTS = [
  { id: 'M1', code: 'yewei', name: '液位', unit: 'm', dataType: 'float', min: 0, max: 10, cycle: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: '', faultHigh: 9.5, desc: '井内水位高度 · latest_json.yewei' },
  { id: 'M2', code: 'wendu', name: '温度', unit: '℃', dataType: 'float', min: -40, max: 85, cycle: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: '', faultHigh: 80, desc: '设备/井内温度 · latest_json.wendu' },
  { id: 'M3', code: 'yaqiang', name: '压强', unit: 'kPa', dataType: 'float', min: 0, max: 200, cycle: 60, warnLow: 80, warnHigh: 120, alarmLow: 70, alarmHigh: 130, faultLow: '', faultHigh: 150, desc: '气压/液压 · latest_json.yaqiang' },
  { id: 'M4', code: 'dianya', name: '电池电压', unit: 'V', dataType: 'float', min: 0, max: 5, cycle: 300, warnLow: 3.5, warnHigh: '', alarmLow: 3.3, alarmHigh: '', faultLow: 3.0, faultHigh: '', desc: '设备供电电压' },
];

const INSTALL_FIELDS = [
  { id: 'I1', code: 'well_depth', name: '井深', dataType: 'float', unit: 'm', required: true, defaultVal: '', example: '8.5', desc: '检查井深度' },
  { id: 'I2', code: 'pipe_diameter', name: '管径', dataType: 'float', unit: 'mm', required: true, defaultVal: '', example: '600', desc: '进出水管管径' },
  { id: 'I3', code: 'install_height', name: '安装高度', dataType: 'float', unit: 'm', required: true, defaultVal: '0.3', example: '0.3', desc: '探头距井底高度' },
  { id: 'I4', code: 'well_no', name: '井号', dataType: 'string', unit: '-', required: true, defaultVal: '', example: 'JW-2026-001', desc: '现场井编号' },
  { id: 'I5', code: 'cover_type', name: '井盖类型', dataType: 'enum', unit: '-', required: false, defaultVal: '铸铁', example: '铸铁/复合材料', desc: '井盖材质类型' },
];

const FIRMWARES = [
  { id: 'F1', categoryId: 'C001', model: 'MF-LW-100', currentVersion: '1.2.0', upgradeVersion: '1.3.0', releaseDate: '2026-09-15', status: '可升级', packageUrl: 'https://example.com/fw/MF-LW-100/1.3.0.bin', packageName: 'MF-LW-100-1.3.0.bin', packageSize: 1867776, changelog: '优化液位滤波算法；修复低电量误报' },
  { id: 'F2', categoryId: 'C001', model: 'MF-LW-100', currentVersion: '1.1.2', upgradeVersion: '1.2.0', releaseDate: '2026-07-01', status: '基线', packageUrl: 'https://example.com/fw/MF-LW-100/1.2.0.bin', packageName: 'MF-LW-100-1.2.0.bin', packageSize: 524288, changelog: '支持 AEP 物模型 v1.2' },
  { id: 'F3', categoryId: 'C001', model: 'MF-LW-200', currentVersion: '2.0.1', upgradeVersion: '', releaseDate: '2026-08-20', status: '最新', packageUrl: 'https://example.com/fw/MF-LW-200/2.0.1.bin', packageName: 'MF-LW-200-2.0.1.bin', packageSize: null, changelog: '新硬件平台首发固件' },
];
/* PUT /iotCategoryFirmware 拒绝文案（只允许 POST 新建） */
const FIRMWARE_EDIT_REFUSED = '暂不支持修改固件信息，请删除后重新上传登记';
/* packageSize 存字节。展示 KB/MB；空为 —。落库见 iot_category_firmware_add_package_size_v1.sql（本原型不写 SQL）。 */
function formatPackageSize(bytes) {
  if (bytes === null || bytes === undefined || bytes === '') return '—';
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '—';
  const kb = n / 1024;
  if (kb < 1024) {
    const text = kb >= 100 ? String(Math.round(kb)) : (Math.round(kb * 10) / 10).toString();
    return text + ' KB';
  }
  const mb = kb / 1024;
  const text = mb >= 100 ? String(Math.round(mb)) : (Math.round(mb * 10) / 10).toString();
  return text + ' MB';
}
/* DELETE：被 OTA 任务 / 设备升级记录引用，或 packageUrl 相同，则失败；批量时任一条被引用则整批失败 */
const FIRMWARE_DELETE_REFUSED = '升级包已被 OTA 任务/设备升级记录使用，不能删除';
const FIRMWARE_DELETE_WARN = '若已被 OTA 任务或设备升级记录引用则无法删除';

/* 指令配置：物模型侧定义该品类「能下什么」（非实时点发台）
 * 积水仪 FAFA…ADAD：字节17–24 为命令开关（bitIndex 1-based，bit=1 执行；位 9 空缺）；
 * 智能井盖：命令位 17/23/24/25；内容区字节 73（角度）/74–80（设备号）/81（补偿姿态）/82（BOOT）。
 * payloadOffset 为内容区 1-based 绝对起始字节（内容从该字节起写入）。
 * 字段对齐后端 kind=service：bitIndex / payloadOffset / hasParam / paramMin / paramMax + identifier·name·dataType·unit·required·access。
 * 真正下发走 AEP CreateCommand（透传 hex，dataType=2） */
const COMMANDS = [
  { id: 'CMD01', categoryId: 'C001', code: 'reboot', name: '重启', hasParam: 0, bitIndex: 1, payloadOffset: 25, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, batchable: true, enabled: true, desc: '命令位 1；内容起始字节 25（F0 重启 / 0F 不重启）', params: null },
  { id: 'CMD02', categoryId: 'C001', code: 'factoryReset', name: '恢复出厂', hasParam: 0, bitIndex: 2, payloadOffset: 26, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, batchable: false, enabled: true, desc: '命令位 2；内容起始字节 26（F0/0F）', params: null },
  { id: 'CMD03', categoryId: 'C001', code: 'clearData', name: '清零', hasParam: 0, bitIndex: 3, payloadOffset: 27, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, batchable: false, enabled: true, desc: '命令位 3；内容起始字节 27（F0/0F）', params: null },
  { id: 'CMD04', categoryId: 'C001', code: 'installHeightMm', name: '安装高度', hasParam: 1, bitIndex: 4, payloadOffset: 28, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 10000, batchable: false, enabled: true, desc: '命令位 4；内容起始字节 28（2 字节 mm）；params.value',
    params: { value: { label: '安装高度', min: 0, max: 10000, unit: 'mm' } } },
  { id: 'CMD05', categoryId: 'C001', code: 'syncTime', name: '对时', hasParam: 1, bitIndex: 5, payloadOffset: 30, dataType: 'int', unit: 's', required: true, access: 'w', paramMin: null, paramMax: null, batchable: true, enabled: true, desc: '命令位 5；内容起始字节 30（4 字节 unix 秒）；params.value',
    params: { value: { label: 'unix 秒', min: null, max: null, unit: 's' } } },
  { id: 'CMD06', categoryId: 'C001', code: 'switchThreshold', name: '切换频率', hasParam: 1, bitIndex: 6, payloadOffset: 34, dataType: 'object', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 65535, batchable: false, enabled: true, desc: '命令位 6；内容起始字节 34（高低水位 4 字节）；params.high / params.low，high＞low',
    params: {
      high: { label: '高水位', min: 0, max: 65535, unit: 'mm' },
      low: { label: '低水位', min: 0, max: 65535, unit: 'mm' }
    } },
  { id: 'CMD07', categoryId: 'C001', code: 'resendRange', name: '重发区间', hasParam: 1, bitIndex: 7, payloadOffset: 38, dataType: 'object', unit: '-', required: true, access: 'w', paramMin: 0, paramMax: 16777215, batchable: false, enabled: true, desc: '命令位 7；内容起始字节 38（起止包序列号 6 字节）；params.start / params.end，start≤end',
    params: {
      start: { label: '起始包序列号', min: 0, max: 16777215 },
      end: { label: '结束包序列号', min: 0, max: 16777215 }
    } },
  { id: 'CMD08', categoryId: 'C001', code: 'sampleInterval', name: '采样频率', hasParam: 1, bitIndex: 8, payloadOffset: 44, dataType: 'object', unit: 'min', required: true, access: 'w', paramMin: 1, paramMax: 65535, batchable: true, enabled: true, desc: '命令位 8；内容起始字节 44（长/中/短采样间隔）；params.longMin / midMin / shortMin',
    params: {
      longMin: { label: '长(无水)分钟', min: 1, max: 65535, unit: 'min' },
      midMin: { label: '中', min: 1, max: 255, unit: 'min' },
      shortMin: { label: '短', min: 1, max: 255, unit: 'min' }
    } },
  { id: 'CMD09', categoryId: 'C001', code: 'raiseHeightMm', name: '上凸高度', hasParam: 1, bitIndex: 10, payloadOffset: 50, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 5000, batchable: false, enabled: true, desc: '命令位 10（位 9 空缺）；内容起始字节 50（2 字节 mm）；params.value',
    params: { value: { label: '上凸高度', min: 0, max: 5000, unit: 'mm' } } },
  { id: 'CMD10', categoryId: 'C001', code: 'sinkHeightMm', name: '下沉高度', hasParam: 1, bitIndex: 11, payloadOffset: 52, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 5000, batchable: false, enabled: true, desc: '命令位 11；内容起始字节 52（2 字节 mm）；params.value',
    params: { value: { label: '下沉高度', min: 0, max: 5000, unit: 'mm' } } },
  { id: 'CMD11', categoryId: 'C001', code: 'sendInterval', name: '发送频率', hasParam: 1, bitIndex: 12, payloadOffset: 54, dataType: 'object', unit: 'min', required: true, access: 'w', paramMin: 1, paramMax: 65535, batchable: true, enabled: true, desc: '命令位 12；内容起始字节 54（长/中/短发送间隔）；params.longMin / midMin / shortMin',
    params: {
      longMin: { label: '长(无水)分钟', min: 1, max: 65535, unit: 'min' },
      midMin: { label: '中', min: 1, max: 255, unit: 'min' },
      shortMin: { label: '短', min: 1, max: 255, unit: 'min' }
    } },

  /* 智能井盖 C007：命令代码 17/23/24/25；内容区字节 73–82 */
  { id: 'CMD70', categoryId: 'C007', code: 'openAngle', name: '修改判断开启角度', hasParam: 1, bitIndex: 17, payloadOffset: 73, dataType: 'int', unit: '°', required: true, access: 'w', paramMin: 0, paramMax: 180, batchable: false, enabled: true, desc: '命令位 17；内容起始字节 73（1 字节，0°–180°，默认 35°）；params.value',
    params: { value: { label: '开启角度', min: 0, max: 180, unit: '°', default: 35 } } },
  { id: 'CMD71', categoryId: 'C007', code: 'changeDeviceSn', name: '更改设备号', hasParam: 1, bitIndex: 23, payloadOffset: 74, dataType: 'string', unit: '-', required: true, access: 'w', paramMin: null, paramMax: null, batchable: false, enabled: true, desc: '命令位 23；内容起始字节 74–80（7 字节设备号）；params.value',
    params: { value: { label: '新设备号', min: null, max: null, unit: '', len: 7 } } },
  { id: 'CMD72', categoryId: 'C007', code: 'recordInstallAttitude', name: '记录安装基准(补偿)姿态', hasParam: 0, bitIndex: 24, payloadOffset: 81, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, batchable: false, enabled: true, desc: '命令位 24；内容起始字节 81（0xF0 记录补偿姿态 / 0x0F 清除）', params: null },
  { id: 'CMD73', categoryId: 'C007', code: 'bootUpgrade', name: 'BOOT升级', hasParam: 0, bitIndex: 25, payloadOffset: 82, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, batchable: true, enabled: true, desc: '命令位 25；内容起始字节 82（0xF0 升级 BOOT / 0x0F 不升级）', params: null },
];


/* OTA 设备升级日志 · 与 bootUpgrade 指令区分：固件包任务
 * 设备状态（不变）：0 排队 / 1 升级中 / 2 成功 / 3 失败
 * 进度按 taskId 归集，对齐 deviceUpgrade?taskId=
 * 失败原因常见：「任务已取消」；「升级超时（超过N分钟无应答）」（N = 任务 timeoutMinutes，默认 30） */
const OTA_DEVICE_STATUS = {
  0: { label: '排队', tag: 'tag-blue' },
  1: { label: '升级中', tag: 'tag-orange' },
  2: { label: '成功', tag: 'tag-green' },
  3: { label: '失败', tag: 'tag-red' },
};
const OTA_DEVICE_STATUS_BY_LABEL = { '排队': 0, '升级中': 1, '成功': 2, '失败': 3 };
/* 任务状态：0 进行中 / 1 已完成 / 2 已取消 / 3 失败 */
const OTA_TASK_STATUS = {
  0: { label: '进行中', tag: 'tag-orange' },
  1: { label: '已完成', tag: 'tag-green' },
  2: { label: '已取消', tag: 'tag-gray' },
  3: { label: '失败', tag: 'tag-red' },
};
const OTA_TASK_STATUS_BY_LABEL = { '进行中': 0, '已完成': 1, '已取消': 2, '失败': 3 };
const OTA_TIMEOUT_DEFAULT = 30;
const OTA_DEVICE_CAP = 200;
const OTA_CANCEL_REASON = '任务已取消';
/* upgradeSupported：1 支持 / 0 不支持，默认 0。同一开关在品类列表与品类详情 OTA 模块，保存 PUT /iotCategory。
 * 落库脚本 iot_category_add_upgrade_supported_v1.sql（本原型不写 SQL）。执行后打开 manhole_cover 等需要升级的品类。
 * 发起升级的品类选择器只取 GET /iotCategory?upgradeSupported=1。未打开仍创建时后端拒绝。 */
const UPGRADE_SUPPORTED_SQL = 'iot_category_add_upgrade_supported_v1.sql';
const UPGRADE_SUPPORTED_NOTE = 'upgradeSupported：1 支持，0 不支持，默认关闭。保存走 PUT /iotCategory。需先执行 iot_category_add_upgrade_supported_v1.sql（本原型不写 SQL）。执行后请把智能井盖（manhole_cover）等需要升级的品类打开。';
const OTA_CATEGORY_REJECT_MSG = '品类未开启升级支持（upgradeSupported=0），不能创建升级任务';

function otaTimeoutFailReason(minutes) {
  const n = Number(minutes);
  const m = Number.isFinite(n) && n > 0 ? Math.round(n) : OTA_TIMEOUT_DEFAULT;
  return '升级超时（超过' + m + '分钟无应答）';
}

/* fromVersion = 升级前设备 softwareVersion（整数，可空）。成功仍由 upgradeStatus 决定，不新增状态：
 * 主路径末包应答 remain=0 → 2 成功。
 * 智能井盖兜底：末包后无最终应答时，信息包 softwareVersion ≠ 本条升级记录 fromVersion 即成功
 * （版本可回退；只比该单 fromVersion，不比设备表当前版本，也不比目标版本）。fromVersion 为空则跳过兜底。
 * 回写用信息包实际版本。应答 remain=0 仍记成功。待后端新 tip。 */
const DEVICE_UPGRADE_LOGS = [
  { id: 'UL02', deviceId: 'D001', taskId: 'OT01', firmwareId: 'F1', packageUrl: 'https://example.com/fw/MF-LW-100/1.3.0.bin', time: '2026-10-30 09:05:00', fromVersion: 120, fromVer: '1.2.0', toVer: '1.3.0', status: 1, progress: 62, sentPackage: 8, remainPackage: 5, totalPackage: 13, operator: '李敏', failReason: '' },
  { id: 'UL03', deviceId: 'D002', taskId: 'OT01', time: '2026-10-30 09:05:00', fromVersion: null, fromVer: '1.2.0', toVer: '1.3.0', status: 0, progress: 0, sentPackage: 0, remainPackage: 12, totalPackage: 12, operator: '李敏', failReason: '' },
  { id: 'UL06', deviceId: 'D015', taskId: 'OT01', time: '2026-10-30 09:05:00', fromVersion: null, fromVer: '1.2.0', toVer: '1.3.0', status: 0, progress: 0, sentPackage: 0, remainPackage: 10, operator: '李敏', failReason: '' },
  { id: 'UL01', deviceId: 'D001', taskId: 'OT02', firmwareId: 'F2', packageUrl: 'https://example.com/fw/MF-LW-100/1.2.0.bin', time: '2026-10-20 15:12:00', fromVersion: 110, fromVer: '1.1.2', toVer: '1.2.0', status: 2, progress: 100, sentPackage: 12, remainPackage: 0, totalPackage: 12, operator: '张三', failReason: '', successNote: '应答 remain=0' },
  { id: 'UL08', deviceId: 'D002', taskId: 'OT02', time: '2026-10-20 16:02:00', fromVersion: null, fromVer: '1.1.8', toVer: '1.2.0', status: 2, progress: 100, sentPackage: 9, remainPackage: 0, operator: '张三', failReason: '', successNote: '应答 remain=0' },
  { id: 'UL05', deviceId: 'D007', taskId: 'OT02', time: '2026-10-20 15:11:00', fromVersion: null, fromVer: '1.0.0', toVer: '1.2.0', status: 2, progress: 100, sentPackage: 8, remainPackage: 0, totalPackage: 8, operator: '张三', failReason: '', successNote: '应答 remain=0' },
  { id: 'UL07', deviceId: 'D009', taskId: 'OT02', time: '2026-10-20 15:18:00', fromVersion: null, fromVer: '1.1.0', toVer: '1.2.0', status: 2, progress: 100, sentPackage: 10, remainPackage: 0, totalPackage: 10, operator: '张三', failReason: '', successNote: '应答 remain=0' },
  { id: 'UL04', deviceId: 'D015', taskId: 'OT02', time: '2026-10-20 15:40:22', fromVersion: null, fromVer: '1.1.2', toVer: '1.2.0', status: 3, progress: 38, sentPackage: 5, remainPackage: 8, totalPackage: 13, operator: '张三', failReason: otaTimeoutFailReason(30) },
  { id: 'UL09', deviceId: 'D009', taskId: 'OT03', time: '2026-10-25 11:02:00', fromVersion: null, fromVer: '1.2.0', toVer: '1.3.0', status: 3, progress: 12, sentPackage: 2, remainPackage: 14, totalPackage: 16, operator: '王建国', failReason: OTA_CANCEL_REASON },
  { id: 'UL10', deviceId: 'D007', taskId: 'OT03', time: '2026-10-25 11:02:00', fromVersion: null, fromVer: '1.2.0', toVer: '1.3.0', status: 3, progress: 0, sentPackage: 0, remainPackage: 16, totalPackage: 16, operator: '王建国', failReason: OTA_CANCEL_REASON },
  { id: 'UL11', deviceId: 'D001', taskId: 'OT04', time: '2026-10-18 08:40:00', fromVersion: 100, fromVer: '1.1.2', toVer: '1.2.0', status: 3, progress: 40, sentPackage: 4, remainPackage: 6, totalPackage: 10, operator: '李敏', failReason: otaTimeoutFailReason(20) },
  { id: 'UL12', deviceId: 'D002', taskId: 'OT04', time: '2026-10-18 08:40:00', fromVersion: null, fromVer: '1.1.2', toVer: '1.2.0', status: 3, progress: 0, sentPackage: 0, remainPackage: 10, operator: '李敏', failReason: otaTimeoutFailReason(20) },
  { id: 'UL13', deviceId: 'D013', taskId: 'OT02', time: '2026-10-21 09:12:00', fromVersion: 8, fromVer: '1.0.0', toVer: '1.0.0', status: 2, progress: 100, sentPackage: 11, remainPackage: 0, totalPackage: 11, operator: '李敏', failReason: '', successNote: '末包无最终应答；信息包 softwareVersion=9 ≠ 本单 fromVersion=8（可升可降），回写实际版本 9' },
  { id: 'UL14', deviceId: 'D009', taskId: 'OT01', time: '2026-10-30 09:20:00', fromVersion: null, fromVer: '1.2.0', toVer: '1.3.0', status: 1, progress: 100, sentPackage: 13, remainPackage: 0, totalPackage: 13, operator: '李敏', failReason: '' },
];

/* 品类级 OTA 任务。排除原因一律「排除: …」，出现在创建结果，不进入设备进度。 */
const CATEGORY_OTA_TASKS = [
  {
    id: 'OT01', categoryId: 'C001', fromVerHint: '<1.3.0', toVer: '1.3.0', firmwareId: 'F1',
    packageUrl: 'https://example.com/fw/MF-LW-100/1.3.0.bin',
    createdAt: '2026-10-30 09:00:00', operator: '李敏',
    deviceCount: 4, success: 0, fail: 0, pending: 4,
    status: 0, timeoutMinutes: 30,
    excluded: [
      { deviceId: 'D007', name: '望江路井-待接入', reason: '排除: 设备待接入且无 AEP 设备号' },
      { deviceId: 'D003', name: '南湖入口站', reason: '排除: 不属于当前品类' },
    ],
  },
  {
    id: 'OT02', categoryId: 'C001', fromVerHint: '<1.2.0', toVer: '1.2.0', firmwareId: 'F2',
    packageUrl: 'https://example.com/fw/MF-LW-100/1.2.0.bin',
    createdAt: '2026-10-20 15:10:00', operator: '张三',
    deviceCount: 6, success: 5, fail: 1, pending: 0,
    status: 1, timeoutMinutes: 30,
    excluded: [],
  },
  {
    id: 'OT03', categoryId: 'C001', fromVerHint: '<1.3.0', toVer: '1.3.0', firmwareId: 'F1',
    packageUrl: 'https://example.com/fw/MF-LW-100/1.3.0.bin',
    createdAt: '2026-10-25 11:00:00', cancelledAt: '2026-10-25 11:20:00', operator: '王建国',
    deviceCount: 2, success: 0, fail: 2, pending: 0,
    status: 2, timeoutMinutes: 45,
    excluded: [
      { deviceId: 'D004', name: '解放路压力-12', reason: '排除: 不属于当前品类' },
    ],
  },
  {
    id: 'OT04', categoryId: 'C001', fromVerHint: '<1.2.0', toVer: '1.2.0', firmwareId: 'F2',
    packageUrl: 'https://example.com/fw/MF-LW-100/1.2.0.bin',
    createdAt: '2026-10-18 08:10:00', operator: '李敏',
    deviceCount: 2, success: 0, fail: 2, pending: 0,
    status: 3, timeoutMinutes: 20,
    excluded: [],
  },
];

/* ========== 设备台账 Mock ========== */
const PROJECTS = [
  { id: 'PJ01', name: '城东排涝一期', status: '进行中', owner: '王建国', deviceCount: 86, region: '城东片区', startedAt: '2026-03-01', desc: '城东易涝点液位与泵站监测', aepProductId: 'AEP-LW-1001', aepProductName: '液位井标准产品' },
  { id: 'PJ02', name: '南湖水质专项', status: '进行中', owner: '李敏', deviceCount: 42, region: '南湖流域', startedAt: '2026-05-12', desc: '南湖出入湖水质站建设', aepProductId: 'AEP-WQ-2003', aepProductName: '水质站标准产品' },
  { id: 'PJ03', name: '老城供水管网', status: '已完工', owner: '赵强', deviceCount: 118, region: '老城区', startedAt: '2025-11-01', desc: '老城压力表替换与接入', aepProductId: 'AEP-PP-4001', aepProductName: '管网压力标准产品' },
  { id: 'PJ04', name: '滨江泵站改造', status: '筹备中', owner: '陈芳', deviceCount: 0, region: '滨江新区', startedAt: '2026-09-01', desc: '滨江 3 座泵站机组台账预建', aepProductId: 'AEP-PU-3012', aepProductName: '泵站机组标准产品' },
  { id: 'PJ05', name: '雨量站扩容', status: '已暂停', owner: '周伟', deviceCount: 12, region: '全市', startedAt: '2026-01-20', desc: '气象雨量计补充部署', aepProductId: 'AEP-RG-5001', aepProductName: '雨量计标准产品' },
];

const DEVICES = [
  { id: 'D001', imei: 'MF20260901001', deviceSn: 'MF20260901001', aepStatus: 1, lastReportAt: '2026-09-29 18:20', name: '东湖路井-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'AEP-DEV-10001', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153576, lat: 30.287459, address: '杭州市上城区东湖路与环城东路交叉口东南侧检查井', installDate: '2026-04-12', installer: '张伟', masterId: '', masterImei: '', slaves: ['D002', 'D015', 'D016'], photos: ['现场全景', '井内安装', '铭牌特写'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.3', well_no: 'JW-2026-001', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D002', imei: 'MF20260901002', deviceSn: 'MF20260901002', aepStatus: 1, lastReportAt: '2026-09-29 18:20', name: '东湖路井-01从机', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'probe:MF20260901002', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153610, lat: 30.287480, address: '杭州市上城区东湖路检查井（从机）', installDate: '2026-04-12', installer: '张伟', masterId: 'D001', masterImei: 'MF20260901001', slaves: [], photos: ['从机安装'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.5', well_no: 'JW-2026-001-S', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D003', imei: 'MF20260520011', deviceSn: 'MF20260520011', aepStatus: 2, lastReportAt: '2026-09-28 09:11', name: '南湖入口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '离线', aepDeviceId: 'AEP-DEV-20011', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.148220, lat: 30.265110, address: '南湖公园北门入湖口', installDate: '2026-06-01', installer: '刘洋', masterId: '', masterImei: '', slaves: [], photos: ['站房外观', '采水口'], installParams: { sample_depth: '1.2', station_code: 'NH-IN-01' }, updatedAt: '2026-09-28 09:11' },
  { id: 'D004', imei: 'MF20251108088', deviceSn: 'MF20251108088', aepStatus: 9, lastReportAt: '2026-08-10 14:00', name: '解放路压力-12', projectId: 'PJ03', projectName: '老城供水管网', categoryId: 'C003', categoryName: '管网压力表', categoryMatch: 'manual', categoryRuleId: '', lifecycle: '停用', aepDeviceId: '', model: 'MF-PP-50', firmware: '0.9.0', lng: 120.165001, lat: 30.274880, address: '解放路 88 号门前阀门井', installDate: '2025-12-05', installer: '孙磊', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { pipe_diameter: '300', install_depth: '1.5' }, updatedAt: '2026-08-10 14:00' },
  { id: 'D005', imei: 'MF20260915030', deviceSn: 'MF20260915030', aepStatus: 1, lastReportAt: '2026-09-30 08:05', name: '城东泵站1#机组', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C004', categoryName: '泵站机组', categoryMatch: 'auto', categoryRuleId: 'R401', lifecycle: '在线', aepDeviceId: 'AEP-DEV-30120', model: 'MF-PU-300', firmware: '1.0.3', lng: 120.160100, lat: 30.291200, address: '城东排涝泵站泵房', installDate: '2026-05-20', installer: '赵强', masterId: '', masterImei: '', slaves: [], photos: ['机组铭牌', '控制柜'], installParams: { rated_power: '75', pump_no: '1#' }, updatedAt: '2026-09-30 08:05' },
  { id: 'D006', imei: 'MF20260120001', deviceSn: 'MF20260120001', aepStatus: 9, lastReportAt: '2026-07-01 10:00', name: '气象局雨量-03', projectId: 'PJ05', projectName: '雨量站扩容', categoryId: 'C005', categoryName: '雨量计', categoryMatch: 'auto', categoryRuleId: 'R501', lifecycle: '报废', aepDeviceId: 'AEP-DEV-RG-03', model: 'MF-RG-10', firmware: '1.0.0', lng: 120.172000, lat: 30.300000, address: '市气象局观测场', installDate: '2024-03-01', installer: '周伟', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { mount_height: '1.2' }, updatedAt: '2026-07-01 10:00' },
  { id: 'D007', imei: 'MF20260928050', deviceSn: 'MF20260928050', aepStatus: 0, lastReportAt: '2026-09-28 16:40', name: '望江路井-待接入', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '待接入', aepDeviceId: '', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.155800, lat: 30.282100, address: '望江路与秋涛路交叉口', installDate: '2026-09-28', installer: '张伟', masterId: '', masterImei: '', slaves: [], photos: ['待装现场'], installParams: { well_depth: '7.2', pipe_diameter: '800', install_height: '0.3', well_no: 'JW-2026-050', cover_type: '复合材料' }, updatedAt: '2026-09-28 16:40' },
  { id: 'D008', imei: 'MF20260601022', deviceSn: 'MF20260601022', aepStatus: 1, lastReportAt: '2026-09-29 21:00', name: '南湖出口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '在线', aepDeviceId: 'AEP-DEV-20022', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.151100, lat: 30.258900, address: '南湖出水闸附近', installDate: '2026-06-08', installer: '刘洋', masterId: '', masterImei: '', slaves: [], photos: ['站房', '仪表盘'], installParams: { sample_depth: '0.8', station_code: 'NH-OUT-01' }, updatedAt: '2026-09-29 21:00' },
  { id: 'D009', imei: 'MF20261001001', deviceSn: 'MF20261001001', aepStatus: 1, lastReportAt: '2026-10-01 09:12', name: 'AEP自注册-液位-01', projectId: null, projectName: '未定义项目', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'AEP-DEV-91001', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.158200, lat: 30.289100, address: '待现场补录', installDate: '2026-10-01', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-01 09:12' },
  { id: 'D010', imei: 'MF20261001088', deviceSn: 'MF20261001088', aepStatus: 0, lastReportAt: '2026-10-02 11:05', name: 'AEP自注册-未知协议', projectId: null, projectName: '未定义项目', categoryId: '', categoryName: '未分类', categoryMatch: 'none', categoryRuleId: '', lifecycle: '待接入', aepDeviceId: 'AEP-DEV-91088', model: 'UNKNOWN', firmware: '', lng: null, lat: null, address: '', installDate: '', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-02 11:05' },
  { id: 'D011', imei: 'AEP-AUTO-7721', deviceSn: 'AEP-AUTO-7721', aepStatus: 1, lastReportAt: '2026-10-03 14:30', name: '临时水质终端-7721', projectId: null, projectName: '未定义项目', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '在线', aepDeviceId: 'AEP-DEV-7721', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.149500, lat: 30.261000, address: '滨江临时点位', installDate: '2026-10-03', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { sample_depth: '1.0' }, updatedAt: '2026-10-03 14:30' },
  { id: 'D012', imei: 'MF20261005012', deviceSn: 'MF20261005012', aepStatus: 2, lastReportAt: '2026-10-05 08:40', name: 'AEP自注册-泵站探头', projectId: null, projectName: '未定义项目', categoryId: 'C004', categoryName: '泵站机组', categoryMatch: 'auto', categoryRuleId: 'fallback:0042', lifecycle: '离线', aepDeviceId: 'AEP-DEV-91200', model: 'MF-PU-300', firmware: '1.0.3', lng: 120.161000, lat: 30.292000, address: '', installDate: '2026-10-05', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-05 08:40' },
  { id: 'D013', imei: 'MF20261008013', deviceSn: 'MF20261008013', aepStatus: 1, lastReportAt: '2026-10-08 11:20', name: '庆春路侧壁-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C006', categoryName: '积水仪侧壁', categoryMatch: 'auto', categoryRuleId: 'R601', lifecycle: '在线', aepDeviceId: 'AEP-DEV-60013', model: 'MF-FS-60', firmware: '1.0.0', lng: 120.168200, lat: 30.278500, address: '庆春路与环城东路交叉口侧壁', installDate: '2026-08-18', installer: '张伟', masterId: '', masterImei: '', slaves: [], photos: ['侧壁安装'], installParams: { install_height: '0.2' }, updatedAt: '2026-10-08 11:20' },
  { id: 'D014', imei: 'MF20261008014', deviceSn: 'MF20261008014', aepStatus: 1, lastReportAt: '2026-10-08 11:22', name: '艮山路侧壁-02', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C006', categoryName: '积水仪侧壁', categoryMatch: 'auto', categoryRuleId: 'R601', lifecycle: '在线', aepDeviceId: 'AEP-DEV-60014', model: 'MF-FS-60', firmware: '1.0.0', lng: 120.170100, lat: 30.281200, address: '艮山路立交侧壁', installDate: '2026-08-20', installer: '赵强', masterId: '', masterImei: '', slaves: [], photos: ['侧壁铭牌'], installParams: { install_height: '0.25' }, updatedAt: '2026-10-08 11:22' },
  { id: 'D015', imei: 'MF20260901003', deviceSn: 'MF20260901003', aepStatus: 1, lastReportAt: '2026-10-19 15:00', name: '东湖路井-01探头B', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'probe:MF20260901003', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153620, lat: 30.287490, address: '杭州市上城区东湖路检查井（探头B）', installDate: '2026-04-12', installer: '张伟', masterId: 'D001', masterImei: 'MF20260901001', slaves: [], photos: [], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.6', well_no: 'JW-2026-001-P2', cover_type: '铸铁' }, updatedAt: '2026-10-19 15:00' },
];

/* 信息包字段：GET /iot/iotDevice/{id}。firmwareVersion 是 OTA 固件版本，与 softwareVersion 无关。
 * 未上报信息包时 hardwareVersion / softwareVersion / 双 IMSI / messageInfoJson 为 null。 */
const MESSAGE_INFO_LABELS = {
  message1: {
    factoryTime: '出厂时间',
    temperature: '温度 (℃)',
    rebootCount: '重启次数',
    ip: 'IP',
    battery: '电池电压 (V)',
    csq: '信号'
  },
  message3: {
    temperature: '温度 (℃)',
    rebootCount: '重启次数',
    ip: 'IP',
    battery: '电池电压 (V)',
    humidity: '湿度 (%RH)',
    workMode: '工作模式'
  },
  message32769: {
    factoryTime: '出厂时间',
    temperature: '温度 (℃)',
    rebootCount: '重启次数',
    battery: '电池 (V)',
    attitude: '姿态',
    gpsValid: 'GPS 有效'
  }
};

function attachDeviceMessageInfo(id, patch) {
  const row = DEVICES.find(d => d.id === id);
  if (row) Object.assign(row, patch);
}
attachDeviceMessageInfo('D001', {
  firmwareVersion: '1.2.0',
  hardwareVersion: 3,
  softwareVersion: 120,
  chinaTelecomImsi: '460030912345678',
  chinaMobileImsi: '460001598765432',
  messageInfoJson: JSON.stringify({
    packageType: 'message1',
    factoryTime: '2024-11-02 10:18:00',
    temperature: 28.6,
    rebootCount: 4,
    ip: '10.18.22.15',
    battery: 3.68,
    csq: 21
  })
});
attachDeviceMessageInfo('D003', {
  firmwareVersion: '2.0.1',
  hardwareVersion: 2,
  softwareVersion: 45,
  chinaTelecomImsi: '460031110002233',
  chinaMobileImsi: null,
  messageInfoJson: JSON.stringify({
    packageType: 'message3',
    temperature: 19.2,
    rebootCount: 1,
    ip: '10.20.4.88',
    battery: 3.41,
    humidity: 62,
    workMode: '定时上报'
  })
});
attachDeviceMessageInfo('D013', {
  firmwareVersion: '1.0.0',
  hardwareVersion: 5,
  softwareVersion: 8,
  chinaTelecomImsi: '460030000111222',
  chinaMobileImsi: '460008887776665',
  messageInfoJson: JSON.stringify({
    packageType: 'message32769',
    factoryTime: '2025-06-18 09:00:00',
    temperature: 26.2,
    rebootCount: 2,
    battery: 3.55,
    attitude: { pitch: 1.2, roll: -0.4, yaw: 88 },
    gpsValid: true
  })
});
attachDeviceMessageInfo('D007', {
  firmwareVersion: '1.2.0',
  hardwareVersion: null,
  softwareVersion: null,
  chinaTelecomImsi: null,
  chinaMobileImsi: null,
  messageInfoJson: null
});
attachDeviceMessageInfo('D010', {
  firmwareVersion: null,
  hardwareVersion: null,
  softwareVersion: null,
  chinaTelecomImsi: null,
  chinaMobileImsi: null,
  messageInfoJson: null
});

function displayNullable(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}
function deviceFirmwareVersion(d) {
  if (!d) return null;
  if (Object.prototype.hasOwnProperty.call(d, 'firmwareVersion')) return d.firmwareVersion;
  if (d.firmware === null || d.firmware === undefined || d.firmware === '') return null;
  return d.firmware;
}
function formatMessageValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object') {
    if (v.pitch != null || v.roll != null || v.yaw != null) {
      return '俯仰 ' + displayNullable(v.pitch) + '° · 横滚 ' + displayNullable(v.roll) + '° · 航向 ' + displayNullable(v.yaw) + '°';
    }
    try { return JSON.stringify(v); } catch (e) { return '—'; }
  }
  return String(v);
}
function parseDeviceMessageInfo(device) {
  if (!device || device.messageInfoJson == null || device.messageInfoJson === '') {
    return { empty: true, parseError: false, packageType: '', rows: [] };
  }
  let obj = device.messageInfoJson;
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj); } catch (e) {
      return { empty: false, parseError: true, packageType: '', rows: [], raw: device.messageInfoJson };
    }
  }
  if (!obj || typeof obj !== 'object') {
    return { empty: true, parseError: false, packageType: '', rows: [] };
  }
  const packageType = String(obj.packageType || '').trim();
  const labels = MESSAGE_INFO_LABELS[packageType] || {};
  const used = { packageType: true };
  const rows = [];
  Object.keys(labels).forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return;
    used[key] = true;
    rows.push({ key, label: labels[key], value: formatMessageValue(obj[key]) });
  });
  Object.keys(obj).forEach(key => {
    if (used[key]) return;
    rows.push({ key, label: key, value: formatMessageValue(obj[key]) });
  });
  return { empty: false, parseError: false, packageType: packageType || '—', rows };
}

const UNASSIGNED_PROJECT_ID = '__unassigned__';
const UNASSIGNED_PROJECT_NAME = '未定义项目';

const AEP_DIFFS = [
  { id: 'AD1', type: 'extra', imei: 'AEP-ONLY-9001', aepDeviceId: 'AEP-DEV-9001', aepName: '未知液位设备-9001', productId: 'AEP-LW-1001', hint: 'AEP 有、台账无：主路径 OpenAPI 绑定自动建档；缺产品时进例外池', action: 'pending' },
  { id: 'AD2', type: 'extra', imei: 'AEP-ONLY-9008', aepDeviceId: 'AEP-DEV-9008', aepName: '测试压力点-9008', productId: 'AEP-PU-3012', hint: '疑似测试设备残留', action: 'pending' },
  { id: 'AD3', type: 'missing', imei: 'MF20260928050', aepDeviceId: '', aepName: '', productId: 'AEP-LW-1001', localName: '望江路井-待接入', localId: 'D007', hint: '本地已建档，AEP 尚未创建设备', action: 'pending' },
  { id: 'AD4', type: 'missing', imei: 'MF20251108088', aepDeviceId: '', aepName: '', productId: 'AEP-PP-4001', localName: '解放路压力-12', localId: 'D004', hint: '本地有、AEP 无：IMEI 或产品映射不一致，可补建或忽略', action: 'pending' },
  { id: 'AD5', type: 'extra', imei: 'AEP-ONLY-7712', aepDeviceId: 'AEP-DEV-7712', aepName: '滨江临时终端', productId: 'AEP-LW-1001', hint: '例外：不在本期产品范围，可忽略', action: 'ignored' },
];

const TRANSFER_LOGS = [
  { id: 'TL1', deviceId: 'D001', imei: 'MF20260901001', deviceName: '东湖路井-01', fromProjectId: null, fromProjectName: '未定义项目', toProjectId: 'PJ01', toProjectName: '城东排涝一期', operator: '王建国', time: '2026-04-12 10:20', note: '例外处理：现场确认后人工改挂至城东项目' },
  { id: 'TL2', deviceId: 'D003', imei: 'MF20260520011', deviceName: '南湖入口站', fromProjectId: 'PJ04', fromProjectName: '滨江泵站改造', toProjectId: 'PJ02', toProjectName: '南湖水质专项', operator: '李敏', time: '2026-06-02 15:40', note: '例外处理：项目范围调整，人工改挂' },
];

/* 设备号变更记录 · 更改设备号指令成功后落库，便于追溯 */
const DEVICE_SN_CHANGE_LOGS = [
  { id: 'SN1', deviceId: 'D001', oldSn: 'MF20260901001', newSn: 'MF20260901999', operator: '张伟', time: '2026-10-28 14:22', source: '指令下发', commandId: 'AEP-CMD-SN-001', commandCode: 'changeDeviceSn', result: '成功', note: '现场铭牌与台账不一致，改号对齐' },
  { id: 'SN2', deviceId: 'D001', oldSn: 'MF20260901999', newSn: 'MF20260901001', operator: '王建国', time: '2026-10-29 09:05', source: '指令下发', commandId: 'AEP-CMD-SN-002', commandCode: 'changeDeviceSn', result: '成功', note: '回滚为原设备号' },
];


const LIFECYCLES = ['待接入', '在线', '离线', '停用', '报废'];
const LC_CLASS = { '待接入': 'lc-pending', '在线': 'lc-online', '离线': 'lc-offline', '停用': 'lc-disabled', '报废': 'lc-scrapped' };
const LC_TAG = { '待接入': 'tag-orange', '在线': 'tag-green', '离线': 'tag-gray', '停用': 'tag-gray', '报废': 'tag-red' };
const PJ_STATUS_TAG = { '进行中': 'tag-blue', '已完工': 'tag-green', '筹备中': 'tag-orange', '已暂停': 'tag-gray' };

/* ========== 驾驶舱 Mock ========== */
const COCKPIT_TODOS = [
  { id: 'CT1', type: '未挂项目', title: 'AEP自注册-液位-01', imei: 'MF20261001001', detail: '例外池：SDK 缺产品映射，待人工改挂', severity: 'warn', target: 'unassignedDevices', time: '2026-10-01 09:12' },
  { id: 'CT2', type: '未挂项目', title: 'AEP自注册-未知协议', imei: 'MF20261001088', detail: '例外池：品类未分类 + 未定义项目', severity: 'danger', target: 'unassignedDevices', time: '2026-10-02 11:05' },
  { id: 'CT3', type: '未挂项目', title: '临时水质终端-7721', imei: 'AEP-AUTO-7721', detail: '例外池：临时点位，待确认项目', severity: 'warn', target: 'unassignedDevices', time: '2026-10-03 14:30' },
  { id: 'CT4', type: '对账差异', title: 'AEP 多出 · 未知液位设备-9001', imei: 'AEP-ONLY-9001', detail: 'AEP 有、台账无，待接入或忽略', severity: 'warn', target: 'aepReconcile', time: '2026-10-09 08:00' },
  { id: 'CT5', type: '对账差异', title: '本地缺失 · 望江路井-待接入', imei: 'MF20260928050', detail: '本地已建档，AEP 尚未创建设备', severity: 'danger', target: 'aepReconcile', time: '2026-10-09 08:00' },
  { id: 'CT6', type: '对账差异', title: '本地缺失 · 解放路压力-12', imei: 'MF20251108088', detail: 'IMEI / 产品映射不一致', severity: 'warn', target: 'aepReconcile', time: '2026-10-09 08:00' },
];

const COCKPIT_ACTIVITIES = [
  { id: 'CA1', time: '2026-10-09 08:00', actor: '系统', action: '完成周期对账（同步自 AEP）', result: '发现 4 条待处理差异', tone: 'primary' },
  { id: 'CA2', time: '2026-10-05 08:40', actor: 'OpenAPI', action: 'AEP 自注册设备写入例外池', result: 'AEP自注册-泵站探头（D012）', tone: 'warn' },
  { id: 'CA3', time: '2026-10-03 14:30', actor: 'OpenAPI', action: '临时设备进入未定义项目', result: '临时水质终端-7721', tone: 'warn' },
  { id: 'CA4', time: '2026-10-02 15:10', actor: '李敏', action: '例外处理 · 人工改挂', result: '南湖入口站 → 南湖水质专项', tone: 'ok' },
  { id: 'CA5', time: '2026-10-01 09:12', actor: 'OpenAPI', action: '绑定建档 · projectId 为空写入例外池', result: 'AEP自注册-液位-01', tone: 'warn' },
  { id: 'CA6', time: '2026-09-30 08:05', actor: '赵强', action: '设备档案更新', result: '城东泵站1#机组 固件/坐标已同步', tone: 'ok' },
];

/** 平台累计数据量演示基数：叠加 mock 报文/采样后形成「平台数据总量」KPI */
const PLATFORM_DATA_SEED = 1284560;


/* ========== 在线监控 Mock（设备数据集中入口） ========== */
const TRUST_TAG = { T0: 'tag-red', T1: 'tag-orange', T2: 'tag-blue', T3: 'tag-green' };
const TRUST_LABEL = { T0: '不可信', T1: '低可信', T2: '中可信', T3: '高可信' };
// AEP status（后端 6587b2d2）：0=待确认 / 1=在线 / 2=离线 / 9=忽略；在线态 UI：1→在线、2→离线，0/空→未知
const ONLINE_TAG = { '在线': 'tag-green', '离线': 'tag-gray', '未知': 'tag-orange' };
/** AEP status（6587b2d2）：0=待确认 / 1=在线 / 2=离线 / 9=忽略 */
const AEP_STATUS_LABEL = { 0: '待确认', 1: '在线', 2: '离线', 9: '忽略' };
const AEP_STATUS_TAG = { 0: 'tag-orange', 1: 'tag-green', 2: 'tag-gray', 9: 'tag-gray' };
function aepStatusLabel(s) {
  if (s === null || s === undefined || s === '') return '未知';
  const n = Number(s);
  return AEP_STATUS_LABEL[n] != null ? AEP_STATUS_LABEL[n] : String(s);
}
function aepStatusTag(s) {
  const n = Number(s);
  return AEP_STATUS_TAG[n] || 'tag-gray';
}


/** 按品类取物模型上报属性（kind=property）；监控展示过滤见 getCategoryMonitorProperties */
function getCategoryProperties(categoryId, list) {
  if (!categoryId) return [];
  const src = list || PROPERTIES;
  return src.filter(p => p.categoryId === categoryId && (p.kind || 'property') === 'property');
}

/** 未定义 showInMonitor 时默认展示（兼容存量）；仅 false 时从监控收列 */
function isShowInMonitor(p) {
  return !p || p.showInMonitor !== false;
}

/** 监控列表测点列 / 详情最新值·曲线·上报明细同源：只保留 showInMonitor !== false */
function getCategoryMonitorProperties(categoryId, list) {
  return getCategoryProperties(categoryId, list).filter(isShowInMonitor);
}

/** 兼容旧引用：积水仪地埋主测点标识 */
const FLOOD_POINT_KEYS = getCategoryProperties('C001').map(p => p.identifier).filter(id => id !== 'dianya');

const MONITOR_ROWS = [
  { id: 'D001', imei: 'MF20260901001', name: '东湖路井-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', online: '在线', lastReportAt: '2026-09-30 16:42:18', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T3', trustScore: 96, warn: 1, alarm: 0, fault: 0, cycleSec: 60, missed24h: 0, expected24h: 1440, actual24h: 1438, latest_json: { yewei: 3.42, wendu: 28.6, yaqiang: 101.3 } },
  { id: 'D002', imei: 'MF20260901002', name: '东湖路井-01从机', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', online: '在线', lastReportAt: '2026-09-30 16:41:50', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T3', trustScore: 94, warn: 0, alarm: 0, fault: 0, cycleSec: 60, missed24h: 2, expected24h: 1440, actual24h: 1438, latest_json: { yewei: 3.38, wendu: 27.9, yaqiang: 100.8 } },
  { id: 'D003', imei: 'MF20260520011', name: '南湖入口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', online: '离线', lastReportAt: '2026-09-28 09:11:02', firmware: '2.0.1', model: 'MF-WQ-200', trustLevel: 'T1', trustScore: 42, warn: 0, alarm: 2, fault: 1, cycleSec: 300, missed24h: 48, expected24h: 288, actual24h: 240, latest_json: { ph: 8.9, do: 2.1, turb: 12.4 } },
  { id: 'D005', imei: 'MF20260915030', name: '城东泵站1#机组', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C004', categoryName: '泵站机组', online: '在线', lastReportAt: '2026-09-30 16:40:05', firmware: '1.0.3', model: 'MF-PU-300', trustLevel: 'T2', trustScore: 78, warn: 2, alarm: 1, fault: 0, cycleSec: 120, missed24h: 6, expected24h: 720, actual24h: 714, latest_json: { cur: 118, vib: 4.8 } },
  { id: 'D008', imei: 'MF20260601022', name: '南湖出口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', online: '在线', lastReportAt: '2026-09-30 16:35:40', firmware: '2.0.1', model: 'MF-WQ-200', trustLevel: 'T3', trustScore: 91, warn: 0, alarm: 0, fault: 0, cycleSec: 300, missed24h: 1, expected24h: 288, actual24h: 287, latest_json: { ph: 7.2, do: 6.4, turb: 4.1 } },
  { id: 'D006', imei: 'MF20260120001', name: '气象局雨量-03', projectId: 'PJ05', projectName: '雨量站扩容', categoryId: 'C005', categoryName: '雨量计', online: '离线', lastReportAt: '2026-07-01 10:00:00', firmware: '1.0.0', model: 'MF-RG-10', trustLevel: 'T0', trustScore: 12, warn: 0, alarm: 0, fault: 1, cycleSec: 1800, missed24h: 48, expected24h: 48, actual24h: 0, latest_json: { rain: null } },
  { id: 'D007', imei: 'MF20260928050', name: '望江路井-待接入', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', online: '未知', lastReportAt: '—', firmware: '1.2.0', model: 'MF-LW-100', trustLevel: 'T0', trustScore: 0, warn: 0, alarm: 0, fault: 0, cycleSec: 60, missed24h: 0, expected24h: 0, actual24h: 0, latest_json: { yewei: null, wendu: null, yaqiang: null } },
  { id: 'D004', imei: 'MF20251108088', name: '解放路压力-12', projectId: 'PJ03', projectName: '老城供水管网', categoryId: 'C003', categoryName: '管网压力表', online: '离线', lastReportAt: '2026-08-10 14:00:00', firmware: '0.9.0', model: 'MF-PP-50', trustLevel: 'T1', trustScore: 35, warn: 1, alarm: 0, fault: 0, cycleSec: 900, missed24h: 12, expected24h: 96, actual24h: 84, latest_json: { yaqiang: 280 } },
  { id: 'D010', imei: 'MF20261008018', name: '望江路井-侧壁-02', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C006', categoryName: '积水仪侧壁', online: '在线', lastReportAt: '2026-10-14 09:18:33', firmware: '1.0.0', model: 'MF-FS-60', trustLevel: 'T3', trustScore: 93, warn: 0, alarm: 0, fault: 0, cycleSec: 60, missed24h: 1, expected24h: 1440, actual24h: 1439, latest_json: { yewei: 1.86, wendu: 26.2, yaqiang: 99.4 } },
];

const MONITOR_POINTS = {
  D001: [
    { code: 'yewei', name: '液位', unit: 'm', value: 3.42, trustLevel: 'T3', trustScore: 98, ts: '2026-09-30 16:42:18', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
    { code: 'wendu', name: '温度', unit: '℃', value: 28.6, trustLevel: 'T3', trustScore: 97, ts: '2026-09-30 16:41:00', cycleSec: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: null, faultHigh: 80, ymin: -40, ymax: 85 },
    { code: 'yaqiang', name: '压强', unit: 'kPa', value: 101.3, trustLevel: 'T3', trustScore: 96, ts: '2026-09-30 16:42:18', cycleSec: 60, warnLow: 80, warnHigh: 120, alarmLow: 70, alarmHigh: 130, faultLow: null, faultHigh: 150, ymin: 0, ymax: 200 },
    { code: 'dianya', name: '电池电压', unit: 'V', value: null, trustLevel: 'T3', trustScore: 95, ts: '2026-09-30 16:40:00', cycleSec: 300, warnLow: 3.5, warnHigh: null, alarmLow: 3.3, alarmHigh: null, faultLow: 3.0, faultHigh: null, ymin: 2.5, ymax: 5 },
  ],
  D002: [
    { code: 'yewei', name: '液位', unit: 'm', value: 3.38, trustLevel: 'T3', trustScore: 94, ts: '2026-09-30 16:41:50', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
    { code: 'wendu', name: '温度', unit: '℃', value: 27.9, trustLevel: 'T3', trustScore: 93, ts: '2026-09-30 16:41:50', cycleSec: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: null, faultHigh: 80, ymin: -40, ymax: 85 },
    { code: 'yaqiang', name: '压强', unit: 'kPa', value: 100.8, trustLevel: 'T3', trustScore: 94, ts: '2026-09-30 16:41:50', cycleSec: 60, warnLow: 80, warnHigh: 120, alarmLow: 70, alarmHigh: 130, faultLow: null, faultHigh: 150, ymin: 0, ymax: 200 },
  ],
  D007: [
    { code: 'yewei', name: '液位', unit: 'm', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
    { code: 'wendu', name: '温度', unit: '℃', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: null, faultHigh: 80, ymin: -40, ymax: 85 },
    { code: 'yaqiang', name: '压强', unit: 'kPa', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 60, warnLow: 80, warnHigh: 120, alarmLow: 70, alarmHigh: 130, faultLow: null, faultHigh: 150, ymin: 0, ymax: 200 },
  ],
  D010: [
    { code: 'yewei', name: '液位', unit: 'm', value: 1.86, trustLevel: 'T3', trustScore: 95, ts: '2026-10-14 09:18:33', cycleSec: 60, warnLow: 0.5, warnHigh: 7.5, alarmLow: 0.2, alarmHigh: 8.5, faultLow: null, faultHigh: 9.5, ymin: 0, ymax: 10 },
    { code: 'wendu', name: '温度', unit: '℃', value: 26.2, trustLevel: 'T3', trustScore: 94, ts: '2026-10-14 09:18:33', cycleSec: 120, warnLow: -10, warnHigh: 60, alarmLow: -20, alarmHigh: 70, faultLow: null, faultHigh: 80, ymin: -40, ymax: 85 },
    { code: 'yaqiang', name: '压强', unit: 'kPa', value: 99.4, trustLevel: 'T3', trustScore: 92, ts: '2026-10-14 09:18:33', cycleSec: 60, warnLow: 80, warnHigh: 120, alarmLow: 70, alarmHigh: 130, faultLow: null, faultHigh: 150, ymin: 0, ymax: 200 },
  ],
  D003: [
    { code: 'ph', name: 'pH', unit: '', value: 8.9, trustLevel: 'T1', trustScore: 40, ts: '2026-09-28 09:11:02', cycleSec: 300, warnLow: 6.5, warnHigh: 8.5, alarmLow: 6.0, alarmHigh: 9.0, faultLow: 5.0, faultHigh: 10.0, ymin: 0, ymax: 14 },
    { code: 'do', name: '溶解氧', unit: 'mg/L', value: 2.1, trustLevel: 'T1', trustScore: 38, ts: '2026-09-28 09:11:02', cycleSec: 300, warnLow: 3.0, warnHigh: null, alarmLow: 2.0, alarmHigh: null, faultLow: 1.0, faultHigh: null, ymin: 0, ymax: 15 },
    { code: 'turb', name: '浊度', unit: 'NTU', value: 12.4, trustLevel: 'T1', trustScore: 36, ts: '2026-09-28 09:11:02', cycleSec: 300, warnLow: null, warnHigh: 20, alarmLow: null, alarmHigh: 50, faultLow: null, faultHigh: 100, ymin: 0, ymax: 100 },
  ],
  D005: [
    { code: 'cur', name: '运行电流', unit: 'A', value: 118, trustLevel: 'T2', trustScore: 76, ts: '2026-09-30 16:40:05', cycleSec: 120, warnLow: null, warnHigh: 130, alarmLow: null, alarmHigh: 145, faultLow: null, faultHigh: 160, ymin: 0, ymax: 200 },
    { code: 'vib', name: '振动', unit: 'mm/s', value: 4.8, trustLevel: 'T2', trustScore: 80, ts: '2026-09-30 16:40:05', cycleSec: 120, warnLow: null, warnHigh: 4.5, alarmLow: null, alarmHigh: 7.0, faultLow: null, faultHigh: 10.0, ymin: 0, ymax: 15 },
  ],
  D006: [
    { code: 'rain', name: '雨量', unit: 'mm', value: null, trustLevel: 'T0', trustScore: 0, ts: '—', cycleSec: 1800, warnLow: null, warnHigh: 50, alarmLow: null, alarmHigh: 80, faultLow: null, faultHigh: null, ymin: 0, ymax: 100 },
  ],
  D004: [
    { code: 'yaqiang', name: '压强', unit: 'kPa', value: 280, trustLevel: 'T1', trustScore: 35, ts: '2026-08-10 14:00:00', cycleSec: 900, warnLow: 150, warnHigh: 450, alarmLow: 100, alarmHigh: 550, faultLow: null, faultHigh: 700, ymin: 0, ymax: 1000 },
  ],
  D008: [
    { code: 'ph', name: 'pH', unit: '', value: 7.2, trustLevel: 'T3', trustScore: 93, ts: '2026-09-30 16:35:40', cycleSec: 300, warnLow: 6.5, warnHigh: 8.5, alarmLow: 6.0, alarmHigh: 9.0, faultLow: 5.0, faultHigh: 10.0, ymin: 0, ymax: 14 },
    { code: 'do', name: '溶解氧', unit: 'mg/L', value: 6.4, trustLevel: 'T3', trustScore: 90, ts: '2026-09-30 16:35:40', cycleSec: 300, warnLow: 3.0, warnHigh: null, alarmLow: 2.0, alarmHigh: null, faultLow: 1.0, faultHigh: null, ymin: 0, ymax: 15 },
    { code: 'turb', name: '浊度', unit: 'NTU', value: 4.1, trustLevel: 'T3', trustScore: 91, ts: '2026-09-30 16:35:40', cycleSec: 300, warnLow: null, warnHigh: 20, alarmLow: null, alarmHigh: 50, faultLow: null, faultHigh: 100, ymin: 0, ymax: 100 },
  ],
};


/** 设备本机数据 · iot_protocol_data 报文列表（按 deviceId 查询；曲线归在线监控） */
const PACKET_FILTERS = [
  { key: '', label: '全部' },
  { key: 'message*', label: 'message*' },
  { key: 'data*', label: 'data*' },
  { key: 'upgrade65535', label: 'upgrade65535' },
  { key: 'command', label: 'command' },
];
const PACKET_TYPE_TAG = {
  messagePackage1: 'tag-blue',
  messagePackage2: 'tag-blue',
  dataPackage1: 'tag-green',
  dataPackage2: 'tag-green',
  dataPackage3: 'tag-green',
  upgradePackage65535: 'tag-orange',
  command: 'tag-gray',
};
const PACKET_STATUS_TAG = { '成功': 'tag-green', '失败': 'tag-red', '待处理': 'tag-orange' };

function matchPackageTypeFilter(packageType, filterKey) {
  const t = packageType || '';
  if (!filterKey) return true;
  if (filterKey === 'message*') return t.startsWith('message');
  if (filterKey === 'data*') return t.startsWith('data');
  if (filterKey === 'upgrade65535') return t === 'upgradePackage65535' || t === 'upgrade65535' || (t.startsWith('upgrade') && t.includes('65535'));
  if (filterKey === 'command') return t === 'command' || t.startsWith('command');
  return t === filterKey;
}

/** mock rows · 字段对齐 iot_protocol_data：id(=数据ID) / receiveTime / packageType / parsedJson / contentHex / status；query by deviceId */
const PROTOCOL_PACKETS = [
  { id: 'PK015', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-09-30 16:42:20', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901001": [ { "yewei": 3.42, "wendu": 28.6, "yaqiang": 101.3 }, { "yewei": 11.2, "wendu": null, "yaqiang": 101.3 } ] } }', contentHex: '3C3C000101020D5C011E2785000B20NULL650D0D', status: '成功', note: '一条报文拍平为 S101、S102' },
  { id: 'PK016', deviceId: 'D002', serialNum: 'MF20260901002', receiveTime: '2026-09-30 16:20:00', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901002": [ { "yewei": 3.38, "wendu": 27.9, "yaqiang": 100.8 } ] } }', contentHex: '3C3C000101020D340117276000000D0D', status: '成功', note: '报文保持入包数据集；sample S103 同窗口覆盖后测值另记' },
  { id: 'PK017', deviceId: 'D004', serialNum: 'MF20251108088', receiveTime: '2026-08-10 14:00:00', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20251108088": [ { "yaqiang": 280 } ] } }', contentHex: '3C3C000101180D0D', status: '成功' },
  { id: 'PK018', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-09-30 08:00:30', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901001": [ { "yewei": 3.20, "wendu": 25.1, "yaqiang": 101.0 } ] } }', contentHex: '3C3C000101020C8000FB6500000D0D', status: '成功', note: '补报，落入 08:00 时点窗口，缺报 G2 改为已补回' },
  { id: 'PK001', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-14 09:18:33', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901001": [ { "yewei": 3.42, "wendu": 28.6, "yaqiang": 101.3 } ] } }', contentHex: '3C3C000101020D5C011E278500000D0D', status: '成功' },
  { id: 'PK002', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-14 09:17:01', packageType: 'messagePackage1', parsedJson: '{ "imei": "860123456789012", "fw": "1.2.0", "probes": 1 }', contentHex: 'B2B2003C860123456789012F010200011A1A', status: '成功' },
  { id: 'PK003', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-13 22:05:12', packageType: 'upgradePackage65535', parsedJson: '{ "chunk": 3, "total": 12, "left": 9, "parse": "0xFFFF" }', contentHex: 'F0F000800003000C0009414243440D0D', status: '成功' },
  { id: 'PK004', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-13 18:40:00', packageType: 'command', parsedJson: '{ "kind": "cmdAck", "ok": true, "bitIndex": 1 }', contentHex: 'FAFA0008AA550001ADAD', status: '成功' },
  { id: 'PK005', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-13 16:42:18', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901001": [ { "yewei": 3.38, "wendu": 27.9, "yaqiang": 100.8 } ] } }', contentHex: '3C3C000101020D340117276000000D0D', status: '成功' },
  { id: 'PK006', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-12 11:20:05', packageType: 'messagePackage2', parsedJson: '{ "well_depth": 8.5, "pipe_diameter": 600 }', contentHex: 'B2B2002801085002025800001A1A', status: '成功' },
  { id: 'PK007', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-10-12 10:01:44', packageType: 'command', parsedJson: '{ "kind": "cmdAck", "ok": false, "dealResult": "checksum fail" }', contentHex: 'FAFA0008DEAD0002ADAD', status: '失败' },
  { id: 'PK008', deviceId: 'D002', serialNum: 'MF20260901002', receiveTime: '2026-10-14 09:17:50', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260901002": [ { "yewei": 3.38, "wendu": 27.9, "yaqiang": 100.8 } ] } }', contentHex: '3C3C000101020D340117276000000D0D', status: '成功' },
  { id: 'PK009', deviceId: 'D002', serialNum: 'MF20260901002', receiveTime: '2026-10-14 08:00:11', packageType: 'messagePackage1', parsedJson: '{ "masterImei": "MF20260901001", "role": "slave" }', contentHex: 'B2B2002A01534C41564500001A1A', status: '成功' },
  { id: 'PK010', deviceId: 'D010', serialNum: 'MF20261008018', receiveTime: '2026-10-14 09:18:33', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20261008018": [ { "yewei": 1.86, "wendu": 26.2, "yaqiang": 99.4 } ] } }', contentHex: '3C3C000101020744010626EC00000D0D', status: '成功' },
  { id: 'PK011', deviceId: 'D010', serialNum: 'MF20261008018', receiveTime: '2026-10-14 09:10:00', packageType: 'upgradePackage65535', parsedJson: '{ "chunk": 1, "total": 4, "left": 3 }', contentHex: 'F0F00040000100040003313233340D0D', status: '待处理' },
  { id: 'PK012', deviceId: 'D003', serialNum: 'MF20260520011', receiveTime: '2026-09-28 09:11:02', packageType: 'dataPackage2', parsedJson: '{ "data": { "MF20260520011": [ { "ph": 8.9, "do": 2.1, "turb": 12.4 } ] } }', contentHex: '3C3C0002085A020A00C40D0D', status: '成功' },
  { id: 'PK013', deviceId: 'D005', serialNum: 'MF20260915030', receiveTime: '2026-09-30 16:40:05', packageType: 'dataPackage1', parsedJson: '{ "data": { "MF20260915030": [ { "cur": 118, "vib": 4.8 } ] } }', contentHex: '3C3C0001007600300D0D', status: '成功' },
  { id: 'PK014', deviceId: 'D001', serialNum: 'MF20260901001', receiveTime: '2026-09-01 08:00:00', packageType: 'dataPackage3', parsedJson: '{ "data": [ { "yewei": 2.10, "wendu": 25.0 } ] }', contentHex: '3C3C0003LEGACYARRAY0D0D', status: '成功', note: '历史 data3：data 仍可能是纯数组；新入库为 序列号→采样列表 KV' },
];

/** mock rows · GET /iot/deviceCommand/log（设备发送记录）字段对齐 FE：deviceId / identifiers / paramsJson / contentHex / aepRequestJson / aepResponseJson / commandId / commandStatus / aepCode / aepMsg / sendTime */
const DEVICE_SEND_LOGS = [
  {
    id: 'SL001', deviceId: 'D001',
    identifiers: ['reboot'],
    paramsJson: '{}',
    contentHex: 'FAFA0008AA550001ADAD',
    aepRequestJson: '{ "deviceId": "AEP-DEV-10001", "operator": "admin", "command": "reboot", "dataType": 2, "payload": "FAFA0008AA550001ADAD" }',
    aepResponseJson: '{ "code": 0, "msg": "ok", "commandId": "AEP-CMD-90001" }',
    commandId: 'AEP-CMD-90001', commandStatus: 'DELIVERED', aepCode: 0, aepMsg: 'ok',
    success: 1, dryRun: 0,
    sendTime: '2026-10-14 09:20:11'
  },
  { id: 'D016', imei: 'MF20260901004', deviceSn: 'MF20260901004', aepStatus: 1, lastReportAt: '2026-10-30 10:00', name: '东湖路井-01探头·未分类', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: '', categoryName: '未分类', categoryMatch: 'none', categoryRuleId: '', lifecycle: '在线', aepDeviceId: 'probe:MF20260901004', model: 'UNKNOWN', firmware: '', lng: 120.153630, lat: 30.287500, address: '东湖路检查井（未归类探头）', installDate: '2026-10-30', installer: '张伟', masterId: 'D001', masterImei: 'MF20260901001', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-30 10:00' },
  {
    id: 'SL002', deviceId: 'D001',
    identifiers: 'sampleInterval',
    paramsJson: '{ "longMin": 60, "midMin": 10, "shortMin": 1 }',
    contentHex: 'FAFA001CAA55008000003C0A01ADAD',
    aepRequestJson: '{ "deviceId": "AEP-DEV-10001", "operator": "admin", "command": "sampleInterval", "params": { "longMin": 60, "midMin": 10, "shortMin": 1 } }',
    aepResponseJson: '{ "code": 0, "msg": "accepted", "commandId": "AEP-CMD-90002" }',
    commandId: 'AEP-CMD-90002', commandStatus: 'SENT', aepCode: 0, aepMsg: 'accepted',
    success: 1, dryRun: 1,
    sendTime: '2026-10-13 18:41:05'
  },
  {
    id: 'SL003', deviceId: 'D001',
    identifiers: ['resendRange'],
    paramsJson: '{ "start": 100, "end": 120 }',
    contentHex: 'FAFA0014AA550040000064000078ADAD',
    aepRequestJson: '{ "deviceId": "AEP-DEV-10001", "operator": "zhangsan", "command": "resendRange", "params": { "start": 100, "end": 120 } }',
    aepResponseJson: '{ "code": 50013, "msg": "device offline", "commandId": "AEP-CMD-90003" }',
    commandId: 'AEP-CMD-90003', commandStatus: 'FAILED', aepCode: 50013, aepMsg: 'device offline',
    success: 0, dryRun: 0,
    sendTime: '2026-10-12 10:02:30'
  },
  {
    id: 'SL004', deviceId: 'D001',
    identifiers: ['cancelAllCommands'],
    paramsJson: '{}',
    contentHex: '',
    aepRequestJson: '{ "deviceId": "AEP-DEV-10001", "operator": "admin", "command": "cancelAllCommands" }',
    aepResponseJson: '{ "code": 0, "msg": "cancelled", "commandId": "AEP-CMD-90004" }',
    commandId: 'AEP-CMD-90004', commandStatus: 'CANCELLED', aepCode: 0, aepMsg: 'cancelled',
    success: 1, dryRun: 0,
    sendTime: '2026-10-11 16:08:22'
  },
  {
    id: 'SL005', deviceId: 'D003',
    identifiers: ['reboot', 'syncTime'],
    paramsJson: '{ "syncTime": { "value": 1728700000 } }',
    contentHex: 'FAFA0010BB660003ADAD',
    aepRequestJson: '{ "deviceId": "AEP-DEV-WQ-11", "operator": "admin", "commands": ["reboot","syncTime"] }',
    aepResponseJson: '{ "code": 0, "msg": "ok", "commandId": "AEP-CMD-91001" }',
    commandId: 'AEP-CMD-91001', commandStatus: 'DELIVERED', aepCode: 0, aepMsg: 'ok',
    success: 1, dryRun: 0,
    sendTime: '2026-09-28 09:15:44'
  },
];

function isFiniteMetricValue(v) {
  if (v === null || v === undefined || v === '') return false;
  return Number.isFinite(Number(v));
}

function genCurveSeries(point, days) {
  if (!point || !isFiniteMetricValue(point.value)) return [];
  const n = days === 30 ? 90 : 48;
  const ymin = point.ymin != null ? point.ymin : 0;
  const ymax = point.ymax != null ? point.ymax : 10;
  const mid = Number(point.value);
  const amp = (ymax - ymin) * 0.18;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(t * Math.PI * 4 + mid) * amp + Math.cos(t * Math.PI * 1.7) * amp * 0.35;
    let v = mid + wave;
    if (i > n * 0.72 && point.warnHigh != null) v = Math.min(ymax, point.warnHigh + (ymax - point.warnHigh) * 0.15 * Math.sin(i));
    v = Math.max(ymin, Math.min(ymax, v));
    pts.push({ i, t, v: Math.round(v * 100) / 100, sampleTime: t });
  }
  return pts;
}

/** 监控详情「上报明细」mock：按测点拼逐条上报（history 风格），非报文 hex */
function pad2(n) { return String(n).padStart(2, '0'); }
function formatSampleTime(baseMs, offsetSec) {
  const d = new Date(baseMs - offsetSec * 1000);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
/** datetime-local 值 → ms；begin 取该分钟 :00，end 取该分钟 :59（含边界） */
function parseReportBoundMs(local, asEnd) {
  if (!local) return NaN;
  const raw = String(local).trim().replace('T', ' ');
  const withSec = /\d{2}:\d{2}:\d{2}$/.test(raw) ? raw : (raw + (asEnd ? ':59' : ':00'));
  return Date.parse(withSec.replace(/-/g, '/'));
}
function toDatetimeLocalValue(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
/**
 * 生成上报明细：默认覆盖近 ~36h（便于默认近 24h 过滤示意），按 sample_time DESC（最新在上）。
 * 一期不接成功/漏报/延迟状态列；曲线 /history 仍升序，勿改。
 */
function genReportSamples(points, opts) {
  const list = (points || []).filter(Boolean);
  const count = (opts && opts.count) || 48;
  const spanSec = (opts && opts.spanSec) || 36 * 3600;
  const baseTs = (opts && opts.baseTs) || '2026-10-14 09:18:33';
  const baseMs = Date.parse(String(baseTs).replace(/-/g, '/')) || Date.parse('2026/10/14 09:18:33');
  const chartable = list.filter(p => isFiniteMetricValue(p.value));
  if (!chartable.length) return [];
  const seriesMap = {};
  chartable.forEach(p => {
    const s = genCurveSeries(p, 7);
    seriesMap[p.code] = s.length ? s : [{ v: Number(p.value), t: 1 }];
  });
  const stepSec = spanSec / Math.max(1, count - 1);
  const rows = [];
  for (let i = 0; i < count; i++) {
    const offsetSec = Math.round(i * stepSec);
    const values = {};
    chartable.forEach(p => {
      const s = seriesMap[p.code];
      const idx = Math.max(0, s.length - 1 - (i % s.length));
      values[p.code] = s[idx] ? s[idx].v : p.value;
    });
    rows.push({
      id: 'RS' + pad2(i + 1),
      time: formatSampleTime(baseMs, offsetSec),
      values,
    });
  }
  // 生成后按 sample_time DESC（不要依赖前端二次 reverse）
  rows.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  return rows;
}


const CURVE_SERIES_COLORS = ['#0D6EFD', '#12B886', '#E78212', '#DC3545', '#7950F2', '#15AABF', '#F06595'];

function buildSingleCurveSvg(point, series, color) {
  const w = 1000, h = 320, padL = 48, padR = 16, padT = 20, padB = 36;
  if (!point || !series || !series.length) {
    return { path: '', paths: [], w, h, padL, padR, padT, padB, lines: [], yTicks: [], ymin: 0, ymax: 1, color: color || CURVE_SERIES_COLORS[0] };
  }
  const ymin = point.ymin != null ? point.ymin : 0;
  const ymax = point.ymax != null ? point.ymax : 10;
  const x = (t) => padL + t * (w - padL - padR);
  const y = (v) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - padT - padB);
  const stroke = color || CURVE_SERIES_COLORS[0];
  const path = series.map((pt, idx) => (idx ? 'L' : 'M') + x(pt.t).toFixed(1) + ',' + y(pt.v).toFixed(1)).join(' ');
  const mkLine = (val, c, label) => {
    if (val == null || val === '' || Number.isNaN(Number(val))) return null;
    const vv = Number(val);
    if (vv < ymin || vv > ymax) return null;
    return { y: y(vv), color: c, label, val: vv };
  };
  const lines = [
    mkLine(point.warnHigh, '#E78212', '预警上限'),
    mkLine(point.warnLow, '#E78212', '预警下限'),
    mkLine(point.alarmHigh, '#DC3545', '报警上限'),
    mkLine(point.alarmLow, '#DC3545', '报警下限'),
    mkLine(point.faultHigh, '#0D6EFD', '故障上限'),
    mkLine(point.faultLow, '#0D6EFD', '故障下限'),
  ].filter(Boolean);
  const yTicks = [ymin, ymin + (ymax - ymin) / 2, ymax].map(v => ({ v: Math.round(v * 100) / 100, y: y(v) }));
  return { path, paths: [{ path, color: stroke, code: point.code, name: point.name }], w, h, padL, padR, padT, padB, lines, yTicks, ymin, ymax, color: stroke };
}

function buildMergeCurveSvg(entries) {
  const w = 1000, h = 320, padL = 48, padR = 16, padT = 20, padB = 36;
  if (!entries || !entries.length) {
    return { path: '', paths: [], w, h, padL, padR, padT, padB, lines: [], yTicks: [{ v: 0, y: h / 2 }, { v: 0.5, y: h / 2 }, { v: 1, y: h / 2 }], ymin: 0, ymax: 1, color: CURVE_SERIES_COLORS[0] };
  }
  const x = (t) => padL + t * (w - padL - padR);
  const paths = entries.map((e, idx) => {
    const p = e.point;
    const series = e.series;
    const ymin = p.ymin != null ? p.ymin : 0;
    const ymax = p.ymax != null ? p.ymax : 10;
    const y = (v) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (h - padT - padB);
    const color = CURVE_SERIES_COLORS[idx % CURVE_SERIES_COLORS.length];
    const path = series.map((pt, i) => (i ? 'L' : 'M') + x(pt.t).toFixed(1) + ',' + y(pt.v).toFixed(1)).join(' ');
    return { path, color, code: p.code, name: p.name, unit: p.unit || '', ymin, ymax };
  });
  // 归一化示意刻度 0/0.5/1（各序列自缩放）
  const yTicks = [
    { v: 'max', y: padT },
    { v: 'mid', y: padT + (h - padT - padB) / 2 },
    { v: 'min', y: h - padB },
  ];
  return { path: paths[0] ? paths[0].path : '', paths, w, h, padL, padR, padT, padB, lines: [], yTicks, ymin: 0, ymax: 1, color: paths[0] ? paths[0].color : CURVE_SERIES_COLORS[0] };
}

/* ========== 数据可信 · 品类标准（独立于物模型三个页签） ==========
 * 标识符复用 PROPERTIES / POINTS，不另起字段名。
 * 三层：报文 PROTOCOL_PACKETS、拍平 sample、判断记录。互不覆盖。
 * 判断在 sample 入库（含覆盖更新）之后，不拦截入库。
 */
const DT_MARKS = [
  { code: 'RANGE_HIGH', name: '超上限', assertionType: 'range' },
  { code: 'RANGE_LOW', name: '超下限', assertionType: 'range' },
  { code: 'TYPE_MISMATCH', name: '类型不符', assertionType: 'type' },
  { code: 'UNIT_MISMATCH', name: '单位不符', assertionType: 'unit' },
  { code: 'ENUM_INVALID', name: '枚举非法', assertionType: 'enum' },
  { code: 'NULL_VALUE', name: '空值', assertionType: 'null' },
  { code: 'REQUIRED_MISS', name: '缺必报', assertionType: 'required' },
  { code: 'TREND_JUMP', name: '趋势跳变', assertionType: 'trend' },
  { code: 'CROSS_FIELD', name: '跨字段不一致', assertionType: 'cross' },
  { code: 'PEER_DEVIATION', name: '同品类偏离', assertionType: 'peer' },
  { code: 'NEIGHBOR_MISS', name: '对照对象缺失', assertionType: 'neighbor' },
  { code: 'NEIGHBOR_DIFF', name: '相邻偏差', assertionType: 'neighbor' },
];
const DT_STATUS_LABEL = { draft: '草稿', published: '已发布', superseded: '被新版本替代' };
const DT_STATUS_TAG = { draft: 'tag-orange', published: 'tag-green', superseded: 'tag-gray' };
const DT_ASSERT_LABEL = { required: '必报', type: '类型与单位', range: '量程', enum: '枚举', null: '空值' };
const DT_REL_LABEL = { cross: '跨字段', trend: '同时段趋势', peer: '同项目同品类', neighbor: '相邻设备' };
const DT_ITEM_STATUS_LABEL = { pass: '已执行通过', fail: '已执行失败', skip: '未执行' };
const DT_ITEM_STATUS_TAG = { pass: 'tag-green', fail: 'tag-red', skip: 'tag-gray' };

function dtDeep(obj) { return JSON.parse(JSON.stringify(obj)); }
function dtPropOf(categoryId, identifier) {
  return PROPERTIES.find(p => p.categoryId === categoryId && p.identifier === identifier) || null;
}
function dtPointOf(identifier) {
  return POINTS.find(p => p.code === identifier) || null;
}
function dtParseCycleSec(reportCycle, fallback) {
  const n = parseInt(reportCycle, 10);
  return Number.isFinite(n) && n > 0 ? n : (fallback || 60);
}

function dtPushAssert(bag, standardId, identifier, type, enabled, params) {
  bag.assertions.push({
    id: standardId + '-as-' + identifier + '-' + type,
    standardId, identifier, type, enabled: !!enabled, params: params || {},
  });
}
function dtMetricAsserts(bag, standardId, identifier, prop, point, opts) {
  const required = !!(opts && opts.required);
  const participate = !(opts && opts.participate === false);
  dtPushAssert(bag, standardId, identifier, 'required', participate && required, {});
  dtPushAssert(bag, standardId, identifier, 'type', participate, {
    dataType: prop ? prop.dataType : (point ? point.dataType : 'float'),
    unit: prop ? (prop.unit || '') : (point ? point.unit : ''),
    cite: 'property',
  });
  if (point) {
    dtPushAssert(bag, standardId, identifier, 'range', participate, {
      min: point.min, max: point.max, cite: 'point', pointCode: point.code,
    });
  } else {
    dtPushAssert(bag, standardId, identifier, 'range', participate, {
      min: opts && opts.min != null ? opts.min : null,
      max: opts && opts.max != null ? opts.max : null,
      cite: 'standard', pointCode: '',
    });
  }
  dtPushAssert(bag, standardId, identifier, 'enum', participate && prop && prop.dataType === 'enum', {
    values: (opts && opts.enumValues) || '',
  });
  dtPushAssert(bag, standardId, identifier, 'null', participate && required, { allowNull: !required });
}

function dtFloodBundle(standardId) {
  const bag = { mappings: [], assertions: [], relations: [], timeliness: [], offline: [], markRefs: [] };
  ['yewei', 'wendu', 'yaqiang', 'dianya'].forEach(identifier => {
    const prop = dtPropOf('C001', identifier);
    bag.mappings.push({
      id: standardId + '-map-' + identifier,
      standardId, identifier,
      sourceKey: 'data[].' + identifier,
      enabled: identifier !== 'dianya',
    });
    dtMetricAsserts(bag, standardId, identifier, prop, dtPointOf(identifier), {
      required: !!(prop && prop.required),
      participate: identifier !== 'dianya',
    });
  });
  bag.relations.push(
    { id: standardId + '-rel-cross', standardId, type: 'cross', targets: [], fields: ['yewei', 'yaqiang'], threshold: 'yewei>8 且 yaqiang<90', windowSec: 0, enabled: true },
    { id: standardId + '-rel-trend', standardId, type: 'trend', targets: [], fields: ['yewei'], threshold: '变化>2', windowSec: 600, enabled: true },
    { id: standardId + '-rel-peer', standardId, type: 'peer', targets: ['同项目同品类'], fields: ['yaqiang'], threshold: '偏离中位数>30', windowSec: 600, enabled: true },
    { id: standardId + '-rel-neighbor', standardId, type: 'neighbor', targets: ['D001', 'D002'], fields: ['yewei'], threshold: '差值>0.5', windowSec: 120, enabled: true }
  );
  const yeweiPoint = dtPointOf('yewei');
  const intervalSec = yeweiPoint ? yeweiPoint.cycle : 60;
  bag.timeliness.push({
    id: standardId + '-time', standardId, mode: 'fixed',
    intervalSec, windowSec: Math.round(intervalSec / 2), windowManual: false,
    completenessEnabled: true, intervalCite: 'point.yewei.cycle',
  });
  bag.offline.push({ id: standardId + '-off', standardId, thresholdCount: 3, thresholdDurationSec: null });
  DT_MARKS.forEach(m => bag.markRefs.push({ id: standardId + '-mk-' + m.code, standardId, code: m.code, enabled: true }));
  return bag;
}
function dtBundleSimple(standardId, categoryId, specs, extra) {
  const bag = { mappings: [], assertions: [], relations: [], timeliness: [], offline: [], markRefs: [] };
  specs.forEach(spec => {
    const prop = dtPropOf(categoryId, spec.identifier);
    const point = dtPointOf(spec.identifier);
    bag.mappings.push({
      id: standardId + '-map-' + spec.identifier,
      standardId, identifier: spec.identifier,
      sourceKey: 'data[].' + spec.identifier,
      enabled: spec.enabled !== false,
    });
    dtMetricAsserts(bag, standardId, spec.identifier, prop, spec.citePoint === false ? null : point, {
      required: spec.required != null ? spec.required : !!(prop && prop.required),
      participate: spec.enabled !== false,
      min: spec.min, max: spec.max, enumValues: spec.enumValues || '',
    });
  });
  (extra && extra.relations || []).forEach(rel => {
    bag.relations.push(Object.assign({ id: standardId + '-rel-' + rel.type, standardId, targets: [], enabled: true }, rel));
  });
  const first = specs[0];
  const prop0 = first ? dtPropOf(categoryId, first.identifier) : null;
  const point0 = first && first.citePoint !== false ? dtPointOf(first.identifier) : null;
  const intervalSec = point0 ? point0.cycle : dtParseCycleSec(prop0 && prop0.reportCycle, 300);
  bag.timeliness.push({
    id: standardId + '-time', standardId, mode: 'fixed',
    intervalSec, windowSec: Math.round(intervalSec / 2), windowManual: false,
    completenessEnabled: true,
    intervalCite: point0 ? ('point.' + point0.code + '.cycle') : 'standard',
  });
  bag.offline.push({
    id: standardId + '-off', standardId,
    thresholdCount: extra && extra.thresholdCount != null ? extra.thresholdCount : 3,
    thresholdDurationSec: extra && extra.thresholdDurationSec != null ? extra.thresholdDurationSec : null,
  });
  DT_MARKS.forEach(m => bag.markRefs.push({ id: standardId + '-mk-' + m.code, standardId, code: m.code, enabled: true }));
  return bag;
}
function dtMergeBags(parts) {
  const all = { mappings: [], assertions: [], relations: [], timeliness: [], offline: [], markRefs: [] };
  parts.forEach(bag => {
    Object.keys(all).forEach(k => { all[k] = all[k].concat(bag[k] || []); });
  });
  return all;
}

const DT_STANDARDS_SEED = [
  { id: 'STD-C001-1', categoryId: 'C001', version: 1, status: 'superseded', effectiveAt: '2026-08-01 00:00:00', supersededAt: '2026-10-01 00:00:00', createdAt: '2026-07-20 11:00:00', copiedFrom: null },
  { id: 'STD-C001-2', categoryId: 'C001', version: 2, status: 'published', effectiveAt: '2026-10-01 00:00:00', supersededAt: null, createdAt: '2026-09-28 16:40:00', copiedFrom: 1 },
  { id: 'STD-C001-3', categoryId: 'C001', version: 3, status: 'draft', effectiveAt: null, supersededAt: null, createdAt: '2026-11-10 09:12:00', copiedFrom: 2 },
  { id: 'STD-C002-1', categoryId: 'C002', version: 1, status: 'published', effectiveAt: '2026-09-01 00:00:00', supersededAt: null, createdAt: '2026-08-20 10:00:00', copiedFrom: null },
  { id: 'STD-C003-1', categoryId: 'C003', version: 1, status: 'published', effectiveAt: '2026-08-10 00:00:00', supersededAt: null, createdAt: '2026-08-01 09:00:00', copiedFrom: null },
];
const DT_CHILDREN = dtMergeBags([
  dtFloodBundle('STD-C001-1'),
  dtFloodBundle('STD-C001-2'),
  dtFloodBundle('STD-C001-3'),
  dtBundleSimple('STD-C002-1', 'C002', [
    { identifier: 'ph', required: true, citePoint: false, min: 0, max: 14 },
    { identifier: 'do', required: true, citePoint: false, min: 0, max: 20 },
    { identifier: 'turb', required: false, citePoint: false, min: 0, max: 1000 },
  ], { thresholdCount: 6 }),
  dtBundleSimple('STD-C003-1', 'C003', [
    { identifier: 'yaqiang', required: true, citePoint: true },
  ], { thresholdCount: 3 }),
]);
DT_CHILDREN.relations.forEach(rel => {
  if (rel.standardId === 'STD-C001-1' && rel.type === 'peer') rel.enabled = false;
});
/* 管网压力表的测点字典周期是积水仪 yaqiang 的 60s，对不上本品类 reportCycle 900s，间隔在标准里改用上报属性周期。量程仍引用测点字典 min/max。 */
DT_CHILDREN.timeliness.forEach(t => {
  if (t.standardId === 'STD-C003-1') {
    t.intervalSec = 900;
    t.windowSec = 450;
    t.intervalCite = 'property.yaqiang.reportCycle';
  }
});

const DT_OVERRIDES_SEED = [
  { id: 'OV-PJ01', scopeType: 'project', scopeId: 'PJ01', categoryId: 'C001', intervalSec: 90, windowSec: 45, windowManual: false, enabled: true },
  { id: 'OV-D001', scopeType: 'device', scopeId: 'D001', categoryId: 'C001', intervalSec: 120, windowSec: 60, windowManual: false, enabled: true },
];

/* 测值 JSON 与 qualityJson 分开。qualityJson 只收录有异常标记的指标。 */
const DT_SAMPLES_SEED = [
  { id: 'S101', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK015', externalId: null, sampleTime: '2026-09-30 16:42:18', values: { yewei: 3.42, wendu: 28.6, yaqiang: 101.3 }, judgeId: 'J101', qualityJson: {} },
  { id: 'S102', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK015', externalId: null, sampleTime: '2026-09-30 16:41:00', values: { yewei: 11.2, wendu: null, yaqiang: 101.3 }, judgeId: 'J102', qualityJson: { yewei: ['RANGE_HIGH'], wendu: ['NULL_VALUE'] } },
  { id: 'S103', deviceId: 'D002', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK016', externalId: null, sampleTime: '2026-09-30 16:20:00', values: { yewei: 11.5, wendu: 27.9, yaqiang: 100.8 }, judgeId: 'J103b', qualityJson: { yewei: ['RANGE_HIGH'] } },
  { id: 'S104', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK005', externalId: null, sampleTime: '2026-09-30 15:00:00', values: { yewei: 3.10, wendu: 26.0, yaqiang: 100.2 }, judgeId: 'J104', qualityJson: {} },
  { id: 'S105', deviceId: 'D009', categoryId: 'C001', projectId: null, messageId: null, externalId: 'EXT-LEVEL-20260930-01', sampleTime: '2026-09-30 14:10:00', values: { yewei: 2.20, wendu: 22.0, yaqiang: 99.0 }, judgeId: 'J105', qualityJson: {} },
  { id: 'S106', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK018', externalId: null, sampleTime: '2026-09-30 08:00:30', values: { yewei: 3.20, wendu: 25.1, yaqiang: 101.0 }, judgeId: 'J106', qualityJson: {} },
  { id: 'S107', deviceId: 'D002', categoryId: 'C001', projectId: 'PJ01', messageId: 'PK008', externalId: null, sampleTime: '2026-09-30 16:41:50', values: { yewei: 3.38, wendu: 27.9, yaqiang: 100.8 }, judgeId: 'J107', qualityJson: {} },
  { id: 'S201', deviceId: 'D004', categoryId: 'C003', projectId: 'PJ03', messageId: 'PK017', externalId: null, sampleTime: '2026-08-10 14:00:00', values: { yaqiang: 280 }, judgeId: 'J201', qualityJson: { yaqiang: ['RANGE_HIGH'] } },
];

const DT_FLOOD_RELS = [
  { type: 'cross', fields: ['yewei', 'yaqiang'], targets: [] },
  { type: 'trend', fields: ['yewei'], targets: [] },
  { type: 'peer', fields: ['yaqiang'], targets: ['同项目同品类'] },
  { type: 'neighbor', fields: ['yewei'], targets: ['D001', 'D002'] },
];
function dtItemsAllPass(judgementId, identifiers, relations) {
  const items = [];
  identifiers.forEach(identifier => {
    ['required', 'type', 'range', 'null'].forEach(type => {
      items.push({
        id: judgementId + '-' + identifier + '-' + type,
        judgementId, identifier, kind: 'assert', assertType: type,
        pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [],
      });
    });
  });
  (relations || []).forEach(rel => {
    items.push({
      id: judgementId + '-rel-' + rel.type,
      judgementId, identifier: rel.fields[0], kind: 'relation', assertType: rel.type, relationType: rel.type,
      pass: true, marks: [], reason: '', status: 'pass', relatedRefs: (rel.targets && rel.targets.length) ? rel.targets.slice() : rel.fields.slice(),
    });
  });
  return items;
}
function dtHead(partial) {
  return Object.assign({
    externalId: null, scopeType: 'category', scopeId: '', intervalSec: 60, windowSec: 30,
    standardVersion: 2, overallPass: true,
  }, partial);
}
const DT_JUDGEMENTS_SEED = [
  dtHead({ id: 'J101', messageId: 'PK015', sampleId: 'S101', deviceId: 'D001', projectId: 'PJ01', categoryId: 'C001', scopeType: 'device', scopeId: 'D001', intervalSec: 120, windowSec: 60, judgedAt: '2026-09-30 16:42:20', overallPass: true, values: { yewei: 3.42, wendu: 28.6, yaqiang: 101.3 } }),
  dtHead({ id: 'J102', messageId: 'PK015', sampleId: 'S102', deviceId: 'D001', projectId: 'PJ01', categoryId: 'C001', scopeType: 'device', scopeId: 'D001', intervalSec: 120, windowSec: 60, judgedAt: '2026-09-30 16:41:02', overallPass: false, values: { yewei: 11.2, wendu: null, yaqiang: 101.3 } }),
  dtHead({ id: 'J103a', messageId: 'PK016', sampleId: 'S103', deviceId: 'D002', projectId: 'PJ01', categoryId: 'C001', scopeType: 'project', scopeId: 'PJ01', intervalSec: 90, windowSec: 45, judgedAt: '2026-09-30 16:20:05', overallPass: true, values: { yewei: 3.38, wendu: 27.9, yaqiang: 100.8 }, kept: true }),
  dtHead({ id: 'J103b', messageId: 'PK016', sampleId: 'S103', deviceId: 'D002', projectId: 'PJ01', categoryId: 'C001', scopeType: 'project', scopeId: 'PJ01', intervalSec: 90, windowSec: 45, judgedAt: '2026-09-30 16:25:40', overallPass: false, values: { yewei: 11.5, wendu: 27.9, yaqiang: 100.8 }, replaces: 'J103a' }),
  dtHead({ id: 'J104', messageId: 'PK005', sampleId: 'S104', deviceId: 'D001', projectId: 'PJ01', categoryId: 'C001', scopeType: 'device', scopeId: 'D001', intervalSec: 120, windowSec: 60, judgedAt: '2026-09-30 15:00:03', overallPass: true, values: { yewei: 3.10, wendu: 26.0, yaqiang: 100.2 } }),
  dtHead({ id: 'J105', messageId: null, externalId: 'EXT-LEVEL-20260930-01', sampleId: 'S105', deviceId: 'D009', projectId: null, categoryId: 'C001', scopeType: 'category', scopeId: 'C001', intervalSec: 60, windowSec: 30, judgedAt: '2026-09-30 14:10:04', overallPass: true, values: { yewei: 2.20, wendu: 22.0, yaqiang: 99.0 } }),
  dtHead({ id: 'J106', messageId: 'PK018', sampleId: 'S106', deviceId: 'D001', projectId: 'PJ01', categoryId: 'C001', scopeType: 'device', scopeId: 'D001', intervalSec: 120, windowSec: 60, judgedAt: '2026-09-30 08:00:36', overallPass: true, values: { yewei: 3.20, wendu: 25.1, yaqiang: 101.0 } }),
  dtHead({ id: 'J107', messageId: 'PK008', sampleId: 'S107', deviceId: 'D002', projectId: 'PJ01', categoryId: 'C001', scopeType: 'project', scopeId: 'PJ01', intervalSec: 90, windowSec: 45, judgedAt: '2026-09-30 16:41:52', overallPass: true, values: { yewei: 3.38, wendu: 27.9, yaqiang: 100.8 } }),
  dtHead({ id: 'J201', messageId: 'PK017', sampleId: 'S201', deviceId: 'D004', projectId: 'PJ03', categoryId: 'C003', scopeType: 'category', scopeId: 'C003', intervalSec: 900, windowSec: 450, standardVersion: 1, judgedAt: '2026-08-10 14:00:02', overallPass: false, values: { yaqiang: 280 } }),
];
let DT_JUDGEMENT_ITEMS_SEED = []
  .concat(dtItemsAllPass('J101', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS))
  .concat(dtItemsAllPass('J103a', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS))
  .concat(dtItemsAllPass('J105', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS))
  .concat(dtItemsAllPass('J106', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS))
  .concat(dtItemsAllPass('J107', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS));
DT_JUDGEMENT_ITEMS_SEED = DT_JUDGEMENT_ITEMS_SEED.concat(dtItemsAllPass('J104', ['yewei', 'wendu', 'yaqiang'], DT_FLOOD_RELS));
DT_JUDGEMENT_ITEMS_SEED.forEach(item => {
  if (item.judgementId === 'J104' && item.relationType === 'neighbor') {
    item.reason = '对照对象缺失';
    item.relatedRefs = ['D002'];
    item.pass = true;
    item.marks = [];
    item.status = 'pass';
  }
});
DT_JUDGEMENT_ITEMS_SEED = DT_JUDGEMENT_ITEMS_SEED.concat([
  { id: 'J102-yewei-required', judgementId: 'J102', identifier: 'yewei', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-yewei-type', judgementId: 'J102', identifier: 'yewei', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-yewei-range', judgementId: 'J102', identifier: 'yewei', kind: 'assert', assertType: 'range', pass: false, marks: ['RANGE_HIGH'], reason: '测值 11.2 超出量程上限 10（引用测点字典 yewei.max）', status: 'fail', relatedRefs: [] },
  { id: 'J102-yewei-null', judgementId: 'J102', identifier: 'yewei', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-wendu-required', judgementId: 'J102', identifier: 'wendu', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '键存在', status: 'pass', relatedRefs: [] },
  { id: 'J102-wendu-type', judgementId: 'J102', identifier: 'wendu', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-wendu-range', judgementId: 'J102', identifier: 'wendu', kind: 'assert', assertType: 'range', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-wendu-null', judgementId: 'J102', identifier: 'wendu', kind: 'assert', assertType: 'null', pass: false, marks: ['NULL_VALUE'], reason: '测值为空', status: 'fail', relatedRefs: [] },
  { id: 'J102-yaqiang-required', judgementId: 'J102', identifier: 'yaqiang', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-yaqiang-type', judgementId: 'J102', identifier: 'yaqiang', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-yaqiang-range', judgementId: 'J102', identifier: 'yaqiang', kind: 'assert', assertType: 'range', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-yaqiang-null', judgementId: 'J102', identifier: 'yaqiang', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J102-rel-cross', judgementId: 'J102', identifier: 'yewei', kind: 'relation', assertType: 'cross', relationType: 'cross', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['yaqiang'] },
  { id: 'J102-rel-trend', judgementId: 'J102', identifier: 'yewei', kind: 'relation', assertType: 'trend', relationType: 'trend', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['yewei'] },
  { id: 'J102-rel-peer', judgementId: 'J102', identifier: 'yaqiang', kind: 'relation', assertType: 'peer', relationType: 'peer', pass: true, marks: [], reason: '不依赖已失败指标，继续执行；偏离未超阈值', status: 'pass', relatedRefs: ['PJ01', 'C001'] },
  { id: 'J102-rel-neighbor', judgementId: 'J102', identifier: 'yewei', kind: 'relation', assertType: 'neighbor', relationType: 'neighbor', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['D002'] },
  { id: 'J103b-yewei-required', judgementId: 'J103b', identifier: 'yewei', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yewei-type', judgementId: 'J103b', identifier: 'yewei', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yewei-range', judgementId: 'J103b', identifier: 'yewei', kind: 'assert', assertType: 'range', pass: false, marks: ['RANGE_HIGH'], reason: '覆盖后测值 11.5 超出量程上限 10', status: 'fail', relatedRefs: [] },
  { id: 'J103b-yewei-null', judgementId: 'J103b', identifier: 'yewei', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-wendu-required', judgementId: 'J103b', identifier: 'wendu', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-wendu-type', judgementId: 'J103b', identifier: 'wendu', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-wendu-range', judgementId: 'J103b', identifier: 'wendu', kind: 'assert', assertType: 'range', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-wendu-null', judgementId: 'J103b', identifier: 'wendu', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yaqiang-required', judgementId: 'J103b', identifier: 'yaqiang', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yaqiang-type', judgementId: 'J103b', identifier: 'yaqiang', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yaqiang-range', judgementId: 'J103b', identifier: 'yaqiang', kind: 'assert', assertType: 'range', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-yaqiang-null', judgementId: 'J103b', identifier: 'yaqiang', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J103b-rel-cross', judgementId: 'J103b', identifier: 'yewei', kind: 'relation', assertType: 'cross', relationType: 'cross', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['yaqiang'] },
  { id: 'J103b-rel-trend', judgementId: 'J103b', identifier: 'yewei', kind: 'relation', assertType: 'trend', relationType: 'trend', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['yewei'] },
  { id: 'J103b-rel-peer', judgementId: 'J103b', identifier: 'yaqiang', kind: 'relation', assertType: 'peer', relationType: 'peer', pass: true, marks: [], reason: '不依赖已失败指标，继续执行', status: 'pass', relatedRefs: ['PJ01'] },
  { id: 'J103b-rel-neighbor', judgementId: 'J103b', identifier: 'yewei', kind: 'relation', assertType: 'neighbor', relationType: 'neighbor', pass: false, marks: [], reason: '依赖 yewei 单条已失败，关联中停', status: 'skip', relatedRefs: ['D001'] },
  { id: 'J201-yaqiang-required', judgementId: 'J201', identifier: 'yaqiang', kind: 'assert', assertType: 'required', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J201-yaqiang-type', judgementId: 'J201', identifier: 'yaqiang', kind: 'assert', assertType: 'type', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
  { id: 'J201-yaqiang-range', judgementId: 'J201', identifier: 'yaqiang', kind: 'assert', assertType: 'range', pass: false, marks: ['RANGE_HIGH'], reason: '测值 280 超出量程上限 200（引用测点字典 yaqiang.max）', status: 'fail', relatedRefs: [] },
  { id: 'J201-yaqiang-null', judgementId: 'J201', identifier: 'yaqiang', kind: 'assert', assertType: 'null', pass: true, marks: [], reason: '', status: 'pass', relatedRefs: [] },
]);

const DT_GAPS_SEED = [
  { id: 'G1', deviceId: 'D007', categoryId: 'C001', projectId: 'PJ01', slotTime: '2026-09-30 10:00:00', periodStart: '', periodEnd: '', type: 'missing', status: 'open', filledSampleId: null, offlineReached: false },
  { id: 'G2', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', slotTime: '2026-09-30 08:00:00', periodStart: '', periodEnd: '', type: 'missing', status: 'filled', filledSampleId: 'S106', offlineReached: false },
  { id: 'G5', deviceId: 'D001', categoryId: 'C001', projectId: 'PJ01', slotTime: '2026-09-29 22:00:00', periodStart: '', periodEnd: '', type: 'missing', status: 'open', filledSampleId: null, offlineReached: false },
  { id: 'G3', deviceId: 'D003', categoryId: 'C002', projectId: 'PJ02', slotTime: '', periodStart: '2026-09-28 00:00:00', periodEnd: '', type: 'offline', status: 'open', filledSampleId: null, offlineReached: true },
  { id: 'G4', deviceId: 'D006', categoryId: 'C005', projectId: 'PJ05', slotTime: '', periodStart: '2026-07-01 10:00:00', periodEnd: '2026-07-20 08:00:00', type: 'offline', status: 'recovered', filledSampleId: null, offlineReached: true },
];

/* 汇总示意。完整率 = 应报 / 实收；有效率 = 无异常标记指标次数 / 参与判断指标次数。不做门槛拦截。 */
const DT_STATS_SEED = [
  { id: 'ST-C001', categoryId: 'C001', projectId: '', deviceId: '', expected: 4320, received: 4102, judgedMetrics: 12306, abnormalMetrics: 214 },
  { id: 'ST-C001-PJ01', categoryId: 'C001', projectId: 'PJ01', deviceId: '', expected: 2880, received: 2760, judgedMetrics: 8280, abnormalMetrics: 126 },
  { id: 'ST-D001', categoryId: 'C001', projectId: 'PJ01', deviceId: 'D001', expected: 720, received: 690, judgedMetrics: 2070, abnormalMetrics: 18 },
  { id: 'ST-D002', categoryId: 'C001', projectId: 'PJ01', deviceId: 'D002', expected: 720, received: 705, judgedMetrics: 2115, abnormalMetrics: 6 },
  { id: 'ST-D009', categoryId: 'C001', projectId: '', deviceId: 'D009', expected: 48, received: 40, judgedMetrics: 120, abnormalMetrics: 0 },
  { id: 'ST-C002-PJ02', categoryId: 'C002', projectId: 'PJ02', deviceId: '', expected: 576, received: 520, judgedMetrics: 1560, abnormalMetrics: 90 },
  { id: 'ST-D003', categoryId: 'C002', projectId: 'PJ02', deviceId: 'D003', expected: 288, received: 240, judgedMetrics: 720, abnormalMetrics: 64 },
  { id: 'ST-D004', categoryId: 'C003', projectId: 'PJ03', deviceId: 'D004', expected: 96, received: 84, judgedMetrics: 84, abnormalMetrics: 12 },
];

createApp({
  setup() {
    const module = ref('cockpit'); // cockpit | thing | ledger | monitor
    const screen = ref('cockpit');
    const detailTab = ref('points');
    const searchKeyword = ref('');
    const filterIndustry = ref('');

    const showCategoryModal = ref(false);
    const categoryModalMode = ref('create');
    const categoryForm = reactive({ id: '', name: '', code: '', icon: '', industry: '市政排水', desc: '', status: '启用' });

    const showRuleModal = ref(false);
    const ruleModalMode = ref('create');
    const ruleForm = reactive({
      id: '', categoryId: '', name: '', type: '通用', matchAepProduct: '', matchProtocol: '',
      priority: 100, enabled: true, note: ''
    });
    const categoryRules = ref(CATEGORY_RULES.map(r => ({ ...r })));

    const showCommandModal = ref(false);
    const commandModalMode = ref('create');
    const commandForm = reactive({
      id: '', categoryId: '', name: '', code: '', desc: '',
      hasParam: 0, bitIndex: 1, payloadOffset: 25,
      dataType: 'bool', unit: '', required: true, access: 'w',
      paramMin: null, paramMax: null, enabled: true
    });
    const commandList = ref(COMMANDS.map(c => ({ ...c })));
    const propertyList = ref(PROPERTIES.map(p => ({ ...p, showInMonitor: p.showInMonitor !== false })));
    const showPropertyModal = ref(false);
    const propertyModalMode = ref('create');
    const propertyForm = reactive({
      id: '', categoryId: '', identifier: '', name: '', dataType: 'float', unit: '',
      access: '只读', reportCycle: '60s', required: true, showInMonitor: true
    });

    /* ---- 品类 · 批量下发 ---- */
    const batchCmdId = ref('');
    const batchParams = reactive({});
    const batchProjectFilter = ref('');
    const batchOnlineOnly = ref(true);
    const batchSelectedDeviceIds = ref([]);
    const batchPreviewHex = ref('');
    const batchPreviewOk = ref(false);
    const batchJobSummary = ref(null); // { total, success, fail, command, at }

    /* ---- OTA：设备固件升级 / 品类批量升级任务 ---- */
    const deviceUpgradeLogs = ref(DEVICE_UPGRADE_LOGS.map(r => ({ ...r })));
    const categoryOtaTasks = ref(CATEGORY_OTA_TASKS.map(r => ({
      ...r,
      excluded: (r.excluded || []).map(e => ({ ...e })),
    })));
    const showDeviceOtaModal = ref(false);
    const deviceOtaTargetVer = ref('');
    const deviceOtaPackageUrl = ref('');
    const showCategoryOtaModal = ref(false);
    const categoryOtaFirmwareId = ref('');
    const categoryOtaTargetVer = ref('');
    const categoryOtaPackageUrl = ref('');
    const categoryOtaSelectedIds = ref([]);
    const categoryOtaOnlineOnly = ref(true);
    const categoryOtaTimeoutMinutes = ref(OTA_TIMEOUT_DEFAULT);
    const categoryOtaExtraIds = ref('');
    const currentOtaTaskId = ref('');
    const otaTaskCategoryFilter = ref('');
    const categoryOtaCategoryId = ref('');
    const categoryOtaRejectText = ref('');
    const deviceOtaRejectText = ref('');
    const categoryTick = ref(0);
    const upgradeHistoryDeviceId = ref('');
    const upgradeHistoryStatusFilter = ref('done'); // done=成功+失败 | success | fail | all
    const upgradeHistoryKeyword = ref('');
    const showCancelOtaConfirm = ref(false);
    const cancelOtaTargetId = ref('');
    const otaCreateResult = ref({
      taskId: 'OT01',
      at: '2026-10-30 09:00:00',
      categoryId: 'C001',
      toVer: '1.3.0',
      firmwareId: 'F1',
      packageUrl: 'https://example.com/fw/MF-LW-100/1.3.0.bin',
      timeoutMinutes: 30,
      accepted: 3,
      acceptedDevices: [
        { deviceId: 'D001', name: '东湖路井-01' },
        { deviceId: 'D002', name: '东湖路井-01从机' },
        { deviceId: 'D015', name: '东湖路井-01探头B' },
      ],
      excluded: CATEGORY_OTA_TASKS[0].excluded.map(e => ({ ...e })),
    });
    const COMMAND_DATA_TYPES = ['bool', 'int', 'float', 'string', 'enum', 'object'];
    const COMMAND_ACCESS_OPTS = ['r', 'w'];

    const showDeleteConfirm = ref(false);
    const deleteTarget = reactive({ type: '', id: '', name: '', ids: [], blocked: false });

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
      id: '', model: '', currentVersion: '', upgradeVersion: '', releaseDate: '', status: '可升级', packageUrl: '', packageName: '', packageSize: null, changelog: ''
    });
    const firmwareRevision = ref(0);
    const firmwareSelectedIds = ref([]);
    const firmwareUploadInput = ref(null);
    const firmwareUploading = ref(false);

    /* ---- 设备台账 state ---- */
    const projectSearch = ref('');
    const projectStatusFilter = ref('');
    const showProjectModal = ref(false);
    const projectModalMode = ref('create');
    const projectForm = reactive({ id: '', name: '', status: '筹备中', owner: '', region: '', startedAt: '2026-09-30', desc: '', aepProductId: '', aepProductName: '' });

    const deviceProjectFilter = ref('');
    const deviceCategoryFilter = ref('');
    const deviceLifecycleFilter = ref('');
    const deviceImeiSearch = ref('');
    const deviceMasterFilter = ref('');
    const showProbeDevices = ref(false);
    /** 子设备条带下钻：筛「其下有该子品类/未分类探头」的一体机；''=不启用 */
    const deviceSlaveCategoryFilter = ref('');
    function isProbeAepId(id) { return !!(id && String(id).startsWith('probe:')); }
    /** 子设备：挂父一体机（有 masterId）或 aepDeviceId 为 probe: 合成键 */
    function isChildDevice(d) {
      if (!d) return false;
      return !!(d.masterId) || isProbeAepId(d.aepDeviceId);
    }
    /** 一体机/主机：无 masterId、非 probe，且存在挂靠其子设备 */
    function isHubDevice(d) {
      if (!d || isChildDevice(d)) return false;
      return deviceList.value.some(x => x.masterId === d.id);
    }
    function displayAepDeviceId(id) {
      if (!id) return '—';
      if (isProbeAepId(id)) return id + '（合成键，非真 AEP ID）';
      return id;
    }
    const deviceList = ref(DEVICES.map(d => ({ ...d })));
    const currentDevice = ref(deviceList.value[0]);
    const currentMessageInfo = computed(() => parseDeviceMessageInfo(currentDevice.value));
    const selectedDeviceIds = ref([]);

    const showImportModal = ref(false);
    const importMode = ref('import'); // import | export

    const showDisableConfirm = ref(false);
    const showTransferModal = ref(false);
    const transferForm = reactive({
      targetProjectId: 'PJ01', note: '', operator: '张三', deviceIds: []
    });
    const transferLogs = ref(TRANSFER_LOGS.map(t => ({ ...t })));
    const deviceSnChangeLogs = ref(typeof DEVICE_SN_CHANGE_LOGS !== 'undefined' ? DEVICE_SN_CHANGE_LOGS.map(t => ({ ...t })) : []);
    const showCategoryOverride = ref(false);

    /* ---- 设备档案 · Tab：档案 / 本机数据 / 指令 / 设备发送记录 / 子设备 ---- */
    const deviceDetailTab = ref('profile'); // profile | localData | dispatch | sendLog | snChange | children | upgradeLog
    const packetTypeFilter = ref(''); // '' | message* | data* | upgrade65535 | command
    const expandedPacketIds = ref([]); // hex 展开行
    const dispatchSelected = ref([]); // command ids
    const dispatchParams = reactive({}); // code -> params object（如 { value } / { start, end }）
    const dispatchPreviewHex = ref('');
    const dispatchPreviewOk = ref(false);
    const showSendLogModal = ref(false);
    const currentSendLog = ref(null);
    const toast = reactive({ show: false, type: 'ok', text: '' });
    let toastTimer = null;

    const deviceFormMode = ref('edit');
    const deviceForm = reactive({
      id: '', imei: '', deviceSn: '', name: '', projectId: '', categoryId: '', lifecycle: '待接入',
      aepDeviceId: '', aepStatus: 0, model: '', firmware: '', lng: '', lat: '', address: '',
      installDate: '', installer: '', masterId: '',
      installParamsText: '', photosText: '', categoryMatch: 'auto', categoryRuleId: ''
    });

    const aepDiffTab = ref('extra'); // extra | missing | ignored
    const aepLastSyncedAt = ref('2026-10-09 08:00');
    const aepDiffs = ref(AEP_DIFFS.map(d => ({ ...d })));

    /* ---- 在线监控 state ---- */
    const monProjectFilter = ref('');
    const monCategoryFilter = ref('');
    const monOnlineFilter = ref('');
    const monAlarmFilter = ref(''); // '' | warn | alarm | fault | none | any
    const monSearch = ref('');
    const currentMonitor = ref(MONITOR_ROWS[0]);
    const monCurveRange = ref(7); // 7 | 30
    const monCurvePointCode = ref('yewei');
    const monCurveMode = ref('split'); // 'split' | 'merge' · 默认分开
    const monHoverT = ref(null); // 0..1 · 悬停采样比例（统一 sampleTime）
    const monDetailTab = ref('overview'); // overview | reports · 最新与曲线 / 上报明细
    // 上报明细时间区间（对接 sampleTimeBegin / sampleTimeEnd）；默认近 24h（相对最近上报）
    const monReportBegin = ref('');
    const monReportEnd = ref('');
    const monReportAppliedBegin = ref('');
    const monReportAppliedEnd = ref('');

    /* ---- 设备对比 state ---- */
    const cmpCategoryId = ref('');
    const cmpDeviceIds = ref([]); // max 8, same category
    const cmpPropIds = ref([]); // property identifiers
    const cmpRange = ref(7); // 1 | 7 | 30
    const cmpDrawerOpen = ref(false);
    const cmpDrawerSearch = ref('');
    const cmpDrawerPick = ref([]); // temp ids in drawer
    const cmpTableOpen = ref(true);
    const cmpListSelected = ref([]); // monitor list checkboxes
    const cmpRefreshNonce = ref(0);

    const filteredCategories = computed(() => {
      categoryTick.value;
      return CATEGORIES.filter(c => {
        const kw = searchKeyword.value.trim();
        if (kw && !(c.name.includes(kw) || c.code.includes(kw) || c.id.includes(kw))) return false;
        if (filterIndustry.value && c.industry !== filterIndustry.value) return false;
        return true;
      });
    });

    function isUpgradeSupported(cat) {
      return !!(cat && Number(cat.upgradeSupported) === 1);
    }

    const upgradeSupportedCategories = computed(() => {
      categoryTick.value;
      return CATEGORIES.filter(c => isUpgradeSupported(c));
    });

    const currentCategoryRules = computed(() => {
      const cid = currentCategory.value?.id;
      return categoryRules.value
        .filter(r => r.categoryId === cid)
        .slice()
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === '特殊' ? -1 : 1;
          return (a.priority || 0) - (b.priority || 0);
        });
    });

    const currentCategoryCommands = computed(() => {
      const cid = currentCategory.value?.id;
      return commandList.value.filter(c => c.categoryId === cid);
    });

    /** 设备档案点发：取该设备品类下启用的 kind=service 指令 */
    const deviceDispatchCommands = computed(() => {
      const d = currentDevice.value;
      if (!d || !d.categoryId) return [];
      return commandList.value.filter(c => c.categoryId === d.categoryId && c.enabled !== false);
    });

    const dispatchSelectedCmds = computed(() => {
      const set = new Set(dispatchSelected.value);
      return deviceDispatchCommands.value.filter(c => set.has(c.id));
    });

    const batchableCategoryCommands = computed(() =>
      currentCategoryCommands.value.filter(c => c.enabled !== false && c.batchable === true)
    );
    const batchSelectedCommand = computed(() =>
      batchableCategoryCommands.value.find(c => c.id === batchCmdId.value) || null
    );
    const batchCandidateDevices = computed(() => {
      const cid = currentCategory.value?.id;
      if (!cid) return [];
      return deviceList.value.filter(d => {
        if (d.categoryId !== cid) return false;
        if (batchProjectFilter.value && d.projectId !== batchProjectFilter.value) return false;
        if (batchOnlineOnly.value && d.lifecycle !== '在线') return false;
        return true;
      });
    });

    function compareSemver(a, b) {
      const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
      const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
      const len = Math.max(pa.length, pb.length);
      for (let i = 0; i < len; i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x < y) return -1;
        if (x > y) return 1;
      }
      return 0;
    }

    function otaDeviceStatusMeta(status) {
      if (status != null && OTA_DEVICE_STATUS_BY_LABEL[status] != null) {
        const code = OTA_DEVICE_STATUS_BY_LABEL[status];
        return { code, ...OTA_DEVICE_STATUS[code] };
      }
      const n = Number(status);
      if (OTA_DEVICE_STATUS[n] && String(status) !== '' && status != null) {
        return { code: n, ...OTA_DEVICE_STATUS[n] };
      }
      return { code: '—', label: status ? String(status) : '—', tag: 'tag-gray' };
    }

    function otaDeviceStatusText(status) {
      const m = otaDeviceStatusMeta(status);
      return m.code + ' ' + m.label;
    }

    function otaTaskStatusMeta(status) {
      if (status != null && OTA_TASK_STATUS_BY_LABEL[status] != null) {
        const code = OTA_TASK_STATUS_BY_LABEL[status];
        return { code, ...OTA_TASK_STATUS[code] };
      }
      const n = Number(status);
      if (OTA_TASK_STATUS[n] && String(status) !== '' && status != null) {
        return { code: n, ...OTA_TASK_STATUS[n] };
      }
      return { code: '—', label: status ? String(status) : '—', tag: 'tag-gray' };
    }

    function otaTaskStatusText(status) {
      const m = otaTaskStatusMeta(status);
      return m.code + ' ' + m.label;
    }

    function otaTimeoutMinutesOf(task) {
      const n = Number(task && task.timeoutMinutes);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : OTA_TIMEOUT_DEFAULT;
    }

    function otaTaskTimeoutReason(task) {
      return otaTimeoutFailReason(otaTimeoutMinutesOf(task));
    }

    function otaDeviceBrief(id) {
      const d = deviceList.value.find(x => x.id === id);
      if (!d) return { id, name: '—', imei: '' };
      return { id: d.id, name: d.name, imei: d.imei };
    }

    function deviceCategoryLabel(deviceId) {
      const d = deviceList.value.find(x => x.id === deviceId);
      if (!d || !d.categoryId) return '—';
      const c = CATEGORIES.find(x => x.id === d.categoryId);
      return c ? c.name : d.categoryName || d.categoryId;
    }

    function parseExtraDeviceIds(text) {
      return String(text || '').split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean);
    }

    function normalizeTimeoutMinutes(raw) {
      if (raw === '' || raw == null) return OTA_TIMEOUT_DEFAULT;
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n <= 0) return OTA_TIMEOUT_DEFAULT;
      return n;
    }

    const currentDeviceUpgradeLogs = computed(() => {
      const d = currentDevice.value;
      if (!d) return [];
      return deviceUpgradeLogs.value
        .filter(r => r.deviceId === d.id)
        .slice()
        .sort((a, b) => String(b.time).localeCompare(String(a.time)));
    });

    const deviceOtaFirmwareOptions = computed(() => {
      firmwareRevision.value;
      const d = currentDevice.value;
      if (!d) return [];
      return FIRMWARES.filter(f => {
        if (f.categoryId) return f.categoryId === d.categoryId;
        return !d.model || !f.model || f.model === d.model;
      });
    });

    const categoryFirmwares = computed(() => {
      firmwareRevision.value;
      const cid = currentCategory.value?.id;
      return FIRMWARES.filter(f => !f.categoryId || f.categoryId === cid);
    });

    const otaTaskList = computed(() => {
      const cid = otaTaskCategoryFilter.value;
      return categoryOtaTasks.value
        .filter(t => !cid || t.categoryId === cid)
        .slice()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    });

    const currentOtaTask = computed(() => {
      const id = currentOtaTaskId.value;
      if (!id) return null;
      return categoryOtaTasks.value.find(t => t.id === id) || null;
    });

    const currentOtaTaskDevices = computed(() => {
      const t = currentOtaTask.value;
      if (!t) return [];
      return deviceUpgradeLogs.value
        .filter(r => r.taskId === t.id)
        .slice()
        .sort((a, b) => String(a.deviceId).localeCompare(String(b.deviceId)));
    });

    const otaRunningDeviceIds = computed(() => {
      const set = new Set();
      categoryOtaTasks.value.forEach(t => {
        if (otaTaskStatusMeta(t.status).code !== 0) return;
        deviceUpgradeLogs.value.forEach(r => {
          if (r.taskId !== t.id) return;
          const code = otaDeviceStatusMeta(r.status).code;
          if (code === 0 || code === 1) set.add(r.deviceId);
        });
      });
      return set;
    });

    function otaDeviceExcludeReason(device, ctx) {
      const runningIds = (ctx && ctx.runningIds) || otaRunningDeviceIds.value;
      const categoryId = ctx && ctx.categoryId;
      const toVer = ctx && ctx.toVer;
      if (!device) return '排除: 设备不存在';
      if (!categoryId) return '排除: 缺少 categoryId';
      if (device.categoryId !== categoryId) return '排除: 不属于当前品类';
      if (!toVer) return '排除: 未指定目标版本';
      if (!(compareSemver(device.firmware, toVer) < 0)) return '排除: 当前固件不低于目标版本';
      if (device.lifecycle === '待接入' || !device.aepDeviceId) return '排除: 设备待接入且无 AEP 设备号';
      if (device.lifecycle === '停用' || device.lifecycle === '报废') return '排除: 设备已' + device.lifecycle;
      if (runningIds && runningIds.has(device.id)) return '排除: 已在进行中的升级任务中';
      return '';
    }

    const categoryOtaCandidateDevices = computed(() => {
      const cid = currentCategory.value?.id;
      const toVer = categoryOtaTargetVer.value;
      if (!cid) return [];
      const runningIds = otaRunningDeviceIds.value;
      return deviceList.value.filter(d => {
        if (d.categoryId !== cid) return false;
        if (categoryOtaOnlineOnly.value && d.lifecycle !== '在线') return false;
        return true;
      }).map(d => ({
        ...d,
        excludeReason: otaDeviceExcludeReason(d, { categoryId: cid, toVer, runningIds }),
      }));
    });

    const categoryOtaUpgradeableDevices = computed(() => {
      return categoryOtaCandidateDevices.value.filter(d => !d.excludeReason);
    });

    const otaTaskFailureRows = computed(() => {
      const ids = new Set(otaTaskList.value.map(t => t.id));
      const taskById = {};
      otaTaskList.value.forEach(t => { taskById[t.id] = t; });
      return deviceUpgradeLogs.value
        .filter(r => ids.has(r.taskId) && otaDeviceStatusMeta(r.status).code === 3)
        .map(r => ({ ...r, task: taskById[r.taskId] }))
        .sort((a, b) => String(b.time).localeCompare(String(a.time)));
    });

    const cancelOtaTarget = computed(() => {
      return categoryOtaTasks.value.find(t => t.id === cancelOtaTargetId.value) || null;
    });

    /** 当前设备本机数据 = iot_protocol_data（query by deviceId；可按 packageType 筛） */
    const devicePackets = computed(() => {
      const d = currentDevice.value;
      if (!d) return [];
      return PROTOCOL_PACKETS.filter(p => p.deviceId === d.id);
    });
    const filteredDevicePackets = computed(() => {
      const t = packetTypeFilter.value;
      return devicePackets.value.filter(p => matchPackageTypeFilter(p.packageType, t));
    });
    const devicePacketTypeCounts = computed(() => {
      const rows = devicePackets.value;
      const counts = {};
      PACKET_FILTERS.forEach(f => {
        counts[f.key] = rows.filter(p => matchPackageTypeFilter(p.packageType, f.key)).length;
      });
      return counts;
    });

    /** 设备发送记录 · GET /iot/deviceCommand/log · 进页按 deviceId 自动过滤，sendTime 倒序 */
    const deviceSendLogs = computed(() => {
      const d = currentDevice.value;
      if (!d) return [];
      return DEVICE_SEND_LOGS
        .filter(r => r.deviceId === d.id)
        .slice()
        .sort((a, b) => String(b.sendTime || '').localeCompare(String(a.sendTime || '')));
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
      const kw = deviceImeiSearch.value.trim();
      const masterOnly = deviceMasterFilter.value;
      return deviceList.value.filter(d => {
        if (deviceProjectFilter.value === UNASSIGNED_PROJECT_ID) {
          if (d.projectId) return false;
        } else if (deviceProjectFilter.value && d.projectId !== deviceProjectFilter.value) {
          return false;
        }
        if (deviceCategoryFilter.value === '__uncat__') {
          if (d.categoryId) return false;
        } else if (deviceCategoryFilter.value === 'aio') {
          // 一体机：主机/hub（无 masterId 且非 probe:）
          if (d.masterId || isProbeAepId(d.aepDeviceId)) return false;
        } else if (deviceCategoryFilter.value && d.categoryId !== deviceCategoryFilter.value) {
          return false;
        }
        /* 子设备条带：仅保留「其下有对应品类/未分类子设备」的一体机 */
        if (deviceSlaveCategoryFilter.value) {
          const want = deviceSlaveCategoryFilter.value;
          const kids = deviceList.value.filter(x => x.masterId === d.id || (isProbeAepId(x.aepDeviceId) && x.masterId === d.id));
          const hit = kids.some(x => want === '__uncat__' ? !x.categoryId : x.categoryId === want);
          if (!hit) return false;
        }
        if (deviceLifecycleFilter.value && d.lifecycle !== deviceLifecycleFilter.value) return false;
        if (masterOnly && d.masterId !== masterOnly && d.id !== masterOnly) return false;
        if (kw && !(d.imei.includes(kw) || d.name.includes(kw) || (d.aepDeviceId || '').includes(kw))) return false;
        // 默认隐藏 probe: 探头子设备；传 masterId / keyword / 勾选「显示探头」才露出
        const isProbe = isProbeAepId(d.aepDeviceId);
        if (isProbe && !showProbeDevices.value && !masterOnly && !(kw && (d.aepDeviceId || '').includes(kw))) return false;
        return true;
      });
    });

    const unassignedDevices = computed(() => deviceList.value.filter(d => !d.projectId));
    const unassignedCount = computed(() => unassignedDevices.value.length);

    const currentDeviceTransferLogs = computed(() => {
      const d = currentDevice.value;
      if (!d) return [];
      return transferLogs.value.filter(t => t.deviceId === d.id || t.imei === d.imei);
    });
    const currentDeviceSnChangeLogs = computed(() => {
      const d = currentDevice.value;
      if (!d) return [];
      return deviceSnChangeLogs.value
        .filter(t => t.deviceId === d.id)
        .slice()
        .sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
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
        if (kw && !(d.imei.includes(kw) || d.name.includes(kw))) return false;
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

    /** 当前物模型详情品类的上报属性（kind=property）；含全部，含未勾选监控展示的 */
    const currentCategoryProperties = computed(() => {
      return getCategoryProperties(currentCategory.value?.id, propertyList.value);
    });

    /** 监控列表：选中品类时的动态测点列（同源过滤 showInMonitor） */
    const monMetricColumns = computed(() => {
      const cid = monCategoryFilter.value;
      if (!cid) return [];
      return getCategoryMonitorProperties(cid, propertyList.value);
    });

    const monHasCategoryFilter = computed(() => !!monCategoryFilter.value);

    const monSelectedCategoryName = computed(() => {
      const cid = monCategoryFilter.value;
      if (!cid) return '';
      const c = CATEGORIES.find(x => x.id === cid);
      return c ? c.name : cid;
    });

    /**
     * 详情最新卡片 / 曲线指标源：仅设备品类 kind=property 属性（顺序=物模型列表）。
     * 无品类或无属性 → 空列表（不扫 latest_json / history 全字段）。
     * 值优先 MONITOR_POINTS，否则 latest_json[identifier]。
     */
    const monLatestPoints = computed(() => {
      const row = currentMonitor.value;
      if (!row || !row.categoryId) return [];
      const defs = getCategoryMonitorProperties(row.categoryId, propertyList.value);
      if (!defs.length) return [];
      const pts = (row.id && MONITOR_POINTS[row.id]) ? MONITOR_POINTS[row.id] : [];
      const byCode = Object.fromEntries(pts.map(p => [p.code, p]));
      const lj = row.latest_json || {};
      return defs.map(d => {
        const hit = byCode[d.identifier];
        const raw = hit ? hit.value : lj[d.identifier];
        return {
          code: d.identifier,
          name: d.name,
          unit: d.unit || '',
          value: raw == null ? null : raw,
          trustLevel: hit ? hit.trustLevel : (row.trustLevel || 'T0'),
          trustScore: hit ? hit.trustScore : (row.trustScore || 0),
          ts: hit ? hit.ts : (row.lastReportAt || '—'),
          cycleSec: hit ? hit.cycleSec : (row.cycleSec || 60),
          warnLow: hit ? hit.warnLow : null,
          warnHigh: hit ? hit.warnHigh : null,
          alarmLow: hit ? hit.alarmLow : null,
          alarmHigh: hit ? hit.alarmHigh : null,
          faultLow: hit ? hit.faultLow : null,
          faultHigh: hit ? hit.faultHigh : null,
          ymin: hit && hit.ymin != null ? hit.ymin : 0,
          ymax: hit && hit.ymax != null ? hit.ymax : 100,
        };
      });
    });

    /** 属性卡片空态文案（精确口径） */
    const monPointsEmptyHint = computed(() => {
      const row = currentMonitor.value;
      if (!row) return '暂无测点数据';
      if (!row.categoryId) return '设备未关联品类，无法按物模型展示指标';
      if (!getCategoryProperties(row.categoryId, propertyList.value).length) return '该品类未配置上报属性，无法按物模型展示指标';
      if (!getCategoryMonitorProperties(row.categoryId, propertyList.value).length) return '本品类上报属性均未勾选「监控展示」';
      return '暂无测点数据';
    });

    /** 曲线区空态文案（精确口径） */
    const monCurveEmptyHint = computed(() => {
      const row = currentMonitor.value;
      if (!row) return '所选时间范围内暂无可用历史曲线数据';
      if (!row.categoryId) return '设备未关联品类，无法按物模型展示曲线';
      if (!getCategoryProperties(row.categoryId, propertyList.value).length) return '该品类未配置上报属性，无法按物模型展示曲线';
      if (!getCategoryMonitorProperties(row.categoryId, propertyList.value).length) return '本品类上报属性均未勾选「监控展示」';
      return '所选时间范围内暂无可用历史曲线数据';
    });

    /** 有有效数值的属性才可画曲线（跳过 null/undefined/NaN/''） */
    const monChartablePoints = computed(() => {
      return monLatestPoints.value.filter(p => isFiniteMetricValue(p.value));
    });

    const monSelectedPoint = computed(() => {
      const pts = monLatestPoints.value;
      if (!pts.length) return null;
      const chartable = monChartablePoints.value;
      const pool = chartable.length ? chartable : pts;
      return pool.find(p => p.code === monCurvePointCode.value) || pool[0];
    });

    const monCurveSeries = computed(() => {
      const p = monSelectedPoint.value;
      if (!p) return [];
      return genCurveSeries(p, monCurveRange.value);
    });

    /** 分开=每指标一图；合并=多线同图。无有效数值的指标不画。 */
    const monCurveCharts = computed(() => {
      const points = monChartablePoints.value;
      const days = monCurveRange.value;
      if (!points.length) return [];
      if (monCurveMode.value === 'merge') {
        const entries = points.map(p => ({ point: p, series: genCurveSeries(p, days) })).filter(e => e.series.length);
        if (!entries.length) return [];
        const svg = buildMergeCurveSvg(entries);
        return [{
          key: 'merge',
          mode: 'merge',
          title: '合并曲线',
          point: null,
          series: entries[0].series,
          entries,
          svg,
        }];
      }
      return points.map((p, idx) => {
        const series = genCurveSeries(p, days);
        if (!series.length) return null;
        const color = CURVE_SERIES_COLORS[idx % CURVE_SERIES_COLORS.length];
        return {
          key: p.code,
          mode: 'split',
          title: p.name + '（' + p.code + '）',
          point: p,
          series,
          entries: [{ point: p, series }],
          svg: buildSingleCurveSvg(p, series, color),
        };
      }).filter(Boolean);
    });

    const monCurveSvg = computed(() => {
      const charts = monCurveCharts.value;
      if (charts.length) return charts[0].svg;
      return { path: '', paths: [], w: 1000, h: 320, padL: 48, padR: 16, padT: 20, padB: 36, lines: [], yTicks: [], ymin: 0, ymax: 1 };
    });

    /** 悬停 readout：当前 sampleTime 下全部已展示指标的 name / value / unit */
    const monHoverReadout = computed(() => {
      const charts = monCurveCharts.value;
      if (!charts.length || monHoverT.value == null) return [];
      const t = monHoverT.value;
      const items = [];
      const pushFrom = (point, series, color) => {
        if (!point || !series || !series.length) return;
        let best = series[0];
        let bestDist = Math.abs(best.t - t);
        for (let i = 1; i < series.length; i++) {
          const d = Math.abs(series[i].t - t);
          if (d < bestDist) { best = series[i]; bestDist = d; }
        }
        items.push({
          code: point.code,
          name: point.name,
          unit: point.unit || '',
          value: best.v,
          color: color || '#0D6EFD',
        });
      };
      charts.forEach(ch => {
        if (ch.mode === 'merge') {
          (ch.entries || []).forEach((e, idx) => {
            pushFrom(e.point, e.series, CURVE_SERIES_COLORS[idx % CURVE_SERIES_COLORS.length]);
          });
        } else {
          pushFrom(ch.point, ch.series, ch.svg && ch.svg.color);
        }
      });
      return items;
    });

    const monCycleFullQueryTip = computed(() => {
      return monChartablePoints.value.some(p => p.cycleSec > 15 * 60);
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
      if (!d) return [];
      // 与后端一致：按 masterId=父台账 id 拉探头/子设备（兼兼容 slaves[]）
      const byMaster = deviceList.value.filter(x => x.masterId === d.id);
      if (byMaster.length) return byMaster;
      if (!d.slaves || !d.slaves.length) return [];
      return deviceList.value.filter(x => d.slaves.includes(x.id));
    });
    /** 仅当存在真实子设备时显示入口：非 probe、无 masterId，且 masterId=本机 的子设备 total>0 */
    const canShowChildDevices = computed(() => {
      const d = currentDevice.value;
      if (!d) return false;
      if (isProbeAepId(d.aepDeviceId) || d.masterId) return false;
      if (!currentDeviceSlaves.value.length) return false;
      return true;
    });

    const currentDeviceMaster = computed(() => {
      const d = currentDevice.value;
      if (!d || !d.masterId) return null;
      return deviceList.value.find(x => x.id === d.masterId) || null;
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
      if (module.value === 'cockpit') {
        return { parent: '设备管控', current: '工作台' };
      }
      if (module.value === 'monitor') {
        if (screen.value === 'monitorList') return { parent: '在线监控', current: '设备数据' };
        if (screen.value === 'monitorDetail') {
          const name = currentMonitor.value?.name || '设备';
          const tab = monDetailTab.value === 'reports' ? '上报明细' : '设备数据';
          return { parent: '在线监控', current: name + ' · ' + tab };
        }
        if (screen.value === 'monitorCurve') return { parent: currentMonitor.value?.name || '设备', current: '历史曲线' };
        if (screen.value === 'monitorOnlineRate') return { parent: '在线监控', current: '在线率统计' };
        if (screen.value === 'monitorCompare') return { parent: '在线监控', current: '设备对比' };
        return { parent: '在线监控', current: '设备数据' };
      }
      if (module.value === 'ledger') {
        if (screen.value === 'projects') return { parent: '设备管控', current: '设备台账 · 项目列表' };
        if (screen.value === 'devices') {
          const un = deviceProjectFilter.value === UNASSIGNED_PROJECT_ID;
          return { parent: '设备台账', current: un ? '例外池 · 未定义项目' : '设备列表' };
        }
        if (screen.value === 'deviceDetail') {
          const name = currentDevice.value?.name || '设备';
          const tabLabel = ({
            profile: '档案',
            localData: '本机数据',
            dispatch: '指令',
            sendLog: '设备发送记录',
            snChange: '设备号变更',
            children: '子设备',
            upgradeLog: '本机升级记录',
          })[deviceDetailTab.value] || '档案';
          return { parent: '设备台账', current: name + ' · ' + tabLabel };
        }
        if (screen.value === 'editDevice') return { parent: currentDevice.value?.name || '设备', current: deviceFormMode.value === 'create' ? '新建设备档案' : '编辑设备档案' };
        if (screen.value === 'aepReconcile') return { parent: '设备台账', current: 'AEP 对账' };
        return { parent: '设备管控', current: '设备台账' };
      }
      if (module.value === 'ota') {
        if (screen.value === 'otaTasks') {
          const id = currentOtaTaskId.value;
          return { parent: 'OTA / 升级', current: id ? ('升级任务 · ' + id) : '升级任务' };
        }
        if (screen.value === 'upgradeMonitor') {
          const id = upgradeMonitorTaskId.value;
          return { parent: 'OTA / 升级', current: id ? ('升级监控 · ' + id) : '升级监控' };
        }
        if (screen.value === 'upgradeHistory') {
          const id = upgradeHistoryDeviceId.value;
          return { parent: 'OTA / 升级', current: id ? ('历史升级记录 · ' + id) : '历史升级记录' };
        }
        return { parent: '设备管控', current: 'OTA / 升级' };
      }
      if (module.value === 'dataTrust') {
        if (screen.value === 'categoryStandard') return { parent: '数据可信', current: '品类标准' };
        if (screen.value === 'dataTrustJudgement') return { parent: '数据可信', current: '判断查询' };
        if (screen.value === 'dataTrustGap') return { parent: '数据可信', current: '缺报与离线' };
        if (screen.value === 'dataTrustStats') return { parent: '数据可信', current: '完整率/有效率' };
        return { parent: '数据可信', current: '目录' };
      }
      if (screen.value === 'list') return { parent: '设备管控', current: '物模型 · 品类列表' };
      if (screen.value === 'detail') {
        return { parent: '物模型', current: currentCategory.value.name + ' · 详情' };
      }
      if (screen.value === 'editPoint') return { parent: currentCategory.value.name, current: pointFormMode.value === 'create' ? '添加测点' : '编辑测点' };
      if (screen.value === 'editInstall') return { parent: currentCategory.value.name, current: installFormMode.value === 'create' ? '添加安装字段' : '编辑安装字段' };
      if (screen.value === 'editFirmware') return { parent: currentCategory.value.name, current: '登记固件版本' };
      return { parent: '设备管控', current: '物模型' };
    });

    const topbarHint = computed(() => {
      if (module.value === 'cockpit') return '一期原型 · 工作台';
      if (module.value === 'ledger') return '一期原型 · 设备台账';
      if (module.value === 'monitor') return '一期原型 · 在线监控';
      if (module.value === 'ota') return '一期原型 · OTA / 升级';
      if (module.value === 'dataTrust') return '一期原型 · 数据可信';
      return '一期原型 · 物模型';
    });

    function goCockpit() { module.value = 'cockpit'; screen.value = 'cockpit'; }

    function formatPlatformCount(n) {
      const v = Number(n) || 0;
      if (v >= 10000) {
        const wan = v / 10000;
        return (wan >= 100 ? wan.toFixed(0) : wan.toFixed(wan >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.[1-9])0$/, '$1')) + ' 万';
      }
      return String(v);
    }

    const cockpitStats = computed(() => {
      const all = deviceList.value;
      const online = all.filter(d => d.lifecycle === '在线').length;
      const offline = all.filter(d => d.lifecycle === '离线').length;
      const pending = all.filter(d => d.lifecycle === '待接入').length;
      const pendingDiff = aepDiffs.value.filter(d => d.action === 'pending').length;
      const packetCount = PROTOCOL_PACKETS.length;
      const samplePoints = MONITOR_ROWS.reduce((s, r) => s + (Number(r.actual24h) || 0), 0);
      const platformDataTotal = PLATFORM_DATA_SEED + packetCount + samplePoints;
      const onlineRate = all.length ? Math.round((online / all.length) * 100) : 0;
      return {
        deviceTotal: all.length,
        online,
        offline,
        pending,
        onlineRate,
        projectCount: PROJECTS.length,
        unassigned: unassignedCount.value,
        pendingDiff,
        platformDataTotal,
        platformDataLabel: formatPlatformCount(platformDataTotal),
        packetCount,
        samplePoints,
      };
    });

    /**
     * 品类分布（层级，对齐 BE tip 5cdbaa5a 闭环）：
     * 顶层桶（参与闭环；探头/子设备不进顶层合计）：
     * 1) aio（code=aio）：无 masterId 且非 probe:、且有 categoryId → 仅主机/hub 台数（不含探头）
     * 2) others：非 hub 顶层独立品类 flat（本 mock 有品类非探头均进 aio，故为空；预留）
     * 3) 未分类：顶层空 categoryId →「未分类」（不用「待归属」）
     * 明细（不进闭环合计；UI 放 Row B 条带，不嵌套进 aio 卡）：
     *    children：masterId 或 probe:，按 categoryId 聚合；空品类归「未分类」
     * 闭环（禁止把 children 加进合计）：
     *    aio.count + Σ(others[].count) + uncategorized.count === deviceTotal
     *    此处 deviceTotal = 与顶层同批（排除 probe/子设备）
     * 下钻：aio→category=aio；child/other→categoryId；未分类→__uncat__
     */
    const cockpitCategoryDist = computed(() => {
      const all = deviceList.value;
      const isChildDev = (d) => !!(d.masterId) || isProbeAepId(d.aepDeviceId);
      const isHubDev = (d) => !d.masterId && !isProbeAepId(d.aepDeviceId);

      /* 闭环批次 = 顶层设备（排除探头/子设备），与合计分母一致 */
      const topLevelDevices = all.filter(d => !isChildDev(d));
      const deviceTotal = topLevelDevices.length;
      const childDevices = all.filter(isChildDev);

      const uncatDevices = topLevelDevices.filter(d => !d.categoryId);
      const hubDevices = topLevelDevices.filter(d => !!d.categoryId && isHubDev(d));
      /* others：顶层独立品类预留。当前有品类非探头全部进 aio。 */
      const otherDevices = [];

      const aio = {
        id: 'aio',
        code: 'aio',
        icon: 'aio',
        iconKey: 'aio',
        name: '一体机',
        count: hubDevices.length,
        empty: hubDevices.length === 0,
        role: 'parent',
        pct: 100,
      };

      const childCounts = {};
      let childUncat = 0;
      childDevices.forEach(d => {
        if (!d.categoryId) { childUncat += 1; return; }
        childCounts[d.categoryId] = (childCounts[d.categoryId] || 0) + 1;
      });
      const childRows = CATEGORIES
        .map(c => {
          const count = childCounts[c.id] || 0;
          return {
            id: c.id,
            code: c.code,
            icon: c.icon || c.code,
            iconKey: c.icon || DEFAULT_CODE_TO_ICONIFY[c.code] || c.code,
            name: c.name,
            count,
            empty: false,
            role: 'child',
          };
        })
        .filter(r => r.count > 0);
      if (childUncat > 0) {
        childRows.push({
          id: '__child_uncat__',
          code: '',
          icon: 'uncategorized',
          iconKey: 'uncategorized',
          name: '未分类',
          count: childUncat,
          empty: false,
          uncategorized: true,
          role: 'child',
        });
      }

      const otherCounts = {};
      otherDevices.forEach(d => {
        if (!d.categoryId) return;
        otherCounts[d.categoryId] = (otherCounts[d.categoryId] || 0) + 1;
      });
      const otherRows = CATEGORIES
        .map(c => {
          const count = otherCounts[c.id] || 0;
          return {
            id: c.id,
            code: c.code,
            icon: c.icon || c.code,
            iconKey: c.icon || DEFAULT_CODE_TO_ICONIFY[c.code] || c.code,
            name: c.name,
            count,
            empty: false,
            role: 'other',
          };
        })
        .filter(r => r.count > 0);

      const uncategorized = uncatDevices.length > 0 ? {
        id: '__uncat__',
        code: '',
        icon: 'uncategorized',
        iconKey: 'uncategorized',
        name: '未分类',
        count: uncatDevices.length,
        empty: false,
        uncategorized: true,
        role: 'uncategorized',
      } : null;

      /* 进度条只比顶层大品类，不含子设备明细 */
      const barMax = Math.max(
        aio.count,
        ...otherRows.map(r => r.count),
        uncategorized ? uncategorized.count : 0,
        1,
      );
      aio.pct = Math.round((aio.count / barMax) * 100);
      otherRows.forEach(r => { r.pct = Math.round((r.count / barMax) * 100); });
      if (uncategorized) uncategorized.pct = Math.round((uncategorized.count / barMax) * 100);
      childRows.forEach(r => { r.pct = 0; });

      /* 顶层合计：不含 aio.children */
      const distSum = aio.count
        + otherRows.reduce((s, r) => s + r.count, 0)
        + (uncategorized ? uncategorized.count : 0);
      const childrenTotal = childRows.reduce((s, r) => s + r.count, 0);
      return {
        aio,
        children: childRows,
        childrenTotal,
        others: otherRows,
        uncategorized,
        distSum,
        deviceTotal,
        closedLoopOk: distSum === deviceTotal,
      };
    });

    /** 按项目罗列：各项目在运行设备概况 */
    const cockpitProjectRows = computed(() => {
      const all = deviceList.value;
      const rows = PROJECTS.map(p => {
        const devices = all.filter(d => d.projectId === p.id);
        const online = devices.filter(d => d.lifecycle === '在线').length;
        const offline = devices.filter(d => d.lifecycle === '离线').length;
        const pending = devices.filter(d => d.lifecycle === '待接入').length;
        const other = devices.length - online - offline - pending;
        const onlineRate = devices.length ? Math.round((online / devices.length) * 100) : 0;
        const catMap = {};
        devices.forEach(d => {
          const name = d.categoryName || (d.categoryId ? d.categoryId : '未分类');
          catMap[name] = (catMap[name] || 0) + 1;
        });
        const topCategories = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));
        /* 在线率偏低阈值：mock 硬编码 70%；0 台设备不标（N/A） */
        const lowOnlineRate = devices.length > 0 && onlineRate < 70;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          region: p.region,
          deviceCount: devices.length,
          online,
          offline,
          pending,
          other,
          onlineRate,
          lowOnlineRate,
          topCategories,
          project: p,
        };
      });
      return rows;
    });

    const cockpitUnassignedRow = computed(() => {
      const devices = deviceList.value.filter(d => !d.projectId);
      const online = devices.filter(d => d.lifecycle === '在线').length;
      const offline = devices.filter(d => d.lifecycle === '离线').length;
      const pending = devices.filter(d => d.lifecycle === '待接入').length;
      const other = devices.length - online - offline - pending;
      const onlineRate = devices.length ? Math.round((online / devices.length) * 100) : 0;
      return {
        deviceCount: devices.length,
        online,
        offline,
        pending,
        other,
        onlineRate,
      };
    });

    const cockpitSyncStatus = computed(() => {
      const pending = aepCounts.value.extra + aepCounts.value.missing;
      return {
        lastAt: aepLastSyncedAt.value,
        result: pending ? '有差异待处理' : '一致',
        ok: pending === 0,
        pending,
        summary: `多出 ${aepCounts.value.extra} · 缺失 ${aepCounts.value.missing} · 已忽略 ${aepCounts.value.ignored}`,
      };
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
      Object.assign(categoryForm, {
        id: '', name: '', code: '', icon: FALLBACK_ICONIFY,
        industry: '市政排水', desc: '', status: '启用'
      });
      showCategoryModal.value = true;
    }
    function openEditCategory(cat) {
      categoryModalMode.value = 'edit';
      Object.assign(categoryForm, {
        id: cat.id, name: cat.name, code: cat.code,
        icon: cat.icon || DEFAULT_CODE_TO_ICONIFY[cat.code] || FALLBACK_ICONIFY,
        industry: cat.industry, desc: cat.desc || '', status: cat.status
      });
      showCategoryModal.value = true;
    }
    function pickCategoryIcon(id) {
      categoryForm.icon = id || '';
    }
    function saveCategory() {
      const iconVal = (categoryForm.icon || '').trim();
      if (categoryModalMode.value === 'create') {
        const id = 'C' + Date.now().toString().slice(-4);
        CATEGORIES.push({
          id,
          name: categoryForm.name || '未命名品类',
          code: categoryForm.code || id.toLowerCase(),
          icon: iconVal,
          industry: categoryForm.industry,
          desc: categoryForm.desc || '',
          deviceCount: 0,
          modelVersion: 'v0.1.0',
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          status: categoryForm.status || '草稿',
          ruleCount: 0,
          upgradeSupported: 0,
        });
        categoryTick.value++;
      } else {
        const idx = CATEGORIES.findIndex(x => x.id === categoryForm.id);
        if (idx >= 0) {
          const prev = CATEGORIES[idx];
          CATEGORIES.splice(idx, 1, {
            ...prev,
            name: categoryForm.name,
            icon: iconVal,
            industry: categoryForm.industry,
            desc: categoryForm.desc || '',
            status: categoryForm.status,
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          });
          if (currentCategory.value && currentCategory.value.id === categoryForm.id) {
            currentCategory.value = CATEGORIES[idx];
          }
          categoryTick.value++;
        }
      }
      showCategoryModal.value = false;
    }

    function setCategoryUpgradeSupported(cat, supported) {
      const idx = CATEGORIES.findIndex(x => x.id === (cat && cat.id));
      if (idx < 0) return;
      const value = supported ? 1 : 0;
      const next = {
        ...CATEGORIES[idx],
        upgradeSupported: value,
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      };
      CATEGORIES.splice(idx, 1, next);
      if (currentCategory.value && currentCategory.value.id === next.id) {
        currentCategory.value = next;
      }
      categoryTick.value++;
      showToast('已保存 PUT /iotCategory · ' + next.name + ' upgradeSupported=' + value, 'ok');
    }

    function toggleCategoryUpgradeSupported(cat) {
      setCategoryUpgradeSupported(cat, !isUpgradeSupported(cat));
    }

    function openCreateRule() {
      ruleModalMode.value = 'create';
      Object.assign(ruleForm, {
        id: '', categoryId: currentCategory.value.id, name: '', type: '通用',
        matchAepProduct: '', matchProtocol: '', priority: 100, enabled: true, note: ''
      });
      showRuleModal.value = true;
    }
    function openEditRule(r) {
      ruleModalMode.value = 'edit';
      Object.assign(ruleForm, { ...r });
      showRuleModal.value = true;
    }
    function saveRule() {
      if (ruleModalMode.value === 'create') {
        const id = 'R' + Date.now().toString().slice(-6);
        categoryRules.value.push({ ...ruleForm, id, categoryId: currentCategory.value.id });
      } else {
        const idx = categoryRules.value.findIndex(x => x.id === ruleForm.id);
        if (idx >= 0) categoryRules.value.splice(idx, 1, { ...ruleForm });
      }
      showRuleModal.value = false;
    }
    function toggleRuleEnabled(r) {
      const idx = categoryRules.value.findIndex(x => x.id === r.id);
      if (idx >= 0) categoryRules.value.splice(idx, 1, { ...r, enabled: !r.enabled });
    }
    function commandParamsSummary(cmd) {
      const hp = Number(cmd.hasParam);
      const dt = cmd.dataType || '';
      const u = cmd.unit && cmd.unit !== '-' ? cmd.unit : '';
      if (!hp || dt === 'bool') {
        return (dt ? dt : '无参') + (u ? ' · ' + u : '') + ' · 无 params';
      }
      const fields = getCommandParamFields(cmd);
      if (fields.length) {
        const keys = fields.map(f => f.key).join(', ');
        return (dt || '带参') + '{ ' + keys + ' }' + (u ? ' / ' + u : '');
      }
      const req = cmd.required ? '必填' : '选填';
      const hasMin = cmd.paramMin !== '' && cmd.paramMin != null;
      const hasMax = cmd.paramMax !== '' && cmd.paramMax != null;
      const range = (hasMin || hasMax)
        ? '[' + (hasMin ? cmd.paramMin : '') + '~' + (hasMax ? cmd.paramMax : '') + ']'
        : '';
      return (dt || '带参') + (u ? '/' + u : '') + '/' + req + (range ? '/' + range : '');
    }
    function onCommandHasParamChange() {
      const hp = Number(commandForm.hasParam);
      commandForm.hasParam = hp ? 1 : 0;
      if (!hp) {
        commandForm.paramMin = null;
        commandForm.paramMax = null;
        if (!commandForm.dataType) commandForm.dataType = 'bool';
        if (!commandForm.unit) commandForm.unit = 'F0/0F';
      }
    }
    function openCreateCommand() {
      commandModalMode.value = 'create';
      Object.assign(commandForm, {
        id: '', categoryId: currentCategory.value.id, name: '', code: '', desc: '',
        hasParam: 0, bitIndex: 1, payloadOffset: 25,
        dataType: 'bool', unit: 'F0/0F', required: true, access: 'w',
        paramMin: null, paramMax: null, enabled: true
      });
      showCommandModal.value = true;
    }
    function openEditCommand(c) {
      commandModalMode.value = 'edit';
      const hp = c.hasParam != null ? Number(c.hasParam) : (c.hasParams ? 1 : 0);
      Object.assign(commandForm, {
        id: c.id,
        categoryId: c.categoryId,
        name: c.name || '',
        code: c.code || '',
        desc: c.desc || '',
        hasParam: hp ? 1 : 0,
        bitIndex: c.bitIndex != null ? c.bitIndex : (c.cmdBit != null ? Number(c.cmdBit) + 1 : 1),
        payloadOffset: c.payloadOffset == null ? 25 : c.payloadOffset,
        dataType: c.dataType || (hp ? 'int' : 'bool'),
        unit: c.unit || (hp ? '' : 'F0/0F'),
        required: c.required != null ? !!c.required : true,
        access: c.access || 'w',
        paramMin: c.paramMin != null ? c.paramMin : null,
        paramMax: c.paramMax != null ? c.paramMax : null,
        enabled: c.enabled != null ? !!c.enabled : true
      });
      showCommandModal.value = true;
    }
    function saveCommand() {
      const hasParam = Number(commandForm.hasParam) ? 1 : 0;
      const toNumOrNull = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const payload = {
        id: commandForm.id,
        categoryId: currentCategory.value.id,
        code: (commandForm.code || '').trim(),
        name: (commandForm.name || '').trim(),
        desc: commandForm.desc || '',
        hasParam,
        bitIndex: Number(commandForm.bitIndex),
        payloadOffset: commandForm.payloadOffset === '' || commandForm.payloadOffset == null ? 25 : Number(commandForm.payloadOffset),
        dataType: commandForm.dataType || (hasParam ? 'int' : 'bool'),
        unit: (commandForm.unit || '').trim(),
        required: !!commandForm.required,
        access: commandForm.access || 'w',
        paramMin: hasParam ? toNumOrNull(commandForm.paramMin) : null,
        paramMax: hasParam ? toNumOrNull(commandForm.paramMax) : null,
        enabled: !!commandForm.enabled
      };
      if (commandModalMode.value === 'create') {
        payload.id = 'CMD' + Date.now().toString().slice(-6);
        payload.params = hasParam && payload.dataType !== 'bool' ? { value: { label: payload.name || 'value', min: payload.paramMin, max: payload.paramMax, unit: payload.unit } } : null;
        commandList.value.push(payload);
      } else {
        const idx = commandList.value.findIndex(x => x.id === commandForm.id);
        if (idx >= 0) {
          const prev = commandList.value[idx];
          payload.params = prev.params != null ? prev.params : (hasParam && payload.dataType !== 'bool' ? { value: { label: payload.name || 'value', min: payload.paramMin, max: payload.paramMax, unit: payload.unit } } : null);
          commandList.value.splice(idx, 1, payload);
        }
      }
      showCommandModal.value = false;
    }
    function toggleCommandEnabled(c) {
      const idx = commandList.value.findIndex(x => x.id === c.id);
      if (idx >= 0) commandList.value.splice(idx, 1, { ...c, enabled: !c.enabled });
    }
    function openCreateProperty() {
      if (!currentCategory.value) return;
      propertyModalMode.value = 'create';
      Object.assign(propertyForm, {
        id: '', categoryId: currentCategory.value.id, identifier: '', name: '', dataType: 'float', unit: '',
        access: '只读', reportCycle: '60s', required: true, showInMonitor: true
      });
      showPropertyModal.value = true;
    }
    function openEditProperty(p) {
      propertyModalMode.value = 'edit';
      Object.assign(propertyForm, {
        id: p.id, categoryId: p.categoryId, identifier: p.identifier, name: p.name,
        dataType: p.dataType || 'float', unit: p.unit || '', access: p.access || '只读',
        reportCycle: p.reportCycle || '60s', required: !!p.required,
        showInMonitor: p.showInMonitor !== false
      });
      showPropertyModal.value = true;
    }
    function saveProperty() {
      const ident = (propertyForm.identifier || '').trim();
      const name = (propertyForm.name || '').trim();
      if (!ident || !name) { showToast('请填写标识符与名称', 'warn'); return; }
      const payload = {
        id: propertyForm.id || ('P' + Date.now().toString().slice(-6)),
        categoryId: propertyForm.categoryId || currentCategory.value?.id,
        kind: 'property',
        identifier: ident,
        name,
        dataType: propertyForm.dataType || 'float',
        unit: (propertyForm.unit || '').trim(),
        access: propertyForm.access || '只读',
        reportCycle: propertyForm.reportCycle || '60s',
        required: !!propertyForm.required,
        showInMonitor: propertyForm.showInMonitor !== false
      };
      if (propertyModalMode.value === 'create') {
        propertyList.value.push(payload);
      } else {
        const idx = propertyList.value.findIndex(x => x.id === propertyForm.id);
        if (idx >= 0) propertyList.value.splice(idx, 1, payload);
      }
      showPropertyModal.value = false;
    }
    function togglePropertyShowInMonitor(p) {
      const idx = propertyList.value.findIndex(x => x.id === p.id);
      if (idx < 0) return;
      const next = !(p.showInMonitor !== false);
      propertyList.value.splice(idx, 1, { ...p, showInMonitor: next });
    }
    function categoryMatchLabel(m) {
      if (m === 'auto') return '自动匹配';
      if (m === 'manual') return '人工改挂';
      if (m === 'none') return '未分类';
      return m || '—';
    }
    function isUnassigned(d) {
      return !d || !d.projectId;
    }
    function displayProjectName(d) {
      if (!d) return '—';
      if (!d.projectId) return UNASSIGNED_PROJECT_NAME;
      return d.projectName || projectName(d.projectId);
    }

    function firmwareIsReferenced(f) {
      if (!f) return false;
      const url = f.packageUrl ? String(f.packageUrl).trim() : '';
      const sameUrl = (value) => url && value && String(value).trim() === url;
      const taskHit = categoryOtaTasks.value.some(t => t.firmwareId === f.id || sameUrl(t.packageUrl));
      const logHit = deviceUpgradeLogs.value.some(r => r.firmwareId === f.id || sameUrl(r.packageUrl));
      return taskHit || logHit;
    }
    function openFirmwareDelete(rows) {
      const list = (rows || []).filter(Boolean);
      if (!list.length) {
        showToast('请选择要删除的固件', 'warn');
        return;
      }
      deleteTarget.type = list.length > 1 ? '固件批量' : '固件版本';
      deleteTarget.id = list.length === 1 ? list[0].id : '';
      deleteTarget.ids = list.map(f => f.id);
      deleteTarget.name = list.map(f => (f.packageName || f.upgradeVersion || f.id)).join('、');
      deleteTarget.blocked = false;
      showDeleteConfirm.value = true;
    }
    function confirmDelete(type, id, name) {
      if (type === '固件版本') {
        openFirmwareDelete([FIRMWARES.find(f => f.id === id)]);
        return;
      }
      deleteTarget.type = type;
      deleteTarget.id = id;
      deleteTarget.name = name;
      deleteTarget.ids = [];
      deleteTarget.blocked = false;
      showDeleteConfirm.value = true;
    }
    function toggleFirmwareSelect(id) {
      const arr = firmwareSelectedIds.value.slice();
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(id);
      firmwareSelectedIds.value = arr;
    }
    function toggleFirmwareSelectAll() {
      const ids = categoryFirmwares.value.map(f => f.id);
      const allOn = ids.length && ids.every(id => firmwareSelectedIds.value.includes(id));
      firmwareSelectedIds.value = allOn ? firmwareSelectedIds.value.filter(id => !ids.includes(id)) : ids.slice();
    }
    function confirmBatchDeleteFirmware() {
      const rows = categoryFirmwares.value.filter(f => firmwareSelectedIds.value.includes(f.id));
      openFirmwareDelete(rows);
    }
    function doDelete() {
      const isFirmware = deleteTarget.type === '固件版本' || deleteTarget.type === '固件批量';
      if (!isFirmware) {
        showDeleteConfirm.value = false;
        return;
      }
      const ids = (deleteTarget.ids && deleteTarget.ids.length) ? deleteTarget.ids.slice() : [deleteTarget.id];
      const rows = ids.map(id => FIRMWARES.find(f => f.id === id)).filter(Boolean);
      if (rows.some(firmwareIsReferenced)) {
        deleteTarget.blocked = true;
        showToast(FIRMWARE_DELETE_REFUSED, 'warn');
        return;
      }
      for (let i = FIRMWARES.length - 1; i >= 0; i--) {
        if (ids.indexOf(FIRMWARES[i].id) >= 0) FIRMWARES.splice(i, 1);
      }
      firmwareSelectedIds.value = firmwareSelectedIds.value.filter(id => ids.indexOf(id) < 0);
      firmwareRevision.value += 1;
      showDeleteConfirm.value = false;
      showToast('已删除 ' + rows.length + ' 条固件（mock）', 'ok');
    }

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
      Object.assign(firmwareForm, { id: '', model: '', currentVersion: '', upgradeVersion: '', releaseDate: '', status: '可升级', packageUrl: '', packageName: '', packageSize: null, changelog: '' });
      firmwareUploading.value = false;
      screen.value = 'editFirmware';
    }
    function triggerFirmwareUpload() {
      const el = firmwareUploadInput.value;
      if (el) el.click();
    }
    function onFirmwarePackageSelected(ev) {
      const file = ev && ev.target && ev.target.files && ev.target.files[0];
      if (!file) return;
      // mock：正式对接 POST /storage/file multipart(part=file; path=firmware; isPrivate=0)
      // 文件名 → packageName；Result.data.fileUrl → packageUrl；Result.data.fileSize（字节）→ packageSize
      // releaseDate 不在上传时手填，保存时自动写入
      firmwareUploading.value = true;
      const name = file.name || 'firmware.bin';
      const fileSize = Number(file.size) || 0;
      setTimeout(() => {
        firmwareForm.packageName = name;
        firmwareForm.packageUrl = 'http://instrument.aquaroot.cn/api/storage/file/mock-fw-key';
        firmwareForm.packageSize = fileSize;
        firmwareUploading.value = false;
        showToast('固件包已上传（mock）→ packageName / packageUrl / packageSize=' + fileSize, 'ok');
        if (ev && ev.target) ev.target.value = '';
      }, 350);
    }
    function firmwareToday() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    }
    function saveFirmware() {
      const categoryId = currentCategory.value && currentCategory.value.id;
      if (!categoryId) {
        showToast('categoryId 必填', 'warn');
        return;
      }
      const ver = String(firmwareForm.upgradeVersion || '').trim();
      if (!ver) {
        showToast('upgradeVersion 必填', 'warn');
        return;
      }
      const pkg = String(firmwareForm.packageUrl || '').trim();
      if (!pkg) {
        showToast('packageUrl 必填：请先上传升级包回填地址', 'warn');
        return;
      }
      firmwareForm.upgradeVersion = ver;
      firmwareForm.packageUrl = pkg;
      // releaseDate 选填；不传时后端默认今天。界面不提供输入，列表展示该默认日期。
      const releaseDate = firmwareToday();
      FIRMWARES.unshift({
        id: 'F' + Date.now(),
        categoryId,
        model: '',
        currentVersion: '',
        upgradeVersion: ver,
        releaseDate,
        status: '可升级',
        packageUrl: pkg,
        packageName: firmwareForm.packageName || '',
        packageSize: (firmwareForm.packageSize === 0 || firmwareForm.packageSize) ? firmwareForm.packageSize : null,
        changelog: ''
      });
      firmwareRevision.value += 1;
      screen.value = 'detail';
      detailTab.value = 'firmware';
      showToast('固件已登记（mock）· upgradeVersion ' + ver + ' · releaseDate ' + releaseDate, 'ok');
    }

    /* ---- 设备台账 actions ---- */
    function goProjects() { module.value = 'ledger'; screen.value = 'projects'; }
    function goDevices() { module.value = 'ledger'; screen.value = 'devices'; }
    function goUnassignedDevices() {
      deviceProjectFilter.value = UNASSIGNED_PROJECT_ID;
      deviceCategoryFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      selectedDeviceIds.value = [];
      goDevices();
    }
    function goAepReconcile() { module.value = 'ledger'; screen.value = 'aepReconcile'; aepDiffTab.value = 'extra'; }

    function openCreateProject() {
      projectModalMode.value = 'create';
      Object.assign(projectForm, { id: '', name: '', status: '筹备中', owner: '', region: '', startedAt: '2026-09-30', desc: '', aepProductId: '', aepProductName: '' });
      showProjectModal.value = true;
    }
    function openEditProject(p) {
      projectModalMode.value = 'edit';
      Object.assign(projectForm, { id: p.id, name: p.name, status: p.status, owner: p.owner, region: p.region, startedAt: p.startedAt, desc: p.desc || '', aepProductId: p.aepProductId || '', aepProductName: p.aepProductName || '' });
      showProjectModal.value = true;
    }
    function saveProject() { showProjectModal.value = false; }

    /** 清空台账筛选项，进入全部设备（工作台「设备总数」） */
    function openAllDevices() {
      deviceProjectFilter.value = '';
      deviceCategoryFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      deviceMasterFilter.value = '';
      deviceSlaveCategoryFilter.value = '';
      showProbeDevices.value = false;
      selectedDeviceIds.value = [];
      goDevices();
    }

    function openDevicesForProject(p) {
      const pid = (p && typeof p === 'object') ? p.id : p;
      deviceProjectFilter.value = pid || '';
      deviceCategoryFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      deviceMasterFilter.value = '';
      deviceSlaveCategoryFilter.value = '';
      selectedDeviceIds.value = [];
      goDevices();
    }

    /**
     * 工作台下钻 → 设备台账筛选项对照（对齐 FE）：
     * - 设备总数 → 清空筛选
     * - 在线/离线/待接入 → lifecycle（BE status 0/1/2）
     * - 品类 aio → category=aio（仅主机）
     * - 子品类 / 独立品类 → categoryId
     * - 未分类 → __uncat__（空 categoryId）
     * - 项目卡片 → projectId
     * - 项目卡片内 在线/离线/待接入 → projectId + lifecycle
     * - 未定义/例外池 → projectId=__unassigned__（空 projectId）
     * - 例外池内状态数字 → __unassigned__ + lifecycle
     * - 在线率偏低仅视觉，整卡仍只带 projectId
     */
    function openDevicesForProjectLifecycle(p, lifecycle) {
      const pid = (p && typeof p === 'object') ? p.id : p;
      deviceProjectFilter.value = pid || '';
      deviceLifecycleFilter.value = lifecycle || '';
      deviceCategoryFilter.value = '';
      deviceImeiSearch.value = '';
      deviceMasterFilter.value = '';
      deviceSlaveCategoryFilter.value = '';
      selectedDeviceIds.value = [];
      goDevices();
    }

    /**
     * 品类侧双向挂靠：跳转台账并按品类筛选。
     * - 普通品类 id → deviceCategoryFilter=id
     * - 顶层「未分类」→ deviceCategoryFilter='__uncat__'（空 categoryId 设备）
     * - 一体机 aio → deviceCategoryFilter='aio'（仅主机）
     * - 子设备条带 role=child：进一体机列表，并按「其下有该子品类/未分类探头」筛主机（deviceSlaveCategoryFilter）
     */
    function openDevicesForCategory(c) {
      const raw = typeof c === 'string' ? c : (c && (c.id || c.code));
      const role = (typeof c === 'object' && c && c.role) || '';
      const uncategorized = (typeof c === 'object' && c && c.uncategorized) || raw === '__uncat__' || raw === 'uncategorized' || raw === '__child_uncat__';
      deviceProjectFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      deviceMasterFilter.value = '';
      selectedDeviceIds.value = [];
      if (role === 'child') {
        /* 点子类型/未分类 → 有对应子设备的一体机父列表，再进详情看探头 */
        deviceCategoryFilter.value = 'aio';
        deviceSlaveCategoryFilter.value = uncategorized ? '__uncat__' : (raw || '');
        showProbeDevices.value = false;
        goDevices();
        return;
      }
      deviceSlaveCategoryFilter.value = '';
      deviceCategoryFilter.value = uncategorized ? '__uncat__' : (raw || '');
      showProbeDevices.value = deviceCategoryFilter.value !== 'aio';
      goDevices();
    }

    /**
     * 工作台生命周期下钻 → 设备台账。
     * Mock 用中文 lifecycle；FE 对齐 BE list status：0=待接入 / 1=在线 / 2=离线。
     */
    const LIFECYCLE_TO_STATUS = { '待接入': 0, '在线': 1, '离线': 2 };
    function openDevicesForLifecycle(lc) {
      deviceLifecycleFilter.value = lc || '';
      deviceProjectFilter.value = '';
      deviceCategoryFilter.value = '';
      deviceImeiSearch.value = '';
      deviceMasterFilter.value = '';
      deviceSlaveCategoryFilter.value = '';
      selectedDeviceIds.value = [];
      goDevices();
      /* FE mirror: GET devices?status=LIFECYCLE_TO_STATUS[lc] */
      return LIFECYCLE_TO_STATUS[lc];
    }

    function showToast(text, type) {
      toast.text = text;
      toast.type = type || 'ok';
      toast.show = true;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.show = false; }, 2800);
    }

    function resetDispatchState() {
      dispatchSelected.value = [];
      Object.keys(dispatchParams).forEach(k => delete dispatchParams[k]);
      dispatchPreviewHex.value = '';
      dispatchPreviewOk.value = false;
    }

    /** 点发表单字段：对齐后端 commands[].params 键 */
    function getCommandParamFields(cmd) {
      const code = cmd.code || '';
      if (!Number(cmd.hasParam) || cmd.dataType === 'bool') return [];
      if (cmd.params && typeof cmd.params === 'object' && !Array.isArray(cmd.params)) {
        return Object.keys(cmd.params).map(key => {
          const meta = cmd.params[key] || {};
          return {
            key,
            label: meta.label || key,
            min: meta.min != null ? meta.min : null,
            max: meta.max != null ? meta.max : null,
            unit: meta.unit || ''
          };
        });
      }
      if (code === 'resendRange') {
        return [
          { key: 'start', label: '起始包序列号', min: 0, max: 16777215, unit: '' },
          { key: 'end', label: '结束包序列号', min: 0, max: 16777215, unit: '' }
        ];
      }
      if (code === 'sampleInterval' || code === 'sendInterval') {
        return [
          { key: 'longMin', label: '长(无水)分钟', min: 1, max: 65535, unit: 'min' },
          { key: 'midMin', label: '中', min: 1, max: 255, unit: 'min' },
          { key: 'shortMin', label: '短', min: 1, max: 255, unit: 'min' }
        ];
      }
      if (code === 'switchThreshold') {
        return [
          { key: 'high', label: '高水位', min: 0, max: 65535, unit: 'mm' },
          { key: 'low', label: '低水位', min: 0, max: 65535, unit: 'mm' }
        ];
      }
      // 单值：params.value
      return [{
        key: 'value',
        label: code === 'syncTime' ? 'unix 秒' : (cmd.name || 'value'),
        min: cmd.paramMin != null ? cmd.paramMin : null,
        max: cmd.paramMax != null ? cmd.paramMax : null,
        unit: cmd.unit && cmd.unit !== '-' ? cmd.unit : (code === 'syncTime' ? 's' : '')
      }];
    }

    function defaultParamsForCommand(cmd) {
      if (cmd && cmd.code === 'openAngle') return { value: 35 };
      if (cmd && cmd.code === 'changeDeviceSn') return { value: '' };
      const fields = getCommandParamFields(cmd);
      const out = {};
      for (const f of fields) {
        if (cmd.code === 'syncTime' && f.key === 'value') {
          out[f.key] = Math.floor(Date.now() / 1000);
        } else if (f.min != null) {
          out[f.key] = Number(f.min);
        } else {
          out[f.key] = 0;
        }
      }
      // switchThreshold 默认 high＞low
      if (cmd.code === 'switchThreshold') {
        if (out.high == null) out.high = 1;
        if (out.low == null) out.low = 0;
        if (!(Number(out.high) > Number(out.low))) {
          out.high = Number(out.low) + 1;
        }
      }
      return out;
    }

    function ensureDispatchParamsObject(cmd) {
      const cur = dispatchParams[cmd.code];
      if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
        dispatchParams[cmd.code] = defaultParamsForCommand(cmd);
      } else {
        const fields = getCommandParamFields(cmd);
        const next = { ...cur };
        let changed = false;
        for (const f of fields) {
          if (next[f.key] === undefined || next[f.key] === '') {
            const def = defaultParamsForCommand(cmd);
            next[f.key] = def[f.key];
            changed = true;
          }
        }
        if (changed) dispatchParams[cmd.code] = next;
      }
      return dispatchParams[cmd.code];
    }

    function guessPayloadBytes(cmd) {
      const code = cmd.code || '';
      if (!Number(cmd.hasParam)) return 1;
      if (code === 'installHeightMm' || code === 'raiseHeightMm' || code === 'sinkHeightMm') return 2;
      if (code === 'syncTime') return 4;
      if (code === 'switchThreshold') return 4;
      if (code === 'resendRange') return 6;
      if (code === 'sampleInterval' || code === 'sendInterval') return 6;
      if (cmd.dataType === 'int') return 4;
      if (cmd.dataType === 'float') return 4;
      if (cmd.dataType === 'object') return 6;
      return 2;
    }

    function writeUintBE(buf, offset, value, nbytes) {
      let v = Math.max(0, Math.floor(Number(value) || 0));
      for (let i = nbytes - 1; i >= 0; i--) {
        if (offset + i < buf.length) buf[offset + i] = v & 0xff;
        v = Math.floor(v / 256);
      }
    }

    /** 将 commands[].params 写入内容区（示意组包） */
    function writeCommandParams(buf, i, cmd, paramsObj) {
      const code = cmd.code || '';
      const p = paramsObj && typeof paramsObj === 'object' ? paramsObj : {};
      if (code === 'resendRange') {
        writeUintBE(buf, i, p.start, 3);
        writeUintBE(buf, i + 3, p.end, 3);
        return;
      }
      if (code === 'sampleInterval' || code === 'sendInterval') {
        writeUintBE(buf, i, p.longMin, 2);
        writeUintBE(buf, i + 2, p.midMin, 2);
        writeUintBE(buf, i + 4, p.shortMin, 2);
        return;
      }
      if (code === 'switchThreshold') {
        writeUintBE(buf, i, p.high, 2);
        writeUintBE(buf, i + 2, p.low, 2);
        return;
      }
      const n = guessPayloadBytes(cmd);
      const v = p.value != null ? p.value : p;
      writeUintBE(buf, i, v, n);
    }

    /** 示意组包：FAFA…ADAD；字节17–24 命令位；内容自 payloadOffset 写入 */
    function packContentHex(cmds, paramsMap) {
      let maxEnd = 56;
      for (const c of cmds) {
        const off = Number(c.payloadOffset) || 25;
        maxEnd = Math.max(maxEnd, off - 1 + guessPayloadBytes(c));
      }
      const frameLen = Math.max(64, maxEnd + 2);
      const buf = new Uint8Array(frameLen);
      buf[0] = 0xfa; buf[1] = 0xfa;
      buf[frameLen - 2] = 0xad; buf[frameLen - 1] = 0xad;
      for (const c of cmds) {
        const bit = Number(c.bitIndex);
        if (bit >= 1 && bit <= 64) {
          const byteIdx = 16 + Math.floor((bit - 1) / 8);
          const bitInByte = (bit - 1) % 8;
          if (byteIdx < frameLen) buf[byteIdx] |= (1 << bitInByte);
        }
        const off = Number(c.payloadOffset);
        if (!off || off < 1) continue;
        const i = off - 1;
        if (!Number(c.hasParam) || c.dataType === 'bool') {
          if (i < frameLen) buf[i] = 0xf0;
        } else {
          writeCommandParams(buf, i, c, paramsMap[c.code]);
        }
      }
      return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function isDispatchSelected(id) {
      return dispatchSelected.value.includes(id);
    }

    function toggleDispatchCmd(cmd) {
      const id = cmd.id;
      const idx = dispatchSelected.value.indexOf(id);
      if (idx >= 0) {
        dispatchSelected.value = dispatchSelected.value.filter(x => x !== id);
      } else {
        dispatchSelected.value = [...dispatchSelected.value, id];
        if (Number(cmd.hasParam) && cmd.dataType !== 'bool') {
          ensureDispatchParamsObject(cmd);
        }
      }
      dispatchPreviewOk.value = false;
    }

    function validateDispatch() {
      const cmds = dispatchSelectedCmds.value;
      if (!cmds.length) return '请至少勾选一条指令';
      for (const c of cmds) {
        if (!Number(c.hasParam) || c.dataType === 'bool') continue;
        const fields = getCommandParamFields(c);
        const p = dispatchParams[c.code];
        if (!p || typeof p !== 'object') return '「' + c.name + '」需要填写 params';
        for (const f of fields) {
          const v = p[f.key];
          if (v === '' || v === null || v === undefined) {
            return '「' + c.name + '」.' + f.key + '（' + f.label + '）需要填写';
          }
          const n = Number(v);
          if (!Number.isFinite(n) || !Number.isInteger(n)) {
            return '「' + c.name + '」.' + f.key + ' 须为整数';
          }
          if (f.min != null && n < Number(f.min)) {
            return '「' + c.name + '」.' + f.key + ' 不能小于 ' + f.min;
          }
          if (f.max != null && n > Number(f.max)) {
            return '「' + c.name + '」.' + f.key + ' 不能大于 ' + f.max;
          }
        }
        if (c.code === 'resendRange') {
          if (Number(p.start) > Number(p.end)) return '「重发区间」start 须 ≤ end';
        }
        if (c.code === 'switchThreshold') {
          if (!(Number(p.high) > Number(p.low))) return '「切换频率」high 须 ＞ low';
        }
      }
      return '';
    }

    function buildDispatchPayload() {
      return dispatchSelectedCmds.value.map(c => {
        const item = { identifier: c.code, name: c.name, bitIndex: c.bitIndex };
        if (Number(c.hasParam) && c.dataType !== 'bool') {
          item.params = { ...(dispatchParams[c.code] || {}) };
        }
        return item;
      });
    }

    function dryRunDispatch() {
      const err = validateDispatch();
      if (err) { showToast(err, 'warn'); return; }
      const hex = packContentHex(dispatchSelectedCmds.value, dispatchParams);
      dispatchPreviewHex.value = hex;
      dispatchPreviewOk.value = true;
      showToast('dryRun 预览已生成（contentHex）', 'ok');
    }

    function sendDispatch() {
      const err = validateDispatch();
      if (err) { showToast(err, 'warn'); return; }
      if (!dispatchPreviewOk.value || !dispatchPreviewHex.value) {
        const hex = packContentHex(dispatchSelectedCmds.value, dispatchParams);
        dispatchPreviewHex.value = hex;
        dispatchPreviewOk.value = true;
      }
      const d = currentDevice.value;
      const n = dispatchSelectedCmds.value.length;
      // mock POST /iot/devices/{id}/commands/send  body: { commands:[{identifier,params}], contentHex }
      const _payload = { commands: buildDispatchPayload(), contentHex: dispatchPreviewHex.value };
      void _payload;
      showToast('已下发 ' + n + ' 条指令 → ' + (d?.name || d?.imei || '设备') + '（mock POST send）', 'ok');
    }

    
    function resetBatchDispatchState() {
      batchCmdId.value = '';
      Object.keys(batchParams).forEach(k => delete batchParams[k]);
      batchProjectFilter.value = '';
      batchOnlineOnly.value = true;
      batchSelectedDeviceIds.value = [];
      batchPreviewHex.value = '';
      batchPreviewOk.value = false;
      batchJobSummary.value = null;
    }

    function onBatchCommandChange() {
      Object.keys(batchParams).forEach(k => delete batchParams[k]);
      batchPreviewHex.value = '';
      batchPreviewOk.value = false;
      const cmd = batchSelectedCommand.value;
      if (cmd && Number(cmd.hasParam) && cmd.dataType !== 'bool') {
        const def = defaultParamsForCommand(cmd);
        Object.assign(batchParams, def);
      }
    }

    function isBatchDeviceSelected(id) {
      return batchSelectedDeviceIds.value.includes(id);
    }

    function toggleBatchDevice(id) {
      if (isBatchDeviceSelected(id)) {
        batchSelectedDeviceIds.value = batchSelectedDeviceIds.value.filter(x => x !== id);
      } else {
        batchSelectedDeviceIds.value = [...batchSelectedDeviceIds.value, id];
      }
    }

    function toggleBatchDevicesAll() {
      const ids = batchCandidateDevices.value.map(d => d.id);
      if (ids.length && ids.every(id => isBatchDeviceSelected(id))) {
        batchSelectedDeviceIds.value = batchSelectedDeviceIds.value.filter(id => !ids.includes(id));
      } else {
        const set = new Set([...batchSelectedDeviceIds.value, ...ids]);
        batchSelectedDeviceIds.value = [...set];
      }
    }

    function validateBatchDispatch() {
      const cmd = batchSelectedCommand.value;
      if (!cmd) return '请选择一条可批量下发的指令';
      if (!batchSelectedDeviceIds.value.length) return '请至少选择一台设备';
      if (Number(cmd.hasParam) && cmd.dataType !== 'bool') {
        const fields = getCommandParamFields(cmd);
        for (const f of fields) {
          const v = batchParams[f.key];
          if (v === '' || v === null || v === undefined) {
            return '请填写参数「' + f.label + '」';
          }
          const n = Number(v);
          if (!Number.isFinite(n) || !Number.isInteger(n)) return '参数「' + f.label + '」须为整数';
          if (f.min != null && n < Number(f.min)) return '参数「' + f.label + '」不能小于 ' + f.min;
          if (f.max != null && n > Number(f.max)) return '参数「' + f.label + '」不能大于 ' + f.max;
        }
        if (cmd.code === 'switchThreshold' && !(Number(batchParams.high) > Number(batchParams.low))) {
          return 'high 须 ＞ low';
        }
      }
      return '';
    }

    function dryRunBatchDispatch() {
      const err = validateBatchDispatch();
      if (err) { showToast(err, 'warn'); return; }
      const cmd = batchSelectedCommand.value;
      const paramsMap = {};
      if (Number(cmd.hasParam) && cmd.dataType !== 'bool') {
        paramsMap[cmd.code] = { ...batchParams };
      }
      batchPreviewHex.value = packContentHex([cmd], paramsMap);
      batchPreviewOk.value = true;
      showToast('批量 dryRun 样例 contentHex 已生成（共 ' + batchSelectedDeviceIds.value.length + ' 台）', 'ok');
    }

    function confirmBatchDispatch() {
      const err = validateBatchDispatch();
      if (err) { showToast(err, 'warn'); return; }
      if (!batchPreviewOk.value) {
        dryRunBatchDispatch();
        if (!batchPreviewOk.value) return;
      }
      const cmd = batchSelectedCommand.value;
      const total = batchSelectedDeviceIds.value.length;
      // mock：在线成功、其余失败示意
      const selected = deviceList.value.filter(d => batchSelectedDeviceIds.value.includes(d.id));
      const success = selected.filter(d => d.lifecycle === '在线').length;
      const fail = total - success;
      batchJobSummary.value = {
        total, success, fail,
        command: cmd.code + ' · ' + cmd.name,
        at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      showToast('批量下发任务已提交（mock）：' + total + ' 台 · 成功 ' + success + ' / 失败 ' + fail, success && !fail ? 'ok' : 'warn');
    }

    function firmwareTargetVer(f) {
      if (!f) return '';
      return f.upgradeVersion || f.currentVersion || '';
    }

    function findFirmwareByTargetVer(list, ver) {
      if (!ver) return null;
      const rows = list || [];
      return rows.find(f => firmwareTargetVer(f) === ver)
        || rows.find(f => f.currentVersion === ver || f.upgradeVersion === ver)
        || null;
    }

    function packageUrlFromFirmware(f) {
      return (f && f.packageUrl) ? String(f.packageUrl).trim() : '';
    }

    function onDeviceOtaTargetChange() {
      const f = findFirmwareByTargetVer(deviceOtaFirmwareOptions.value, deviceOtaTargetVer.value);
      deviceOtaPackageUrl.value = packageUrlFromFirmware(f);
    }

    function onCategoryOtaTargetChange() {
      categoryOtaSelectedIds.value = [];
      const f = findFirmwareByTargetVer(categoryFirmwares.value, categoryOtaTargetVer.value);
      if (f) {
        categoryOtaFirmwareId.value = f.id;
        categoryOtaPackageUrl.value = packageUrlFromFirmware(f);
      } else {
        categoryOtaFirmwareId.value = '';
        categoryOtaPackageUrl.value = '';
      }
    }

    function openDeviceOtaModal() {
      const d = currentDevice.value;
      const cat = d && CATEGORIES.find(c => c.id === d.categoryId);
      deviceOtaRejectText.value = (d && !isUpgradeSupported(cat)) ? OTA_CATEGORY_REJECT_MSG : '';
      const opts = deviceOtaFirmwareOptions.value;
      const prefer = opts.find(f => f.upgradeVersion) || opts[0];
      deviceOtaTargetVer.value = prefer
        ? firmwareTargetVer(prefer)
        : '';
      deviceOtaPackageUrl.value = packageUrlFromFirmware(prefer);
      showDeviceOtaModal.value = true;
    }

    function submitDeviceOta() {
      const d = currentDevice.value;
      if (!d) return;
      const cat = CATEGORIES.find(c => c.id === d.categoryId);
      if (!isUpgradeSupported(cat)) {
        deviceOtaRejectText.value = OTA_CATEGORY_REJECT_MSG;
        showToast(OTA_CATEGORY_REJECT_MSG, 'warn');
        return;
      }
      const toVer = deviceOtaTargetVer.value;
      if (!toVer) { showToast('请选择目标固件版本', 'warn'); return; }
      const pkg = String(deviceOtaPackageUrl.value || '').trim();
      if (!pkg) { showToast('请填写包地址 packageUrl 后才能提交', 'warn'); return; }
      if (!(compareSemver(d.firmware, toVer) < 0)) {
        showToast('目标版本须高于当前固件 ' + (d.firmware || '—'), 'warn');
        return;
      }
      const fw = findFirmwareByTargetVer(deviceOtaFirmwareOptions.value, toVer);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const task = {
        id: 'OT' + Date.now(),
        categoryId: cat.id,
        deviceId: d.id,
        fromVerHint: d.firmware || '',
        toVer,
        packageUrl: pkg,
        firmwareId: fw ? fw.id : '',
        createdAt: now,
        operator: '当前用户',
        deviceCount: 1,
        success: 0,
        fail: 0,
        pending: 1,
        status: 0,
        timeoutMinutes: OTA_TIMEOUT_DEFAULT,
        excluded: [],
      };
      const row = {
        id: 'UL' + Date.now(),
        deviceId: d.id,
        taskId: task.id,
        time: now,
        fromVersion: (d.softwareVersion === 0 || d.softwareVersion) ? d.softwareVersion : null,
        fromVer: d.firmware || '—',
        toVer,
        packageUrl: pkg,
        status: 0,
        progress: 0,
        sentPackage: 0,
        remainPackage: null,
        operator: '当前用户',
        failReason: ''
      };
      categoryOtaTasks.value = [task, ...categoryOtaTasks.value];
      deviceUpgradeLogs.value = [row, ...deviceUpgradeLogs.value];
      otaCreateResult.value = {
        taskId: task.id,
        at: now,
        categoryId: cat.id,
        deviceId: d.id,
        toVer,
        firmwareId: task.firmwareId,
        packageUrl: pkg,
        timeoutMinutes: OTA_TIMEOUT_DEFAULT,
        accepted: 1,
        acceptedDevices: [{ deviceId: d.id, name: d.name }],
        excluded: [],
      };
      deviceOtaRejectText.value = '';
      showDeviceOtaModal.value = false;
      deviceDetailTab.value = 'upgradeLog';
      showToast('已 POST /iot/otaTask（deviceId + categoryId）创建任务 ' + task.id + '，再挂本机升级记录 → ' + toVer, 'ok');
    }

    function openCategoryBatchOta(fw) {
      const cat = currentCategory.value;
      const supported = isUpgradeSupported(cat);
      categoryOtaCategoryId.value = supported ? cat.id : '';
      categoryOtaRejectText.value = supported ? '' : OTA_CATEGORY_REJECT_MSG;
      categoryOtaFirmwareId.value = fw ? fw.id : '';
      categoryOtaTargetVer.value = fw
        ? firmwareTargetVer(fw)
        : '';
      categoryOtaPackageUrl.value = packageUrlFromFirmware(fw);
      categoryOtaSelectedIds.value = [];
      categoryOtaOnlineOnly.value = true;
      categoryOtaTimeoutMinutes.value = OTA_TIMEOUT_DEFAULT;
      categoryOtaExtraIds.value = '';
      showCategoryOtaModal.value = true;
    }

    function onCategoryOtaCategoryChange(ev) {
      if (ev && ev.target) categoryOtaCategoryId.value = ev.target.value;
      const cat = CATEGORIES.find(c => c.id === categoryOtaCategoryId.value);
      categoryOtaSelectedIds.value = [];
      if (!isUpgradeSupported(cat)) {
        categoryOtaCategoryId.value = '';
        categoryOtaRejectText.value = OTA_CATEGORY_REJECT_MSG;
        return;
      }
      currentCategory.value = cat;
      categoryOtaRejectText.value = '';
      const still = categoryFirmwares.value.some(f => firmwareTargetVer(f) === categoryOtaTargetVer.value);
      if (!still) {
        categoryOtaTargetVer.value = '';
        categoryOtaFirmwareId.value = '';
        categoryOtaPackageUrl.value = '';
      }
    }

    function isCategoryOtaDeviceSelected(id) {
      return categoryOtaSelectedIds.value.includes(id);
    }

    function toggleCategoryOtaDevice(id) {
      if (isCategoryOtaDeviceSelected(id)) {
        categoryOtaSelectedIds.value = categoryOtaSelectedIds.value.filter(x => x !== id);
      } else {
        categoryOtaSelectedIds.value = [...categoryOtaSelectedIds.value, id];
      }
    }

    function toggleCategoryOtaDevicesAll() {
      const ids = categoryOtaUpgradeableDevices.value.map(d => d.id);
      if (ids.length && ids.every(id => isCategoryOtaDeviceSelected(id))) {
        categoryOtaSelectedIds.value = categoryOtaSelectedIds.value.filter(id => !ids.includes(id));
      } else {
        categoryOtaSelectedIds.value = [...new Set([...categoryOtaSelectedIds.value, ...ids])];
      }
    }

    function submitCategoryOta() {
      const picked = CATEGORIES.find(c => c.id === categoryOtaCategoryId.value);
      const current = currentCategory.value;
      if (!isUpgradeSupported(picked)) {
        const forcingOff = !!(current && current.id && !isUpgradeSupported(current));
        const msg = (forcingOff || categoryOtaCategoryId.value)
          ? OTA_CATEGORY_REJECT_MSG
          : '请选择已开启升级的品类（GET /iotCategory?upgradeSupported=1）';
        categoryOtaRejectText.value = msg;
        showToast(msg, 'warn');
        return;
      }
      const cat = picked;
      currentCategory.value = cat;
      const toVer = categoryOtaTargetVer.value;
      if (!toVer) { showToast('请选择目标固件版本', 'warn'); return; }
      const pkg = String(categoryOtaPackageUrl.value || '').trim();
      const fwId = categoryOtaFirmwareId.value || '';
      if (!pkg && !fwId) { showToast('请填写 packageUrl 或 firmwareId', 'warn'); return; }
      const extraIds = parseExtraDeviceIds(categoryOtaExtraIds.value);
      const requestedIds = [];
      categoryOtaSelectedIds.value.forEach(id => { if (!requestedIds.includes(id)) requestedIds.push(id); });
      extraIds.forEach(id => { if (!requestedIds.includes(id)) requestedIds.push(id); });
      if (!requestedIds.length) { showToast('请选择待升级设备，或追加 deviceIds', 'warn'); return; }
      if (requestedIds.length > OTA_DEVICE_CAP) {
        showToast('deviceIds 合计不能超过 200（当前 ' + requestedIds.length + '）', 'warn');
        return;
      }
      const timeoutMinutes = normalizeTimeoutMinutes(categoryOtaTimeoutMinutes.value);
      categoryOtaTimeoutMinutes.value = timeoutMinutes;
      const runningIds = otaRunningDeviceIds.value;
      const accepted = [];
      const excluded = [];
      requestedIds.forEach(id => {
        const d = deviceList.value.find(x => x.id === id);
        const reason = otaDeviceExcludeReason(d, { categoryId: cat.id, toVer, runningIds });
        if (reason) {
          excluded.push({ deviceId: id, name: d ? d.name : '—', reason });
        } else {
          accepted.push(d);
        }
      });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const resultBase = {
        at: now,
        categoryId: cat.id,
        toVer,
        firmwareId: fwId,
        packageUrl: pkg,
        timeoutMinutes,
        accepted: accepted.length,
        acceptedDevices: accepted.map(d => ({ deviceId: d.id, name: d.name })),
        excluded,
      };
      if (!accepted.length) {
        otaCreateResult.value = { taskId: '', ...resultBase };
        showCategoryOtaModal.value = false;
        showToast('没有可纳入的设备，创建结果仅含排除项', 'warn');
        openOtaTaskList(cat.id);
        return;
      }
      const task = {
        id: 'OT' + Date.now(),
        categoryId: cat.id,
        fromVerHint: '<' + toVer,
        toVer,
        packageUrl: pkg,
        firmwareId: fwId,
        createdAt: now,
        operator: '当前用户',
        deviceCount: accepted.length,
        success: 0,
        fail: 0,
        pending: accepted.length,
        status: 0,
        timeoutMinutes,
        excluded: excluded.map(e => ({ ...e })),
      };
      categoryOtaTasks.value = [task, ...categoryOtaTasks.value];
      const logs = accepted.map((d, idx) => ({
        id: 'UL' + Date.now() + idx,
        deviceId: d.id,
        taskId: task.id,
        time: now,
        fromVersion: (d.softwareVersion === 0 || d.softwareVersion) ? d.softwareVersion : null,
        fromVer: d.firmware || '—',
        toVer,
        status: idx === 0 ? 1 : 0,
        progress: idx === 0 ? 15 : 0,
        sentPackage: idx === 0 ? 3 : 0,
        remainPackage: idx === 0 ? 17 : 20,
        totalPackage: 20,
        operator: '当前用户',
        failReason: '',
      }));
      deviceUpgradeLogs.value = [...logs, ...deviceUpgradeLogs.value];
      otaCreateResult.value = { taskId: task.id, ...resultBase };
      showCategoryOtaModal.value = false;
      const tip = excluded.length
        ? ('已 POST /iot/otaTask（deviceIds + categoryId）创建任务 ' + task.id + '：纳入 ' + accepted.length + ' · 排除 ' + excluded.length)
        : ('已 POST /iot/otaTask（deviceIds + categoryId）创建任务 ' + task.id + '，再挂 ' + accepted.length + ' 台设备记录 → ' + toVer);
      showToast(tip, excluded.length ? 'warn' : 'ok');
      openOtaTaskDetail(task.id);
    }

    function recalcOtaTaskCounts(task) {
      const rows = deviceUpgradeLogs.value.filter(r => r.taskId === task.id);
      let success = 0, fail = 0, pending = 0;
      rows.forEach(r => {
        const code = otaDeviceStatusMeta(r.status).code;
        if (code === 2) success += 1;
        else if (code === 3) fail += 1;
        else pending += 1;
      });
      task.deviceCount = rows.length;
      task.success = success;
      task.fail = fail;
      task.pending = pending;
    }

    function otaTasksHash(opts) {
      const q = new URLSearchParams();
      if (opts && opts.categoryId) q.set('categoryId', opts.categoryId);
      if (opts && opts.id) q.set('id', opts.id);
      const s = q.toString();
      return s ? ('#otaTasks?' + s) : '#otaTasks';
    }

    function applyOtaTaskRoute(id, categoryId) {
      module.value = 'ota';
      screen.value = 'otaTasks';
      currentOtaTaskId.value = id || '';
      otaTaskCategoryFilter.value = categoryId || '';
      const task = id ? categoryOtaTasks.value.find(t => t.id === id) : null;
      const cid = categoryId || (task && task.categoryId) || '';
      if (cid) {
        const cat = CATEGORIES.find(c => c.id === cid);
        if (cat) currentCategory.value = cat;
      }
    }

    function openOtaTaskList(categoryId) {
      const cid = categoryId || '';
      applyOtaTaskRoute('', cid);
      const next = otaTasksHash({ categoryId: cid });
      if (location.hash !== next) location.hash = next;
    }

    function setOtaTaskCategoryFilter(categoryId) {
      openOtaTaskList(categoryId || '');
    }

    function openCategoryOtaTasks() {
      const id = currentCategory.value && currentCategory.value.id;
      openOtaTaskList(id || '');
    }

    function startCategoryOtaTask(fw) {
      if (!currentCategory.value || !currentCategory.value.id) {
        showToast('请先进入品类后再发起任务', 'warn');
        return;
      }
      openCategoryBatchOta(fw || null);
    }

    function startOtaTaskFromPage() {
      const cid = otaTaskCategoryFilter.value;
      const cat = cid ? CATEGORIES.find(c => c.id === cid) : null;
      if (cat) currentCategory.value = cat;
      else {
        const first = upgradeSupportedCategories.value[0];
        if (first) currentCategory.value = first;
      }
      openCategoryBatchOta(null);
      if (cat && !isUpgradeSupported(cat)) {
        categoryOtaCategoryId.value = '';
        categoryOtaRejectText.value = OTA_CATEGORY_REJECT_MSG;
      }
    }

    function openOtaTaskDetail(taskOrId) {
      const id = typeof taskOrId === 'string' ? taskOrId : (taskOrId && taskOrId.id);
      if (!id) return;
      const task = categoryOtaTasks.value.find(t => t.id === id);
      if (task) {
        const cat = CATEGORIES.find(c => c.id === task.categoryId);
        if (cat) currentCategory.value = cat;
      }
      const categoryId = otaTaskCategoryFilter.value || '';
      applyOtaTaskRoute(id, categoryId);
      const next = otaTasksHash({ id, categoryId });
      if (location.hash !== next) location.hash = next;
    }

    function closeOtaTaskDetail() {
      const categoryId = otaTaskCategoryFilter.value || '';
      applyOtaTaskRoute('', categoryId);
      const next = otaTasksHash({ categoryId });
      if (location.hash !== next) location.hash = next;
    }

    function openOtaTaskFromLog(taskId) {
      if (!taskId) return;
      openOtaTaskDetail(taskId);
    }

    function askCancelOtaTask(task) {
      if (!task || otaTaskStatusMeta(task.status).code !== 0) {
        showToast('仅状态 0「进行中」的任务可取消', 'warn');
        return;
      }
      cancelOtaTargetId.value = task.id;
      showCancelOtaConfirm.value = true;
    }

    function doCancelOtaTask() {
      const task = categoryOtaTasks.value.find(t => t.id === cancelOtaTargetId.value);
      showCancelOtaConfirm.value = false;
      if (!task || otaTaskStatusMeta(task.status).code !== 0) return;
      task.status = 2;
      task.cancelledAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      deviceUpgradeLogs.value = deviceUpgradeLogs.value.map(r => {
        if (r.taskId !== task.id) return r;
        const code = otaDeviceStatusMeta(r.status).code;
        if (code === 2 || code === 3) return r;
        return { ...r, status: 3, failReason: OTA_CANCEL_REASON };
      });
      recalcOtaTaskCounts(task);
      showToast('任务已取消：未完成设备失败原因「' + OTA_CANCEL_REASON + '」', 'ok');
    }

    function upgradeStatusTag(status) {
      return otaDeviceStatusMeta(status).tag;
    }
    function upgradeFromVersion(row) {
      if (!row || !Object.prototype.hasOwnProperty.call(row, 'fromVersion')) return null;
      return row.fromVersion;
    }
    function upgradeSuccessNote(row) {
      if (!row) return '';
      if (row.successNote) return row.successNote;
      if (otaDeviceStatusMeta(row.status).code === 2) return '应答 remain=0';
      return '';
    }
    function upgradePackageLine(row) {
      if (!row) return '';
      const has = function (v) { return v !== null && v !== undefined && v !== ''; };
      const parts = [];
      if (has(row.sentPackage)) parts.push('已发 ' + row.sentPackage);
      if (has(row.remainPackage)) parts.push('剩余 ' + row.remainPackage);
      if (has(row.totalPackage)) parts.push('共 ' + row.totalPackage);
      return parts.join(' · ');
    }
    const upgradeHistoryRows = computed(() => {
      const deviceId = upgradeHistoryDeviceId.value;
      const kw = String(upgradeHistoryKeyword.value || '').trim().toLowerCase();
      const st = upgradeHistoryStatusFilter.value;
      return deviceUpgradeLogs.value
        .filter(function (r) {
          const code = otaDeviceStatusMeta(r.status).code;
          if (st === 'done' && code !== 2 && code !== 3) return false;
          if (st === 'success' && code !== 2) return false;
          if (st === 'fail' && code !== 3) return false;
          if (deviceId && r.deviceId !== deviceId) return false;
          if (kw) {
            const brief = otaDeviceBrief(r.deviceId);
            const dev = deviceList.value.find(d => d.id === r.deviceId);
            const blob = [
              r.deviceId, brief.name, brief.imei, r.taskId, r.failReason,
              r.toVer, r.fromVer, dev && dev.categoryName, dev && dev.categoryId,
              upgradeFromVersion(r), upgradeSuccessNote(r)
            ].join(' ').toLowerCase();
            if (blob.indexOf(kw) < 0) return false;
          }
          return true;
        })
        .slice()
        .sort((a, b) => String(b.time).localeCompare(String(a.time)));
    });
    const upgradeHistoryCounts = computed(() => {
      const deviceId = upgradeHistoryDeviceId.value;
      let success = 0, fail = 0, other = 0;
      deviceUpgradeLogs.value.forEach(function (r) {
        if (deviceId && r.deviceId !== deviceId) return;
        const code = otaDeviceStatusMeta(r.status).code;
        if (code === 2) success += 1;
        else if (code === 3) fail += 1;
        else other += 1;
      });
      return { success, fail, other };
    });
    function openUpgradeHistory(deviceId) {
      const id = deviceId || '';
      upgradeHistoryDeviceId.value = id;
      upgradeHistoryStatusFilter.value = 'done';
      upgradeHistoryKeyword.value = '';
      module.value = 'ota';
      screen.value = 'upgradeHistory';
      const next = id ? ('#upgradeHistory?deviceId=' + encodeURIComponent(id)) : '#upgradeHistory';
      if (location.hash !== next) location.hash = next;
    }
    function clearUpgradeHistoryDevice() {
      openUpgradeHistory('');
    }
    function openDeviceUpgradeSlice(deviceId) {
      const d = deviceList.value.find(x => x.id === deviceId);
      if (!d) {
        showToast('未找到设备 ' + deviceId, 'warn');
        return;
      }
      location.hash = '#deviceDetail?id=' + encodeURIComponent(deviceId) + '&tab=upgradeLog';
    }
    const UPGRADE_MONITOR_POLL_MS = 4000;
    const upgradeMonitorTaskId = ref('');
    const upgradeMonitorPolledAt = ref('');
    const upgradeMonitorTick = ref(0);
    let upgradeMonitorTimer = null;
    function upgradeMonitorStage(row) {
      const code = otaDeviceStatusMeta(row.status).code;
      if (code === 0) return { stage: 'queued', stageLabel: '排队' };
      if (code === 1) {
        if (Number(row.remainPackage) === 0) return { stage: 'awaitingConfirm', stageLabel: '待确认' };
        return { stage: 'transferring', stageLabel: '传输中' };
      }
      return null;
    }
    function upgradeMonitorStamp(date) {
      const p = function (n) { return String(n).padStart(2, '0'); };
      return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate()) + ' ' + p(date.getHours()) + ':' + p(date.getMinutes());
    }
    function touchUpgradeMonitorPoll() {
      upgradeMonitorPolledAt.value = upgradeMonitorStamp(new Date());
    }
    function stopUpgradeMonitorPoll() {
      if (upgradeMonitorTimer) {
        clearInterval(upgradeMonitorTimer);
        upgradeMonitorTimer = null;
      }
    }
    function startUpgradeMonitorPoll() {
      stopUpgradeMonitorPoll();
      touchUpgradeMonitorPoll();
      upgradeMonitorTimer = setInterval(function () {
        upgradeMonitorTick.value += 1;
        touchUpgradeMonitorPoll();
      }, UPGRADE_MONITOR_POLL_MS);
    }
    const upgradeMonitorView = computed(function () {
      upgradeMonitorTick.value;
      const taskId = upgradeMonitorTaskId.value;
      const active = deviceUpgradeLogs.value.filter(function (row) {
        if (taskId && row.taskId !== taskId) return false;
        return !!upgradeMonitorStage(row);
      });
      const items = active.map(function (row) {
        const stage = upgradeMonitorStage(row);
        const remain = Number(row.remainPackage);
        const sec = (Number.isFinite(remain) && remain > 0) ? remain * 30 : 120;
        const brief = otaDeviceBrief(row.deviceId);
        return {
          id: row.id,
          deviceId: row.deviceId,
          deviceName: brief.name,
          taskId: row.taskId || '',
          fromVersion: upgradeFromVersion(row),
          status: row.status,
          statusText: otaDeviceStatusText(row.status),
          statusTag: otaDeviceStatusMeta(row.status).tag,
          stage: stage.stage,
          stageLabel: stage.stageLabel,
          progress: row.progress || 0,
          sentPackage: row.sentPackage,
          remainPackage: row.remainPackage,
          totalPackage: row.totalPackage,
          packageLine: upgradePackageLine(row),
          estimatedCompleteAt: upgradeMonitorStamp(new Date(Date.now() + sec * 1000))
        };
      });
      const countStage = function (key) { return items.filter(function (it) { return it.stage === key; }).length; };
      const queuedCount = countStage('queued');
      const transferringCount = countStage('transferring');
      const awaitingConfirmCount = countStage('awaitingConfirm');
      let latest = 0;
      items.forEach(function (it) {
        const remain = Number(it.remainPackage);
        const sec = (Number.isFinite(remain) && remain > 0) ? remain * 30 : 120;
        if (sec > latest) latest = sec;
      });
      const etaAt = items.length ? upgradeMonitorStamp(new Date(Date.now() + latest * 1000)) : '';
      const runningTasks = categoryOtaTasks.value.filter(function (t) {
        return otaTaskStatusMeta(t.status).code === 0;
      }).map(function (t) {
        const n = deviceUpgradeLogs.value.filter(function (row) {
          return row.taskId === t.id && upgradeMonitorStage(row);
        }).length;
        return { taskId: t.id, toVer: t.toVer, activeCount: n };
      });
      return {
        summary: {
          upgradingCount: transferringCount + awaitingConfirmCount,
          queuedCount: queuedCount,
          transferringCount: transferringCount,
          awaitingConfirmCount: awaitingConfirmCount
        },
        stageBreakdown: [
          { stage: 'queued', label: '排队', count: queuedCount },
          { stage: 'transferring', label: '传输中', count: transferringCount },
          { stage: 'awaitingConfirm', label: '待确认', count: awaitingConfirmCount }
        ],
        items: items,
        eta: {
          estimatedCompleteAt: etaAt,
          estimateBasis: '按在途剩余包粗估（约 30 秒/包；剩余 0 的待确认另加约 2 分钟），非精确倒计时'
        },
        runningTasks: runningTasks
      };
    });
    function openUpgradeMonitor(taskId) {
      location.hash = taskId ? ('#upgradeMonitor?taskId=' + encodeURIComponent(taskId)) : '#upgradeMonitor';
    }


    function syncMonitorFromDevice(device) {
      if (!device) return;
      const row = MONITOR_ROWS.find(r => r.id === device.id || r.imei === device.imei);
      if (row) {
        currentMonitor.value = row;
      } else {
        currentMonitor.value = {
          id: device.id,
          imei: device.imei,
          name: device.name,
          projectId: device.projectId,
          projectName: device.projectName || '未定义项目',
          categoryId: device.categoryId,
          categoryName: device.categoryName || '未分类',
          online: device.lifecycle === '在线' ? '在线' : (device.lifecycle === '离线' ? '离线' : '未知'),
          lastReportAt: device.updatedAt || '—',
          firmware: device.firmware || '—',
          model: device.model || '—',
          trustLevel: 'T0',
          trustScore: 0,
          warn: 0, alarm: 0, fault: 0,
          cycleSec: 60,
          missed24h: 0, expected24h: 0, actual24h: 0,
          latest_json: {},
        };
      }
      const defs = getCategoryMonitorProperties(currentMonitor.value.categoryId, propertyList.value);
      const pts = MONITOR_POINTS[currentMonitor.value.id] || [];
      const code = defs.length ? defs[0].identifier : (pts.length ? pts[0].code : '');
      if (code) monCurvePointCode.value = code;
      monCurveRange.value = 7;
    }

    function openDeviceDetail(d, tab) {
      currentDevice.value = d;
      module.value = 'ledger';
      screen.value = 'deviceDetail';
      // packets 旧 hash 并入 localData（本机数据 = 报文列表）；commandLog 旧名 → sendLog
      if (tab === 'packets') tab = 'localData';
      if (tab === 'commandLog') tab = 'sendLog';
      const allowed = ['profile', 'localData', 'dispatch', 'sendLog', 'snChange', 'children', 'upgradeLog'];
      let next = allowed.includes(tab) ? tab : 'profile';
      // ?tab=children 无真实子设备时回落档案，避免空表长期挂着
      if (next === 'children') {
        const slaves = deviceList.value.filter(x => x.masterId === d.id);
        const hasSlaves = slaves.length || (d.slaves && d.slaves.length);
        if (isProbeAepId(d.aepDeviceId) || d.masterId || !hasSlaves) next = 'profile';
      }
      deviceDetailTab.value = next;
      packetTypeFilter.value = '';
      expandedPacketIds.value = [];
      resetDispatchState();
      showSendLogModal.value = false;
      currentSendLog.value = null;
    }

    function setDeviceDetailTab(tab) {
      if (tab === 'packets') tab = 'localData';
      if (tab === 'commandLog') tab = 'sendLog';
      if (tab === 'children' && !canShowChildDevices.value) {
        deviceDetailTab.value = 'profile';
        return;
      }
      deviceDetailTab.value = tab;
      if (tab === 'localData') {
        packetTypeFilter.value = '';
        expandedPacketIds.value = [];
      }
      if (tab === 'dispatch') resetDispatchState();
      if (tab === 'sendLog') {
        showSendLogModal.value = false;
        currentSendLog.value = null;
      }
    }

    function formatIdentifiers(ids) {
      if (ids == null || ids === '') return '—';
      if (Array.isArray(ids)) return ids.length ? ids.join(', ') : '—';
      return String(ids);
    }
    /** 结果列：字段 success；1→成功（绿），否则失败（红）。不用 commandStatus 字符串当结果。 */
    function sendLogSuccess(row) {
      if (!row) return false;
      return Number(row.success) === 1;
    }
    /** 类型：identifiers 含 cancelAllCommands → 取消全部，否则 下发 */
    function sendLogTypeLabel(row) {
      const raw = row && row.identifiers;
      const list = Array.isArray(raw) ? raw : (raw == null || raw === '' ? [] : [String(raw)]);
      const hit = list.some(x => String(x).includes('cancelAllCommands'));
      return hit ? '取消全部' : '下发';
    }
    function sendLogDryRunLabel(row) {
      return Number(row && row.dryRun) === 1 ? '是' : '否';
    }
    function openSendLogDetail(row) {
      currentSendLog.value = row;
      showSendLogModal.value = true;
    }
    function closeSendLogDetail() {
      showSendLogModal.value = false;
      currentSendLog.value = null;
    }

    function onMonCurveMove(evt, chart) {
      if (!chart || !chart.svg) return;
      const svgEl = evt.currentTarget;
      const rect = svgEl.getBoundingClientRect();
      const padL = chart.svg.padL || 48;
      const padR = chart.svg.padR || 16;
      const w = chart.svg.w || 1000;
      const plotW = w - padL - padR;
      if (plotW <= 0 || rect.width <= 0) return;
      const xInView = ((evt.clientX - rect.left) / rect.width) * w;
      let t = (xInView - padL) / plotW;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      monHoverT.value = t;
    }
    function onMonCurveLeave() {
      monHoverT.value = null;
    }
    function setMonCurveMode(mode) {
      monCurveMode.value = mode === 'merge' ? 'merge' : 'split';
      monHoverT.value = null;
    }

    function isPacketExpanded(id) {
      return expandedPacketIds.value.includes(id);
    }
    function togglePacketHex(id) {
      const set = new Set(expandedPacketIds.value);
      if (set.has(id)) set.delete(id); else set.add(id);
      expandedPacketIds.value = Array.from(set);
    }

    function fillDeviceForm(d) {
      Object.assign(deviceForm, {
        id: d.id || '',
        imei: d.imei || '', deviceSn: d.deviceSn || '', aepStatus: d.aepStatus != null ? d.aepStatus : 0,
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
        photosText: (d.photos || []).join('、'),
        categoryMatch: d.categoryMatch || 'auto',
        categoryRuleId: d.categoryRuleId || ''
      });
      showCategoryOverride.value = false;
    }

    function openEditDevice(d) {
      deviceFormMode.value = 'edit';
      fillDeviceForm(d || currentDevice.value);
      module.value = 'ledger';
      screen.value = 'editDevice';
    }
    function saveDevice() {
      const idx = deviceList.value.findIndex(x => x.id === deviceForm.id);
      if (idx >= 0) {
        const proj = PROJECTS.find(p => p.id === deviceForm.projectId);
        const cat = CATEGORIES.find(c => c.id === deviceForm.categoryId);
        const updated = {
          ...deviceList.value[idx],
          imei: deviceForm.imei,
          deviceSn: deviceForm.deviceSn || deviceForm.imei,
          name: deviceForm.name,
          projectId: deviceForm.projectId || null,
          projectName: deviceForm.projectId ? (proj ? proj.name : deviceForm.projectId) : UNASSIGNED_PROJECT_NAME,
          categoryId: deviceForm.categoryId || '',
          categoryName: deviceForm.categoryId ? (cat ? cat.name : deviceForm.categoryId) : '未分类',
          categoryMatch: showCategoryOverride.value ? 'manual' : (deviceForm.categoryMatch || 'auto'),
          categoryRuleId: showCategoryOverride.value ? '' : (deviceForm.categoryRuleId || ''),
          lifecycle: deviceForm.lifecycle,
          aepDeviceId: deviceForm.aepDeviceId,
          aepStatus: deviceForm.aepStatus != null ? Number(deviceForm.aepStatus) : 0,
          model: deviceForm.model,
          firmware: deviceForm.firmware,
          firmwareVersion: deviceForm.firmware,
          lng: deviceForm.lng ? Number(deviceForm.lng) : null,
          lat: deviceForm.lat ? Number(deviceForm.lat) : null,
          address: deviceForm.address,
          installDate: deviceForm.installDate,
          installer: deviceForm.installer,
          masterId: deviceForm.masterId,
          updatedAt: '2026-10-08 14:45'
        };
        deviceList.value.splice(idx, 1, updated);
        currentDevice.value = updated;
      }
      screen.value = 'deviceDetail';
    }

    function toggleSelectDevice(id) {
      const i = selectedDeviceIds.value.indexOf(id);
      if (i >= 0) selectedDeviceIds.value.splice(i, 1);
      else selectedDeviceIds.value.push(id);
    }
    function toggleSelectAllFiltered() {
      const ids = filteredDevices.value.map(d => d.id);
      if (ids.length && ids.every(id => selectedDeviceIds.value.includes(id))) {
        selectedDeviceIds.value = selectedDeviceIds.value.filter(id => !ids.includes(id));
      } else {
        const set = new Set([...selectedDeviceIds.value, ...ids]);
        selectedDeviceIds.value = [...set];
      }
    }
    function openTransferModal(deviceOrNull) {
      let ids = [];
      if (deviceOrNull && deviceOrNull.id) ids = [deviceOrNull.id];
      else if (selectedDeviceIds.value.length) ids = [...selectedDeviceIds.value];
      else if (currentDevice.value) ids = [currentDevice.value.id];
      if (!ids.length) return;
      transferForm.deviceIds = ids;
      transferForm.targetProjectId = 'PJ01';
      transferForm.note = '';
      transferForm.operator = '张三';
      showTransferModal.value = true;
    }
    function confirmTransfer() {
      const target = PROJECTS.find(p => p.id === transferForm.targetProjectId);
      if (!target) return;
      const now = '2026-10-08 14:50';
      transferForm.deviceIds.forEach(id => {
        const idx = deviceList.value.findIndex(d => d.id === id);
        if (idx < 0) return;
        const d = deviceList.value[idx];
        const fromName = d.projectId ? d.projectName : UNASSIGNED_PROJECT_NAME;
        const fromId = d.projectId || null;
        const updated = {
          ...d,
          projectId: target.id,
          projectName: target.name,
          updatedAt: now
        };
        deviceList.value.splice(idx, 1, updated);
        if (currentDevice.value && currentDevice.value.id === id) currentDevice.value = updated;
        transferLogs.value.unshift({
          id: 'TL' + Date.now().toString().slice(-6) + id,
          deviceId: d.id,
          imei: d.imei,
          deviceName: d.name,
          fromProjectId: fromId,
          fromProjectName: fromName,
          toProjectId: target.id,
          toProjectName: target.name,
          operator: transferForm.operator || '张三',
          time: now,
          note: transferForm.note || ''
        });
      });
      selectedDeviceIds.value = [];
      showTransferModal.value = false;
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
    function syncFromAep() {
      /* 原型：主 CTA「同步自 AEP」→ 拉取产品/设备清单并生成差异；正式实现含周期对账 */
      aepDiffTab.value = 'extra';
      aepLastSyncedAt.value = '2026-10-09 17:30';
    }

    function projectName(id) {
      const p = PROJECTS.find(x => x.id === id);
      return p ? p.name : id;
    }
    function categoryName(id) {
      if (id === 'aio') return '一体机';
      if (id === '__uncat__') return '未分类';
      const c = CATEGORIES.find(x => x.id === id);
      return c ? c.name : id;
    }

    /**
     * 解析品类 Iconify id：
     * 1) category.icon（已是 Iconify id，如 mdi:water）
     * 2) DEFAULT_CODE_TO_ICONIFY[code]（icon 空）
     * 3) 名称→code→表 / 合成桶 aio|uncategorized|probe
     * 4) FALLBACK_ICONIFY（mdi:devices）
     */
    function resolveCategoryIcon(c) {
      if (!c) return FALLBACK_ICONIFY;
      if (typeof c === 'string') {
        if (c.includes(':')) return c; /* 已是 Iconify id */
        if (c === 'aio' || c === '__uncat__' || c === 'uncategorized') {
          const code = c === 'aio' ? 'aio' : 'uncategorized';
          return DEFAULT_CODE_TO_ICONIFY[code] || FALLBACK_ICONIFY;
        }
        const byId = CATEGORIES.find(x => x.id === c);
        if (byId) {
          if (byId.icon) return byId.icon;
          return DEFAULT_CODE_TO_ICONIFY[byId.code] || FALLBACK_ICONIFY;
        }
        if (DEFAULT_CODE_TO_ICONIFY[c]) return DEFAULT_CODE_TO_ICONIFY[c];
        const codeFromName = CATEGORY_CODE_BY_NAME[c];
        if (codeFromName) return DEFAULT_CODE_TO_ICONIFY[codeFromName] || FALLBACK_ICONIFY;
        return FALLBACK_ICONIFY;
      }
      if (c.icon) return c.icon;
      if (c.uncategorized || c.id === '__uncat__' || c.id === '__child_uncat__' || c.role === 'uncategorized') {
        return DEFAULT_CODE_TO_ICONIFY.uncategorized;
      }
      if (c.id === 'aio' || c.code === 'aio' || c.role === 'parent') {
        return DEFAULT_CODE_TO_ICONIFY.aio;
      }
      const code = c.code || CATEGORY_CODE_BY_NAME[c.name];
      if (code && DEFAULT_CODE_TO_ICONIFY[code]) return DEFAULT_CODE_TO_ICONIFY[code];
      if (c.role === 'child') return DEFAULT_CODE_TO_ICONIFY.probe;
      return FALLBACK_ICONIFY;
    }
    /** @deprecated 兼容旧调用名 → Iconify id */
    function resolveCategoryIconKey(c) { return resolveCategoryIcon(c); }
    /** 工作台等处若仍传业务 code，归一成 Iconify id */
    function categoryIconifyId(keyOrCat) {
      return resolveCategoryIcon(keyOrCat);
    }

    /* ---- 在线监控 actions ---- */
    function goMonitorList() { module.value = 'monitor'; screen.value = 'monitorList'; }
    function goMonitorOnlineRate() { module.value = 'monitor'; screen.value = 'monitorOnlineRate'; }
    function openMonitorDetail(row) {
      currentMonitor.value = row;
      const defs = getCategoryMonitorProperties(row.categoryId, propertyList.value);
      const pts = MONITOR_POINTS[row.id] || [];
      monCurvePointCode.value = defs.length ? defs[0].identifier : (pts.length ? pts[0].code : '');
      monCurveRange.value = 7;
      monDetailTab.value = 'overview';
      resetMonReportTimeRange();
      module.value = 'monitor';
      screen.value = 'monitorDetail';
    }
    /** 当前监控设备对应台账行（补 aepDeviceId / deviceSn / aepStatus） */
    const monLedgerDevice = computed(() => {
      const m = currentMonitor.value;
      if (!m) return null;
      return deviceList.value.find(d => d.id === m.id || d.imei === m.imei) || null;
    });
    const monIdentity = computed(() => {
      const m = currentMonitor.value || {};
      const d = monLedgerDevice.value || {};
      return {
        deviceId: m.id || d.id || '—',
        aepDeviceId: m.aepDeviceId || d.aepDeviceId || '',
        imei: m.imei || d.imei || '—',
        deviceSn: m.deviceSn || d.deviceSn || m.imei || d.imei || '—',
        categoryName: m.categoryName || d.categoryName || '—',
        projectName: m.projectName || d.projectName || '—',
        aepStatus: m.aepStatus != null ? m.aepStatus : (d.aepStatus != null ? d.aepStatus : null),
      };
    });
    /** 上报明细表：当前设备 mock 逐条采样（属性列同 monLatestPoints） */
    const monReportColumns = computed(() => monLatestPoints.value || []);
    function monReportBaseMs() {
      const row = currentMonitor.value;
      const baseTs = row && row.lastReportAt && row.lastReportAt !== '—' ? row.lastReportAt : '2026-10-14 09:18:33';
      return Date.parse(String(baseTs).replace(/-/g, '/')) || Date.parse('2026/10/14 09:18:33');
    }
    /** 默认近 24h：相对最近上报 sample_time */
    function resetMonReportTimeRange() {
      const endMs = monReportBaseMs();
      const beginMs = endMs - 24 * 3600 * 1000;
      const b = toDatetimeLocalValue(beginMs);
      const e = toDatetimeLocalValue(endMs);
      monReportBegin.value = b;
      monReportEnd.value = e;
      monReportAppliedBegin.value = b;
      monReportAppliedEnd.value = e;
    }
    function queryMonReportSamples() {
      monReportAppliedBegin.value = monReportBegin.value;
      monReportAppliedEnd.value = monReportEnd.value;
    }
    const monReportSamplesAll = computed(() => {
      const row = currentMonitor.value;
      const pts = monLatestPoints.value || [];
      if (!row || !pts.length) return [];
      const baseTs = row.lastReportAt && row.lastReportAt !== '—' ? row.lastReportAt : '2026-10-14 09:18:33';
      // ~36h 跨度 + DESC，便于默认 24h 窗过滤示意；曲线 /history 仍升序另算
      const generated = genReportSamples(pts, { count: 48, spanSec: 36 * 3600, baseTs }).map(r => ({
        id: r.id, time: r.time, values: r.values, qualityJson: {}, judgeId: '', fromTrust: false,
      }));
      const trust = dtSamples.value.filter(s => s.deviceId === row.id).map(s => ({
        id: s.id, time: s.sampleTime, values: s.values || {},
        qualityJson: s.qualityJson || {}, judgeId: s.judgeId || '', fromTrust: true,
      }));
      return generated.concat(trust).sort((a, b) => {
        if (a.time === b.time) return (a.fromTrust ? 0 : 1) - (b.fromTrust ? 0 : 1);
        return a.time < b.time ? 1 : -1;
      });
    });
    const monReportSamples = computed(() => {
      const all = monReportSamplesAll.value;
      const bMs = parseReportBoundMs(monReportAppliedBegin.value, false);
      const eMs = parseReportBoundMs(monReportAppliedEnd.value, true);
      if (!Number.isFinite(bMs) && !Number.isFinite(eMs)) return all;
      return all.filter(r => {
        const t = Date.parse(String(r.time).replace(/-/g, '/'));
        if (!Number.isFinite(t)) return false;
        if (Number.isFinite(bMs) && t < bMs) return false;
        if (Number.isFinite(eMs) && t > eMs) return false;
        return true;
      });
    });
    const monReportEmptyHint = computed(() => {
      if (!(monLatestPoints.value || []).length) return monPointsEmptyHint.value;
      if (!monReportSamplesAll.value.length) return '暂无上报数据';
      if (!monReportSamples.value.length) return '所选时间范围内暂无上报数据';
      return '';
    });
    function openMonitorDeviceLocalData() {
      const m = currentMonitor.value;
      if (!m) return;
      const d = deviceList.value.find(x => x.id === m.id || x.imei === m.imei);
      if (d) {
        openDeviceDetail(d, 'localData');
        return;
      }
      showToast('台账中未找到该设备，无法打开本机数据', 'warn');
    }
    function openMonitorCurve(row, pointCode) {
      if (row) currentMonitor.value = row;
      const defs = getCategoryMonitorProperties(currentMonitor.value.categoryId, propertyList.value);
      const pts = MONITOR_POINTS[currentMonitor.value.id] || [];
      monCurvePointCode.value = pointCode || (defs.length ? defs[0].identifier : (pts.length ? pts[0].code : ''));
      monCurveRange.value = 7;
      module.value = 'monitor';
      screen.value = 'monitorCurve';
    }
    /** 台账「曲线」入口：按子设备（单探头）各画各的；一体机有探头时引导去子设备 Tab */
    function openMonitorForDevice(device) {
      if (!device) return;
      const kids = deviceList.value.filter(x => x.masterId === device.id);
      const isHub = !device.masterId && !isProbeAepId(device.aepDeviceId) && kids.length > 0;
      if (isHub) {
        currentDevice.value = device;
        module.value = 'ledger';
        screen.value = 'deviceDetail';
        deviceDetailTab.value = 'children';
        showToast('曲线按探头分图：请在子设备里点「曲线」', 'ok');
        return;
      }
      const row = MONITOR_ROWS.find(r => r.id === device.id || r.imei === device.imei);
      if (row) {
        openMonitorDetail(row);
        return;
      }
      // 台账有、监控无：用档案拼一条只读示意行
      openMonitorDetail({
        id: device.id,
        imei: device.imei,
        name: device.name,
        projectId: device.projectId,
        projectName: device.projectName || '未定义项目',
        categoryId: device.categoryId,
        categoryName: device.categoryName || '未分类',
        online: device.lifecycle === '在线' ? '在线' : (device.lifecycle === '离线' ? '离线' : '未知'),
        lastReportAt: device.updatedAt || '—',
        firmware: device.firmware || '—',
        model: device.model || '—',
        trustLevel: 'T0',
        trustScore: 0,
        warn: 0, alarm: 0, fault: 0,
        cycleSec: 60,
        missed24h: 0, expected24h: 0, actual24h: 0,
        latest_json: {},
      });
    }
    /** 按品类 property 定义拼测点条目；无定义时回退 latest_json / MONITOR_POINTS */
    function latestPointEntries(row) {
      if (!row) return [];
      const defs = getCategoryMonitorProperties(row.categoryId, propertyList.value);
      const lj = row.latest_json || {};
      const pts = MONITOR_POINTS[row.id] || [];
      const byCode = Object.fromEntries(pts.map(p => [p.code, p]));
      if (defs.length) {
        return defs.map(d => {
          const hit = byCode[d.identifier];
          const raw = Object.prototype.hasOwnProperty.call(lj, d.identifier)
            ? lj[d.identifier]
            : (hit ? hit.value : null);
          return {
            code: d.identifier,
            name: d.name,
            unit: d.unit || '',
            value: raw,
          };
        });
      }
      if (pts.length) {
        return pts.map(p => ({
          code: p.code,
          name: p.name,
          unit: p.unit || '',
          value: p.value,
        }));
      }
      return Object.keys(lj).map(code => ({
        code,
        name: code,
        unit: '',
        value: lj[code],
      }));
    }
    function latestMetricValue(row, identifier) {
      if (!row || !identifier) return null;
      const lj = row.latest_json || {};
      if (Object.prototype.hasOwnProperty.call(lj, identifier)) return lj[identifier];
      const pts = MONITOR_POINTS[row.id] || [];
      const hit = pts.find(p => p.code === identifier);
      return hit ? hit.value : null;
    }
    function formatMetricCell(val, unit) {
      if (val == null || val === '') return '—';
      return unit ? (val + ' ' + unit) : String(val);
    }
    function latestSummaryText(row) {
      const entries = latestPointEntries(row);
      if (!entries.length) return '—';
      return entries.slice(0, 4).map(e => {
        const v = e.value == null || e.value === '' ? '—' : e.value;
        return e.name + ':' + v + (e.unit && v !== '—' ? e.unit : '');
      }).join(' · ');
    }
    function selectCurvePoint(code) {
      monCurvePointCode.value = code;
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

    /* ---- 设备对比 ---- */
    const CMP_MAX = 8;
    const cmpCategoryProps = computed(() => getCategoryMonitorProperties(cmpCategoryId.value, propertyList.value));
    const cmpSelectedDevices = computed(() => {
      const set = new Set(cmpDeviceIds.value);
      return MONITOR_ROWS.filter(d => set.has(d.id));
    });
    const cmpCandidateDevices = computed(() => {
      const cid = cmpCategoryId.value;
      if (!cid) return [];
      const kw = cmpDrawerSearch.value.trim();
      return MONITOR_ROWS.filter(d => {
        if (d.categoryId !== cid) return false;
        if (kw && !(d.name.includes(kw) || d.imei.includes(kw))) return false;
        return true;
      });
    });
    const cmpPrimaryProp = computed(() => {
      const props = cmpCategoryProps.value;
      if (!props.length) return null;
      const id = cmpPropIds.value[0];
      return props.find(p => p.identifier === id) || props[0];
    });
    const cmpKpiCards = computed(() => {
      void cmpRefreshNonce.value;
      const prop = cmpPrimaryProp.value;
      return cmpSelectedDevices.value.map((d, idx) => {
        const val = prop ? latestMetricValue(d, prop.identifier) : null;
        return {
          id: d.id,
          name: d.name,
          online: d.online,
          color: CURVE_SERIES_COLORS[idx % CURVE_SERIES_COLORS.length],
          propName: prop ? prop.name : '—',
          propUnit: prop ? (prop.unit || '') : '',
          value: val,
          lastReportAt: d.lastReportAt,
        };
      });
    });
    function cmpPointForDevice(row, prop) {
      if (!row || !prop) return null;
      const pts = MONITOR_POINTS[row.id] || [];
      const hit = pts.find(p => p.code === prop.identifier);
      const val = latestMetricValue(row, prop.identifier);
      if (!isFiniteMetricValue(val) && !(hit && isFiniteMetricValue(hit.value))) return null;
      return {
        code: prop.identifier,
        name: row.name,
        unit: prop.unit || '',
        value: isFiniteMetricValue(val) ? Number(val) : Number(hit.value),
        warnLow: hit ? hit.warnLow : null,
        warnHigh: hit ? hit.warnHigh : null,
        alarmLow: hit ? hit.alarmLow : null,
        alarmHigh: hit ? hit.alarmHigh : null,
        faultLow: hit ? hit.faultLow : null,
        faultHigh: hit ? hit.faultHigh : null,
        ymin: hit && hit.ymin != null ? hit.ymin : 0,
        ymax: hit && hit.ymax != null ? hit.ymax : 100,
        cycleSec: hit ? hit.cycleSec : (row.cycleSec || 60),
      };
    }
    const cmpOverlayChart = computed(() => {
      void cmpRefreshNonce.value;
      const prop = cmpPrimaryProp.value;
      const days = cmpRange.value === 1 ? 7 : cmpRange.value; // reuse series density; 1d still uses short wave
      if (!prop || !cmpSelectedDevices.value.length) {
        return { svg: buildMergeCurveSvg([]), legend: [], empty: true };
      }
      const entries = [];
      const legend = [];
      cmpSelectedDevices.value.forEach((d, idx) => {
        const point = cmpPointForDevice(d, prop);
        const color = CURVE_SERIES_COLORS[idx % CURVE_SERIES_COLORS.length];
        if (!point) {
          legend.push({ id: d.id, name: d.name, color, missing: true });
          return;
        }
        // slight phase offset per device so overlay is visually distinct
        const series = genCurveSeries(point, days === 30 ? 30 : 7).map((pt, i) => ({
          ...pt,
          v: Math.round((pt.v + Math.sin(i * 0.17 + idx) * (point.ymax - point.ymin) * 0.02 * (idx + 1)) * 100) / 100,
        }));
        if (!series.length) {
          legend.push({ id: d.id, name: d.name, color, missing: true });
          return;
        }
        entries.push({ point, series });
        legend.push({ id: d.id, name: d.name, color, missing: false, unit: prop.unit || '' });
      });
      const svg = buildMergeCurveSvg(entries);
      // recolor / rename paths to device names
      if (svg.paths && svg.paths.length) {
        let pi = 0;
        legend.filter(l => !l.missing).forEach((l) => {
          if (svg.paths[pi]) {
            svg.paths[pi].color = l.color;
            svg.paths[pi].name = l.name;
            svg.paths[pi].code = l.id;
          }
          pi += 1;
        });
      }
      return { svg, legend, empty: !entries.length, prop };
    });
    const cmpTableRows = computed(() => {
      void cmpRefreshNonce.value;
      const props = cmpCategoryProps.value.filter(p => cmpPropIds.value.includes(p.identifier));
      const useProps = props.length ? props : (cmpPrimaryProp.value ? [cmpPrimaryProp.value] : []);
      return cmpSelectedDevices.value.map(d => ({
        id: d.id,
        name: d.name,
        online: d.online,
        lastReportAt: d.lastReportAt,
        cells: useProps.map(p => ({
          identifier: p.identifier,
          name: p.name,
          unit: p.unit || '',
          value: latestMetricValue(d, p.identifier),
        })),
      }));
    });
    const cmpTableProps = computed(() => {
      const props = cmpCategoryProps.value.filter(p => cmpPropIds.value.includes(p.identifier));
      return props.length ? props : (cmpPrimaryProp.value ? [cmpPrimaryProp.value] : []);
    });
    function syncCmpPropsForCategory() {
      const props = getCategoryMonitorProperties(cmpCategoryId.value, propertyList.value);
      if (!props.length) { cmpPropIds.value = []; return; }
      const keep = cmpPropIds.value.filter(id => props.some(p => p.identifier === id));
      cmpPropIds.value = keep.length ? keep : [props[0].identifier];
    }
    function onCmpCategoryChange() {
      const cid = cmpCategoryId.value;
      cmpDeviceIds.value = cmpDeviceIds.value.filter(id => {
        const row = MONITOR_ROWS.find(d => d.id === id);
        return row && row.categoryId === cid;
      });
      syncCmpPropsForCategory();
    }
    function goMonitorCompare(preIds) {
      module.value = 'monitor';
      screen.value = 'monitorCompare';
      if (Array.isArray(preIds) && preIds.length) {
        applyCmpDevices(preIds);
      } else if (!cmpCategoryId.value) {
        // default demo: 积水仪地埋 + 前两台同品类
        const demo = MONITOR_ROWS.filter(d => d.categoryId === 'C001').slice(0, 2);
        if (demo.length) {
          cmpCategoryId.value = 'C001';
          cmpDeviceIds.value = demo.map(d => d.id);
          syncCmpPropsForCategory();
        }
      } else {
        syncCmpPropsForCategory();
      }
    }
    function applyCmpDevices(ids) {
      const cleaned = [];
      let category = '';
      for (const id of ids) {
        const row = MONITOR_ROWS.find(d => d.id === id);
        if (!row || !row.categoryId) continue;
        if (!category) category = row.categoryId;
        if (row.categoryId !== category) continue;
        if (cleaned.includes(row.id)) continue;
        if (cleaned.length >= CMP_MAX) break;
        cleaned.push(row.id);
      }
      cmpCategoryId.value = category;
      cmpDeviceIds.value = cleaned;
      syncCmpPropsForCategory();
    }
    function removeCmpDevice(id) {
      cmpDeviceIds.value = cmpDeviceIds.value.filter(x => x !== id);
    }
    function openCmpDrawer() {
      if (!cmpCategoryId.value) {
        showToast('请先选择品类', 'warn');
        return;
      }
      cmpDrawerPick.value = cmpDeviceIds.value.slice();
      cmpDrawerSearch.value = '';
      cmpDrawerOpen.value = true;
    }
    function closeCmpDrawer() { cmpDrawerOpen.value = false; }
    function toggleCmpDrawerPick(id) {
      const arr = cmpDrawerPick.value.slice();
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1);
      else {
        if (arr.length >= CMP_MAX) { showToast('最多对比 ' + CMP_MAX + ' 台设备', 'warn'); return; }
        arr.push(id);
      }
      cmpDrawerPick.value = arr;
    }
    function confirmCmpDrawer() {
      cmpDeviceIds.value = cmpDrawerPick.value.slice(0, CMP_MAX);
      cmpDrawerOpen.value = false;
    }
    function toggleCmpProp(identifier) {
      const arr = cmpPropIds.value.slice();
      const i = arr.indexOf(identifier);
      if (i >= 0) {
        if (arr.length <= 1) return; // keep at least one
        arr.splice(i, 1);
      } else arr.push(identifier);
      cmpPropIds.value = arr;
    }
    function refreshCmp() { cmpRefreshNonce.value += 1; showToast('已刷新对比数据（mock）', 'ok'); }
    function toggleCmpListSelect(id, evt) {
      if (evt) evt.stopPropagation();
      const arr = cmpListSelected.value.slice();
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(id);
      cmpListSelected.value = arr;
    }
    function compareFromMonitorList() {
      const ids = cmpListSelected.value;
      if (!ids.length) { showToast('请先勾选设备', 'warn'); return; }
      const rows = ids.map(id => MONITOR_ROWS.find(d => d.id === id)).filter(Boolean);
      const cats = [...new Set(rows.map(r => r.categoryId).filter(Boolean))];
      if (cats.length !== 1) { showToast('仅支持同品类设备对比', 'warn'); return; }
      if (rows.length > CMP_MAX) { showToast('最多对比 ' + CMP_MAX + ' 台，已截取前 ' + CMP_MAX + ' 台', 'warn'); }
      goMonitorCompare(ids.slice(0, CMP_MAX));
    }

    /* ---- 数据可信 ---- */
    const dtStandards = ref(DT_STANDARDS_SEED.map(s => dtDeep(s)));
    const dtMappings = ref(DT_CHILDREN.mappings.map(s => dtDeep(s)));
    const dtAssertions = ref(DT_CHILDREN.assertions.map(s => dtDeep(s)));
    const dtRelations = ref(DT_CHILDREN.relations.map(s => dtDeep(s)));
    const dtTimeliness = ref(DT_CHILDREN.timeliness.map(s => dtDeep(s)));
    const dtOffline = ref(DT_CHILDREN.offline.map(s => dtDeep(s)));
    const dtMarkRefs = ref(DT_CHILDREN.markRefs.map(s => dtDeep(s)));
    const dtOverrides = ref(DT_OVERRIDES_SEED.map(s => dtDeep(s)));
    const dtSamples = ref(DT_SAMPLES_SEED.map(s => dtDeep(s)));
    const dtJudgements = ref(DT_JUDGEMENTS_SEED.map(s => dtDeep(s)));
    const dtJudgementItems = ref(DT_JUDGEMENT_ITEMS_SEED.map(s => dtDeep(s)));
    const dtGaps = ref(DT_GAPS_SEED.map(s => dtDeep(s)));
    const dtStats = ref(DT_STATS_SEED.map(s => dtDeep(s)));
    const dtCategoryId = ref('C001');
    const dtViewStandardId = ref('');
    const dtShowHistory = ref(false);
    const dtStdTab = ref('standard');
    const dtOverrideScopeType = ref('project');
    const dtOverrideScopeId = ref('PJ01');
    const dtOverrideInterval = ref(90);
    const dtOverrideWindow = ref(45);
    const dtJCategory = ref('');
    const dtJProject = ref('');
    const dtJDevice = ref('');
    const dtJBegin = ref('');
    const dtJEnd = ref('');
    const dtJMetric = ref('');
    const dtJOnlyAbnormal = ref(false);
    const dtJCurrentId = ref('');
    const dtGDevice = ref('');
    const dtGBegin = ref('');
    const dtGEnd = ref('');
    const dtGStatus = ref('');
    const dtSCategory = ref('');
    const dtSProject = ref('');
    const dtSDevice = ref('');
    const dtDeviceIntervalInput = ref('');
    const dtDeviceWindowInput = ref('');

    function dtNow() { return '2026-11-12 10:30:00'; }
    function dtStatusLabel(status) { return DT_STATUS_LABEL[status] || status || '—'; }
    function dtStatusTag(status) { return DT_STATUS_TAG[status] || 'tag-gray'; }
    function dtAssertLabel(type) { return DT_ASSERT_LABEL[type] || type || '—'; }
    function dtRelLabel(type) { return DT_REL_LABEL[type] || type || '—'; }
    function dtItemStatusLabel(status) { return DT_ITEM_STATUS_LABEL[status] || status || '—'; }
    function dtItemStatusTag(status) { return DT_ITEM_STATUS_TAG[status] || 'tag-gray'; }
    function dtMarkName(code) {
      const m = DT_MARKS.find(x => x.code === code);
      return m ? (m.name + '（' + code + '）') : code;
    }
    function dtDeviceName(id) {
      if (!id) return '—';
      const d = deviceList.value.find(x => x.id === id) || DEVICES.find(x => x.id === id);
      return d ? (d.name + ' · ' + id) : id;
    }
    function dtProjectName(id) {
      if (!id) return '—';
      const p = PROJECTS.find(x => x.id === id);
      return p ? p.name : id;
    }
    function dtCategoryName(id) {
      const c = CATEGORIES.find(x => x.id === id);
      return c ? c.name : (id || '—');
    }
    function dtSampleById(id) { return dtSamples.value.find(s => s.id === id) || null; }
    function dtFindOverride(scopeType, scopeId, categoryId) {
      if (!scopeId) return null;
      return dtOverrides.value.find(o => o.enabled && o.scopeType === scopeType && o.scopeId === scopeId && o.categoryId === categoryId) || null;
    }
    function dtPublishedOf(categoryId) {
      return dtStandards.value.find(s => s.categoryId === categoryId && s.status === 'published') || null;
    }
    function dtPublishedTimeliness(categoryId) {
      const std = dtPublishedOf(categoryId);
      if (!std) return null;
      return dtTimeliness.value.find(t => t.standardId === std.id) || null;
    }
    function dtResolveInterval(device) {
      if (!device) return { intervalSec: null, windowSec: null, source: 'category', label: '继承自品类', overrideId: null, categoryInterval: null, projectInterval: null };
      const tim = dtPublishedTimeliness(device.categoryId);
      const baseInterval = tim ? tim.intervalSec : null;
      const baseWindow = tim ? tim.windowSec : null;
      const proj = device.projectId ? dtFindOverride('project', device.projectId, device.categoryId) : null;
      const dev = dtFindOverride('device', device.id, device.categoryId);
      if (dev) {
        return { intervalSec: dev.intervalSec, windowSec: dev.windowSec, source: 'device', label: '已覆盖', overrideId: dev.id, categoryInterval: baseInterval, projectInterval: proj ? proj.intervalSec : null };
      }
      if (proj) {
        return { intervalSec: proj.intervalSec, windowSec: proj.windowSec, source: 'project', label: '继承自项目', overrideId: null, categoryInterval: baseInterval, projectInterval: proj.intervalSec };
      }
      return { intervalSec: baseInterval, windowSec: baseWindow, source: 'category', label: '继承自品类', overrideId: null, categoryInterval: baseInterval, projectInterval: null };
    }
    const dtStandardsOfCategory = computed(() => {
      return dtStandards.value.filter(s => s.categoryId === dtCategoryId.value).slice().sort((a, b) => b.version - a.version);
    });
    const dtEffectiveStandard = computed(() => dtStandardsOfCategory.value.find(s => s.status === 'published') || null);
    const dtDraftStandard = computed(() => dtStandardsOfCategory.value.find(s => s.status === 'draft') || null);
    const dtViewStandard = computed(() => {
      if (dtViewStandardId.value) {
        return dtStandards.value.find(s => s.id === dtViewStandardId.value) || dtEffectiveStandard.value || dtDraftStandard.value;
      }
      return dtEffectiveStandard.value || dtDraftStandard.value || null;
    });
    const dtViewReadonly = computed(() => !dtViewStandard.value || dtViewStandard.value.status !== 'draft');
    function dtRowsOf(list) {
      const id = dtViewStandard.value && dtViewStandard.value.id;
      if (!id) return [];
      return list.value.filter(row => row.standardId === id);
    }
    const dtViewMappings = computed(() => dtRowsOf(dtMappings).map(m => {
      const prop = dtPropOf(dtCategoryId.value, m.identifier);
      const point = dtPointOf(m.identifier);
      return Object.assign({}, m, {
        name: prop ? prop.name : (point ? point.name : m.identifier),
        dataType: prop ? prop.dataType : (point ? point.dataType : '—'),
        unit: prop ? (prop.unit || '—') : (point ? point.unit : '—'),
      });
    }));
    const dtViewAssertionGroups = computed(() => {
      const rows = dtRowsOf(dtAssertions);
      const ids = [];
      rows.forEach(r => { if (ids.indexOf(r.identifier) < 0) ids.push(r.identifier); });
      return ids.map(identifier => {
        const prop = dtPropOf(dtCategoryId.value, identifier);
        const point = dtPointOf(identifier);
        const byType = {};
        rows.filter(r => r.identifier === identifier).forEach(r => { byType[r.type] = r; });
        return {
          identifier,
          name: prop ? prop.name : (point ? point.name : identifier),
          byType,
        };
      });
    });
    const dtViewRelations = computed(() => dtRowsOf(dtRelations));
    const dtViewTimeliness = computed(() => dtRowsOf(dtTimeliness)[0] || null);
    const dtViewOffline = computed(() => dtRowsOf(dtOffline)[0] || null);
    const dtViewMarkRefs = computed(() => {
      const refs = dtRowsOf(dtMarkRefs);
      return DT_MARKS.map(m => {
        const hit = refs.find(r => r.code === m.code);
        return { code: m.code, name: m.name, assertionType: m.assertionType, enabled: hit ? hit.enabled : false, row: hit };
      });
    });
    const dtOverridesOfCategory = computed(() => dtOverrides.value.filter(o => o.categoryId === dtCategoryId.value));
    const dtEffectivePreview = computed(() => {
      return deviceList.value.filter(d => d.categoryId === dtCategoryId.value).slice(0, 8).map(d => ({
        device: d, eff: dtResolveInterval(d),
      }));
    });
    const dtScopeOptions = computed(() => {
      if (dtOverrideScopeType.value === 'device') {
        return deviceList.value.filter(d => d.categoryId === dtCategoryId.value).map(d => ({ id: d.id, label: d.name + ' · ' + d.id }));
      }
      return PROJECTS.map(p => ({ id: p.id, label: p.name + ' · ' + p.id }));
    });
    function dtGuardDraft() {
      if (!dtViewReadonly.value) return true;
      showToast('已发布或历史版本只读。改规则请从当前版复制出新草稿再发布', 'warn');
      return false;
    }
    function dtCreateDraft() {
      const cat = dtCategoryId.value;
      if (dtDraftStandard.value) {
        dtViewStandardId.value = dtDraftStandard.value.id;
        dtStdTab.value = 'standard';
        showToast('已有草稿 v' + dtDraftStandard.value.version + '，请在草稿上修改或先发布', 'warn');
        return;
      }
      const src = dtEffectiveStandard.value;
      const versions = dtStandardsOfCategory.value.map(s => s.version);
      const nextVer = (versions.length ? Math.max.apply(null, versions) : 0) + 1;
      const id = 'STD-' + cat + '-' + nextVer;
      dtStandards.value.unshift({
        id, categoryId: cat, version: nextVer, status: 'draft',
        effectiveAt: null, supersededAt: null, createdAt: dtNow(),
        copiedFrom: src ? src.version : null,
      });
      if (src) dtCloneChildren(src.id, id);
      else dtSeedFromModel(id, cat);
      dtViewStandardId.value = id;
      dtShowHistory.value = false;
      dtStdTab.value = 'standard';
      showToast('已复制出草稿 v' + nextVer + (src ? ('（来自 v' + src.version + '）') : '（来自物模型）'), 'ok');
    }
    function dtCloneChildren(fromId, toId) {
      function copy(list) {
        list.value.filter(row => row.standardId === fromId).forEach(row => {
          const c = dtDeep(row);
          c.standardId = toId;
          c.id = toId + String(row.id).slice(fromId.length);
          list.value.push(c);
        });
      }
      copy(dtMappings); copy(dtAssertions); copy(dtRelations); copy(dtTimeliness); copy(dtOffline); copy(dtMarkRefs);
    }
    function dtSeedFromModel(standardId, categoryId) {
      const props = PROPERTIES.filter(p => p.categoryId === categoryId);
      props.forEach(p => {
        const point = dtPointOf(p.identifier);
        dtMappings.value.push({ id: standardId + '-map-' + p.identifier, standardId, identifier: p.identifier, sourceKey: 'data[].' + p.identifier, enabled: p.showInMonitor !== false });
        dtMetricAsserts({ assertions: dtAssertions.value }, standardId, p.identifier, p, point, { required: !!p.required, participate: true });
      });
      const point0 = props.length ? dtPointOf(props[0].identifier) : null;
      const intervalSec = point0 ? point0.cycle : dtParseCycleSec(props[0] && props[0].reportCycle, 60);
      dtTimeliness.value.push({
        id: standardId + '-time', standardId, mode: 'fixed', intervalSec,
        windowSec: Math.round(intervalSec / 2), windowManual: false, completenessEnabled: true,
        intervalCite: point0 ? ('point.' + point0.code + '.cycle') : 'standard',
      });
      dtOffline.value.push({ id: standardId + '-off', standardId, thresholdCount: 3, thresholdDurationSec: null });
      DT_MARKS.forEach(m => dtMarkRefs.value.push({ id: standardId + '-mk-' + m.code, standardId, code: m.code, enabled: true }));
    }
    function dtPublish() {
      const cur = dtViewStandard.value;
      if (!cur || cur.status !== 'draft') {
        showToast('只有草稿可以发布。已发布版本只读', 'warn');
        return;
      }
      const at = dtNow();
      dtStandards.value.forEach(s => {
        if (s.categoryId === cur.categoryId && s.status === 'published') {
          s.status = 'superseded';
          s.supersededAt = at;
        }
      });
      cur.status = 'published';
      cur.effectiveAt = at;
      dtViewStandardId.value = cur.id;
      showToast('v' + cur.version + ' 已发布。判断只使用当时已发布且在生效范围内的版本', 'ok');
    }
    function dtViewVersion(row) {
      dtViewStandardId.value = row.id;
      dtStdTab.value = 'standard';
      dtShowHistory.value = false;
    }
    function dtBackToEffective() {
      dtViewStandardId.value = '';
      dtShowHistory.value = false;
    }
    function dtToggleMapping(row) {
      if (!dtGuardDraft()) return;
      const hit = dtMappings.value.find(m => m.id === row.id);
      if (hit) hit.enabled = !hit.enabled;
    }
    function dtToggleAssertion(row) {
      if (!row || !dtGuardDraft()) return;
      row.enabled = !row.enabled;
    }
    function dtToggleRelation(row) {
      if (!row || !dtGuardDraft()) return;
      row.enabled = !row.enabled;
    }
    function dtToggleMark(row) {
      if (!row || !dtGuardDraft()) return;
      row.enabled = !row.enabled;
    }
    function dtSetRangeCite(row, cite) {
      if (!row || !dtGuardDraft()) return;
      row.params.cite = cite;
      if (cite === 'point') {
        const point = dtPointOf(row.params.pointCode || row.identifier);
        if (point) { row.params.min = point.min; row.params.max = point.max; row.params.pointCode = point.code; }
      }
    }
    function dtOnIntervalInput(tim) {
      if (!tim || dtViewReadonly.value) return;
      const n = Number(tim.intervalSec);
      if (!tim.windowManual && Number.isFinite(n) && n > 0) tim.windowSec = Math.round(n / 2);
    }
    function dtMarkWindowManual(tim) {
      if (!tim || dtViewReadonly.value) return;
      tim.windowManual = true;
    }
    function dtSetOfflineMode(off, mode) {
      if (!off || !dtGuardDraft()) return;
      if (mode === 'count') {
        off.thresholdDurationSec = null;
        if (off.thresholdCount == null) off.thresholdCount = 3;
      } else {
        off.thresholdCount = null;
        if (off.thresholdDurationSec == null) off.thresholdDurationSec = 180;
      }
    }
    function dtSaveOverrideForm() {
      const scopeId = dtOverrideScopeId.value;
      const intervalSec = Number(dtOverrideInterval.value);
      if (!scopeId) { showToast('请选择项目或设备', 'warn'); return; }
      if (!Number.isFinite(intervalSec) || intervalSec <= 0) { showToast('间隔须为正数秒', 'warn'); return; }
      let windowSec = Number(dtOverrideWindow.value);
      if (!Number.isFinite(windowSec) || windowSec < 0) windowSec = Math.round(intervalSec / 2);
      const exist = dtOverrides.value.find(o => o.scopeType === dtOverrideScopeType.value && o.scopeId === scopeId && o.categoryId === dtCategoryId.value);
      if (exist) {
        exist.intervalSec = intervalSec;
        exist.windowSec = windowSec;
        exist.windowManual = windowSec !== Math.round(intervalSec / 2);
        exist.enabled = true;
      } else {
        dtOverrides.value.push({
          id: 'OV-' + dtOverrideScopeType.value + '-' + scopeId + '-' + dtCategoryId.value,
          scopeType: dtOverrideScopeType.value, scopeId, categoryId: dtCategoryId.value,
          intervalSec, windowSec, windowManual: windowSec !== Math.round(intervalSec / 2), enabled: true,
        });
      }
      showToast('已保存间隔覆盖。未覆盖的对象继续继承', 'ok');
    }
    function dtRestoreOverride(row) {
      dtOverrides.value = dtOverrides.value.filter(o => o.id !== row.id);
      showToast('已恢复继承', 'ok');
    }
    function dtSyncDeviceIntervalInputs(d) {
      if (!d) { dtDeviceIntervalInput.value = ''; dtDeviceWindowInput.value = ''; return; }
      const dev = dtFindOverride('device', d.id, d.categoryId);
      dtDeviceIntervalInput.value = dev ? dev.intervalSec : '';
      dtDeviceWindowInput.value = dev ? dev.windowSec : '';
    }
    const dtDeviceIntervalView = computed(() => dtResolveInterval(currentDevice.value));
    watch(() => currentDevice.value && currentDevice.value.id, () => {
      dtSyncDeviceIntervalInputs(currentDevice.value);
    }, { immediate: true });
    function dtSaveDeviceOverride() {
      const d = currentDevice.value;
      if (!d || !d.categoryId) { showToast('设备未关联品类，不能覆盖间隔', 'warn'); return; }
      const intervalSec = Number(dtDeviceIntervalInput.value);
      if (!Number.isFinite(intervalSec) || intervalSec <= 0) { showToast('间隔须为正数秒', 'warn'); return; }
      let windowSec = Number(dtDeviceWindowInput.value);
      if (!Number.isFinite(windowSec) || windowSec < 0) windowSec = Math.round(intervalSec / 2);
      const exist = dtOverrides.value.find(o => o.scopeType === 'device' && o.scopeId === d.id && o.categoryId === d.categoryId);
      if (exist) {
        exist.intervalSec = intervalSec;
        exist.windowSec = windowSec;
        exist.windowManual = windowSec !== Math.round(intervalSec / 2);
        exist.enabled = true;
      } else {
        dtOverrides.value.push({
          id: 'OV-device-' + d.id, scopeType: 'device', scopeId: d.id, categoryId: d.categoryId,
          intervalSec, windowSec, windowManual: windowSec !== Math.round(intervalSec / 2), enabled: true,
        });
      }
      dtSyncDeviceIntervalInputs(d);
      showToast('设备间隔已覆盖。窗口默认为间隔的一半', 'ok');
    }
    function dtRestoreDeviceOverride() {
      const d = currentDevice.value;
      if (!d) return;
      dtOverrides.value = dtOverrides.value.filter(o => !(o.scopeType === 'device' && o.scopeId === d.id && o.categoryId === d.categoryId));
      dtSyncDeviceIntervalInputs(d);
      showToast('已恢复继承', 'ok');
    }
    function openCategoryStandard(cat) {
      const id = (cat && cat.id) || (currentCategory.value && currentCategory.value.id) || 'C001';
      jump('categoryStandard?categoryId=' + encodeURIComponent(id));
    }
    const dtMetricOptions = computed(() => {
      const cid = dtJCategory.value;
      const props = cid ? getCategoryProperties(cid) : PROPERTIES;
      const seen = {};
      const list = [];
      props.forEach(p => {
        if (seen[p.identifier]) return;
        seen[p.identifier] = true;
        list.push({ identifier: p.identifier, name: p.name });
      });
      return list;
    });
    function dtFormatValues(values) {
      if (!values) return '—';
      const keys = Object.keys(values);
      if (!keys.length) return '—';
      return keys.map(k => k + '=' + (values[k] == null ? 'null' : values[k])).join('，');
    }
    function dtJudgementReasonText(j) {
      const fails = dtJudgementItems.value.filter(i => i.judgementId === j.id && i.status === 'fail' && i.marks && i.marks.length);
      if (!fails.length) {
        const note = dtJudgementItems.value.find(i => i.judgementId === j.id && i.reason === '对照对象缺失');
        return note ? '对照对象缺失（本条仍合格）' : '—';
      }
      return fails.map(i => i.identifier + ' ' + i.marks.map(dtMarkName).join('/')).join('；');
    }
    function dtScopeText(j) {
      if (!j) return '—';
      if (j.scopeType === 'device') return '设备覆盖 ' + dtDeviceName(j.scopeId) + ' · 间隔 ' + j.intervalSec + 's · 窗口 ' + j.windowSec + 's';
      if (j.scopeType === 'project') return '项目覆盖 ' + dtProjectName(j.scopeId) + ' · 间隔 ' + j.intervalSec + 's · 窗口 ' + j.windowSec + 's';
      return '品类已发布版本 ' + dtCategoryName(j.categoryId) + ' · 间隔 ' + j.intervalSec + 's · 窗口 ' + j.windowSec + 's';
    }
    const dtFilteredJudgements = computed(() => {
      return dtJudgements.value.filter(j => {
        if (dtJCategory.value && j.categoryId !== dtJCategory.value) return false;
        if (dtJProject.value && j.projectId !== dtJProject.value) return false;
        if (dtJDevice.value && j.deviceId !== dtJDevice.value) return false;
        if (dtJBegin.value && String(j.judgedAt) < dtJBegin.value) return false;
        if (dtJEnd.value && String(j.judgedAt) > (dtJEnd.value.length <= 10 ? dtJEnd.value + ' 23:59:59' : dtJEnd.value)) return false;
        if (dtJMetric.value && !(j.values && Object.prototype.hasOwnProperty.call(j.values, dtJMetric.value))) return false;
        if (dtJOnlyAbnormal.value && j.overallPass) return false;
        return true;
      }).slice().sort((a, b) => String(b.judgedAt).localeCompare(String(a.judgedAt)));
    });
    const dtCurrentJudgement = computed(() => dtJudgements.value.find(j => j.id === dtJCurrentId.value) || null);
    const dtCurrentItems = computed(() => dtJudgementItems.value.filter(i => i.judgementId === dtJCurrentId.value));
    const dtCurrentSample = computed(() => {
      const j = dtCurrentJudgement.value;
      return j ? dtSampleById(j.sampleId) : null;
    });
    const dtPriorJudgement = computed(() => {
      const j = dtCurrentJudgement.value;
      if (!j) return null;
      if (j.replaces) return dtJudgements.value.find(x => x.id === j.replaces) || null;
      return dtJudgements.value.find(x => x.sampleId === j.sampleId && x.id !== j.id && x.kept) || null;
    });
    function dtOpenJudgement(id) {
      if (!id) return;
      jump('dataTrustJudgement?id=' + encodeURIComponent(id));
    }
    function dtOpenMessage(j) {
      if (!j) return;
      if (!j.messageId) {
        showToast('本条无平台报文 id，外部数据记 externalId=' + (j.externalId || '—') + '，流程相同', 'warn');
        return;
      }
      const sample = dtSampleById(j.sampleId);
      const device = deviceList.value.find(d => d.id === (sample && sample.deviceId) || d.id === j.deviceId);
      if (!device) { showToast('未找到设备', 'warn'); return; }
      jump('deviceDetail?id=' + encodeURIComponent(device.id) + '&tab=localData&packet=' + encodeURIComponent(j.messageId));
    }
    function dtOpenSample(j) {
      if (!j) return;
      const sample = dtSampleById(j.sampleId);
      const deviceId = (sample && sample.deviceId) || j.deviceId;
      const row = MONITOR_ROWS.find(r => r.id === deviceId);
      if (row) {
        openMonitorDetail(row);
        monDetailTab.value = 'reports';
        location.hash = 'monitorDetail?id=' + encodeURIComponent(deviceId) + '&tab=reports';
        return;
      }
      const device = deviceList.value.find(d => d.id === deviceId);
      if (device) openMonitorForDevice(device);
      monDetailTab.value = 'reports';
      showToast('已打开监控上报明细。测值读 sample 原 JSON，异常读 qualityJson', 'ok');
    }
    function dtGapStatusKey(g) {
      if (g.status === 'filled') return 'filled';
      if (g.status === 'recovered') return 'recovered';
      if (g.type === 'offline') return 'offline';
      return 'missing';
    }
    function dtGapStatusLabel(g) {
      const k = dtGapStatusKey(g);
      return { missing: '缺报中', filled: '已补回', offline: '离线中', recovered: '已恢复' }[k] || k;
    }
    function dtGapStatusTag(g) {
      const k = dtGapStatusKey(g);
      return { missing: 'tag-orange', filled: 'tag-green', offline: 'tag-red', recovered: 'tag-blue' }[k] || 'tag-gray';
    }
    function dtGapWhen(g) {
      if (g.slotTime) return g.slotTime;
      if (g.periodStart && g.periodEnd) return g.periodStart + ' ~ ' + g.periodEnd;
      if (g.periodStart) return g.periodStart + ' 起';
      return '—';
    }
    const dtFilteredGaps = computed(() => {
      return dtGaps.value.filter(g => {
        if (dtGDevice.value && g.deviceId !== dtGDevice.value) return false;
        if (dtGStatus.value && dtGapStatusKey(g) !== dtGStatus.value) return false;
        const when = g.slotTime || g.periodStart || '';
        if (dtGBegin.value && when && when < dtGBegin.value) return false;
        if (dtGEnd.value && when && when > (dtGEnd.value.length <= 10 ? dtGEnd.value + ' 23:59:59' : dtGEnd.value)) return false;
        return true;
      }).slice().sort((a, b) => String(dtGapWhen(b)).localeCompare(String(dtGapWhen(a))));
    });
    function dtStatCompleteness(row) {
      if (!row || !row.received) return '—';
      return (Math.round((row.expected / row.received) * 1000) / 10).toFixed(1) + '%';
    }
    function dtStatValidity(row) {
      if (!row || !row.judgedMetrics) return '—';
      const ok = row.judgedMetrics - row.abnormalMetrics;
      return (Math.round((ok / row.judgedMetrics) * 1000) / 10).toFixed(1) + '%';
    }
    const dtFilteredStats = computed(() => {
      return dtStats.value.filter(row => {
        if (dtSCategory.value && row.categoryId !== dtSCategory.value) return false;
        if (dtSProject.value && row.projectId !== dtSProject.value) return false;
        if (dtSDevice.value && row.deviceId !== dtSDevice.value) return false;
        return true;
      });
    });
    const dtStatSummary = computed(() => {
      const rows = dtFilteredStats.value.filter(r => r.deviceId);
      const base = rows.length ? rows : dtFilteredStats.value;
      return base.reduce((acc, r) => {
        acc.expected += r.expected;
        acc.received += r.received;
        acc.judgedMetrics += r.judgedMetrics;
        acc.abnormalMetrics += r.abnormalMetrics;
        return acc;
      }, { expected: 0, received: 0, judgedMetrics: 0, abnormalMetrics: 0 });
    });
    function dtLatestSample(deviceId) {
      const rows = dtSamples.value.filter(s => s.deviceId === deviceId).slice().sort((a, b) => String(b.sampleTime).localeCompare(String(a.sampleTime)));
      return rows[0] || null;
    }
    function dtMetricMarks(deviceId, identifier) {
      const s = dtLatestSample(deviceId);
      if (!s || !s.qualityJson || !s.qualityJson[identifier]) return [];
      return s.qualityJson[identifier];
    }
    function onMetricCellClick(d, identifier, evt) {
      const marks = dtMetricMarks(d.id, identifier);
      if (!marks.length) return;
      if (evt && evt.stopPropagation) evt.stopPropagation();
      const s = dtLatestSample(d.id);
      if (s && s.judgeId) dtOpenJudgement(s.judgeId);
    }
    function reportMarks(row, code) {
      if (!row || !row.qualityJson || !row.qualityJson[code]) return [];
      return row.qualityJson[code];
    }
    function openReportJudge(row, evt) {
      if (!row || !row.judgeId) return;
      if (evt && evt.stopPropagation) evt.stopPropagation();
      dtOpenJudgement(row.judgeId);
    }
    function monCurveQualityMarks(ch) {
      const row = currentMonitor.value;
      if (!row || !ch || ch.mode === 'merge' || !ch.point || !ch.svg) return [];
      const code = ch.point.code;
      const svg = ch.svg;
      const series = ch.series || [];
      if (!series.length) return [];
      const samples = dtSamples.value.filter(s => s.deviceId === row.id && s.qualityJson && Array.isArray(s.qualityJson[code]) && s.qualityJson[code].length);
      return samples.map((s, i) => {
        const idx = Math.max(0, Math.min(series.length - 1, Math.round(series.length * (0.62 + i * 0.12))));
        const pt = series[idx];
        const x = svg.padL + pt.t * (svg.w - svg.padL - svg.padR);
        const ymin = ch.point.ymin != null ? ch.point.ymin : 0;
        const ymax = ch.point.ymax != null ? ch.point.ymax : 10;
        const y = svg.padT + (1 - (pt.v - ymin) / ((ymax - ymin) || 1)) * (svg.h - svg.padT - svg.padB);
        return { x: x, y: y, judgeId: s.judgeId, sampleId: s.id, marks: s.qualityJson[code], code: code };
      });
    }
    function parsePacketDatasets(parsedJson) {
      if (!parsedJson) return [];
      let obj = parsedJson;
      if (typeof parsedJson === 'string') {
        try { obj = JSON.parse(parsedJson); } catch (e) { return []; }
      }
      const data = obj && obj.data;
      if (Array.isArray(data)) return [{ serial: '（历史数组）', rows: data }];
      if (data && typeof data === 'object') {
        return Object.keys(data).map(serial => ({
          serial: serial,
          rows: Array.isArray(data[serial]) ? data[serial] : [data[serial]],
        }));
      }
      return [];
    }
    function dtSamplesOfMessage(messageId) {
      return dtSamples.value.filter(s => s.messageId === messageId);
    }
    function dtQualitySummary(sample) {
      const q = sample && sample.qualityJson;
      if (!q || !Object.keys(q).length) return '无异常';
      return Object.keys(q).map(k => k + ' ' + q[k].map(dtMarkName).join('/')).join('；');
    }
    function dtDatasetText(row) {
      if (!row || typeof row !== 'object') return '—';
      return Object.keys(row).map(k => k + '=' + (row[k] == null ? 'null' : row[k])).join('，');
    }

    function resetOverlays() {
      showCategoryModal.value = false;
      showRuleModal.value = false;
      showCommandModal.value = false;
      showDeleteConfirm.value = false;
      showProjectModal.value = false;
      showImportModal.value = false;
      showDisableConfirm.value = false;
      showTransferModal.value = false;
      showSendLogModal.value = false;
      showDeviceOtaModal.value = false;
      showCategoryOtaModal.value = false;
      showCancelOtaConfirm.value = false;
      cmpDrawerOpen.value = false;
    }

    function jump(hash) {
      const normalized = hash || 'cockpit';
      const current = (location.hash || '').replace(/^#/, '');
      if (current !== normalized) {
        location.hash = normalized;
        return;
      }
      resetOverlays();
      let tabFromQuery = null;
      let queryParams = null;
      let key = hash || '';
      if (key.includes('?')) {
        const parts = key.split('?');
        key = parts[0];
        try {
          queryParams = new URLSearchParams(parts.slice(1).join('?'));
          tabFromQuery = queryParams.get('tab');
        } catch (e) { tabFromQuery = null; queryParams = null; }
      }
      if (key !== 'upgradeMonitor') stopUpgradeMonitorPoll();
      const map = {
        cockpit: () => goCockpit(),
        workbench: () => goCockpit(),
        home: () => goCockpit(),
        list: () => { module.value = 'thing'; screen.value = 'list'; },
        createCategory: () => { goList(); openCreateCategory(); },
        editCategory: () => { goList(); openEditCategory(CATEGORIES[0]); },
        detail: () => openDetail(CATEGORIES[0]),
        points: () => { openDetail(CATEGORIES[0]); detailTab.value = 'points'; },
        props: () => { openDetail(CATEGORIES[0]); detailTab.value = 'props'; },
        events: () => { openDetail(CATEGORIES[0]); detailTab.value = 'events'; },
        install: () => { openDetail(CATEGORIES[0]); detailTab.value = 'install'; },
        firmware: () => { openDetail(CATEGORIES[0]); detailTab.value = 'firmware'; },
        rules: () => { openDetail(CATEGORIES[0]); detailTab.value = 'rules'; },
        categoryRules: () => { openDetail(CATEGORIES[0]); detailTab.value = 'rules'; },
        commands: () => { openDetail(CATEGORIES[0]); detailTab.value = 'commands'; },
        batchDispatch: () => { openDetail(CATEGORIES[0]); detailTab.value = 'batchDispatch'; resetBatchDispatchState(); },
        otaTasks: () => {
          const id = (queryParams && queryParams.get('id')) || '';
          const categoryId = (queryParams && queryParams.get('categoryId')) || '';
          applyOtaTaskRoute(id, categoryId);
        },
        editCommand: () => { openDetail(CATEGORIES[0]); detailTab.value = 'commands'; openEditCommand(commandList.value.find(c => c.code === 'installHeightMm') || commandList.value.find(c => Number(c.hasParam) === 1) || commandList.value[0]); },
        editPoint: () => { openDetail(CATEGORIES[0]); openEditPoint(POINTS[0]); },
        editInstall: () => { openDetail(CATEGORIES[0]); openEditInstall(INSTALL_FIELDS[0]); },
        editFirmware: () => { openDetail(CATEGORIES[0]); openCreateFirmware(); },
        deleteConfirm: () => { goList(); confirmDelete('品类', 'C003', '管网压力表'); },
        // ledger
        projects: () => goProjects(),
        createProject: () => { goProjects(); openCreateProject(); },
        editProject: () => { goProjects(); openEditProject(PROJECTS[0]); },
        devices: () => openAllDevices(),
        unassignedDevices: () => goUnassignedDevices(),
        deviceDetail: () => {
          const id = queryParams && queryParams.get('id');
          const d = (id && deviceList.value.find(x => x.id === id)) || deviceList.value[0];
          openDeviceDetail(d, tabFromQuery || 'profile');
          const packet = queryParams && queryParams.get('packet');
          if (packet) expandedPacketIds.value = [packet];
        },
        deviceLocalData: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'localData'),
        devicePackets: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'localData'), // 旧 hash → 本机数据
        deviceDispatch: () => openDeviceDetail(deviceList.value.find(d => d.categoryId === 'C001') || deviceList.value[0], 'dispatch'),
        deviceSendLog: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'sendLog'),
        deviceUpgradeLog: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'upgradeLog'),
        deviceOta: () => { openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'upgradeLog'); openDeviceOtaModal(); },
        upgradeMonitor: () => {
          module.value = 'ota';
          screen.value = 'upgradeMonitor';
          upgradeMonitorTaskId.value = (queryParams && queryParams.get('taskId')) || '';
          startUpgradeMonitorPoll();
        },
        upgradeHistory: () => {
          module.value = 'ota';
          screen.value = 'upgradeHistory';
          upgradeHistoryDeviceId.value = (queryParams && queryParams.get('deviceId')) || '';
          const status = queryParams && queryParams.get('status');
          upgradeHistoryStatusFilter.value = (status === 'all' || status === 'success' || status === 'fail' || status === 'done') ? status : 'done';
          upgradeHistoryKeyword.value = '';
        },
        editDevice: () => { openDeviceDetail(deviceList.value[0]); openEditDevice(deviceList.value[0]); },
        aepReconcile: () => goAepReconcile(),
        importExport: () => { goDevices(); openImportModal(); },
        exportHelp: () => { goDevices(); openExportModal(); },
        deviceTransfer: () => { goUnassignedDevices(); openTransferModal(unassignedDevices.value[0] || null); },
        // monitor
        monitor: () => {
          goMonitorList();
          const cid = queryParams && queryParams.get('categoryId');
          if (cid) monCategoryFilter.value = cid;
        },
        monitorList: () => {
          goMonitorList();
          const cid = queryParams && queryParams.get('categoryId');
          if (cid) monCategoryFilter.value = cid;
        },
        monitorDetail: () => {
          const id = queryParams && queryParams.get('id');
          const row = (id && MONITOR_ROWS.find(r => r.id === id)) || MONITOR_ROWS[0];
          openMonitorDetail(row);
          if (queryParams && queryParams.get('tab') === 'reports') monDetailTab.value = 'reports';
        },
        categoryStandard: () => {
          module.value = 'dataTrust';
          screen.value = 'categoryStandard';
          const cid = (queryParams && queryParams.get('categoryId')) || 'C001';
          dtCategoryId.value = cid;
          const cat = CATEGORIES.find(c => c.id === cid);
          if (cat) currentCategory.value = cat;
          dtShowHistory.value = false;
          dtViewStandardId.value = (queryParams && queryParams.get('versionId')) || '';
          const tab = queryParams && queryParams.get('tab');
          if (tab === 'tip' || tab === 'standard') dtStdTab.value = tab;
        },
        dataTrustJudgement: () => {
          module.value = 'dataTrust';
          screen.value = 'dataTrustJudgement';
          dtJCurrentId.value = (queryParams && queryParams.get('id')) || '';
        },
        dataTrustGap: () => {
          module.value = 'dataTrust';
          screen.value = 'dataTrustGap';
        },
        dataTrustStats: () => {
          module.value = 'dataTrust';
          screen.value = 'dataTrustStats';
        },
        monitorCurve: () => openMonitorCurve(MONITOR_ROWS[0], 'yewei'),
        monitorOnlineRate: () => goMonitorOnlineRate(),
        monitorCurveLong: () => openMonitorCurve(MONITOR_ROWS.find(r => r.id === 'D006') || MONITOR_ROWS[0], 'rain'),
        deviceCompare: () => {
          const idsRaw = queryParams ? (queryParams.get('ids') || '') : '';
          const ids = idsRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
          const cat = queryParams ? (queryParams.get('category') || queryParams.get('categoryId') || '') : '';
          if (ids.length) goMonitorCompare(ids);
          else {
            goMonitorCompare();
            if (cat) { cmpCategoryId.value = cat; onCmpCategoryChange(); }
          }
        },
        monitorCompare: () => {
          const idsRaw = queryParams ? (queryParams.get('ids') || '') : '';
          const ids = idsRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
          goMonitorCompare(ids.length ? ids : undefined);
        },
      };
      if (map[key]) map[key]();
      else if (map[hash]) map[hash]();
    }

    function applyHash() {
      const h = (location.hash || '#cockpit').replace('#', '');
      jump(h || 'cockpit');
    }
    window.addEventListener('hashchange', applyHash);
    nextTick(applyHash);

    window.__protoApp = {
      jump, screen, module, detailTab,
      showCategoryModal, showRuleModal, showCommandModal, showPropertyModal, showDeleteConfirm, showProjectModal, showImportModal, showDisableConfirm, showTransferModal
    };

    return {
      module, screen, detailTab, searchKeyword, filterIndustry,
      goCockpit, cockpitStats, cockpitCategoryDist, cockpitProjectRows, cockpitUnassignedRow, cockpitSyncStatus, COCKPIT_TODOS, COCKPIT_ACTIVITIES, formatPlatformCount,
      filteredCategories, industries, breadcrumb, topbarHint, currentCategory,
      CATEGORIES, PROPERTIES, EVENTS, POINTS, INSTALL_FIELDS, FIRMWARES, COMMANDS,
      currentCategoryProperties, getCategoryProperties, getCategoryMonitorProperties, isShowInMonitor,
      propertyList, showPropertyModal, propertyModalMode, propertyForm,
      openCreateProperty, openEditProperty, saveProperty, togglePropertyShowInMonitor,
      CATEGORY_RULES, categoryRules, currentCategoryRules,
      commandList, currentCategoryCommands, COMMAND_DATA_TYPES, COMMAND_ACCESS_OPTS,
      onCommandHasParamChange,
      showCategoryModal, categoryModalMode, categoryForm,
      showRuleModal, ruleModalMode, ruleForm,
      openCreateRule, openEditRule, saveRule, toggleRuleEnabled,
      showCommandModal, commandModalMode, commandForm,
      openCreateCommand, openEditCommand, saveCommand, toggleCommandEnabled,
      commandParamsSummary,
      showDeleteConfirm, deleteTarget,
      pointForm, pointFormMode, installForm, installFormMode, firmwareForm, FIRMWARE_EDIT_REFUSED, FIRMWARE_DELETE_REFUSED, FIRMWARE_DELETE_WARN, firmwareToday,
      firmwareSelectedIds, toggleFirmwareSelect, toggleFirmwareSelectAll, confirmBatchDeleteFirmware,
      firmwareUploadInput, firmwareUploading, triggerFirmwareUpload, onFirmwarePackageSelected,
      goList, openDetail, openCreateCategory, openEditCategory, saveCategory,
      confirmDelete, doDelete,
      openCreatePoint, openEditPoint, savePoint,
      openCreateInstall, openEditInstall, saveInstall,
      openCreateFirmware, saveFirmware, formatPackageSize,
      jump,
      // ledger
      PROJECTS, DEVICES, deviceList, LIFECYCLES, LC_CLASS, LC_TAG, PJ_STATUS_TAG,
      UNASSIGNED_PROJECT_ID, UNASSIGNED_PROJECT_NAME,
      projectSearch, projectStatusFilter, filteredProjects,
      showProjectModal, projectModalMode, projectForm,
      openCreateProject, openEditProject, saveProject, openAllDevices, openDevicesForProject, openDevicesForProjectLifecycle, openDevicesForCategory, openDevicesForLifecycle, LIFECYCLE_TO_STATUS,
      goProjects, goDevices, goUnassignedDevices, goAepReconcile,
      deviceProjectFilter, deviceCategoryFilter, deviceLifecycleFilter, deviceImeiSearch, deviceMasterFilter, deviceSlaveCategoryFilter, showProbeDevices, isProbeAepId, isChildDevice, isHubDevice, displayAepDeviceId,
      filteredDevices, deviceStats, currentDevice, openDeviceDetail, currentMessageInfo, displayNullable, deviceFirmwareVersion,
      deviceDetailTab, setDeviceDetailTab, deviceDispatchCommands, dispatchSelectedCmds,
      dispatchSelected, dispatchParams, dispatchPreviewHex, dispatchPreviewOk,
      isDispatchSelected, toggleDispatchCmd, dryRunDispatch, sendDispatch, toast,
      batchCmdId, batchParams, batchProjectFilter, batchOnlineOnly, batchSelectedDeviceIds,
      batchPreviewHex, batchPreviewOk, batchJobSummary, batchableCategoryCommands, batchSelectedCommand,
      batchCandidateDevices, onBatchCommandChange, isBatchDeviceSelected, toggleBatchDevice,
      toggleBatchDevicesAll, dryRunBatchDispatch, confirmBatchDispatch, resetBatchDispatchState,
      deviceUpgradeLogs, currentDeviceUpgradeLogs, categoryOtaTasks, otaTaskList,
      showDeviceOtaModal, deviceOtaTargetVer, deviceOtaPackageUrl, deviceOtaFirmwareOptions, openDeviceOtaModal, onDeviceOtaTargetChange, submitDeviceOta,
      showCategoryOtaModal, categoryOtaFirmwareId, categoryOtaTargetVer, categoryOtaPackageUrl, categoryOtaSelectedIds,
      categoryOtaOnlineOnly, categoryOtaTimeoutMinutes, categoryOtaExtraIds, categoryFirmwares,
      categoryOtaUpgradeableDevices, categoryOtaCandidateDevices, otaTaskFailureRows,
      currentOtaTaskId, otaTaskCategoryFilter, currentOtaTask, currentOtaTaskDevices, otaCreateResult,
      otaTaskStatusMeta, otaTaskStatusText, otaDeviceStatusMeta, otaDeviceStatusText,
      otaTimeoutMinutesOf, otaTaskTimeoutReason, otaDeviceBrief, deviceCategoryLabel,
      openOtaTaskDetail, closeOtaTaskDetail, openOtaTaskFromLog, openOtaTaskList, setOtaTaskCategoryFilter,
      openCategoryOtaTasks, startCategoryOtaTask, startOtaTaskFromPage,
      isUpgradeSupported, upgradeSupportedCategories, toggleCategoryUpgradeSupported,
      UPGRADE_SUPPORTED_SQL, UPGRADE_SUPPORTED_NOTE, OTA_CATEGORY_REJECT_MSG,
      categoryOtaCategoryId, categoryOtaRejectText, deviceOtaRejectText, onCategoryOtaCategoryChange,
      askCancelOtaTask, doCancelOtaTask, showCancelOtaConfirm, cancelOtaTarget,
      OTA_TIMEOUT_DEFAULT, OTA_DEVICE_CAP, OTA_CANCEL_REASON,
      openCategoryBatchOta, onCategoryOtaTargetChange, isCategoryOtaDeviceSelected, toggleCategoryOtaDevice,
      toggleCategoryOtaDevicesAll, submitCategoryOta, upgradeStatusTag, upgradeFromVersion, upgradeSuccessNote, upgradePackageLine, compareSemver,
      upgradeMonitorView, upgradeMonitorTaskId, upgradeMonitorPolledAt, openUpgradeMonitor, UPGRADE_MONITOR_POLL_MS,
      upgradeHistoryRows, upgradeHistoryCounts, upgradeHistoryDeviceId, upgradeHistoryStatusFilter, upgradeHistoryKeyword,
      openUpgradeHistory, clearUpgradeHistoryDevice, openDeviceUpgradeSlice,
      PACKET_FILTERS, PACKET_TYPE_TAG, PACKET_STATUS_TAG, packetTypeFilter, filteredDevicePackets, devicePacketTypeCounts,
      isPacketExpanded, togglePacketHex,
      deviceSendLogs, showSendLogModal, currentSendLog, openSendLogDetail, closeSendLogDetail, formatIdentifiers, sendLogSuccess, sendLogTypeLabel, sendLogDryRunLabel,
      getCommandParamFields,
      unassignedDevices, unassignedCount, selectedDeviceIds,
      toggleSelectDevice, toggleSelectAllFiltered,
      currentDeviceSlaves, currentDeviceMaster, canShowChildDevices, installParamEntries,
      deviceForm, deviceFormMode, openEditDevice, saveDevice, showCategoryOverride,
      categoryMatchLabel, isUnassigned, displayProjectName,
      showDisableConfirm, openDisableDevice, doDisableDevice,
      showImportModal, importMode, openImportModal, openExportModal,
      showTransferModal, transferForm, transferLogs, currentDeviceTransferLogs, deviceSnChangeLogs, currentDeviceSnChangeLogs,
      openTransferModal, confirmTransfer,
      aepDiffTab, aepLastSyncedAt, filteredAepDiffs, aepCounts, resolveAepDiff, syncFromAep,
      projectName, categoryName, resolveCategoryIcon, resolveCategoryIconKey, categoryIconifyId,
      ICON_CATALOG, DEFAULT_CODE_TO_ICONIFY, FALLBACK_ICONIFY, pickCategoryIcon,
      // monitor
      MONITOR_ROWS, TRUST_TAG, TRUST_LABEL, ONLINE_TAG,
      monProjectFilter, monCategoryFilter, monOnlineFilter, monAlarmFilter, monSearch,
      filteredMonitorRows, monListStats, currentMonitor,
      monMetricColumns, monHasCategoryFilter, monSelectedCategoryName,
      monLatestPoints, monSelectedPoint, monCurveRange, monCurvePointCode, monCurveMode, monHoverT,
      monDetailTab, monLedgerDevice, monIdentity, monReportColumns, monReportSamples, monReportSamplesAll,
      monReportBegin, monReportEnd, monReportEmptyHint, resetMonReportTimeRange, queryMonReportSamples,
      openMonitorDeviceLocalData,
      monChartablePoints, monCurveCharts, monHoverReadout, monPointsEmptyHint, monCurveEmptyHint,
      monCurveSeries, monCurveSvg, monCycleFullQueryTip,
      onMonCurveMove, onMonCurveLeave, setMonCurveMode, isFiniteMetricValue,
      monOnlineRateSummary, monOnlineRateRows,
      goMonitorList, goMonitorOnlineRate, openMonitorDetail, openMonitorCurve, openMonitorForDevice,
      latestPointEntries, latestMetricValue, formatMetricCell, latestSummaryText, selectCurvePoint, FLOOD_POINT_KEYS,
      alarmSummaryText, formatCycle, aepStatusLabel, aepStatusTag, AEP_STATUS_LABEL,
      // device compare
      CMP_MAX, cmpCategoryId, cmpDeviceIds, cmpPropIds, cmpRange, cmpDrawerOpen, cmpDrawerSearch, cmpDrawerPick,
      cmpTableOpen, cmpListSelected, cmpRefreshNonce,
      cmpCategoryProps, cmpSelectedDevices, cmpCandidateDevices, cmpPrimaryProp, cmpKpiCards,
      cmpOverlayChart, cmpTableRows, cmpTableProps,
      goMonitorCompare, onCmpCategoryChange, removeCmpDevice, openCmpDrawer, closeCmpDrawer,
      toggleCmpDrawerPick, confirmCmpDrawer, toggleCmpProp, refreshCmp,
      toggleCmpListSelect, compareFromMonitorList, applyCmpDevices,
      // data trust
      DT_MARKS, DT_ASSERT_LABEL, DT_REL_LABEL,
      dtCategoryId, dtStandardsOfCategory, dtViewStandard, dtEffectiveStandard, dtDraftStandard, dtViewReadonly,
      dtShowHistory, dtStdTab, dtViewMappings, dtViewAssertionGroups, dtViewRelations, dtViewTimeliness, dtViewOffline, dtViewMarkRefs,
      dtOverridesOfCategory, dtEffectivePreview, dtOverrideScopeType, dtOverrideScopeId, dtOverrideInterval, dtOverrideWindow, dtScopeOptions,
      dtStatusLabel, dtStatusTag, dtAssertLabel, dtRelLabel, dtMarkName, dtDeviceName, dtProjectName, dtCategoryName,
      dtCreateDraft, dtPublish, dtViewVersion, dtBackToEffective, dtGuardDraft, dtToggleMapping, dtToggleAssertion, dtToggleRelation, dtToggleMark,
      dtSetRangeCite, dtOnIntervalInput, dtMarkWindowManual, dtSetOfflineMode, dtSaveOverrideForm, dtRestoreOverride,
      openCategoryStandard,
      dtJCategory, dtJProject, dtJDevice, dtJBegin, dtJEnd, dtJMetric, dtJOnlyAbnormal, dtJCurrentId,
      dtMetricOptions, dtFilteredJudgements, dtCurrentJudgement, dtCurrentItems, dtCurrentSample, dtPriorJudgement,
      dtOpenJudgement, dtJudgementReasonText, dtItemStatusLabel, dtItemStatusTag, dtOpenMessage, dtOpenSample,
      dtScopeText, dtFormatValues,
      dtGDevice, dtGBegin, dtGEnd, dtGStatus, dtFilteredGaps, dtGapStatusLabel, dtGapStatusTag, dtGapWhen,
      dtSCategory, dtSProject, dtSDevice, dtFilteredStats, dtStatSummary, dtStatCompleteness, dtStatValidity,
      dtDeviceIntervalView, dtDeviceIntervalInput, dtDeviceWindowInput, dtSaveDeviceOverride, dtRestoreDeviceOverride,
      dtMetricMarks, onMetricCellClick, reportMarks, openReportJudge, monCurveQualityMarks,
      parsePacketDatasets, dtSamplesOfMessage, dtQualitySummary, dtDatasetText,
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
        <div class="nav-group-title">设备管控</div>
        <div class="nav-item" :class="{active: module==='cockpit'}" @click="jump('cockpit')"><span class="dot"></span>工作台</div>
        <div class="nav-item" :class="{active: module==='ledger'}" @click="jump('projects')"><span class="dot"></span>设备台账</div>
        <div class="nav-item" :class="{active: module==='thing'}" @click="jump('list')"><span class="dot"></span>物模型</div>
        <div class="nav-group-title">OTA / 升级</div>
        <div class="nav-item" :class="{active: module==='ota' && screen==='otaTasks'}" @click="jump('otaTasks')"><span class="dot"></span>升级任务</div>
        <div class="nav-item" :class="{active: module==='ota' && screen==='upgradeMonitor'}" @click="jump('upgradeMonitor')"><span class="dot"></span>升级监控</div>
        <div class="nav-item" :class="{active: module==='ota' && screen==='upgradeHistory'}" @click="jump('upgradeHistory')"><span class="dot"></span>历史升级记录</div>
        <div class="nav-group-title" title="目录占位 /iot/data-trust，点目录本身不进入业务页">数据可信</div>
        <div class="nav-item" :class="{active: module==='dataTrust' && screen==='categoryStandard'}" @click="jump('categoryStandard')"><span class="dot"></span>品类标准</div>
        <div class="nav-item" :class="{active: module==='dataTrust' && screen==='dataTrustJudgement'}" @click="jump('dataTrustJudgement')"><span class="dot"></span>判断查询</div>
        <div class="nav-item" :class="{active: module==='dataTrust' && screen==='dataTrustGap'}" @click="jump('dataTrustGap')"><span class="dot"></span>缺报与离线</div>
        <div class="nav-item" :class="{active: module==='dataTrust' && screen==='dataTrustStats'}" @click="jump('dataTrustStats')"><span class="dot"></span>完整率/有效率</div>
        <div class="nav-group-title">在线监控</div>
        <div class="nav-item" :class="{active: module==='monitor' && (screen==='monitorList' || screen==='monitorDetail' || screen==='monitorCurve')}" @click="jump('monitor')"><span class="dot"></span>设备数据</div>
        <div class="nav-item" :class="{active: module==='monitor' && screen==='monitorOnlineRate'}" @click="goMonitorOnlineRate()"><span class="dot"></span>在线率统计</div>
        <div class="nav-item" :class="{active: module==='monitor' && screen==='monitorCompare'}" @click="goMonitorCompare()"><span class="dot"></span>设备对比</div>
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
        <!-- ===== 工作台（原驾驶舱首页） ===== -->
        <div v-if="module==='cockpit'" class="page-card cockpit-page" data-screen="cockpit">
          <div class="page-header">
            <div>
              <h1 class="page-title">工作台</h1>
              <p class="page-desc">平台核心数据总览：设备规模、项目分布、品类构成与累计数据量；下方按项目查看在运行设备情况。AEP 对账与例外处理见底部运维区。</p>
            </div>
            <button class="btn" @click="jump('aepReconcile')">同步自 AEP</button>
          </div>

          <!-- 核心概览 Hero -->
          <section class="cockpit-hero" aria-label="核心概览">
            <div class="cockpit-hero-card accent" style="cursor:pointer" title="设备台账 · 清空筛选" @click="openAllDevices()">
              <div class="ch-label">设备总数</div>
              <div class="ch-value">{{ cockpitStats.deviceTotal }}</div>
              <div class="ch-hint">台账在册设备</div>
            </div>
            <div class="cockpit-hero-card" style="cursor:pointer" @click="jump('projects')">
              <div class="ch-label">项目数</div>
              <div class="ch-value">{{ cockpitStats.projectCount }}</div>
              <div class="ch-hint">正式项目（不含例外池）</div>
            </div>
            <div class="cockpit-hero-card data" title="累计数据报文 ≈ 历史基数 + 协议报文样例 + 近 24h 采样点数（演示）">
              <div class="ch-label">平台数据总量</div>
              <div class="ch-value">{{ cockpitStats.platformDataLabel }}</div>
              <div class="ch-hint">累计数据报文 · 条</div>
            </div>
          </section>

          <!-- 次要状态条 -->
          <div class="cockpit-secondary-stats">
            <div class="stat-chip ok" style="cursor:pointer" title="设备台账 · status=1 在线" @click="openDevicesForLifecycle('在线')">
              <div class="sc-label">在线</div>
              <div class="sc-value">{{ cockpitStats.online }}</div>
            </div>
            <div class="stat-chip danger" style="cursor:pointer" title="设备台账 · status=2 离线" @click="openDevicesForLifecycle('离线')">
              <div class="sc-label">离线</div>
              <div class="sc-value">{{ cockpitStats.offline }}</div>
            </div>
            <div class="stat-chip warn" style="cursor:pointer" title="设备台账 · status=0 待接入" @click="openDevicesForLifecycle('待接入')">
              <div class="sc-label">待接入</div>
              <div class="sc-value">{{ cockpitStats.pending }}</div>
            </div>
            <div class="stat-chip" style="cursor:pointer" @click="jump('monitor')" title="进入在线监控">
              <div class="sc-label">在线率</div>
              <div class="sc-value">{{ cockpitStats.onlineRate }}%</div>
            </div>
            <div class="stat-chip warn" style="cursor:pointer" @click="jump('unassignedDevices')" title="例外池，非主路径">
              <div class="sc-label">例外池</div>
              <div class="sc-value">{{ cockpitStats.unassigned }}</div>
            </div>
            <div class="stat-chip warn" style="cursor:pointer" @click="jump('aepReconcile')">
              <div class="sc-label">待处理对账</div>
              <div class="sc-value">{{ cockpitStats.pendingDiff }}</div>
            </div>
          </div>

          <!-- 品类分布：Row A 大品类同级卡片；Row B 一体机子设备类型条带（不嵌套进 aio 卡） -->
          <section class="cockpit-panel cockpit-category-panel">
            <div class="cockpit-panel-hd">
              <h3>品类分布</h3>
              <span class="sub-nav-hint">一体机 · 独立品类 · 未分类同级 · 子设备见下方条带 · 顶层闭环不含子设备</span>
            </div>
            <!-- Row A：大品类同级等高校 -->
            <div class="cockpit-cat-grid cockpit-cat-peers">
              <div
                v-if="cockpitCategoryDist.aio && cockpitCategoryDist.aio.count > 0"
                class="cockpit-cat-card cockpit-cat-aio"
                style="cursor:pointer"
                title="筛选一体机/主机（无 masterId 且非 probe）"
                @click="openDevicesForCategory(cockpitCategoryDist.aio)"
              >
                <div class="cc-name">
                  <iconify-icon class="cat-icon cat-icon-card" :icon="resolveCategoryIcon(cockpitCategoryDist.aio.iconKey || 'aio')" width="24" height="24" aria-hidden="true"></iconify-icon>
                  <span class="cc-name-text">{{ cockpitCategoryDist.aio.name }} <span class="cc-code">code=aio</span></span>
                </div>
                <div class="cc-count">{{ cockpitCategoryDist.aio.count }}</div>
                <div class="cc-bar"><span :style="{ width: cockpitCategoryDist.aio.pct + '%' }"></span></div>
                <div
                  v-if="cockpitCategoryDist.children.length"
                  class="cc-aio-hint"
                >含 {{ cockpitCategoryDist.children.length }} 类子设备</div>
              </div>
              <div
                v-for="c in (cockpitCategoryDist.others || [])"
                :key="'other-' + c.id"
                class="cockpit-cat-card"
                style="cursor:pointer"
                :title="'筛选独立品类主机：' + c.name"
                @click="openDevicesForCategory(c)"
              >
                <div class="cc-name">
                  <iconify-icon class="cat-icon cat-icon-card" :icon="resolveCategoryIcon(c)" width="24" height="24" aria-hidden="true"></iconify-icon>
                  <span class="cc-name-text">{{ c.name }}</span>
                </div>
                <div class="cc-count">{{ c.count }}</div>
                <div class="cc-bar"><span :style="{ width: c.pct + '%' }"></span></div>
              </div>
              <div
                v-if="cockpitCategoryDist.uncategorized && cockpitCategoryDist.uncategorized.count > 0"
                class="cockpit-cat-card warn cockpit-cat-uncat"
                style="cursor:pointer"
                title="筛选未分类（空 categoryId）"
                @click="openDevicesForCategory(cockpitCategoryDist.uncategorized)"
              >
                <div class="cc-name">
                  <iconify-icon class="cat-icon cat-icon-card" :icon="resolveCategoryIcon(cockpitCategoryDist.uncategorized.iconKey || 'uncategorized')" width="24" height="24" aria-hidden="true"></iconify-icon>
                  <span class="cc-name-text">{{ cockpitCategoryDist.uncategorized.name }}</span>
                </div>
                <div class="cc-count">{{ cockpitCategoryDist.uncategorized.count }}</div>
                <div class="cc-bar"><span :style="{ width: cockpitCategoryDist.uncategorized.pct + '%' }"></span></div>
              </div>
            </div>
            <!-- Row B：一体机子设备类型（从属条带，非同级卡片） -->
            <div
              v-if="cockpitCategoryDist.children.length"
              class="cockpit-cat-children-band"
            >
              <div class="cockpit-cat-children-band-title">一体机 · 子设备类型<span class="cockpit-cat-children-band-title-count">（{{ cockpitCategoryDist.childrenTotal }}）</span></div>
              <div class="cockpit-cat-chips">
                <button
                  v-for="c in cockpitCategoryDist.children"
                  :key="'child-' + c.id"
                  type="button"
                  class="cockpit-cat-chip"
                  :class="{ empty: c.empty, warn: c.uncategorized }"
                  :title="'查看拥有该子类型探头的一体机：' + c.name"
                  @click="openDevicesForCategory(c)"
                >
                  <iconify-icon class="cat-icon cat-icon-chip" :icon="resolveCategoryIcon(c)" width="20" height="20" aria-hidden="true"></iconify-icon>
                  <span class="chip-name">{{ c.name }}</span>
                  <span class="chip-count">{{ c.count }}</span>
                </button>
              </div>
            </div>
            <div
              class="cockpit-cat-footer"
              :class="{ mismatch: !cockpitCategoryDist.closedLoopOk }"
              :title="cockpitCategoryDist.closedLoopOk ? '闭环：一体机 + 独立品类 + 未分类 = 设备总数（不含子设备）' : '顶层合计与设备总数不一致'"
            >
              合计 {{ cockpitCategoryDist.distSum }} / 设备总数 {{ cockpitCategoryDist.deviceTotal }}
              <span v-if="!cockpitCategoryDist.closedLoopOk" class="cockpit-cat-footer-warn"> · 不一致</span>
            </div>
          </section>

          <!-- 按项目罗列：在运行设备情况 -->
          <section class="cockpit-panel cockpit-projects-panel">
            <div class="cockpit-panel-hd">
              <h3>按项目 · 在运行设备</h3>
              <span class="sub-nav-hint">一览各项目设备规模与在线情况 · 点击进入该项目设备列表</span>
            </div>
            <div class="cockpit-project-list">
              <div
                v-for="row in cockpitProjectRows"
                :key="row.id"
                class="cockpit-project-card"
                :class="{ 'low-online-rate': row.lowOnlineRate }"
                @click="openDevicesForProject(row.project)"
              >
                <div class="cpr-hd">
                  <div class="cpr-title">
                    <span class="cpr-name">{{ row.name }}</span>
                    <span class="tag" :class="PJ_STATUS_TAG[row.status] || 'tag-gray'">{{ row.status }}</span>
                    <span v-if="row.lowOnlineRate" class="tag tag-red cpr-low-rate-badge" title="在线率 &lt; 70%（mock 阈值）">在线率偏低</span>
                  </div>
                </div>
                <div class="cpr-meta">{{ row.region || '—' }} · 设备 {{ row.deviceCount }} 台</div>
                <div class="cpr-cats" v-if="row.topCategories.length">
                  <span v-for="cat in row.topCategories" :key="cat.name" class="cpr-cat-pill">{{ cat.name }} {{ cat.count }}</span>
                </div>
                <div class="cpr-cats muted" v-else>暂无设备</div>
                <div class="cpr-stats">
                  <div class="cpr-stat ok cpr-stat-click" title="该项目 · 在线" @click.stop="openDevicesForProjectLifecycle(row.project, '在线')"><span class="k">在线</span><span class="v">{{ row.online }}</span></div>
                  <div class="cpr-stat cpr-stat-click" title="该项目 · 离线" @click.stop="openDevicesForProjectLifecycle(row.project, '离线')"><span class="k">离线</span><span class="v">{{ row.offline }}</span></div>
                  <div class="cpr-stat warn cpr-stat-click" v-if="row.pending" title="该项目 · 待接入" @click.stop="openDevicesForProjectLifecycle(row.project, '待接入')"><span class="k">待接入</span><span class="v">{{ row.pending }}</span></div>
                  <div class="cpr-rate">
                    <div class="cpr-rate-label">在线率</div>
                    <div class="cpr-rate-value">{{ row.deviceCount ? row.onlineRate + '%' : '—' }}</div>
                    <div class="cpr-rate-bar"><span :style="{ width: (row.deviceCount ? row.onlineRate : 0) + '%' }"></span></div>
                  </div>
                </div>
              </div>
              <div
                class="cockpit-project-card aside"
                @click="goUnassignedDevices()"
                title="例外池 · 未定义项目"
              >
                <div class="cpr-hd">
                  <div class="cpr-title">
                    <span class="cpr-name">未定义项目（例外池）</span>
                    <span class="tag tag-orange">例外</span>
                  </div>
                </div>
                <div class="cpr-meta">非主路径 · SDK 缺映射 / 临时设备 · {{ cockpitUnassignedRow.deviceCount }} 台</div>
                <div class="cpr-cats muted">例外池 · 点击进入未挂项目设备</div>
                <div class="cpr-stats">
                  <div class="cpr-stat ok cpr-stat-click" title="例外池 · 在线" @click.stop="openDevicesForProjectLifecycle('__unassigned__', '在线')"><span class="k">在线</span><span class="v">{{ cockpitUnassignedRow.online }}</span></div>
                  <div class="cpr-stat cpr-stat-click" title="例外池 · 离线" @click.stop="openDevicesForProjectLifecycle('__unassigned__', '离线')"><span class="k">离线</span><span class="v">{{ cockpitUnassignedRow.offline }}</span></div>
                  <div class="cpr-stat warn cpr-stat-click" v-if="cockpitUnassignedRow.pending" title="例外池 · 待接入" @click.stop="openDevicesForProjectLifecycle('__unassigned__', '待接入')"><span class="k">待接入</span><span class="v">{{ cockpitUnassignedRow.pending }}</span></div>
                  <div class="cpr-rate">
                    <div class="cpr-rate-label">在线率</div>
                    <div class="cpr-rate-value">{{ cockpitUnassignedRow.deviceCount ? cockpitUnassignedRow.onlineRate + '%' : '—' }}</div>
                    <div class="cpr-rate-bar"><span :style="{ width: (cockpitUnassignedRow.deviceCount ? cockpitUnassignedRow.onlineRate : 0) + '%' }"></span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 运维辅助（降级） -->
          <section class="cockpit-ops">
            <div class="cockpit-panel cockpit-ops-compact">
              <div class="cockpit-panel-hd">
                <h3>AEP 同步 · 对账</h3>
                <span class="tag" :class="cockpitSyncStatus.ok ? 'tag-green' : 'tag-orange'">{{ cockpitSyncStatus.result }}</span>
              </div>
              <div class="cockpit-sync-body compact">
                <div class="sync-row"><span class="k">最近同步</span><span class="v">{{ cockpitSyncStatus.lastAt }}</span></div>
                <div class="sync-row"><span class="k">结果</span><span class="v">{{ cockpitSyncStatus.ok ? '清单一致' : cockpitSyncStatus.summary }}</span></div>
                <div class="cockpit-sync-actions">
                  <button class="btn btn-primary" @click="jump('aepReconcile')">查看对账差异</button>
                  <button class="btn" @click="syncFromAep">立即同步</button>
                </div>
              </div>
              <div class="quick-chips" style="margin-top:12px">
                <button class="quick-chip" @click="jump('list')">物模型 · 品类</button>
                <button class="quick-chip" @click="jump('projects')">项目列表</button>
                <button class="quick-chip" @click="jump('devices')">设备列表</button>
                <button class="quick-chip accent" @click="jump('aepReconcile')">AEP 对账</button>
                <button class="quick-chip warn" @click="jump('unassignedDevices')">例外池 <span class="tag tag-orange" style="margin-left:4px">{{ cockpitStats.unassigned }}</span></button>
                <button class="quick-chip" @click="jump('monitor')">在线监控</button>
              </div>
            </div>
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>例外待办</h3>
                <span class="sub-nav-hint">未挂项目 · 对账差异</span>
              </div>
              <ul class="cockpit-todo-compact">
                <li v-for="t in COCKPIT_TODOS.slice(0, 4)" :key="t.id">
                  <span class="tag" :class="t.severity==='danger'?'tag-red':'tag-orange'">{{ t.type }}</span>
                  <span class="todo-title">{{ t.title }}</span>
                  <button class="btn-link btn" @click="jump(t.target)">处理</button>
                </li>
              </ul>
              <button class="btn-link btn" style="margin-top:8px" @click="jump('aepReconcile')">查看全部 →</button>
            </div>
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>近期动态</h3>
              </div>
              <ul class="cockpit-timeline compact">
                <li v-for="a in COCKPIT_ACTIVITIES.slice(0, 4)" :key="a.id" :class="'tone-'+a.tone">
                  <div class="tl-dot"></div>
                  <div class="tl-body">
                    <div class="tl-meta"><span class="tl-time">{{ a.time }}</span><span class="tl-actor">{{ a.actor }}</span></div>
                    <div class="tl-action">{{ a.action }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <!-- ===== 物模型：品类列表 ===== -->
        <div v-else-if="module==='thing' && screen==='list'" class="page-card" data-screen="category-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">物模型 · 品类管理</h1>
              <p class="page-desc">物模型定义产品类型语义（测点 / 事件 / 阈值 / 安装模板 / 固件 / 指令）。AEP 完成设备数据解析后，由归属规则自动挂靠品类；未匹配进入「未分类」。</p>
            </div>
            <button class="btn btn-primary" @click="openCreateCategory">＋ 新建品类</button>
          </div>
          <div class="toolbar">
            <input class="input input-lg" v-model="searchKeyword" placeholder="搜索品类名称 / 编码 / ID" />
            <select class="select" v-model="filterIndustry">
              <option value="">全部行业</option>
              <option v-for="i in industries" :key="i" :value="i">{{ i }}</option>
            </select>
            <button class="btn" @click="searchKeyword=''; filterIndustry=''">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>品类 ID</th><th>品类名称</th><th>编码</th><th>行业</th><th>归属规则</th><th>设备数</th><th>是否支持升级</th><th>物模型版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="c in filteredCategories" :key="c.id">
                  <td>{{ c.id }}</td>
                  <td>
                    <a class="btn-link btn cat-name-cell" style="padding:0" @click="openDetail(c)">
                      <iconify-icon class="cat-icon cat-icon-list" :icon="resolveCategoryIcon(c)" width="18" height="18" aria-hidden="true"></iconify-icon>
                      <span>{{ c.name }}</span>
                    </a>
                  </td>
                  <td><code>{{ c.code }}</code></td>
                  <td>{{ c.industry }}</td>
                  <td><span class="tag tag-blue">{{ categoryRules.filter(r => r.categoryId===c.id).length }} 条</span></td>
                  <td>
                    <a class="btn-link btn" style="padding:0" @click="openDevicesForCategory(c)" :title="'查看挂靠「'+c.name+'」的设备'">{{ c.deviceCount }}</a>
                  </td>
                  <td>
                    <button type="button" class="upgrade-switch" :class="{on: isUpgradeSupported(c)}"
                      :aria-pressed="isUpgradeSupported(c) ? 'true' : 'false'"
                      :data-upgrade-supported="isUpgradeSupported(c) ? 1 : 0"
                      :data-category-id="c.id"
                      @click="toggleCategoryUpgradeSupported(c)">
                      <i></i><span>{{ isUpgradeSupported(c) ? '1 支持' : '0 不支持' }}</span>
                    </button>
                  </td>
                  <td>{{ c.modelVersion }}</td>
                  <td><span class="tag" :class="c.status==='启用'?'tag-blue':(c.status==='草稿'?'tag-orange':'tag-gray')">{{ c.status }}</span></td>
                  <td>{{ c.updatedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDetail(c)">物模型</button>
                    <button class="btn-link btn" @click="openDetail(c); detailTab='rules'">归属规则</button>
                    <button class="btn-link btn" @click="openDevicesForCategory(c)">查看设备</button>
                    <button class="btn-link btn" @click="openEditCategory(c)">编辑</button>
                    <button class="btn-link btn danger" @click="confirmDelete('品类', c.id, c.name)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination"><span>共 {{ filteredCategories.length }} 条</span><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">›</button></div>
          <div class="table-note">「是否支持升级」与品类详情 OTA 升级模块是同一开关，字段 <code>upgradeSupported</code>（1 支持 / 0 不支持）。{{ UPGRADE_SUPPORTED_NOTE }}</div>
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
                <span>归属规则：<b>{{ currentCategoryRules.length }} 条</b></span>
                <span>设备数：<b><a class="btn-link btn" style="padding:0" @click="openDevicesForCategory(currentCategory)">{{ currentCategory.deviceCount }}</a></b>
                  <a class="btn-link btn" style="padding:0;margin-left:6px" @click="openDevicesForCategory(currentCategory)">查看设备</a>
                </span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="openDevicesForCategory(currentCategory)">查看设备</button>
              <button class="btn" @click="openCategoryStandard(currentCategory)">品类标准</button>
              <button class="btn" @click="startCategoryOtaTask()">发起任务</button>
              <button class="btn" @click="openCategoryOtaTasks()">查看任务</button>
              <button class="btn" @click="openEditCategory(currentCategory)">编辑品类</button>
              <button class="btn btn-primary" @click="detailTab='rules'">归属规则</button>
            </div>
          </div>
          <div class="banner-tip" style="margin-bottom:12px">AEP 侧已完成设备数据解析；本平台通过归属规则自动挂靠品类。无需维护解析脚本。未匹配设备进入「未分类」。</div>
          <div class="banner-muted" style="margin-bottom:12px">品类标准独立维护，不进入下面的上报属性 / 测点字典 / 安装参数模板。标识符仍引用物模型。
            <button class="btn-link btn" @click="openCategoryStandard(currentCategory)">打开本品类标准 →</button>
          </div>
          <div class="ota-support-module" data-block="category-ota-module">
            <div class="info-section-title">OTA 升级</div>
            <div class="ota-support-row">
              <span class="ota-support-label">是否支持升级 <code>upgradeSupported</code></span>
              <button type="button" class="upgrade-switch" :class="{on: isUpgradeSupported(currentCategory)}"
                :aria-pressed="isUpgradeSupported(currentCategory) ? 'true' : 'false'"
                :data-upgrade-supported="isUpgradeSupported(currentCategory) ? 1 : 0"
                :data-category-id="currentCategory.id"
                data-ota-module-switch="1"
                @click="toggleCategoryUpgradeSupported(currentCategory)">
                <i></i><span>{{ isUpgradeSupported(currentCategory) ? '1 支持' : '0 不支持' }}</span>
              </button>
              <span class="cell-sub">与品类列表同一字段。当前 {{ isUpgradeSupported(currentCategory) ? '1' : '0' }}。</span>
            </div>
            <div class="table-note">{{ UPGRADE_SUPPORTED_NOTE }}</div>
            <div class="banner-muted">发起升级（本页「发起任务」、固件基线「批量升级」，以及设备档案「固件升级」）都走 <code>POST /iot/otaTask</code>：单台带 <code>deviceId</code> + <code>categoryId</code>，批量带 <code>deviceIds</code> + <code>categoryId</code>。先创建升级任务，再挂设备升级记录。品类选择器只请求 <code>GET /iotCategory?upgradeSupported=1</code>。本开关为 0 时不出现在选择器里；若仍提交，后端拒绝并在界面提示「{{ OTA_CATEGORY_REJECT_MSG }}」。</div>
          </div>
          <div class="tabs">
            <div class="tab" :class="{active: detailTab==='props'}" @click="detailTab='props'">上报属性</div>
            <div class="tab" :class="{active: detailTab==='events'}" @click="detailTab='events'">异常事件</div>
            <div class="tab" :class="{active: detailTab==='points'}" @click="detailTab='points'">测点字典</div>
            <div class="tab" :class="{active: detailTab==='install'}" @click="detailTab='install'">安装参数模板</div>
            <div class="tab" :class="{active: detailTab==='firmware'}" @click="detailTab='firmware'">固件基线</div>
            <div class="tab" :class="{active: detailTab==='commands'}" @click="detailTab='commands'">指令</div>
            <div class="tab" :class="{active: detailTab==='batchDispatch'}" @click="detailTab='batchDispatch'; resetBatchDispatchState()">批量下发</div>
            <div class="tab" :class="{active: detailTab==='rules'}" @click="detailTab='rules'">归属规则</div>
          </div>
          <div v-if="detailTab==='props'">
            <div class="toolbar"><span style="color:#666;font-size:13px">设备按周期上报的属性定义（与 AEP 解析后的属性对齐）</span><div class="spacer"></div><button class="btn btn-primary btn-sm" @click="openCreateProperty">＋ 添加属性</button></div>
            <div class="table-note">「监控展示」关闭后不出现在监控详情「最新值 / 曲线 / 上报明细」（及列表测点列）。字段暂名 <code>showInMonitor</code>，默认开，兼容存量。</div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>标识符</th><th>名称</th><th>数据类型</th><th>单位</th><th>访问</th><th>上报周期</th><th>必报</th><th>监控展示</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="p in currentCategoryProperties" :key="p.id">
                  <td><code>{{ p.identifier }}</code></td>
                  <td>{{ p.name }}</td>
                  <td>{{ p.dataType }}</td>
                  <td>{{ p.unit || '—' }}</td>
                  <td>{{ p.access }}</td>
                  <td>{{ p.reportCycle }}</td>
                  <td><span class="tag" :class="p.required?'tag-blue':'tag-gray'">{{ p.required?'是':'否' }}</span></td>
                  <td>
                    <button type="button" class="btn-link btn" @click="togglePropertyShowInMonitor(p)" :title="'切换监控展示'">
                      <span class="tag" :class="p.showInMonitor !== false ? 'tag-green' : 'tag-gray'">{{ p.showInMonitor !== false ? '开' : '关' }}</span>
                    </button>
                  </td>
                  <td class="actions"><button class="btn-link btn" @click="openEditProperty(p)">编辑</button><button class="btn-link btn danger" @click="confirmDelete('上报属性', p.id, p.name)">删除</button></td>
                </tr>
                <tr v-if="!currentCategoryProperties.length"><td colspan="9"><div class="empty-hint">本品类暂无上报属性（kind=property）</div></td></tr>
              </tbody></table></div>
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
            <div class="banner-tip">{{ FIRMWARE_EDIT_REFUSED }}</div>
            <div class="toolbar">
              <span style="color:#666;font-size:13px">只支持新建。POST 必填 <code>categoryId</code> + <code>packageUrl</code> + <code>upgradeVersion</code>。<code>packageName</code> 取上传文件名；<code>packageSize</code> 取上传返回的 fileSize；<code>releaseDate</code> 不手填，缺省为今天。批量升级与单台一样走 <code>POST /iot/otaTask</code>（<code>deviceIds</code> + <code>categoryId</code>），先建任务再挂设备记录。本品类 upgradeSupported 为 0 时不进选择器，强制创建会被拒绝。</span>
              <div class="spacer"></div>
              <button class="btn btn-sm" @click="confirmBatchDeleteFirmware" :disabled="!firmwareSelectedIds.length">批量删除<span v-if="firmwareSelectedIds.length">（{{ firmwareSelectedIds.length }}）</span></button>
              <button class="btn btn-sm" @click="openCategoryOtaTasks">查看任务</button>
              <button class="btn btn-primary btn-sm" @click="openCreateFirmware">＋ 登记固件版本</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:36px"><input type="checkbox" :checked="categoryFirmwares.length && categoryFirmwares.every(f => firmwareSelectedIds.includes(f.id))" @change="toggleFirmwareSelectAll" /></th>
                    <th>packageName</th><th>upgradeVersion</th><th>packageUrl</th><th>packageSize</th><th>releaseDate</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in categoryFirmwares" :key="f.id">
                    <td><input type="checkbox" :checked="firmwareSelectedIds.includes(f.id)" @change="toggleFirmwareSelect(f.id)" /></td>
                    <td>{{ f.packageName || '—' }}</td>
                    <td><code>{{ f.upgradeVersion || '—' }}</code></td>
                    <td style="max-width:280px"><code :title="f.packageUrl || ''">{{ f.packageUrl ? (f.packageUrl.length>42 ? f.packageUrl.slice(0,42)+'…' : f.packageUrl) : '—' }}</code></td>
                    <td :title="f.packageSize != null ? (f.packageSize + ' 字节') : ''">{{ formatPackageSize(f.packageSize) }}</td>
                    <td>{{ f.releaseDate || '—' }}</td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openCategoryBatchOta(f)" :disabled="!f.upgradeVersion && f.status==='最新'">批量升级</button>
                      <button class="btn-link btn danger" @click="confirmDelete('固件版本', f.id, f.packageName || f.id)">删除</button>
                    </td>
                  </tr>
                  <tr v-if="!categoryFirmwares.length"><td colspan="7"><div class="empty-hint">暂无固件版本</div></td></tr>
                </tbody>
              </table>
            </div>
            <div class="table-note">列顺序：packageName / upgradeVersion / packageUrl / packageSize / releaseDate。packageSize 为字节，展示为 KB/MB，空为 —。上传 POST /storage/file（path=firmware）后把返回 fileSize 写入 packageSize。落库脚本 iot_category_firmware_add_package_size_v1.sql（本原型不写 SQL）。被引用或 packageUrl 相同则不能删除；批量任一条被引用则整批失败。</div>
          </div>
          <div v-else-if="detailTab==='batchDispatch'">
            <div class="banner-tip" style="margin-bottom:12px">品类批量下发：选 <b>一条</b> 可批量指令 → 填共享参数 → 多选设备（可筛项目/仅在线）→ dryRun 样例 → 确认批量发送。与「指令」定义 Tab、设备档案单点发分离；不含 OTA 固件包。</div>
            <div class="form-row" style="align-items:flex-end;gap:12px;margin-bottom:12px;flex-wrap:wrap">
              <div class="form-item" style="min-width:220px">
                <label><span class="req">*</span>批量指令（仅 batchable）</label>
                <select class="select input-full" v-model="batchCmdId" @change="onBatchCommandChange">
                  <option value="">请选择</option>
                  <option v-for="c in batchableCategoryCommands" :key="c.id" :value="c.id">{{ c.name }}（{{ c.code }}）</option>
                </select>
              </div>
              <div class="form-item" style="min-width:160px">
                <label>项目筛选</label>
                <select class="select input-full" v-model="batchProjectFilter">
                  <option value="">全部项目</option>
                  <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </div>
              <div class="form-item" style="padding-bottom:6px">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                  <input type="checkbox" v-model="batchOnlineOnly" /> 仅在线设备
                </label>
              </div>
            </div>
            <div v-if="batchSelectedCommand && Number(batchSelectedCommand.hasParam) && batchSelectedCommand.dataType !== 'bool'" class="info-section" style="margin-bottom:12px">
              <div class="info-section-title">共享参数 · {{ batchSelectedCommand.name }}</div>
              <div class="form-row" style="flex-wrap:wrap;gap:12px">
                <div class="form-item" v-for="f in getCommandParamFields(batchSelectedCommand)" :key="f.key" style="min-width:140px">
                  <label>{{ f.label }}<span v-if="f.unit">（{{ f.unit }}）</span></label>
                  <input class="input input-full" type="number" v-model.number="batchParams[f.key]" />
                </div>
              </div>
            </div>
            <div v-else-if="batchSelectedCommand && (!Number(batchSelectedCommand.hasParam) || batchSelectedCommand.dataType==='bool')" class="banner-muted" style="margin-bottom:12px">无参 / bool 指令：组包写入 0xF0，无需填参。</div>
            <div class="toolbar">
              <span style="color:#666;font-size:13px">候选设备 {{ batchCandidateDevices.length }} 台 · 已选 {{ batchSelectedDeviceIds.length }}</span>
              <div class="spacer"></div>
              <button class="btn btn-sm" @click="toggleBatchDevicesAll">全选/取消</button>
              <button class="btn btn-sm" @click="dryRunBatchDispatch" :disabled="!batchCmdId || !batchSelectedDeviceIds.length">dryRun 样例</button>
              <button class="btn btn-primary btn-sm" @click="confirmBatchDispatch" :disabled="!batchCmdId || !batchSelectedDeviceIds.length">确认批量发送</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:40px"></th>
                    <th>设备</th><th>IMEI</th><th>项目</th><th>生命周期</th><th>固件</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in batchCandidateDevices" :key="d.id" :class="{'row-selected': isBatchDeviceSelected(d.id)}">
                    <td><input type="checkbox" :checked="isBatchDeviceSelected(d.id)" @change="toggleBatchDevice(d.id)" /></td>
                    <td>{{ d.name }}</td>
                    <td><code>{{ d.imei }}</code></td>
                    <td>{{ d.projectName || '未定义项目' }}</td>
                    <td><span class="lifecycle-dot" style="display:inline-flex;align-items:center;gap:4px"><i :class="LC_CLASS[d.lifecycle]"></i>{{ d.lifecycle }}</span></td>
                    <td>{{ d.firmware || '—' }}</td>
                  </tr>
                  <tr v-if="!batchCandidateDevices.length"><td colspan="6"><div class="empty-hint">无候选设备（检查项目筛选 / 仅在线）</div></td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="batchPreviewOk" class="info-section" style="margin-top:12px">
              <div class="info-section-title">dryRun 样例 contentHex</div>
              <pre class="hex-preview">{{ batchPreviewHex }}</pre>
            </div>
            <div v-if="batchJobSummary" class="info-section" style="margin-top:12px">
              <div class="info-section-title">最近批量任务摘要（mock）</div>
              <div class="kv-grid">
                <div class="k">指令</div><div class="v">{{ batchJobSummary.command }}</div>
                <div class="k">时间</div><div class="v">{{ batchJobSummary.at }}</div>
                <div class="k">设备数</div><div class="v">{{ batchJobSummary.total }}</div>
                <div class="k">成功 / 失败</div><div class="v"><span class="tag tag-green">{{ batchJobSummary.success }}</span> / <span class="tag tag-red">{{ batchJobSummary.fail }}</span></div>
              </div>
            </div>
            <div class="table-note">batchable=true 默认识别：reboot / syncTime / sampleInterval / sendInterval / bootUpgrade；changeDeviceSn 等设备唯一载荷不可批量。</div>
          </div>
          <div v-else-if="detailTab==='commands'">
            <div class="banner-muted">字节17–24 为命令开关（bitIndex 1-based，bit=1 执行；积水仪位 9 空缺）；内容从 payloadOffset（1-based 内容起始字节）起写入。组包时选中指令自动置对应位。</div>
            <div class="toolbar">
              <span style="color:#666;font-size:13px">配置本品类「能下什么」：命令位 vs 内容载荷。本 Tab 只配定义，不是实时点发。批量点发见「批量下发」Tab（batchable）。</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" @click="openCreateCommand">＋ 新建指令</button>
            </div>
            <div class="table-wrap">
              <table class="data-table cmd-table">
                <thead>
                  <tr>
                    <th rowspan="2">标识</th>
                    <th rowspan="2">名称</th>
                    <th colspan="2" class="th-group th-group-bit">命令位<span class="th-sub">1-based · 字节17–24</span></th>
                    <th colspan="4" class="th-group th-group-payload">内容载荷<span class="th-sub">1-based 起始字节</span></th>
                    <th rowspan="2">状态</th>
                    <th rowspan="2">操作</th>
                  </tr>
                  <tr>
                    <th class="th-subcol">bitIndex</th>
                    <th class="th-subcol">说明</th>
                    <th class="th-subcol">payloadOffset</th>
                    <th class="th-subcol">hasParam</th>
                    <th class="th-subcol">dataType / unit</th>
                    <th class="th-subcol">params 键 / 范围</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in currentCategoryCommands" :key="c.id">
                    <td><code>{{ c.code }}</code></td>
                    <td>{{ c.name }}</td>
                    <td><code>{{ c.bitIndex }}</code></td>
                    <td class="muted-cell">{{ c.desc || '命令位' }}</td>
                    <td><code>{{ c.payloadOffset != null ? c.payloadOffset : '—' }}</code></td>
                    <td><span class="tag" :class="Number(c.hasParam)?'tag-blue':'tag-gray'">{{ Number(c.hasParam) ? '1 带参' : '0 无参' }}</span></td>
                    <td style="font-size:12px"><code>{{ c.dataType || '—' }}</code>{{ c.unit ? ' / ' + c.unit : '' }}</td>
                    <td style="font-size:12px">
                      <template v-if="Number(c.hasParam) && c.dataType === 'object' && c.params">
                        <code>{{ Object.keys(c.params).join(', ') }}</code>
                      </template>
                      <template v-else-if="Number(c.hasParam) && c.params && c.params.value">
                        <code>value</code>
                        <span v-if="c.paramMin != null || c.paramMax != null"> {{ c.paramMin != null ? c.paramMin : '—' }}～{{ c.paramMax != null ? c.paramMax : '—' }}</span>
                      </template>
                      <template v-else-if="Number(c.hasParam)">{{ c.paramMin != null ? c.paramMin : '—' }}～{{ c.paramMax != null ? c.paramMax : '—' }}</template>
                      <template v-else>—</template>
                    </td>
                    <td><span class="tag" :class="c.enabled?'tag-green':'tag-gray'">{{ c.enabled?'启用':'停用' }}</span></td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openEditCommand(c)">编辑</button>
                      <button class="btn-link btn" @click="toggleCommandEnabled(c)">{{ c.enabled?'停用':'启用' }}</button>
                      <button class="btn-link btn danger" @click="confirmDelete('指令', c.id, c.name)">删除</button>
                    </td>
                  </tr>
                  <tr v-if="!currentCategoryCommands.length">
                    <td colspan="10"><div class="empty-hint">暂无指令；点击「新建指令」配置本品类可下发命令</div></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-note">积水仪协议示意 FAFA…ADAD：命令位 1–8、10–12（位 9 空）；内容起始字节如 reboot=25、factoryReset=26、clearData=27、installHeightMm=28、syncTime=30、switchThreshold=34、resendRange=38、sampleInterval=44、raiseHeightMm=50、sinkHeightMm=52、sendInterval=54。真正下发走 AEP CreateCommand（透传 hex，dataType=2）；应答另解析入库。</div>
          </div>
          <div v-else-if="detailTab==='rules'">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">通用规则为默认匹配；特殊处理规则优先级更高。匹配条件可用 AEP 产品 ID、协议 ID/名称等自由文本。</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" @click="openCreateRule">＋ 新建规则</button>
            </div>
            <div class="stat-row" style="margin-bottom:12px">
              <div class="stat-chip accent"><div class="sc-label">规则总数</div><div class="sc-value">{{ currentCategoryRules.length }}</div></div>
              <div class="stat-chip ok"><div class="sc-label">通用规则</div><div class="sc-value">{{ currentCategoryRules.filter(r=>r.type==='通用').length }}</div></div>
              <div class="stat-chip warn"><div class="sc-label">特殊处理</div><div class="sc-value">{{ currentCategoryRules.filter(r=>r.type==='特殊').length }}</div></div>
              <div class="stat-chip"><div class="sc-label">已启用</div><div class="sc-value">{{ currentCategoryRules.filter(r=>r.enabled).length }}</div></div>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>规则名称</th><th>类型</th><th>匹配 AEP 产品 ID</th><th>协议 ID / 名称</th><th>优先级</th><th>启用</th><th>备注</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in currentCategoryRules" :key="r.id">
                    <td>{{ r.name }}</td>
                    <td><span class="tag" :class="r.type==='特殊'?'tag-orange':'tag-blue'">{{ r.type }}</span></td>
                    <td><code>{{ r.matchAepProduct || '—' }}</code></td>
                    <td>{{ r.matchProtocol || '—' }}</td>
                    <td>{{ r.priority }}</td>
                    <td>
                      <span class="tag" :class="r.enabled?'tag-green':'tag-gray'">{{ r.enabled?'启用':'停用' }}</span>
                    </td>
                    <td style="max-width:220px;white-space:normal">{{ r.note || '—' }}</td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openEditRule(r)">编辑</button>
                      <button class="btn-link btn" @click="toggleRuleEnabled(r)">{{ r.enabled?'停用':'启用' }}</button>
                      <button class="btn-link btn danger" @click="confirmDelete('归属规则', r.id, r.name)">删除</button>
                    </td>
                  </tr>
                  <tr v-if="!currentCategoryRules.length">
                    <td colspan="8"><div class="empty-hint">暂无归属规则；未匹配设备将进入「未分类」</div></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-note">执行顺序：特殊处理（优先级数值越小越优先）→ 通用规则。一期为交互示意，无真实匹配引擎。</div>
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
          <div class="page-header">
            <div>
              <h1 class="page-title">登记固件版本</h1>
              <p class="page-desc">品类：{{ currentCategory.name }} · 仅 POST 新建。{{ FIRMWARE_EDIT_REFUSED }}</p>
            </div>
          </div>
          <div class="banner-tip">{{ FIRMWARE_EDIT_REFUSED }}</div>
          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>categoryId</label>
              <div class="field-static"><code>{{ currentCategory.id }}</code> {{ currentCategory.name }}</div>
              <div class="hint">POST 必填，取当前品类，不可改挂。</div>
            </div>
            <div class="form-item">
              <label><span class="req">*</span>upgradeVersion</label>
              <input class="input input-full" v-model="firmwareForm.upgradeVersion" placeholder="例如 1.4.0" />
              <div class="hint">POST 必填。OTA 目标版本。</div>
            </div>
          </div>
          <div class="form-item">
            <label><span class="req">*</span>上传升级包（回填 packageUrl）</label>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <input ref="firmwareUploadInput" type="file" accept=".bin,.hex,.img,.zip,application/octet-stream" style="display:none" @change="onFirmwarePackageSelected" />
              <button type="button" class="btn btn-sm" :disabled="firmwareUploading" @click="triggerFirmwareUpload">{{ firmwareUploading ? '上传中…' : '选择并上传' }}</button>
            </div>
            <div class="hint">对接 <code>POST /storage/file</code> multipart（part <code>file</code>；<code>path=firmware</code>、<code>isPrivate=0</code> 公开可读，本地目录 storage.active=local）。成功取 <code>Result.data.fileUrl</code> 回填 <code>packageUrl</code>，取 <code>Result.data.fileSize</code>（字节）写入 <code>packageSize</code>。空 URL 不可提交。</div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>包名 packageName</label>
              <div class="field-static">{{ firmwareForm.packageName || '上传后显示文件名' }}</div>
              <div class="hint">取自上传文件名，写入 packageName，不可单独修改。</div>
            </div>
            <div class="form-item">
              <label>packageSize</label>
              <div class="field-static" :title="firmwareForm.packageSize != null ? (firmwareForm.packageSize + ' 字节') : ''">{{ formatPackageSize(firmwareForm.packageSize) }}</div>
              <div class="hint">只读。上传返回 fileSize 写入 packageSize，按 KB/MB 展示；未上传为 —。</div>
            </div>
            <div class="form-item">
              <label>releaseDate</label>
              <div class="field-static">{{ firmwareToday() }}</div>
              <div class="hint">无输入框。不传时后端默认今天，此处只读预览。</div>
            </div>
          </div>
          <div class="form-item">
            <label>包地址 packageUrl</label>
            <div class="field-static">{{ firmwareForm.packageUrl || '上传成功后自动回填' }}</div>
            <div class="hint">POST 必填。只读，不可手填。OTA 选该版本时带出此地址。</div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" @click="screen='detail'; detailTab='firmware'">取消</button>
            <button class="btn btn-primary" @click="saveFirmware">保存</button>
          </div>
        </div>


        <!-- ===== OTA：升级任务 ===== -->
        <div v-else-if="module==='ota' && screen==='otaTasks'" class="page-card" data-screen="ota-tasks">
          <div class="page-header">
            <div>
              <h1 class="page-title">升级任务</h1>
              <p class="page-desc">组件 <code>iot/iot-device/IotOtaTask</code> · 路由建议 <code>/iot/iot-ota-task</code> · 本页 <code>#otaTasks</code>。单台与批量都走 <code>POST /iot/otaTask</code>（<code>deviceId</code> 或 <code>deviceIds</code>，加上 <code>categoryId</code>）：先创建升级任务，再挂设备升级记录。发起时品类来自 <code>GET /iotCategory?upgradeSupported=1</code>，未打开的品类不出现；若仍以 upgradeSupported=0 创建，后端拒绝。取消 / 超时 / 排除结果口径不变。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="jump('upgradeMonitor')">升级监控</button>
              <button class="btn" @click="openUpgradeHistory()">历史升级记录</button>
            </div>
          </div>
            <template v-if="currentOtaTask">
              <div class="toolbar">
                <button class="btn btn-sm" @click="closeOtaTaskDetail">← 返回任务列表</button>
                <div class="spacer"></div>
                <button class="btn btn-sm" @click="openUpgradeMonitor(currentOtaTask.id)">监控</button>
                <button v-if="otaTaskStatusMeta(currentOtaTask.status).code===0" class="btn btn-danger btn-sm" @click="askCancelOtaTask(currentOtaTask)">取消任务</button>
                <span v-else class="cell-sub">已结束的任务不可取消</span>
              </div>
              <div class="info-section">
                <div class="info-section-title">
                  <span>升级任务 {{ currentOtaTask.id }}</span>
                  <span class="tag" :class="otaTaskStatusMeta(currentOtaTask.status).tag">{{ otaTaskStatusText(currentOtaTask.status) }}</span>
                </div>
                <div class="kv-grid">
                  <div class="k">任务状态</div>
                  <div class="v"><code>{{ otaTaskStatusMeta(currentOtaTask.status).code }}</code> {{ otaTaskStatusMeta(currentOtaTask.status).label }} <span class="cell-sub">0 进行中 / 1 已完成 / 2 已取消 / 3 失败</span></div>
                  <div class="k">categoryId</div><div class="v"><code>{{ currentOtaTask.categoryId }}</code> {{ categoryName(currentOtaTask.categoryId) }}</div>
                  <div class="k">目标版本</div><div class="v"><code>{{ currentOtaTask.toVer }}</code> <span class="cell-sub">{{ currentOtaTask.fromVerHint }}</span></div>
                  <div class="k">firmwareId</div><div class="v"><code>{{ currentOtaTask.firmwareId || '—' }}</code></div>
                  <div class="k">packageUrl</div><div class="v"><code>{{ currentOtaTask.packageUrl || '—' }}</code></div>
                  <div class="k">timeoutMinutes</div>
                  <div class="v">{{ otaTimeoutMinutesOf(currentOtaTask) }} 分钟<span v-if="otaTimeoutMinutesOf(currentOtaTask)===30">（默认）</span></div>
                  <div class="k">创建 / 操作人</div><div class="v">{{ currentOtaTask.createdAt }} · {{ currentOtaTask.operator }}</div>
                  <div class="k" v-if="currentOtaTask.cancelledAt">取消时间</div>
                  <div class="v" v-if="currentOtaTask.cancelledAt">{{ currentOtaTask.cancelledAt }}</div>
                  <div class="k">进度</div>
                  <div class="v">纳入 {{ currentOtaTask.deviceCount }} · 成功 {{ currentOtaTask.success }} · 失败 {{ currentOtaTask.fail }} · 排队/进行 {{ currentOtaTask.pending }}</div>
                </div>
              </div>
              <div class="banner-tip">取消：仅状态 <b>0 进行中</b> 可取消。确认后任务变为 <b>2 已取消</b>；未完成设备（0 排队 / 1 升级中）记为 <b>3 失败</b>，失败原因「任务已取消」。已成功（2）不回滚。</div>
              <div class="banner-muted">超时：设备超过本任务 timeoutMinutes（当前 <b>{{ otaTimeoutMinutesOf(currentOtaTask) }}</b> 分钟，未配置时默认 30）无应答，记为失败，失败原因「{{ otaTaskTimeoutReason(currentOtaTask) }}」。</div>
              <div class="ota-result" v-if="currentOtaTask.excluded && currentOtaTask.excluded.length">
                <div class="ota-result-title">创建结果 · 排除 {{ currentOtaTask.excluded.length }} 台</div>
                <div class="cell-sub" style="margin-bottom:8px">被排除的设备不进入 deviceUpgrade。原因以「排除: 」开头。</div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>deviceId</th><th>设备</th><th>排除原因</th></tr></thead>
                    <tbody>
                      <tr v-for="ex in currentOtaTask.excluded" :key="currentOtaTask.id+ex.deviceId">
                        <td><code>{{ ex.deviceId }}</code></td>
                        <td>{{ ex.name || '—' }}</td>
                        <td class="ota-exclude-reason">{{ ex.reason }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="ota-result" v-else>
                <div class="ota-result-title">创建结果</div>
                <div class="cell-sub">本次无设备被排除，纳入 {{ currentOtaTask.deviceCount }} 台。</div>
              </div>
              <div class="info-section-title" style="margin-top:4px">设备升级进度 · <code>deviceUpgrade?taskId={{ currentOtaTask.id }}</code></div>
              <div class="banner-muted">成功仍由 upgradeStatus 决定，不新增状态：末包应答 remain=0 记为 2 成功。智能井盖兜底：末包已发但没有最终应答时，实时信息包 softwareVersion 与本条升级记录的 fromVersion 不相等即记成功（版本可回退；只比该单 fromVersion，不比设备当前版本，也不比目标版本）。回写用信息包实际版本。fromVersion 为空则跳过信息包兜底，应答 remain=0 仍记成功。兜底比较：信息包 softwareVersion ≠ 本单 fromVersion（待后端新 tip）。</div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>设备</th><th>fromVersion</th><th>版本</th><th>设备状态</th><th>进度</th><th>失败原因</th><th>说明</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in currentOtaTaskDevices" :key="r.id">
                      <td>{{ otaDeviceBrief(r.deviceId).name }}<div class="cell-sub"><code>{{ r.deviceId }}</code></div></td>
                      <td>{{ displayNullable(upgradeFromVersion(r)) }}<div class="cell-sub">升级前 softwareVersion</div></td>
                      <td><code>{{ r.fromVer }}</code> → <code>{{ r.toVer }}</code></td>
                      <td><span class="tag" :class="otaDeviceStatusMeta(r.status).tag">{{ otaDeviceStatusText(r.status) }}</span></td>
                      <td>
                        <div class="ota-progress">
                          <div class="ota-progress-bar"><i :style="{width: (r.progress||0)+'%'}"></i></div>
                          <span>{{ r.progress || 0 }}%</span>
                        </div>
                        <div class="ota-progress-pkgs" v-if="upgradePackageLine(r)">{{ upgradePackageLine(r) }}</div>
                      </td>
                      <td :class="{'ota-fail-reason': !!r.failReason}">{{ r.failReason || '—' }}</td>
                      <td>{{ upgradeSuccessNote(r) || '—' }}</td>
                    </tr>
                    <tr v-if="!currentOtaTaskDevices.length"><td colspan="7"><div class="empty-hint">该任务暂无设备进度</div></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="table-note">进度除百分比外展示已发 sentPackage、剩余 remainPackage；有 totalPackage 时一并显示。成功仍看 upgradeStatus。fromVersion 是升级前 softwareVersion，可空。状态仍是 0 排队 / 1 升级中 / 2 成功 / 3 失败。</div>
            </template>
            <template v-else-if="currentOtaTaskId">
              <div class="toolbar">
                <button class="btn btn-sm" @click="closeOtaTaskDetail">← 返回任务列表</button>
              </div>
              <div class="empty-hint">未找到升级任务 {{ currentOtaTaskId }}</div>
            </template>
            <template v-else>
              <div class="toolbar">
                <span style="color:#666;font-size:13px">全量 OTA 任务。状态 0 进行中 / 1 已完成 / 2 已取消 / 3 失败。设备档案「固件升级」传 deviceId，品类「发起任务 / 批量升级」传 deviceIds，都进 POST /iot/otaTask，先建任务再挂记录。</span>
                <div class="spacer"></div>
                <button class="btn btn-primary btn-sm" @click="startOtaTaskFromPage">发起任务</button>
              </div>
              <div class="toolbar">
                <label style="font-size:13px;color:#666">品类 categoryId</label>
                <select class="select" :value="otaTaskCategoryFilter" @change="setOtaTaskCategoryFilter($event.target.value)">
                  <option value="">全部品类</option>
                  <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}（{{ c.id }}）</option>
                </select>
                <span v-if="otaTaskCategoryFilter" class="cell-sub">当前 {{ otaTaskCategoryFilter }} · <button class="btn-link btn" @click="setOtaTaskCategoryFilter('')">查看全部</button></span>
                <span class="cell-sub">此筛选看历史任务，含未开升级开关的品类。发起任务的品类选择器只列 upgradeSupported=1。</span>
              </div>
              <div class="banner-tip">取消：仅 <b>0 进行中</b> 可点「取消」。取消后未完成设备失败原因「任务已取消」。超时：超过任务 timeoutMinutes（默认 <b>30</b> 分钟）无应答，失败原因「升级超时（超过N分钟无应答）」。</div>
              <div class="ota-result" v-if="otaCreateResult && (!otaTaskCategoryFilter || otaCreateResult.categoryId===otaTaskCategoryFilter)">
                <div class="ota-result-title">创建结果<span v-if="otaCreateResult.taskId"> · {{ otaCreateResult.taskId }}</span><span v-else> · 未生成任务</span></div>
                <div class="cell-sub" style="margin-bottom:8px">{{ otaCreateResult.at }} · categoryId <code>{{ otaCreateResult.categoryId }}</code> · 目标 <code>{{ otaCreateResult.toVer }}</code> · 超时 {{ otaCreateResult.timeoutMinutes }} 分钟<span v-if="otaCreateResult.timeoutMinutes===30">（默认）</span> · 纳入 {{ otaCreateResult.accepted }} · 排除 {{ otaCreateResult.excluded.length }}</div>
                <div class="cell-sub" v-if="otaCreateResult.acceptedDevices && otaCreateResult.acceptedDevices.length" style="margin-bottom:8px">纳入：<span v-for="(d, i) in otaCreateResult.acceptedDevices" :key="d.deviceId">{{ i ? '、' : '' }}{{ d.name }}（{{ d.deviceId }}）</span></div>
                <div class="table-wrap" v-if="otaCreateResult.excluded.length">
                  <table class="data-table">
                    <thead><tr><th>deviceId</th><th>设备</th><th>排除原因</th></tr></thead>
                    <tbody>
                      <tr v-for="ex in otaCreateResult.excluded" :key="'cr-'+ex.deviceId">
                        <td><code>{{ ex.deviceId }}</code></td>
                        <td>{{ ex.name || '—' }}</td>
                        <td class="ota-exclude-reason">{{ ex.reason }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="table-note" v-else>本次无设备被排除。</div>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>任务 ID</th><th>品类</th><th>创建时间</th><th>目标版本</th><th>超时</th><th>纳入</th><th>成功</th><th>失败</th><th>排队/进行</th><th>排除</th><th>状态</th><th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in otaTaskList" :key="t.id" class="row-clickable" @click="openOtaTaskDetail(t)">
                      <td><code>{{ t.id }}</code></td>
                      <td>{{ categoryName(t.categoryId) }}<div class="cell-sub"><code>{{ t.categoryId }}</code></div></td>
                      <td>{{ t.createdAt }}</td>
                      <td><code>{{ t.toVer }}</code></td>
                      <td>{{ otaTimeoutMinutesOf(t) }} 分钟<span v-if="otaTimeoutMinutesOf(t)===30" class="cell-sub"> · 默认</span></td>
                      <td>{{ t.deviceCount }}</td>
                      <td>{{ t.success }}</td>
                      <td>{{ t.fail }}</td>
                      <td>{{ t.pending }}</td>
                      <td>{{ (t.excluded && t.excluded.length) || 0 }}</td>
                      <td><span class="tag" :class="otaTaskStatusMeta(t.status).tag">{{ otaTaskStatusText(t.status) }}</span></td>
                      <td class="actions" @click.stop>
                        <button class="btn-link btn" @click="openOtaTaskDetail(t)">详情</button>
                        <button class="btn-link btn" @click="openUpgradeMonitor(t.id)">监控</button>
                        <button v-if="otaTaskStatusMeta(t.status).code===0" class="btn-link btn danger" @click="askCancelOtaTask(t)">取消</button>
                      </td>
                    </tr>
                    <tr v-if="!otaTaskList.length"><td colspan="12"><div class="empty-hint">暂无升级任务</div></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="table-note">任务状态：0 进行中 / 1 已完成 / 2 已取消 / 3 失败。设备状态（不变）：0 排队 / 1 升级中 / 2 成功 / 3 失败。设备进度走 deviceUpgrade?taskId=。</div>
              <div class="info-section-title" style="margin-top:16px">设备失败原因</div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>任务</th><th>超时</th><th>设备</th><th>fromVersion</th><th>设备状态</th><th>失败原因</th></tr></thead>
                  <tbody>
                    <tr v-for="r in otaTaskFailureRows" :key="'fail-'+r.id">
                      <td><button class="btn-link btn" @click="openOtaTaskDetail(r.taskId)">{{ r.taskId }}</button></td>
                      <td>{{ r.task ? otaTimeoutMinutesOf(r.task) : '—' }} 分钟</td>
                      <td>{{ otaDeviceBrief(r.deviceId).name }}<div class="cell-sub"><code>{{ r.deviceId }}</code></div></td>
                      <td>{{ displayNullable(upgradeFromVersion(r)) }}</td>
                      <td><span class="tag" :class="otaDeviceStatusMeta(r.status).tag">{{ otaDeviceStatusText(r.status) }}</span></td>
                      <td class="ota-fail-reason">{{ r.failReason || '—' }}</td>
                    </tr>
                    <tr v-if="!otaTaskFailureRows.length"><td colspan="6"><div class="empty-hint">暂无失败设备</div></td></tr>
                  </tbody>
                </table>
              </div>
              <div class="table-note">常见失败原因：「任务已取消」（取消进行中任务后，未完成设备）；「升级超时（超过N分钟无应答）」，N 取该任务 timeoutMinutes，未填时默认 30。</div>
            </template>
        </div>

        <!-- ===== OTA：历史升级记录 ===== -->
        <div v-else-if="module==='ota' && screen==='upgradeHistory'" class="page-card" data-screen="upgrade-history">
          <div class="page-header">
            <div>
              <h1 class="page-title">历史升级记录</h1>
              <p class="page-desc">组件 <code>iot/iot-device/IotDeviceUpgrade</code> · 路由建议 <code>/iot/iot-device-upgrade</code> · 本页 <code>#upgradeHistory</code>。全量成功/失败列表，绑 <code>GET /iot/deviceUpgrade</code>。在途看升级监控。无新后端接口。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="jump('otaTasks')">升级任务</button>
              <button class="btn" @click="jump('upgradeMonitor')">升级监控</button>
            </div>
          </div>
          <div class="banner-muted">成功仍由 upgradeStatus 决定，不新增状态：末包应答 remain=0 记为 2 成功。智能井盖兜底：末包已发但没有最终应答时，实时信息包 softwareVersion 与本条升级记录的 fromVersion 不相等即记成功（版本可回退；只比该单 fromVersion，不比设备当前版本，也不比目标版本）。回写用信息包实际版本。fromVersion 为空则跳过信息包兜底，应答 remain=0 仍记成功。兜底比较：信息包 softwareVersion ≠ 本单 fromVersion（待后端新 tip）。</div>
          <div class="stat-row">
            <div class="stat-chip"><div class="sc-label">成功</div><div class="sc-value">{{ upgradeHistoryCounts.success }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">失败</div><div class="sc-value">{{ upgradeHistoryCounts.fail }}</div></div>
            <div class="stat-chip"><div class="sc-label">排队/升级中（不在默认列表）</div><div class="sc-value">{{ upgradeHistoryCounts.other }}</div></div>
          </div>
          <div class="toolbar" style="margin-top:12px">
            <div class="seg-group">
              <button class="seg-btn" :class="{active: upgradeHistoryStatusFilter==='done'}" @click="upgradeHistoryStatusFilter='done'">成功/失败</button>
              <button class="seg-btn" :class="{active: upgradeHistoryStatusFilter==='success'}" @click="upgradeHistoryStatusFilter='success'">仅成功</button>
              <button class="seg-btn" :class="{active: upgradeHistoryStatusFilter==='fail'}" @click="upgradeHistoryStatusFilter='fail'">仅失败</button>
              <button class="seg-btn" :class="{active: upgradeHistoryStatusFilter==='all'}" @click="upgradeHistoryStatusFilter='all'">全部状态</button>
            </div>
            <input class="input" v-model="upgradeHistoryKeyword" placeholder="设备 / 任务 / 失败原因" style="max-width:220px" />
            <span v-if="upgradeHistoryDeviceId" class="tag tag-blue">deviceId {{ upgradeHistoryDeviceId }} · {{ otaDeviceBrief(upgradeHistoryDeviceId).name }} <button class="btn-link btn" @click="clearUpgradeHistoryDevice">清除</button></span>
            <div class="spacer"></div>
            <span style="color:#888;font-size:12px">{{ upgradeHistoryRows.length }} 条</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>时间</th><th>设备</th><th>品类</th><th>任务</th><th>fromVersion</th><th>版本</th><th>设备状态</th><th>进度</th><th>操作人</th><th>失败原因</th><th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in upgradeHistoryRows" :key="r.id">
                  <td>{{ r.time }}</td>
                  <td>
                    {{ otaDeviceBrief(r.deviceId).name }}
                    <div class="cell-sub"><code>{{ r.deviceId }}</code> · <button class="btn-link btn" @click="openDeviceUpgradeSlice(r.deviceId)">本机记录</button></div>
                  </td>
                  <td>{{ deviceCategoryLabel(r.deviceId) }}</td>
                  <td>
                    <button v-if="r.taskId" class="btn-link btn" @click="openOtaTaskFromLog(r.taskId)">{{ r.taskId }}</button>
                    <span v-else>—</span>
                  </td>
                  <td>{{ displayNullable(upgradeFromVersion(r)) }}<div class="cell-sub">升级前 softwareVersion</div></td>
                  <td><code>{{ r.fromVer }}</code> → <code>{{ r.toVer }}</code></td>
                  <td><span class="tag" :class="upgradeStatusTag(r.status)">{{ otaDeviceStatusText(r.status) }}</span></td>
                  <td>
                    <div class="ota-progress">
                      <div class="ota-progress-bar"><i :style="{width: (r.progress||0)+'%'}"></i></div>
                      <span>{{ r.progress || 0 }}%</span>
                    </div>
                    <div class="ota-progress-pkgs" v-if="upgradePackageLine(r)">{{ upgradePackageLine(r) }}</div>
                  </td>
                  <td>{{ r.operator }}</td>
                  <td :class="{'ota-fail-reason': !!r.failReason}">{{ r.failReason || '—' }}</td>
                  <td>{{ upgradeSuccessNote(r) || '—' }}</td>
                </tr>
                <tr v-if="!upgradeHistoryRows.length"><td colspan="11"><div class="empty-hint">没有符合筛选的升级记录</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-note">进度除百分比外展示 sentPackage、remainPackage，有则显示 totalPackage。成功仍看 upgradeStatus。fromVersion 为升级前 softwareVersion，未上报则为 —。D013 的成功记录是智能井盖信息包兜底（softwareVersion ≠ 本单 fromVersion）。默认只列成功（2）和失败（3）；排队/升级中用「全部状态」，或到升级监控看在途。</div>
        </div>

        <!-- ===== 升级在线监控 ===== -->
        <div v-else-if="module==='ota' && screen==='upgradeMonitor'" class="page-card" data-screen="upgrade-monitor">
          <div class="page-header">
            <div>
              <h1 class="page-title">升级监控</h1>
              <p class="page-desc">组件 <code>iot/iot-device/IotDeviceUpgradeMonitor</code> · 路由建议 <code>/iot/iot-device-upgrade-monitor</code> · 本页 <code>#upgradeMonitor</code>。约 {{ UPGRADE_MONITOR_POLL_MS / 1000 }} 秒轮询 <code>GET /iot/deviceUpgrade/monitor</code><span v-if="upgradeMonitorTaskId">?taskId={{ upgradeMonitorTaskId }}</span>。最近刷新 {{ upgradeMonitorPolledAt || '—' }}。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" v-if="upgradeMonitorTaskId" @click="openUpgradeMonitor()">查看全部在途</button>
              <button class="btn" @click="openUpgradeHistory()">历史升级记录</button>
              <button class="btn" @click="jump('otaTasks')">升级任务</button>
            </div>
          </div>
          <div class="banner-muted">历史成功/失败仍走 <code>GET /iot/deviceUpgrade</code>（历史升级记录页）。本页只看在途，不替代历史查询。库状态仍是 0 排队 / 1 升级中 / 2 成功 / 3 失败；阶段 queued / transferring / awaitingConfirm 只是在途拆分。</div>
          <div class="stat-row">
            <div class="stat-chip accent"><div class="sc-label">升级中 upgradingCount</div><div class="sc-value">{{ upgradeMonitorView.summary.upgradingCount }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">排队 queuedCount</div><div class="sc-value">{{ upgradeMonitorView.summary.queuedCount }}</div></div>
          </div>
          <div class="table-note" style="margin-top:0">其中传输中 transferringCount {{ upgradeMonitorView.summary.transferringCount }} · 待确认 awaitingConfirmCount {{ upgradeMonitorView.summary.awaitingConfirmCount }}</div>
          <div class="info-section" style="margin-top:16px">
            <div class="info-section-title">阶段 stageBreakdown</div>
            <div class="stat-row">
              <div class="stat-chip" v-for="s in upgradeMonitorView.stageBreakdown" :key="s.stage">
                <div class="sc-label">{{ s.label }} {{ s.stage }}</div>
                <div class="sc-value">{{ s.count }}</div>
              </div>
            </div>
          </div>
          <div class="info-section">
            <div class="info-section-title">预计全部完成</div>
            <div class="kv-grid">
              <div class="k">eta.estimatedCompleteAt</div>
              <div class="v">{{ upgradeMonitorView.eta.estimatedCompleteAt || '—' }}</div>
              <div class="k">eta.estimateBasis</div>
              <div class="v">{{ upgradeMonitorView.eta.estimateBasis }}</div>
            </div>
          </div>
          <div class="info-section">
            <div class="info-section-title">进行中任务 runningTasks</div>
            <div v-if="upgradeMonitorView.runningTasks.length" style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm" v-for="t in upgradeMonitorView.runningTasks" :key="t.taskId" @click="openUpgradeMonitor(t.taskId)">
                {{ t.taskId }} · {{ t.toVer }} · 在途 {{ t.activeCount }}
              </button>
            </div>
            <div v-else class="empty-hint">当前没有进行中的批量任务</div>
          </div>
          <div class="info-section">
            <div class="info-section-title">在途明细 items</div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>设备</th><th>任务</th><th>阶段 stageLabel</th><th>库状态</th><th>fromVersion</th><th>包进度</th><th>预计完成 estimatedCompleteAt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in upgradeMonitorView.items" :key="it.id">
                    <td>{{ it.deviceName }}<div class="cell-sub"><code>{{ it.deviceId }}</code></div></td>
                    <td><button v-if="it.taskId" class="btn-link btn" @click="openOtaTaskDetail(it.taskId)">{{ it.taskId }}</button><span v-else>—</span></td>
                    <td>{{ it.stageLabel }}<div class="cell-sub"><code>{{ it.stage }}</code></div></td>
                    <td><span class="tag" :class="it.statusTag">{{ it.statusText }}</span></td>
                    <td>{{ displayNullable(it.fromVersion) }}</td>
                    <td>
                      <div class="ota-progress">
                        <div class="ota-progress-bar"><i :style="{width: (it.progress||0)+'%'}"></i></div>
                        <span>{{ it.progress || 0 }}%</span>
                      </div>
                      <div class="ota-progress-pkgs">{{ it.packageLine || '—' }}</div>
                    </td>
                    <td>{{ it.estimatedCompleteAt }}</td>
                  </tr>
                  <tr v-if="!upgradeMonitorView.items.length"><td colspan="7"><div class="empty-hint">没有在途升级</div></td></tr>
                </tbody>
              </table>
            </div>
            <div class="table-note">包进度为 sentPackage / remainPackage，有 totalPackage 时带「共」。行内预计完成是粗估。成功失败不在本表，请看历史升级记录。</div>
          </div>
        </div>

        <!-- ===== 设备台账：项目列表 ===== -->
        <div v-else-if="module==='ledger' && screen==='projects'" class="page-card" data-screen="ledger-projects">
          <div class="page-header">
            <div>
              <h1 class="page-title">设备台账 · 项目列表</h1>
              <p class="page-desc">本地项目与 AEP 产品 1:1 对齐（SDK 产品列表同步）。设备主路径为 OpenAPI 绑定自动建档；「未定义项目」仅为例外池。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="goDevices">全部设备</button>
              <button class="btn" @click="goUnassignedDevices">例外池 <span class="tag tag-orange" style="margin-left:4px">{{ unassignedCount }}</span></button>
              <button class="btn btn-primary" @click="openCreateProject">＋ 新建项目</button>
            </div>
          </div>
          <div class="banner-tip" style="margin-bottom:12px">
            <b>同步为准：</b>项目由 AEP 产品自动同步生成（1:1）。手动新建/编辑仅作补录；OpenAPI 绑定建档时仅在 projectId 为空时写入，不覆盖人工已挂项目。
          </div>
          <div class="banner-tip" style="margin-bottom:12px" v-if="unassignedCount">
            <b>例外池：</b>「未定义项目」现有 <b>{{ unassignedCount }}</b> 台（SDK 缺产品 / 临时设备等），非主路径。
            <a class="btn-link btn" style="padding:0;margin-left:8px" @click="goUnassignedDevices">查看例外池 →</a>
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
                  <th>项目 ID</th><th>项目名称</th><th>AEP 产品</th><th>状态</th><th>负责人</th><th>所属区域</th><th>设备数</th><th>启动日期</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredProjects" :key="p.id">
                  <td>{{ p.id }}</td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDevicesForProject(p)">{{ p.name }}</a></td>
                  <td>
                    <div><code>{{ p.aepProductId || '—' }}</code></div>
                    <div style="font-size:12px;color:#888">{{ p.aepProductName || '' }}</div>
                  </td>
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
              <h1 class="page-title">{{ deviceProjectFilter===UNASSIGNED_PROJECT_ID ? '例外池 · 未定义项目' : (deviceSlaveCategoryFilter ? ('一体机列表 · 含子设备「' + categoryName(deviceSlaveCategoryFilter) + '」') : (deviceCategoryFilter ? ('设备列表 · ' + categoryName(deviceCategoryFilter)) : '设备列表')) }}</h1>
              <p class="page-desc" v-if="deviceProjectFilter===UNASSIGNED_PROJECT_ID">例外池：SDK 缺产品 / 临时设备等；非主路径。主路径为 OpenAPI 绑定自动创建项目与设备（仅 projectId 为空时写入）。人工改挂为例外处理。</p>
              <p class="page-desc" v-else-if="deviceCategoryFilter">已按物模型品类「{{ categoryName(deviceCategoryFilter) }}」筛选（双向挂靠）。品类匹配标签见「匹配」列；多数为自动匹配。</p>
              <p class="page-desc" v-else>按项目 / 品类 / 生命周期筛选。主路径 OpenAPI 绑定自动建档；例外池与人工改挂仅用于异常场景。支持导入导出与 AEP 对账。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="openImportModal">导入</button>
              <button class="btn" @click="openExportModal">导出</button>
              <button class="btn" :disabled="!selectedDeviceIds.length" @click="openTransferModal(null)">例外处理 · 人工改挂{{ selectedDeviceIds.length ? ' ('+selectedDeviceIds.length+')' : '' }}</button>
              <button class="btn btn-orange" @click="goAepReconcile">AEP 对账</button>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-chip accent"><div class="sc-label">筛选结果</div><div class="sc-value">{{ deviceStats.total }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">在线</div><div class="sc-value">{{ deviceStats.online }}</div></div>
            <div class="stat-chip"><div class="sc-label">离线</div><div class="sc-value">{{ deviceStats.offline }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">待接入</div><div class="sc-value">{{ deviceStats.pending }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">停用/报废</div><div class="sc-value">{{ deviceStats.disabled }}</div></div>
            <div class="stat-chip warn" style="cursor:pointer" @click="goUnassignedDevices" title="例外池，非主入口"><div class="sc-label">例外池</div><div class="sc-value">{{ unassignedCount }}</div></div>
          </div>
          <div class="toolbar">
            <select class="select" v-model="deviceProjectFilter">
              <option value="">全部项目</option>
              <option :value="UNASSIGNED_PROJECT_ID">未定义项目（例外池）</option>
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select class="select" v-model="deviceCategoryFilter">
              <option value="">全部品类</option>
              <option value="aio">一体机（aio · 主机）</option>
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
              <option value="__uncat__">未分类</option>
            </select>
            <select class="select" v-model="deviceLifecycleFilter">
              <option value="">全部生命周期</option>
              <option v-for="s in LIFECYCLES" :key="s" :value="s">{{ s }}</option>
            </select>
            <input class="input input-md" v-model="deviceImeiSearch" placeholder="IMEI / 名称 / AEP ID" />
            <input class="input input-sm" style="width:140px" v-model="deviceMasterFilter" placeholder="父设备ID" title="填一体机台账 id，查 probe 子设备" />
            <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;white-space:nowrap">
              <input type="checkbox" v-model="showProbeDevices" /> 显示探头子设备
            </label>
            <button class="btn" @click="deviceProjectFilter=''; deviceCategoryFilter=''; deviceLifecycleFilter=''; deviceImeiSearch=''; deviceMasterFilter=''; deviceSlaveCategoryFilter=''; showProbeDevices=false; selectedDeviceIds=[]">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:36px"><input type="checkbox" :checked="filteredDevices.length && filteredDevices.every(d => selectedDeviceIds.includes(d.id))" @change="toggleSelectAllFiltered" /></th>
                  <th>IMEI</th><th>设备名称</th><th>项目</th><th>品类</th><th>匹配</th><th>挂靠规则</th><th>生命周期</th><th>AEP 设备 ID</th><th>型号</th><th>更新时间</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredDevices" :key="d.id">
                  <td><input type="checkbox" :checked="selectedDeviceIds.includes(d.id)" @change="toggleSelectDevice(d.id)" /></td>
                  <td><code>{{ d.imei }}</code></td>
                  <td>
                    <a class="btn-link btn" style="padding:0" @click="openDeviceDetail(d)">{{ d.name }}</a>
                    <span v-if="isChildDevice(d)" class="tag tag-blue" style="margin-left:6px" title="挂靠父一体机的子设备/探头">子设备</span>
                    <span v-else-if="isHubDevice(d)" class="tag tag-green" style="margin-left:6px" title="一体机主机，可查看其下子设备">一体机</span>
                  </td>
                  <td>
                    <span v-if="!d.projectId" class="tag tag-orange">未定义项目</span>
                    <span v-else>{{ d.projectName }}</span>
                  </td>
                  <td>
                    <span v-if="!d.categoryId" class="tag tag-gray">未分类</span>
                    <span v-else>{{ d.categoryName }}</span>
                  </td>
                  <td><span class="tag" :class="d.categoryMatch==='auto'?'tag-blue':(d.categoryMatch==='manual'?'tag-orange':'tag-gray')">{{ categoryMatchLabel(d.categoryMatch) }}</span></td>
                  <td><code v-if="d.categoryRuleId" style="font-size:12px">{{ d.categoryRuleId }}</code><span v-else style="color:#bbb">—</span></td>
                  <td>
                    <span class="lifecycle-dot">
                      <i :class="LC_CLASS[d.lifecycle]"></i>
                      <span class="tag" :class="LC_TAG[d.lifecycle]">{{ d.lifecycle }}</span>
                    </span>
                  </td>
                  <td>
                    <span v-if="isProbeAepId(d.aepDeviceId)" class="tag tag-gray" title="合成键，非真 AEP 设备 ID">{{ d.aepDeviceId }}</span>
                    <span v-else>{{ d.aepDeviceId || '—' }}</span>
                  </td>
                  <td>{{ d.model }}</td>
                  <td>{{ d.updatedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDeviceDetail(d)">档案</button>
                    <button class="btn-link btn" @click="openMonitorForDevice(d)">数据</button>
                    <button class="btn-link btn" @click="openTransferModal(d)">改挂</button>
                    <button class="btn-link btn" @click="openEditDevice(d)">编辑</button>
                  </td>
                </tr>
                <tr v-if="!filteredDevices.length">
                  <td colspan="12"><div class="empty-hint">无匹配设备</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredDevices.length }} 台 · 已选 {{ selectedDeviceIds.length }}</span>
            <button class="page-btn active">1</button>
            <button class="page-btn">›</button>
          </div>
          <div class="table-note">品类默认由归属规则自动匹配；「挂靠规则」列=categoryRuleId（含 fallback:型号）。列表默认隐藏 aepDeviceId 以 probe: 开头的探头子设备（选主机或勾选「显示探头」可见）；露出后名称旁标「子设备」，一体机主机标「一体机」。probe:{SN} 为合成键，真 AEP ID 看父一体机。</div>
        </div>

        <!-- ===== 设备台账：设备档案详情 ===== -->
        <div v-else-if="module==='ledger' && screen==='deviceDetail'" class="page-card detail-shell" data-screen="ledger-device-detail">
          <button class="back-link" @click="goDevices">← 返回设备列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title" style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span>{{ currentDevice.name }}</span>
                <span v-if="isChildDevice(currentDevice)" class="tag tag-blue" title="挂靠父一体机的子设备/探头">子设备</span>
                <span v-else-if="isHubDevice(currentDevice)" class="tag tag-green" title="一体机主机">一体机</span>
              </h1>
              <div class="detail-meta">
                <span>IMEI：<b>{{ currentDevice.imei }}</b></span>
                <span>项目：
                  <b v-if="!currentDevice.projectId" style="color:#E78212">未定义项目 · 例外池</b>
                  <b v-else>{{ currentDevice.projectName }}</b>
                </span>
                <span>品类：
                  <b v-if="!currentDevice.categoryId" style="color:#8c8c8c">未分类</b>
                  <b v-else>{{ currentDevice.categoryName }}</b>
                  <span class="tag" style="margin-left:6px" :class="currentDevice.categoryMatch==='auto'?'tag-blue':(currentDevice.categoryMatch==='manual'?'tag-orange':'tag-gray')">{{ categoryMatchLabel(currentDevice.categoryMatch) }}</span>
                </span>
                <span>生命周期：
                  <span class="lifecycle-dot" style="display:inline-flex">
                    <i :class="LC_CLASS[currentDevice.lifecycle]"></i>
                    <b>{{ currentDevice.lifecycle }}</b>
                  </span>
                </span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary" @click="setDeviceDetailTab('localData')">本机数据</button>
              <button class="btn" @click="setDeviceDetailTab('dispatch')" :disabled="!currentDevice.categoryId">指令</button>
              <button class="btn" @click="openDeviceOtaModal">固件升级</button>
              <button class="btn" @click="setDeviceDetailTab('sendLog')">设备发送记录</button>
              <button class="btn" v-if="canShowChildDevices" @click="setDeviceDetailTab('children')">子设备（探头） · {{ currentDeviceSlaves.length }}</button>
              <button class="btn" @click="openMonitorForDevice(currentDevice)">{{ canShowChildDevices ? '曲线 · 先选探头' : '曲线（在线监控）' }}</button>
              <button class="btn" @click="openTransferModal(currentDevice)">例外处理 · 人工改挂</button>
              <button class="btn" @click="openEditDevice(currentDevice)">编辑档案</button>
              <button class="btn btn-danger" @click="openDisableDevice" :disabled="currentDevice.lifecycle==='停用'||currentDevice.lifecycle==='报废'">停用</button>
            </div>
          </div>

          <div class="device-sticky-bar" title="切 Tab 时置顶可见">
            <div class="sticky-chip"><span class="sk">名称</span><b>{{ currentDevice.name }}</b>
              <span v-if="isChildDevice(currentDevice)" class="tag tag-blue" style="margin-left:6px">子设备</span>
              <span v-else-if="isHubDevice(currentDevice)" class="tag tag-green" style="margin-left:6px">一体机</span>
            </div>
            <div class="sticky-chip"><span class="sk">IMEI</span><code>{{ currentDevice.imei }}</code></div>
            <div class="sticky-chip"><span class="sk">设备序列号</span><code>{{ currentDevice.deviceSn || '—' }}</code></div>
            <div class="sticky-chip"><span class="sk">品类</span><b>{{ currentDevice.categoryName || '未分类' }}</b></div>
            <div class="sticky-chip"><span class="sk">AEP状态</span>
              <span class="tag" :class="aepStatusTag(currentDevice.aepStatus)">{{ aepStatusLabel(currentDevice.aepStatus) }}</span>
            </div>
            <div class="sticky-chip"><span class="sk">项目</span>
              <b v-if="!currentDevice.projectId" style="color:#E78212">未定义项目</b>
              <b v-else>{{ currentDevice.projectName }}</b>
            </div>
            <div class="sticky-chip"><span class="sk">生命周期</span>
              <span class="lifecycle-dot" style="display:inline-flex;align-items:center;gap:4px">
                <i :class="LC_CLASS[currentDevice.lifecycle]"></i>
                <b>{{ currentDevice.lifecycle }}</b>
              </span>
            </div>
            <div class="sticky-chip"><span class="sk">AEP设备ID</span>
              <code v-if="isProbeAepId(currentDevice.aepDeviceId)">{{ currentDevice.aepDeviceId }}</code>
              <code v-else>{{ currentDevice.aepDeviceId || '—' }}</code>
            </div>
            <div class="sticky-chip"><span class="sk">最近上报</span><b>{{ currentDevice.lastReportAt || currentDevice.updatedAt || '—' }}</b></div>
          </div>

          <div class="tabs" style="margin-top:4px">
            <div class="tab" :class="{active: deviceDetailTab==='profile'}" @click="setDeviceDetailTab('profile')">档案</div>
            <div class="tab" :class="{active: deviceDetailTab==='localData'}" @click="setDeviceDetailTab('localData')">本机数据</div>
            <div class="tab" :class="{active: deviceDetailTab==='dispatch'}" @click="setDeviceDetailTab('dispatch')">指令</div>
            <div class="tab" :class="{active: deviceDetailTab==='upgradeLog'}" @click="setDeviceDetailTab('upgradeLog')">本机升级记录</div>
            <div class="tab" :class="{active: deviceDetailTab==='sendLog'}" @click="setDeviceDetailTab('sendLog')">设备发送记录</div>
            <div class="tab" :class="{active: deviceDetailTab==='snChange'}" @click="setDeviceDetailTab('snChange')">设备号变更</div>
            <div class="tab" v-if="canShowChildDevices" :class="{active: deviceDetailTab==='children'}" @click="setDeviceDetailTab('children')">子设备</div>
          </div>

          <template v-if="deviceDetailTab==='profile'">
          <div class="info-section">
            <div class="info-section-title">基本信息</div>
            <div class="kv-grid">
              <div class="k">设备 ID</div><div class="v">{{ currentDevice.id }}</div>
              <div class="k">IMEI</div><div class="v"><code>{{ currentDevice.imei }}</code></div>
              <div class="k">设备序列号</div><div class="v"><code>{{ currentDevice.deviceSn || '—' }}</code> <span class="sub-nav-hint">deviceSn · 后端 51cfe454</span></div>
              <div class="k">AEP 状态</div><div class="v"><span class="tag" :class="aepStatusTag(currentDevice.aepStatus)">{{ aepStatusLabel(currentDevice.aepStatus) }}</span> <span class="sub-nav-hint">0待确认 / 1在线 / 2离线 / 9忽略</span></div>
              <div class="k">最近上报</div><div class="v">{{ currentDevice.lastReportAt || currentDevice.updatedAt || '—' }}</div>
              <div class="k">AEP 设备 ID</div><div class="v">
                <template v-if="isProbeAepId(currentDevice.aepDeviceId)">
                  <code>{{ currentDevice.aepDeviceId }}</code>
                  <span class="tag tag-gray" style="margin-left:6px">合成键 · 非真 AEP ID</span>
                  <div class="hint" style="margin-top:4px">真 AEP 设备 id 请看主机：{{ (currentDeviceMaster && currentDeviceMaster.aepDeviceId) || '—' }}</div>
                </template>
                <template v-else>{{ currentDevice.aepDeviceId || '—' }}</template>
              </div>
              <div class="k">物模型品类</div><div class="v">{{ currentDevice.categoryName || '未分类' }} <span class="tag" :class="currentDevice.categoryMatch==='auto'?'tag-blue':(currentDevice.categoryMatch==='manual'?'tag-orange':'tag-gray')">{{ categoryMatchLabel(currentDevice.categoryMatch) }}</span></div>
              <div class="k">挂靠规则 ID</div><div class="v"><code v-if="currentDevice.categoryRuleId">{{ currentDevice.categoryRuleId }}</code><span v-else>—</span> <span class="sub-nav-hint">解绑品类时清空；型号兜底形如 fallback:0042</span></div>
              <div class="k">所属项目</div><div class="v">{{ displayProjectName(currentDevice) }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentDevice.model || '—' }}</div>
              <div class="k">firmwareVersion</div><div class="v">{{ displayNullable(deviceFirmwareVersion(currentDevice)) }} <span class="sub-nav-hint">OTA 固件版本，不是 softwareVersion</span></div>
              <div class="k">hardwareVersion</div><div class="v">{{ displayNullable(currentDevice.hardwareVersion) }} <span class="sub-nav-hint">整数，可空</span></div>
              <div class="k">softwareVersion</div><div class="v">{{ displayNullable(currentDevice.softwareVersion) }} <span class="sub-nav-hint">信息包软件版本，整数，可空</span></div>
              <div class="k">安装日期</div><div class="v">{{ currentDevice.installDate || '—' }}</div>
              <div class="k">安装人</div><div class="v">{{ currentDevice.installer || '—' }}</div>
              <div class="k">安装地址</div><div class="v">{{ currentDevice.address || '—' }}</div>
              <div class="k">最近更新</div><div class="v">{{ currentDevice.updatedAt }}</div>
            </div>
          </div>

          <div class="info-section" data-block="device-interval-override">
            <div class="info-section-title">上报间隔 <span class="sub-nav-hint">数据可信 · 只覆盖间隔，窗口可随间隔算 · 不改测值</span></div>
            <div class="kv-grid" v-if="currentDevice.categoryId">
              <div class="k">生效</div>
              <div class="v">
                <b>{{ dtDeviceIntervalView.intervalSec == null ? '—' : dtDeviceIntervalView.intervalSec + 's' }}</b>
                <span class="tag" :class="dtDeviceIntervalView.source==='device' ? 'tag-orange' : 'tag-blue'" style="margin-left:8px">{{ dtDeviceIntervalView.label }}</span>
                <span class="cell-sub">窗口 {{ dtDeviceIntervalView.windowSec == null ? '—' : dtDeviceIntervalView.windowSec + 's' }}</span>
              </div>
              <div class="k">品类已发布</div>
              <div class="v">{{ dtDeviceIntervalView.categoryInterval == null ? '—' : dtDeviceIntervalView.categoryInterval + 's' }} <span class="sub-nav-hint">{{ currentDevice.categoryName }}</span></div>
              <div class="k">项目覆盖</div>
              <div class="v">{{ dtDeviceIntervalView.projectInterval == null ? '无，继承品类' : dtDeviceIntervalView.projectInterval + 's' }}</div>
            </div>
            <div v-else class="empty-hint">设备未关联品类，不能覆盖上报间隔。</div>
            <div class="toolbar" style="margin-top:8px" v-if="currentDevice.categoryId">
              <label class="dispatch-param-label">间隔(s)</label>
              <input class="input" style="width:100px" type="number" min="1" v-model.number="dtDeviceIntervalInput" placeholder="秒" />
              <label class="dispatch-param-label">窗口(s)</label>
              <input class="input" style="width:100px" type="number" min="0" v-model.number="dtDeviceWindowInput" placeholder="默认为一半" />
              <button class="btn btn-primary btn-sm" @click="dtSaveDeviceOverride">保存覆盖</button>
              <button class="btn btn-sm" @click="dtRestoreDeviceOverride" :disabled="dtDeviceIntervalView.source!=='device'">恢复默认</button>
              <button class="btn-link btn" @click="openCategoryStandard(CATEGORIES.find(c => c.id===currentDevice.categoryId))">品类标准</button>
            </div>
            <div class="table-note">生效顺序：设备覆盖 &gt; 项目覆盖 &gt; 品类已发布版本。恢复默认只去掉本设备覆盖。</div>
          </div>

          <div class="info-section">
            <div class="info-section-title">双 IMSI</div>
            <div class="kv-grid">
              <div class="k">chinaTelecomImsi</div><div class="v"><code v-if="currentDevice.chinaTelecomImsi">{{ currentDevice.chinaTelecomImsi }}</code><span v-else>—</span></div>
              <div class="k">chinaMobileImsi</div><div class="v"><code v-if="currentDevice.chinaMobileImsi">{{ currentDevice.chinaMobileImsi }}</code><span v-else>—</span></div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">安装经纬度 <span class="sub-nav-hint">lng / lat · 井盖信息包有效 GPS 会覆盖</span></div>
            <div class="coord-row">
              <span>经度 lng：<b>{{ displayNullable(currentDevice.lng) }}</b></span>
              <span>纬度 lat：<b>{{ displayNullable(currentDevice.lat) }}</b></span>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">信息包 <span class="sub-nav-hint">解析 messageInfoJson，按 packageType 展示</span></div>
            <div v-if="currentMessageInfo.empty" class="empty-hint">尚未上报信息包。hardwareVersion、softwareVersion、双 IMSI、messageInfoJson 为空时以 — 展示。</div>
            <div v-else-if="currentMessageInfo.parseError" class="empty-hint">messageInfoJson 无法解析</div>
            <template v-else>
              <div class="kv-grid">
                <div class="k">packageType</div><div class="v"><code>{{ currentMessageInfo.packageType }}</code></div>
                <template v-for="row in currentMessageInfo.rows" :key="row.key">
                  <div class="k">{{ row.label }} <span class="sub-nav-hint">{{ row.key }}</span></div>
                  <div class="v">{{ row.value }}</div>
                </template>
              </div>
              <div v-if="currentMessageInfo.packageType==='message32769'" class="table-note">井盖信息包 gpsValid 为真时，上方 lng/lat 为该包有效 GPS 覆盖后的安装经纬度。</div>
            </template>
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
            <div class="info-section-title">主从关系
              <a v-if="canShowChildDevices" class="btn-link btn" style="padding:0;margin-left:8px;font-size:13px" @click="setDeviceDetailTab('children')">查看子设备（探头）→</a>
            </div>
            <div class="relation-card">
              <div class="relation-node" v-if="currentDeviceMaster">
                <span class="rn-role">主机</span>
                <span class="rn-name" @click="openDeviceDetail(currentDeviceMaster)">{{ currentDeviceMaster.name }}</span>
                <span style="font-size:12px;color:#888">{{ currentDeviceMaster.imei }}</span>
              </div>
              <div class="relation-node" v-else>
                <span class="rn-role">本机角色</span>
                <span class="rn-name" style="color:#1f1f1f;cursor:default">{{ currentDeviceSlaves.length ? '主机' : '独立设备' }}</span>
                <span style="font-size:12px;color:#888">{{ currentDevice.imei }}</span>
              </div>
              <div class="relation-arrow" v-if="currentDeviceMaster || currentDeviceSlaves.length">→</div>
              <div class="relation-node" v-for="s in currentDeviceSlaves" :key="s.id">
                <span class="rn-role">从机</span>
                <span class="rn-name" @click="openDeviceDetail(s)">{{ s.name }}</span>
                <span style="font-size:12px;color:#888">{{ s.imei }}</span>
              </div>
              <div v-if="currentDeviceMaster && !currentDeviceSlaves.length" class="relation-node">
                <span class="rn-role">本机</span>
                <span class="rn-name" style="color:#1f1f1f;cursor:default">{{ currentDevice.name }}（从机）</span>
              </div>
              <div v-if="!currentDeviceMaster && !currentDeviceSlaves.length" style="font-size:13px;color:#999">无主从关联</div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-section-title">改挂记录 <span class="sub-nav-hint">例外处理 · 项目归属变更日志</span></div>
            <div class="table-wrap" v-if="currentDeviceTransferLogs.length">
              <table class="data-table">
                <thead><tr><th>时间</th><th>操作人</th><th>自</th><th>至</th><th>备注</th></tr></thead>
                <tbody>
                  <tr v-for="t in currentDeviceTransferLogs" :key="t.id">
                    <td>{{ t.time }}</td>
                    <td>{{ t.operator }}</td>
                    <td>{{ t.fromProjectName }}</td>
                    <td>{{ t.toProjectName }}</td>
                    <td>{{ t.note || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无改挂记录</div>
          </div>
          </template>


          <template v-else-if="deviceDetailTab==='children'">
            <div class="banner-muted">按 masterId=当前台账 id 查探头。曲线按<strong>单个探头各一图</strong>（单位不同不混轴）；采样 history 挂子设备 deviceId。报文仍挂本一体机「本机数据」。</div>
            <div class="table-wrap" v-if="currentDeviceSlaves.length">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>IMEI</th><th>名称</th><th>aepDeviceId</th><th>生命周期</th><th>品类</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in currentDeviceSlaves" :key="s.id">
                    <td><code>{{ s.imei }}</code></td>
                    <td>{{ s.name }} <span class="tag tag-blue" style="margin-left:4px">子设备</span></td>
                    <td>
                      <span v-if="isProbeAepId(s.aepDeviceId)" class="tag tag-gray">{{ s.aepDeviceId }}</span>
                      <span v-else>{{ s.aepDeviceId || '—' }}</span>
                    </td>
                    <td><span class="tag" :class="LC_TAG[s.lifecycle]">{{ s.lifecycle }}</span></td>
                    <td>{{ s.categoryName || '未分类' }}</td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openDeviceDetail(s)">档案</button>
                      <button class="btn-link btn" @click="openMonitorForDevice(s)">曲线</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无子设备 / 探头（masterId={{ currentDevice.id }}）</div>
            <div class="table-note">入口：一体机 → 子设备 → 该探头「曲线」。列表也可筛父设备ID。探头自身不显示「子设备」入口。</div>
          </template>

          <template v-else-if="deviceDetailTab==='localData'">
            <div class="banner-muted">
              本机数据 = iot_protocol_data 报文（按 deviceId）。无「解析摘要」列；保留序列号(serialNum) + parsedJson 原文（非摘要）。列：数据ID / serialNum / receiveTime / packageType / parsedJson / contentHex / status。
              <template v-if="canShowChildDevices">报文挂<strong>本一体机</strong>；曲线请到「子设备」里点各探头「曲线」（不混图）。</template>
              <template v-else-if="currentDeviceMaster">采样曲线挂<strong>本探头</strong> deviceId；报文一般在父一体机「本机数据」。</template>
              <template v-else>曲线 → 顶栏「曲线（在线监控）」。</template>
            </div>
            <div class="toolbar" style="margin-bottom:10px">
              <div class="seg-group">
                <button
                  class="seg-btn"
                  v-for="f in PACKET_FILTERS"
                  :key="f.key || 'all'"
                  :class="{active: packetTypeFilter===f.key}"
                  @click="packetTypeFilter=f.key"
                >{{ f.label }} <span class="seg-cnt">{{ devicePacketTypeCounts[f.key] || 0 }}</span></button>
              </div>
              <div class="spacer"></div>
              <span style="color:#888;font-size:12px">共 {{ filteredDevicePackets.length }} 条 · deviceId={{ currentDevice.id }}</span>
            </div>
            <div class="table-wrap" v-if="filteredDevicePackets.length">
              <table class="data-table packet-table">
                <thead>
                  <tr>
                    <th style="width:100px">数据ID</th>
                    <th style="width:140px">序列号</th>
                    <th style="width:160px">receiveTime</th>
                    <th style="width:160px">packageType</th>
                    <th>parsedJson</th>
                    <th style="width:100px">contentHex</th>
                    <th style="width:88px">status</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="pk in filteredDevicePackets" :key="pk.id">
                    <tr>
                      <td><code>{{ pk.id }}</code></td>
                      <td><code>{{ pk.serialNum || '—' }}</code></td>
                      <td>{{ pk.receiveTime }}</td>
                      <td><span class="tag" :class="PACKET_TYPE_TAG[pk.packageType] || 'tag-gray'"><code>{{ pk.packageType }}</code></span></td>
                      <td><div class="packet-parsed"><code>{{ pk.parsedJson }}</code></div></td>
                      <td>
                        <button class="btn-link btn" @click="togglePacketHex(pk.id)">{{ isPacketExpanded(pk.id) ? '收起' : '展开' }}</button>
                      </td>
                      <td><span class="tag" :class="PACKET_STATUS_TAG[pk.status] || 'tag-gray'">{{ pk.status }}</span></td>
                    </tr>
                    <tr v-if="isPacketExpanded(pk.id)" class="packet-hex-row">
                      <td colspan="7">
                        <div class="packet-detail-block">
                          <div class="info-section-title">包内数据集 <span class="sub-nav-hint">parsedJson.data · 报文层不因判断或 sample 覆盖而改写</span></div>
                          <div v-if="parsePacketDatasets(pk.parsedJson).length">
                            <div v-for="(ds, di) in parsePacketDatasets(pk.parsedJson)" :key="pk.id + '-ds-' + di" class="packet-dataset">
                              <div class="cell-sub">序列号 {{ ds.serial }}</div>
                              <div v-for="(row, ri) in ds.rows" :key="pk.id + '-r-' + di + '-' + ri"><code>{{ dtDatasetText(row) }}</code></div>
                            </div>
                          </div>
                          <div v-else class="cell-sub">本包 data 不是采样列表（信息包 / 指令 / 升级包等）</div>
                          <div class="info-section-title" style="margin-top:10px">本包 sample 异常摘要 <span class="sub-nav-hint">读 sample.qualityJson / judgeId，测值仍以 sample 原 JSON 为准</span></div>
                          <table class="data-table" v-if="dtSamplesOfMessage(pk.id).length">
                            <thead><tr><th>sample</th><th>时间</th><th>测值 JSON</th><th>judgeId</th><th>异常摘要</th></tr></thead>
                            <tbody>
                              <tr v-for="s in dtSamplesOfMessage(pk.id)" :key="s.id">
                                <td><code>{{ s.id }}</code></td>
                                <td>{{ s.sampleTime }}</td>
                                <td><code>{{ dtFormatValues(s.values) }}</code></td>
                                <td><button class="btn-link btn" @click="dtOpenJudgement(s.judgeId)">{{ s.judgeId }}</button></td>
                                <td>
                                  <span class="tag" :class="dtQualitySummary(s)==='无异常' ? 'tag-green' : 'tag-red'">{{ dtQualitySummary(s) }}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div v-else class="cell-sub">本包没有挂接 sample（或不是数据上报包）</div>
                        </div>
                        <pre class="hex-preview">{{ pk.contentHex }}</pre>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无报文 · 可切换 packageType 筛选（message* / data* / upgrade65535 / command）</div>
            <div class="table-note">本机数据不再内嵌测点曲线；历史曲线仅在线监控 <code>#monitorDetail</code> / <code>#monitorCurve</code>。筛选 packageType：message* · data* · upgrade65535 · command。</div>
          </template>

          <template v-else-if="deviceDetailTab==='dispatch'">
            <div class="banner-muted">指令点发：从本品类物模型指令（kind=service）选取并组包。真正下发走 <b>AEP CreateCommand</b> 透传 hex，dataType=2。物模型「指令」Tab 仅定义，不在此点发。历史见「设备发送记录」。</div>
            <div v-if="!currentDevice.categoryId" class="empty-hint">设备未分类，无法加载指令</div>
            <div v-else-if="!deviceDispatchCommands.length" class="empty-hint">本品类暂无启用指令；请先在物模型「指令」Tab 配置</div>
            <template v-else>
              <div class="toolbar" style="margin-bottom:8px">
                <span style="color:#666;font-size:13px">已选 <b>{{ dispatchSelected.length }}</b> 条 · 可多选；object/单值指令按 <code>params</code> 键填表后再 dryRun / 下发</span>
                <div class="spacer"></div>
                <button class="btn" @click="dryRunDispatch" :disabled="!dispatchSelected.length">dryRun 预览</button>
                <button class="btn btn-primary" @click="sendDispatch" :disabled="!dispatchSelected.length">真正下发</button>
              </div>
              <div class="table-wrap">
                <table class="data-table dispatch-table">
                  <thead>
                    <tr>
                      <th style="width:44px">选</th>
                      <th>identifier</th>
                      <th>名称</th>
                      <th>bitIndex</th>
                      <th>hasParam</th>
                      <th>参数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in deviceDispatchCommands" :key="c.id" :class="{'row-selected': isDispatchSelected(c.id)}">
                      <td><input type="checkbox" :checked="isDispatchSelected(c.id)" @change="toggleDispatchCmd(c)" /></td>
                      <td><code>{{ c.code }}</code></td>
                      <td>{{ c.name }}</td>
                      <td><code>{{ c.bitIndex }}</code></td>
                      <td><span class="tag" :class="Number(c.hasParam)?'tag-blue':'tag-gray'">{{ Number(c.hasParam) ? '1 带参' : '0 无参' }}</span></td>
                      <td>
                        <template v-if="Number(c.hasParam) && c.dataType !== 'bool'">
                          <div class="dispatch-param-fields" v-if="isDispatchSelected(c.id)">
                            <div class="dispatch-param-row" v-for="f in getCommandParamFields(c)" :key="f.key">
                              <label class="dispatch-param-label"><code>{{ f.key }}</code><span>{{ f.label }}</span></label>
                              <input class="input" type="number" step="1"
                                v-model.number="dispatchParams[c.code][f.key]"
                                :min="f.min != null ? f.min : undefined"
                                :max="f.max != null ? f.max : undefined"
                                :placeholder="f.key" />
                              <span class="dispatch-param-hint">
                                <template v-if="f.min != null || f.max != null">{{ f.min != null ? f.min : '—' }}～{{ f.max != null ? f.max : '—' }}</template>
                                <template v-if="f.unit"> {{ f.unit }}</template>
                              </span>
                            </div>
                            <div class="dispatch-param-meta" v-if="c.dataType === 'object'">params · dataType=object</div>
                            <div class="dispatch-param-meta" v-else>params.value</div>
                          </div>
                          <span v-else class="muted-cell">勾选后按 params 键填写</span>
                        </template>
                        <span v-else class="muted-cell">无参 · 选中写 F0</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="info-section" style="margin-top:16px" v-if="dispatchPreviewHex">
                <div class="info-section-title">dryRun · contentHex <span class="sub-nav-hint">示意组包 FAFA…ADAD</span></div>
                <pre class="hex-preview">{{ dispatchPreviewHex }}</pre>
              </div>
              <div class="table-note">请求体对齐后端：commands[].params 为对象键（如 resendRange→start/end；sampleInterval→longMin/midMin/shortMin；高度类→value）。dryRun 仍预览 contentHex；真正下发 mock toast。AEP CreateCommand 透传 hex dataType=2。</div>
            </template>
          </template>


          <template v-else-if="deviceDetailTab==='upgradeLog'">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">本机升级记录（切片）。「固件升级」走 POST /iot/otaTask（deviceId + categoryId），先建升级任务再挂本条记录。设备状态 0 排队 / 1 升级中 / 2 成功 / 3 失败。全量成功/失败在历史升级记录。</span>
              <div class="spacer"></div>
              <button class="btn btn-sm" @click="openUpgradeHistory(currentDevice.id)">历史升级记录</button>
              <button class="btn btn-primary btn-sm" @click="openDeviceOtaModal">＋ 固件升级</button>
            </div>
            <div class="banner-muted">成功仍由 upgradeStatus 决定，不新增状态：末包应答 remain=0 记为 2 成功。智能井盖兜底：末包已发但没有最终应答时，实时信息包 softwareVersion 与本条升级记录的 fromVersion 不相等即记成功（版本可回退；只比该单 fromVersion，不比设备当前版本，也不比目标版本）。回写用信息包实际版本。fromVersion 为空则跳过信息包兜底，应答 remain=0 仍记成功。兜底比较：信息包 softwareVersion ≠ 本单 fromVersion（待后端新 tip）。</div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>时间</th><th>任务</th><th>fromVersion</th><th>版本</th><th>设备状态</th><th>进度</th><th>操作人</th><th>失败原因</th><th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in currentDeviceUpgradeLogs" :key="r.id">
                    <td>{{ r.time }}</td>
                    <td>
                      <button v-if="r.taskId" class="btn-link btn" @click="openOtaTaskFromLog(r.taskId)">{{ r.taskId }}</button>
                      <span v-else>—</span>
                    </td>
                    <td>{{ displayNullable(upgradeFromVersion(r)) }}<div class="cell-sub">升级前 softwareVersion</div></td>
                    <td><code>{{ r.fromVer }}</code> → <code>{{ r.toVer }}</code></td>
                    <td><span class="tag" :class="upgradeStatusTag(r.status)">{{ otaDeviceStatusText(r.status) }}</span></td>
                    <td>
                      <div class="ota-progress">
                        <div class="ota-progress-bar"><i :style="{width: (r.progress||0)+'%'}"></i></div>
                        <span>{{ r.progress || 0 }}%</span>
                      </div>
                      <div class="ota-progress-pkgs" v-if="upgradePackageLine(r)">{{ upgradePackageLine(r) }}</div>
                    </td>
                    <td>{{ r.operator }}</td>
                    <td :class="{'ota-fail-reason': !!r.failReason}">{{ r.failReason || '—' }}</td>
                    <td>{{ upgradeSuccessNote(r) || '—' }}</td>
                  </tr>
                  <tr v-if="!currentDeviceUpgradeLogs.length"><td colspan="9"><div class="empty-hint">暂无升级日志。点击「固件升级」会先创建升级任务，再挂本机记录</div></td></tr>
                </tbody>
              </table>
            </div>
            <div class="table-note">进度除百分比外展示 sentPackage、remainPackage，有则显示 totalPackage。成功仍看 upgradeStatus。fromVersion 为升级前 softwareVersion，未上报则为 —。D013 的成功记录是智能井盖信息包兜底（softwareVersion ≠ 本单 fromVersion）。</div>
          </template>

          <template v-else-if="deviceDetailTab==='snChange'">
            <div class="banner-muted">设备号变更记录：执行「更改设备号」指令成功后写入，便于对账与排障。字段：旧号 / 新号 / 操作人 / 时间 / 来源 / commandId / 结果。</div>
            <div class="table-wrap" v-if="currentDeviceSnChangeLogs.length">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>时间</th><th>旧设备号</th><th>新设备号</th><th>操作人</th><th>来源</th><th>commandId</th><th>结果</th><th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in currentDeviceSnChangeLogs" :key="row.id">
                    <td>{{ row.time }}</td>
                    <td><code>{{ row.oldSn }}</code></td>
                    <td><code>{{ row.newSn }}</code></td>
                    <td>{{ row.operator || '—' }}</td>
                    <td>{{ row.source || '—' }}</td>
                    <td><code style="font-size:12px">{{ row.commandId || '—' }}</code></td>
                    <td><span class="tag" :class="row.result==='成功'?'tag-green':'tag-red'">{{ row.result || '—' }}</span></td>
                    <td>{{ row.note || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无设备号变更记录</div>
            <div class="table-note">与发送记录区分：发送记录看整包下发；本 Tab 只留「号变更」审计链。后端建议表 iot_device_sn_change_log，指令 changeDeviceSn 成功回调写入。</div>
          </template>

          <template v-else-if="deviceDetailTab==='sendLog'">
            <div class="banner-muted">进页自动拉 <code>GET /iot/deviceCommand/log</code>（按 deviceId={{ currentDevice.id }} · sendTime 倒序）。与「指令」内下发历史同一组件示意。列表对齐 IotDeviceCommandLogPanel；aepCode 仅详情返回侧。</div>
            <div class="table-wrap" v-if="deviceSendLogs.length">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width:150px">时间</th>
                    <th style="width:88px">类型</th>
                    <th>identifiers</th>
                    <th style="width:72px">结果</th>
                    <th style="width:64px">dryRun</th>
                    <th style="width:150px">commandId</th>
                    <th style="width:120px">状态</th>
                    <th style="width:110px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in deviceSendLogs" :key="row.id">
                    <td>{{ row.sendTime }}</td>
                    <td>{{ sendLogTypeLabel(row) }}</td>
                    <td><code>{{ formatIdentifiers(row.identifiers) }}</code></td>
                    <td><span class="tag" :class="sendLogSuccess(row) ? 'tag-green' : 'tag-red'">{{ sendLogSuccess(row) ? '成功' : '失败' }}</span></td>
                    <td>{{ sendLogDryRunLabel(row) }}</td>
                    <td><code>{{ row.commandId || '—' }}</code></td>
                    <td><code>{{ row.commandStatus || '—' }}</code></td>
                    <td class="actions"><button class="btn-link btn" @click="openSendLogDetail(row)">查看出站/返回</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-hint">暂无设备发送记录</div>
            <div class="table-note">结果列 = success（1→成功绿 / 否则失败红）；状态列 = commandStatus 原文（不做中文映射）；aepCode 不进列表。</div>
          </template>

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
            <div class="form-item"><label><span class="req">*</span>IMEI</label><input class="input input-full" v-model="deviceForm.imei" :disabled="deviceFormMode==='edit'" /></div>
            <div class="form-item"><label>设备序列号</label><input class="input input-full" v-model="deviceForm.deviceSn" placeholder="deviceSn" /><div class="hint">与 IMEI 可不同；后端详情基本信息字段</div></div>
            <div class="form-item"><label><span class="req">*</span>设备名称</label><input class="input input-full" v-model="deviceForm.name" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>所属项目</label>
              <select class="select input-full" v-model="deviceForm.projectId">
                <option value="">未定义项目（例外池）</option>
                <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <div class="hint">主路径：OpenAPI 绑定自动建档，仅当 projectId 为空时写入，不覆盖人工已挂。例外池 / 人工改挂仅作异常处理。</div>
            </div>
            <div class="form-item"><label>品类（自动匹配）</label>
              <div v-if="!showCategoryOverride">
                <input class="input input-full" :value="(CATEGORIES.find(c=>c.id===deviceForm.categoryId)||{}).name || '未分类'" disabled />
                <div class="hint">
                  由归属规则自动挂靠 · {{ categoryMatchLabel(deviceForm.categoryMatch) }}
                  <a class="btn-link btn" style="padding:0;margin-left:8px" @click="showCategoryOverride=true">改挂</a>
                </div>
              </div>
              <div v-else>
                <select class="select input-full" v-model="deviceForm.categoryId">
                  <option value="">未分类</option>
                  <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <div class="hint">例外处理：人工改挂品类；保存后标记为「人工改挂」（非主路径）</div>
              </div>
            </div>
            <div class="form-item"><label>生命周期</label>
              <select class="select input-full" v-model="deviceForm.lifecycle">
                <option v-for="s in LIFECYCLES" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>AEP 设备 ID</label>
              <input class="input input-full" v-model="deviceForm.aepDeviceId" placeholder="对账接入后自动回填" :disabled="isProbeAepId(deviceForm.aepDeviceId)" />
              <div class="hint" v-if="isProbeAepId(deviceForm.aepDeviceId)">probe:{SN} 为探头合成键，不可当 AEP 设备 id 编辑；真 AEP id 在主机档案。</div>
              <div class="hint" v-else>对账接入后自动回填；勿填 probe: 前缀。</div>
            </div>
            <div class="form-item"><label>硬件型号</label><input class="input input-full" v-model="deviceForm.model" /></div>
            <div class="form-item"><label>firmwareVersion（OTA 固件版本）</label><input class="input input-full" v-model="deviceForm.firmware" /><div class="hint">OTA 固件版本，不要填成信息包 softwareVersion。</div></div>
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
                <option v-for="d in deviceList.filter(x => x.id !== deviceForm.id)" :key="d.id" :value="d.id">{{ d.name }}（{{ d.imei }}）</option>
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
              <p class="page-desc">「同步自 AEP」拉取产品/设备清单并生成差异（多出 / 缺失）。支持周期对账。项目与 AEP 产品 1:1；品类仍由归属规则匹配，对账不依赖品类绑定产品。缺产品或临时设备进入例外池（未定义项目）。</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              <button class="btn btn-primary" @click="syncFromAep">同步自 AEP</button>
              <span style="font-size:12px;color:#888">最近同步：{{ aepLastSyncedAt }} · 支持周期对账</span>
            </div>
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
                  <th>类型</th><th>IMEI</th><th>AEP / 本地名称</th><th>AEP 设备 ID</th><th>产品 ID</th><th>说明</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredAepDiffs" :key="item.id">
                  <td>
                    <span class="tag" :class="item.type==='extra'?'tag-orange':'tag-red'">{{ item.type==='extra'?'多出':'缺失' }}</span>
                  </td>
                  <td><code>{{ item.imei }}</code></td>
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
          <div class="table-note">主操作「同步自 AEP」生成差异；行内「接入台账 / 创建接入 / 忽略」为二次处理。OpenAPI 绑定为主建档路径（projectId 仅空时写入）；缺产品进例外池。对账与品类归属规则相互独立。一期为交互示意。</div>
        </div>

        <!-- ===== 在线监控：设备数据列表（数据向，与台账区分） ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorList'" class="page-card mon-page" data-screen="monitor-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">在线监控 · 设备数据</h1>
              <p class="page-desc">看测点最新值与上报状态——按<strong>项目</strong> / <strong>品类</strong>筛选；选品类后展开该品类物模型测点列。档案、生命周期、AEP 绑定、型号请到<strong>设备台账</strong>。</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-primary" :disabled="!cmpListSelected.length" @click="compareFromMonitorList">对比{{ cmpListSelected.length ? '（' + cmpListSelected.length + '）' : '' }}</button>
              <button class="btn" @click="goMonitorOnlineRate">在线率统计</button>
            </div>
          </div>
          <div class="stat-row mon-stat-row">
            <div class="stat-chip accent"><div class="sc-label">监控设备</div><div class="sc-value">{{ monListStats.total }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">在线</div><div class="sc-value">{{ monListStats.online }}</div></div>
            <div class="stat-chip"><div class="sc-label">离线</div><div class="sc-value">{{ monListStats.offline }}</div></div>
            <div class="stat-chip warn"><div class="sc-label">有告警</div><div class="sc-value">{{ monListStats.alarming }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">低可信 (T0/T1)</div><div class="sc-value">{{ monListStats.lowTrust }}</div></div>
          </div>
          <div class="toolbar mon-toolbar">
            <select class="select" v-model="monProjectFilter" data-testid="mon-project-filter">
              <option value="">全部项目</option>
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select class="select" v-model="monCategoryFilter" data-testid="mon-category-filter">
              <option value="">全部品类</option>
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <input class="input input-md" v-model="monSearch" placeholder="设备名 / IMEI" />
            <select class="select select-sm" v-model="monOnlineFilter">
              <option value="">在线态</option>
              <option value="在线">在线</option>
              <option value="离线">离线</option>
              <option value="未知">未知</option>
            </select>
            <select class="select select-sm" v-model="monAlarmFilter">
              <option value="">告警</option>
              <option value="any">有告警</option>
              <option value="warn">有预警</option>
              <option value="alarm">有报警</option>
              <option value="fault">有故障</option>
              <option value="none">无告警</option>
            </select>
            <button class="btn" @click="monSearch=''; monProjectFilter=''; monCategoryFilter=''; monOnlineFilter=''; monAlarmFilter=''">重置</button>
          </div>
          <div class="banner-tip mon-hint" v-if="monHasCategoryFilter">
            已选品类「{{ monSelectedCategoryName }}」· 测点列 {{ monMetricColumns.length }} 个（仅「监控展示」勾选 ·
            <template v-for="(col, idx) in monMetricColumns" :key="col.id"><code>{{ col.identifier }}</code><span v-if="idx < monMetricColumns.length - 1"> · </span></template>）
          </div>
          <div class="banner-muted mon-hint" v-else>选择品类以展开测点列</div>
          <div class="table-wrap">
            <table class="data-table mon-table" data-testid="mon-list-table">
              <thead>
                <tr>
                  <th class="mon-col-check" style="width:36px"></th>
                  <th class="mon-col-device">设备</th>
                  <th class="mon-col-status">在线态</th>
                  <th class="mon-col-time">最近上报</th>
                  <template v-if="monHasCategoryFilter">
                    <th v-for="col in monMetricColumns" :key="col.identifier" class="metric-col">
                      {{ col.name }}
                      <span class="th-sub" v-if="col.unit">{{ col.unit }}</span>
                      <span class="th-sub"><code>{{ col.identifier }}</code></span>
                    </th>
                  </template>
                  <th v-else class="mon-col-summary">最新数据 <span class="th-sub">摘要</span></th>
                  <th class="mon-col-alarm">告警</th>
                  <th class="mon-col-ops">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in filteredMonitorRows" :key="d.id" class="row-clickable" @click="openMonitorDetail(d)">
                  <td class="mon-check-cell" @click.stop>
                    <input type="checkbox" :checked="cmpListSelected.includes(d.id)" @change="toggleCmpListSelect(d.id, $event)" :aria-label="'选择 '+d.name" />
                  </td>
                  <td class="mon-device-cell">
                    <div class="cell-title">{{ d.name }}</div>
                    <div class="cell-sub"><code>{{ d.imei }}</code>
                      <span class="mon-meta-sep">·</span>
                      <span class="mon-meta">{{ d.projectName }}</span>
                      <span class="mon-meta-sep">·</span>
                      <span class="mon-meta">{{ d.categoryName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="mon-status-chip" :class="'mon-st-' + (d.online==='在线'?'online':(d.online==='离线'?'offline':'unknown'))">
                      <i class="mon-st-dot"></i>{{ d.online }}
                    </span>
                  </td>
                  <td class="mon-time-cell">{{ d.lastReportAt }}</td>
                  <template v-if="monHasCategoryFilter">
                    <td v-for="col in monMetricColumns" :key="col.identifier" class="metric-cell" :class="{'quality-bad': dtMetricMarks(d.id, col.identifier).length}" @click="onMetricCellClick(d, col.identifier, $event)">
                      <b class="metric-val">{{ latestMetricValue(d, col.identifier) == null ? '—' : latestMetricValue(d, col.identifier) }}</b>
                      <span class="metric-unit" v-if="col.unit && latestMetricValue(d, col.identifier) != null">{{ col.unit }}</span>
                      <div v-if="dtMetricMarks(d.id, col.identifier).length" class="cell-sub">{{ dtMetricMarks(d.id, col.identifier).join('、') }}</div>
                    </td>
                  </template>
                  <td v-else class="latest-summary-cell">
                    <code class="latest-summary">{{ latestSummaryText(d) }}</code>
                  </td>
                  <td>
                    <span v-if="!d.warn && !d.alarm && !d.fault" class="tag tag-gray">无</span>
                    <span v-else class="alarm-pills">
                      <span v-if="d.warn" class="pill pill-warn">预警 {{ d.warn }}</span>
                      <span v-if="d.alarm" class="pill pill-alarm">报警 {{ d.alarm }}</span>
                      <span v-if="d.fault" class="pill pill-fault">故障 {{ d.fault }}</span>
                    </span>
                  </td>
                  <td class="actions" @click.stop>
                    <button class="btn-link btn" @click="openMonitorDetail(d)">查看数据</button>
                    <button class="btn-link btn" @click="openMonitorCurve(d)">曲线</button>
                  </td>
                </tr>
                <tr v-if="!filteredMonitorRows.length">
                  <td :colspan="monHasCategoryFilter ? (6 + monMetricColumns.length) : 7"><div class="empty-hint">无匹配监控设备</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredMonitorRows.length }} 台</span>
            <button class="page-btn active">1</button>
            <button class="page-btn">›</button>
          </div>
          <div class="table-note">与台账分工：本页只看测点与在线态；生命周期 / AEP / 匹配 / 型号等档案字段在设备台账。测点列随品类切换，跨品类总览用「最新数据」摘要。一期不做设施树、地图。</div>
        </div>

        <!-- ===== 在线监控：设备数据详情（最新值卡片 + 历史曲线） ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorDetail'" class="page-card detail-shell" data-screen="monitor-detail">
          <button class="back-link" @click="goMonitorList">← 返回在线监控列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentMonitor.name }} · 设备数据</h1>
              <div class="detail-meta">
                <span>device_id：<code>{{ monIdentity.deviceId }}</code></span>
                <span>AEP_ID：<code>{{ monIdentity.aepDeviceId || '—' }}</code></span>
                <span>IMEI：<b>{{ monIdentity.imei }}</b></span>
                <span>deviceSn：<code>{{ monIdentity.deviceSn }}</code></span>
                <span>品类：<b>{{ monIdentity.categoryName }}</b></span>
                <span>项目：<b>{{ monIdentity.projectName }}</b></span>
                <span>AEP status：<b>{{ monIdentity.aepStatus == null ? '—' : aepStatusLabel(monIdentity.aepStatus) }}</b></span>
                <span>在线：
                  <span class="lifecycle-dot" style="display:inline-flex">
                    <i :class="currentMonitor.online==='在线'?'lc-online':(currentMonitor.online==='离线'?'lc-offline':'lc-pending')"></i>
                    <b>{{ currentMonitor.online }}</b>
                  </span>
                </span>
                <span>最近上报：<b>{{ currentMonitor.lastReportAt }}</b></span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary" @click="openMonitorCurve(currentMonitor, monCurvePointCode)">全屏曲线</button>
              <button class="btn" @click="openMonitorDeviceLocalData">本机数据（报文）</button>
              <button class="btn" @click="goMonitorOnlineRate">在线率</button>
            </div>
          </div>

          <div class="banner-muted" style="margin-bottom:12px">
            曲线看趋势；上报明细看逐条上报。报文 hex 仍在台账「本机数据」。
            <button class="btn-link btn" @click="openMonitorDeviceLocalData">打开本机数据 →</button>
          </div>

          <div class="tabs" style="margin-bottom:14px">
            <div class="tab" :class="{active: monDetailTab==='overview'}" @click="monDetailTab='overview'">最新与曲线</div>
            <div class="tab" :class="{active: monDetailTab==='reports'}" @click="monDetailTab='reports'">上报明细</div>
          </div>

          <template v-if="monDetailTab==='overview'">
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
            <div class="info-section-title">最新数据 <span class="sub-nav-hint">仅展示物模型属性中勾选「监控展示」的测点 · 顺序同物模型 · 值取 MONITOR_POINTS / latest_json[identifier]</span></div>
            <div class="banner-muted" style="margin-bottom:10px">仅展示本设备品类物模型 property 且 <code>showInMonitor !== false</code>；未关联品类或品类无属性时不扫 history / latest_json 全字段。</div>
            <div class="table-note" style="margin-bottom:10px">仅展示物模型属性中勾选「监控展示」的测点。</div>
            <div class="point-card-grid" v-if="monLatestPoints.length">
              <div
                class="point-card"
                v-for="p in monLatestPoints"
                :key="p.code"
                :class="{ dim: !isFiniteMetricValue(p.value) }"
              >
                <div class="pc-head">
                  <span class="pc-name">{{ p.name }}</span>
                  <code class="pc-code">{{ p.code }}</code>
                </div>
                <div class="pc-value">
                  <b>{{ p.value == null || p.value === '' ? '—' : p.value }}</b>
                  <span class="pc-unit" v-if="p.unit">{{ p.unit }}</span>
                </div>
                <div class="pc-meta">
                  <span class="tag" :class="TRUST_TAG[p.trustLevel]">{{ p.trustLevel }}</span>
                  <span>{{ p.ts }}</span>
                  <span class="tag tag-gray" v-if="!isFiniteMetricValue(p.value)">无曲线</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-hint">{{ monPointsEmptyHint }}</div>
          </div>

          <div class="info-section">
            <div class="info-section-title">历史曲线 <span class="sub-nav-hint">分开=每指标一图 · 合并=多线同图 · 横轴 sampleTime · 无有效数值不画</span></div>
            <div class="toolbar" style="margin-bottom:10px">
              <div class="seg-group">
                <button class="seg-btn" :class="{active: monCurveMode==='split'}" @click="setMonCurveMode('split')">分开</button>
                <button class="seg-btn" :class="{active: monCurveMode==='merge'}" @click="setMonCurveMode('merge')">合并</button>
              </div>
              <div class="seg-group">
                <button class="seg-btn" :class="{active: monCurveRange===7}" @click="monCurveRange=7">近 7 天</button>
                <button class="seg-btn" :class="{active: monCurveRange===30}" @click="monCurveRange=30">近 30 天</button>
              </div>
              <div class="spacer"></div>
              <span class="tag tag-gray">可画 {{ monChartablePoints.length }} / 属性 {{ monLatestPoints.length }}</span>
              <button class="btn" @click="openMonitorCurve(currentMonitor)">全屏</button>
            </div>
            <div v-if="monCycleFullQueryTip" class="banner-tip">采集周期 &gt; 15 分钟：历史全量查、不分段</div>
            <div class="banner-muted" style="margin-bottom:10px">异常点（红点）按指标读 qualityJson，点击用 judgeId 下钻判断详情。测值仍读原 JSON。合并模式不标点。</div>

            <div class="curve-readout" v-if="monCurveCharts.length">
              <div class="curve-readout-hint">悬停或点击任一曲线，查看该采样时间点全部指标</div>
              <div class="curve-readout-items" v-if="monHoverReadout.length">
                <span class="curve-readout-item" v-for="it in monHoverReadout" :key="it.code">
                  <i class="curve-dot" :style="{background: it.color}"></i>
                  <b>{{ it.name }}</b>：{{ it.value }}<span v-if="it.unit"> {{ it.unit }}</span>
                </span>
              </div>
              <div class="curve-readout-items muted" v-else>将指针移入图表以查看 sampleTime 联动读数</div>
            </div>
            <div v-if="monCurveCharts.length" class="curve-stack" :class="monCurveMode==='merge' ? 'is-merge' : 'is-split'">
              <div class="chart-card" v-for="ch in monCurveCharts" :key="ch.key">
                <div class="chart-legend">
                  <template v-if="ch.mode==='merge'">
                    <span class="leg curve-merge-legend" v-for="(p, i) in ch.entries" :key="p.point.code">
                      <i class="lg-line" :style="{background: (ch.svg.paths[i] && ch.svg.paths[i].color) || '#0D6EFD'}"></i>
                      {{ p.point.name }}（{{ p.point.code }}）
                    </span>
                  </template>
                  <template v-else>
                    <span class="leg"><i class="lg-line" :style="{background: ch.svg.color}"></i>{{ ch.title }}</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#E78212"></i>预警</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#DC3545"></i>报警</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#0D6EFD"></i>故障</span>
                  </template>
                  <span class="leg muted">sampleTime · {{ monCurveRange }} 天</span>
                </div>
                <svg class="curve-svg" :viewBox="'0 0 ' + ch.svg.w + ' ' + ch.svg.h" preserveAspectRatio="none"
                  @mousemove="onMonCurveMove($event, ch)" @mouseleave="onMonCurveLeave" @click="onMonCurveMove($event, ch)">
                  <rect :x="ch.svg.padL" :y="ch.svg.padT" :width="ch.svg.w - ch.svg.padL - ch.svg.padR" :height="ch.svg.h - ch.svg.padT - ch.svg.padB" fill="#fafcff" stroke="#eef2f8" />
                  <g v-for="(tk, i) in ch.svg.yTicks" :key="'yt'+ch.key+i">
                    <line :x1="ch.svg.padL" :x2="ch.svg.w - ch.svg.padR" :y1="tk.y" :y2="tk.y" stroke="#edf0f5" />
                    <text :x="ch.svg.padL - 8" :y="tk.y + 4" text-anchor="end" font-size="11" fill="#8c8c8c">{{ tk.v }}</text>
                  </g>
                  <g v-for="(ln, i) in ch.svg.lines" :key="'ln'+ch.key+i">
                    <line :x1="ch.svg.padL" :x2="ch.svg.w - ch.svg.padR" :y1="ln.y" :y2="ln.y" :stroke="ln.color" stroke-width="1.5" stroke-dasharray="6 4" />
                    <text :x="ch.svg.w - ch.svg.padR - 4" :y="ln.y - 4" text-anchor="end" font-size="10" :fill="ln.color">{{ ln.label }} {{ ln.val }}</text>
                  </g>
                  <path v-for="(pp, pi) in (ch.svg.paths && ch.svg.paths.length ? ch.svg.paths : [{path: ch.svg.path, color: ch.svg.color}])" :key="'p'+ch.key+pi"
                    :d="pp.path" fill="none" :stroke="pp.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                  <g v-for="mk in monCurveQualityMarks(ch)" :key="'qm'+ch.key+mk.sampleId">
                    <circle :cx="mk.x" :cy="mk.y" r="5.5" fill="#DC3545" stroke="#fff" stroke-width="1.5" style="cursor:pointer" @click.stop="dtOpenJudgement(mk.judgeId)">
                      <title>{{ mk.code }} {{ mk.marks.join('、') }} · {{ mk.judgeId }}</title>
                    </circle>
                  </g>
                  <line v-if="monHoverT != null" :x1="ch.svg.padL + monHoverT * (ch.svg.w - ch.svg.padL - ch.svg.padR)" :x2="ch.svg.padL + monHoverT * (ch.svg.w - ch.svg.padL - ch.svg.padR)" :y1="ch.svg.padT" :y2="ch.svg.h - ch.svg.padB" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" />
                  <text :x="(ch.svg.padL + ch.svg.w - ch.svg.padR)/2" :y="ch.svg.h - 10" text-anchor="middle" font-size="11" fill="#8c8c8c">sampleTime →（{{ monCurveRange }} 天 · PG 时序示意）</text>
                </svg>
                <div class="chart-meta" v-if="ch.point">
                  <span>测点：<b>{{ ch.point.name }}</b>（{{ ch.point.code }}）</span>
                  <span>最新值：<b>{{ ch.point.value == null ? '—' : ch.point.value }}</b> {{ ch.point.unit }}</span>
                  <span>量程：{{ ch.point.ymin }} ~ {{ ch.point.ymax }}</span>
                </div>
                <div class="chart-meta" v-else>
                  <span>合并模式 · 各序列按自身 ymin/ymax 归一化到同一画布</span>
                  <span>可画指标 {{ monChartablePoints.length }} 个</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-hint">{{ monCurveEmptyHint }}</div>

          </div>

          <div class="info-section">
            <div class="info-section-title">设备与固件</div>
            <div class="kv-grid">
              <div class="k">device_id</div><div class="v"><code>{{ monIdentity.deviceId }}</code></div>
              <div class="k">AEP_ID</div><div class="v"><code>{{ monIdentity.aepDeviceId || '—' }}</code></div>
              <div class="k">IMEI / deviceSn</div><div class="v"><code>{{ monIdentity.imei }}</code> / <code>{{ monIdentity.deviceSn }}</code></div>
              <div class="k">品类 / 项目</div><div class="v">{{ monIdentity.categoryName }} · {{ monIdentity.projectName }}</div>
              <div class="k">AEP status</div><div class="v">{{ monIdentity.aepStatus == null ? '—' : aepStatusLabel(monIdentity.aepStatus) }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentMonitor.model }}</div>
              <div class="k">固件版本</div><div class="v">{{ currentMonitor.firmware }}</div>
              <div class="k">告警摘要</div><div class="v">{{ alarmSummaryText(currentMonitor) }}</div>
              <div class="k">可信说明</div><div class="v">{{ TRUST_LABEL[currentMonitor.trustLevel] }}（{{ currentMonitor.trustLevel }} / {{ currentMonitor.trustScore }} 分）</div>
              <div class="k">latest_json</div><div class="v"><code style="font-size:12px">{{ latestSummaryText(currentMonitor) }}</code></div>
            </div>
          </div>
          <div class="table-note">测点与曲线仅按品类 property 标识符对齐；无有效数值的属性不画曲线（如 D001 dianya / D006·D007 全空演示空态）。PG 时序示意，非实时接入。</div>
          </template>

          <template v-else-if="monDetailTab==='reports'">
            <div class="info-section">
              <div class="info-section-title">上报明细 <span class="sub-nav-hint">逐条采样 · sample_time DESC · 仅「监控展示」勾选的品类 property · 非报文 hex</span></div>
              <div class="table-note" style="margin-bottom:10px">仅展示物模型属性中勾选「监控展示」的测点。一期不接成功/漏报/延迟状态列。</div>
              <div class="banner-muted" style="margin-bottom:10px">
                曲线看趋势；本表看逐条上报。原始报文 contentHex 请到台账「本机数据」。
                <button class="btn-link btn" @click="openMonitorDeviceLocalData">跳转本机数据 →</button>
              </div>
              <div class="form-row" style="align-items:flex-end;gap:12px;margin-bottom:12px;flex-wrap:wrap">
                <div class="form-item" style="min-width:200px">
                  <label>开始时间 <code style="font-size:12px;font-weight:normal">sampleTimeBegin</code></label>
                  <input class="input input-full" type="datetime-local" v-model="monReportBegin" />
                </div>
                <div class="form-item" style="min-width:200px">
                  <label>结束时间 <code style="font-size:12px;font-weight:normal">sampleTimeEnd</code></label>
                  <input class="input input-full" type="datetime-local" v-model="monReportEnd" />
                </div>
                <div class="form-item" style="flex:0;padding-bottom:1px">
                  <button class="btn btn-primary" @click="queryMonReportSamples">查询</button>
                </div>
                <div class="form-item" style="flex:0;padding-bottom:1px">
                  <button class="btn" @click="resetMonReportTimeRange">近 24 小时</button>
                </div>
              </div>
              <div class="table-wrap" v-if="monReportSamples.length">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>上报时间</th>
                      <th v-for="c in monReportColumns" :key="c.code">{{ c.name }}<span v-if="c.unit">（{{ c.unit }}）</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in monReportSamples" :key="r.id" :class="{'row-trust': r.fromTrust}">
                      <td>
                        {{ r.time }}
                        <div v-if="r.judgeId" class="cell-sub"><button class="btn-link btn" @click.stop="openReportJudge(r, $event)">{{ r.judgeId }}</button></div>
                      </td>
                      <td v-for="c in monReportColumns" :key="r.id + '-' + c.code" :class="{'quality-bad': reportMarks(r, c.code).length}" @click.stop="reportMarks(r, c.code).length && openReportJudge(r, $event)">
                        <template v-if="isFiniteMetricValue(r.values[c.code])">{{ r.values[c.code] }}</template>
                        <span v-else class="muted">—</span>
                        <div v-if="reportMarks(r, c.code).length" class="cell-sub">{{ reportMarks(r, c.code).join('、') }}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-hint">{{ monReportEmptyHint }}</div>
              <div class="table-note">筛参对接 <code>sampleTimeBegin</code> / <code>sampleTimeEnd</code>（含边界）；列表分页 <code>GET /iot/iotDeviceSample</code> 按 <code>sample_time DESC</code>（最新在上）。曲线 <code>/history</code> 仍升序，勿改。测值读 sample 原 JSON；异常高亮读 <code>qualityJson</code>（无异常的指标不出现）。带 judgeId 的行可下钻判断详情。缺报不出现在本表，也不伪造测值。</div>
            </div>
          </template>
        </div>

        <!-- ===== 在线监控：历史曲线 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorCurve'" class="page-card" data-screen="monitor-curve">
          <button class="back-link" @click="screen='monitorDetail'">← 返回监控详情</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">历史曲线 · {{ currentMonitor.name }}</h1>
              <p class="page-desc">指标源=品类 kind=property；分开/合并展示；横轴 sampleTime；悬停联动全部指标读数</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="seg-group">
              <button class="seg-btn" :class="{active: monCurveMode==='split'}" @click="setMonCurveMode('split')">分开</button>
              <button class="seg-btn" :class="{active: monCurveMode==='merge'}" @click="setMonCurveMode('merge')">合并</button>
            </div>
            <div class="seg-group">
              <button class="seg-btn" :class="{active: monCurveRange===7}" @click="monCurveRange=7">近 7 天</button>
              <button class="seg-btn" :class="{active: monCurveRange===30}" @click="monCurveRange=30">近 30 天</button>
            </div>
            <div class="spacer"></div>
            <span class="tag tag-gray">可画 {{ monChartablePoints.length }} / 属性 {{ monLatestPoints.length }}</span>
          </div>
          <div v-if="monCycleFullQueryTip" class="banner-tip">
            采集周期 &gt; 15 分钟：历史全量查、不分段
          </div>

            <div class="curve-readout" v-if="monCurveCharts.length">
              <div class="curve-readout-hint">悬停或点击任一曲线，查看该采样时间点全部指标</div>
              <div class="curve-readout-items" v-if="monHoverReadout.length">
                <span class="curve-readout-item" v-for="it in monHoverReadout" :key="it.code">
                  <i class="curve-dot" :style="{background: it.color}"></i>
                  <b>{{ it.name }}</b>：{{ it.value }}<span v-if="it.unit"> {{ it.unit }}</span>
                </span>
              </div>
              <div class="curve-readout-items muted" v-else>将指针移入图表以查看 sampleTime 联动读数</div>
            </div>
            <div v-if="monCurveCharts.length" class="curve-stack" :class="monCurveMode==='merge' ? 'is-merge' : 'is-split'">
              <div class="chart-card" v-for="ch in monCurveCharts" :key="ch.key">
                <div class="chart-legend">
                  <template v-if="ch.mode==='merge'">
                    <span class="leg curve-merge-legend" v-for="(p, i) in ch.entries" :key="p.point.code">
                      <i class="lg-line" :style="{background: (ch.svg.paths[i] && ch.svg.paths[i].color) || '#0D6EFD'}"></i>
                      {{ p.point.name }}（{{ p.point.code }}）
                    </span>
                  </template>
                  <template v-else>
                    <span class="leg"><i class="lg-line" :style="{background: ch.svg.color}"></i>{{ ch.title }}</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#E78212"></i>预警</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#DC3545"></i>报警</span>
                    <span class="leg"><i class="lg-dash" style="border-color:#0D6EFD"></i>故障</span>
                  </template>
                  <span class="leg muted">sampleTime · {{ monCurveRange }} 天</span>
                </div>
                <svg class="curve-svg" :viewBox="'0 0 ' + ch.svg.w + ' ' + ch.svg.h" preserveAspectRatio="none"
                  @mousemove="onMonCurveMove($event, ch)" @mouseleave="onMonCurveLeave" @click="onMonCurveMove($event, ch)">
                  <rect :x="ch.svg.padL" :y="ch.svg.padT" :width="ch.svg.w - ch.svg.padL - ch.svg.padR" :height="ch.svg.h - ch.svg.padT - ch.svg.padB" fill="#fafcff" stroke="#eef2f8" />
                  <g v-for="(tk, i) in ch.svg.yTicks" :key="'yt'+ch.key+i">
                    <line :x1="ch.svg.padL" :x2="ch.svg.w - ch.svg.padR" :y1="tk.y" :y2="tk.y" stroke="#edf0f5" />
                    <text :x="ch.svg.padL - 8" :y="tk.y + 4" text-anchor="end" font-size="11" fill="#8c8c8c">{{ tk.v }}</text>
                  </g>
                  <g v-for="(ln, i) in ch.svg.lines" :key="'ln'+ch.key+i">
                    <line :x1="ch.svg.padL" :x2="ch.svg.w - ch.svg.padR" :y1="ln.y" :y2="ln.y" :stroke="ln.color" stroke-width="1.5" stroke-dasharray="6 4" />
                    <text :x="ch.svg.w - ch.svg.padR - 4" :y="ln.y - 4" text-anchor="end" font-size="10" :fill="ln.color">{{ ln.label }} {{ ln.val }}</text>
                  </g>
                  <path v-for="(pp, pi) in (ch.svg.paths && ch.svg.paths.length ? ch.svg.paths : [{path: ch.svg.path, color: ch.svg.color}])" :key="'p'+ch.key+pi"
                    :d="pp.path" fill="none" :stroke="pp.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                  <g v-for="mk in monCurveQualityMarks(ch)" :key="'qm'+ch.key+mk.sampleId">
                    <circle :cx="mk.x" :cy="mk.y" r="5.5" fill="#DC3545" stroke="#fff" stroke-width="1.5" style="cursor:pointer" @click.stop="dtOpenJudgement(mk.judgeId)">
                      <title>{{ mk.code }} {{ mk.marks.join('、') }} · {{ mk.judgeId }}</title>
                    </circle>
                  </g>
                  <line v-if="monHoverT != null" :x1="ch.svg.padL + monHoverT * (ch.svg.w - ch.svg.padL - ch.svg.padR)" :x2="ch.svg.padL + monHoverT * (ch.svg.w - ch.svg.padL - ch.svg.padR)" :y1="ch.svg.padT" :y2="ch.svg.h - ch.svg.padB" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3" />
                  <text :x="(ch.svg.padL + ch.svg.w - ch.svg.padR)/2" :y="ch.svg.h - 10" text-anchor="middle" font-size="11" fill="#8c8c8c">sampleTime →（{{ monCurveRange }} 天 · PG 时序示意）</text>
                </svg>
                <div class="chart-meta" v-if="ch.point">
                  <span>测点：<b>{{ ch.point.name }}</b>（{{ ch.point.code }}）</span>
                  <span>最新值：<b>{{ ch.point.value == null ? '—' : ch.point.value }}</b> {{ ch.point.unit }}</span>
                  <span>量程：{{ ch.point.ymin }} ~ {{ ch.point.ymax }}</span>
                </div>
                <div class="chart-meta" v-else>
                  <span>合并模式 · 各序列按自身 ymin/ymax 归一化到同一画布</span>
                  <span>可画指标 {{ monChartablePoints.length }} 个</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-hint">{{ monCurveEmptyHint }}</div>

        </div>

        <!-- ===== 在线监控：设备对比 ===== -->
        <div v-else-if="module==='monitor' && screen==='monitorCompare'" class="page-card cmp-page" data-screen="monitor-compare">
          <div class="page-header">
            <div>
              <h1 class="page-title">设备对比</h1>
              <p class="page-desc">同品类多设备测点叠加对比（最多 {{ CMP_MAX }} 台）。数据来自 MONITOR_POINTS / latest_json 与品类 PROPERTIES，无后端接口。</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="goMonitorList">返回设备数据</button>
              <button class="btn" @click="refreshCmp">刷新</button>
            </div>
          </div>

          <div class="toolbar cmp-toolbar">
            <label class="cmp-field">
              <span class="cmp-label">品类</span>
              <select class="select" v-model="cmpCategoryId" @change="onCmpCategoryChange" data-testid="cmp-category">
                <option value="">请选择品类</option>
                <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <div class="cmp-tags">
              <span class="cmp-label">已选设备</span>
              <template v-if="cmpSelectedDevices.length">
                <span v-for="(d, idx) in cmpSelectedDevices" :key="d.id" class="cmp-device-tag">
                  <i class="cmp-tag-dot" :class="'cmp-c'+ (idx % 7)"></i>
                  {{ d.name }}
                  <button type="button" class="cmp-tag-x" @click="removeCmpDevice(d.id)" title="移除">×</button>
                </span>
              </template>
              <span v-else class="cmp-tags-empty">未选择设备</span>
              <button class="btn" :disabled="!cmpCategoryId" @click="openCmpDrawer">添加设备</button>
            </div>
            <label class="cmp-field">
              <span class="cmp-label">时间范围</span>
              <select class="select select-sm" v-model.number="cmpRange">
                <option :value="1">近 24 小时</option>
                <option :value="7">近 7 天</option>
                <option :value="30">近 30 天</option>
              </select>
            </label>
          </div>

          <div class="toolbar cmp-prop-row" v-if="cmpCategoryId">
            <span class="cmp-label">对比属性</span>
            <div class="cmp-prop-chips" v-if="cmpCategoryProps.length">
              <label v-for="p in cmpCategoryProps" :key="p.identifier" class="cmp-prop-chip" :class="{active: cmpPropIds.includes(p.identifier)}">
                <input type="checkbox" :checked="cmpPropIds.includes(p.identifier)" @change="toggleCmpProp(p.identifier)" />
                {{ p.name }}<span class="th-sub" v-if="p.unit">{{ p.unit }}</span>
              </label>
            </div>
            <span v-else class="cmp-tags-empty">该品类暂无上报属性（PROPERTIES）</span>
          </div>
          <div class="banner-muted mon-hint" v-else>请选择品类以锁定同品类对比，并展开属性多选。</div>

          <!-- KPI -->
          <div class="cmp-kpi-row" v-if="cmpKpiCards.length">
            <div v-for="(card, idx) in cmpKpiCards" :key="card.id" class="cmp-kpi-card">
              <div class="cmp-kpi-top">
                <span class="cmp-kpi-name"><i class="cmp-tag-dot" :class="'cmp-c'+(idx%7)"></i>{{ card.name }}</span>
                <span class="mon-status-chip" :class="'mon-st-' + (card.online==='在线'?'online':(card.online==='离线'?'offline':'unknown'))">
                  <i class="mon-st-dot"></i>{{ card.online }}
                </span>
              </div>
              <div class="cmp-kpi-val">
                <b>{{ card.value == null || card.value === '' ? '—' : card.value }}</b>
                <span class="metric-unit" v-if="card.propUnit && card.value != null && card.value !== ''">{{ card.propUnit }}</span>
              </div>
              <div class="cmp-kpi-sub">{{ card.propName }} · {{ card.lastReportAt }}</div>
            </div>
          </div>
          <div class="empty-hint cmp-empty" v-else-if="cmpCategoryId">暂无对比设备，请点击「添加设备」从本品类选取（最多 {{ CMP_MAX }} 台）。</div>
          <div class="empty-hint cmp-empty" v-else>请先选择品类。</div>

          <!-- Overlay chart -->
          <div class="chart-card cmp-chart-card" v-if="cmpSelectedDevices.length && cmpPrimaryProp">
            <div class="chart-legend">
              <strong>叠加曲线 · {{ cmpPrimaryProp.name }}</strong>
              <span class="sub-nav-hint">多设备同图（按设备名图例）· mock 时序 · 首个勾选属性</span>
              <span v-for="leg in cmpOverlayChart.legend" :key="leg.id" class="leg">
                <i class="lg-line" :style="{background: leg.color}"></i>{{ leg.name }}<span v-if="leg.missing" class="th-sub">（无有效值）</span>
              </span>
            </div>
            <div v-if="!cmpOverlayChart.empty" class="cmp-chart-wrap">
              <svg class="curve-svg cmp-curve-svg" :viewBox="'0 0 ' + cmpOverlayChart.svg.w + ' ' + cmpOverlayChart.svg.h" preserveAspectRatio="none">
                <rect :x="cmpOverlayChart.svg.padL" :y="cmpOverlayChart.svg.padT" :width="cmpOverlayChart.svg.w - cmpOverlayChart.svg.padL - cmpOverlayChart.svg.padR" :height="cmpOverlayChart.svg.h - cmpOverlayChart.svg.padT - cmpOverlayChart.svg.padB" fill="#fafcff" stroke="#eef2f8" />
                <g v-for="(tk, i) in cmpOverlayChart.svg.yTicks" :key="'cyt'+i">
                  <line :x1="cmpOverlayChart.svg.padL" :x2="cmpOverlayChart.svg.w - cmpOverlayChart.svg.padR" :y1="tk.y" :y2="tk.y" stroke="#edf0f5" />
                  <text :x="cmpOverlayChart.svg.padL - 8" :y="tk.y + 4" text-anchor="end" font-size="11" fill="#8c8c8c">{{ tk.v }}</text>
                </g>
                <path v-for="(pp, pi) in cmpOverlayChart.svg.paths" :key="'cp'+pi"
                  :d="pp.path" fill="none" :stroke="pp.color" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
                <text :x="(cmpOverlayChart.svg.padL + cmpOverlayChart.svg.w - cmpOverlayChart.svg.padR)/2" :y="cmpOverlayChart.svg.h - 10" text-anchor="middle" font-size="11" fill="#8c8c8c">
                  sampleTime →（{{ cmpRange === 1 ? '近24小时' : ('近' + cmpRange + '天') }} · 叠加示意）
                </text>
              </svg>
            </div>
            <div v-else class="empty-hint">所选设备在该属性上暂无有效数值，无法绘制叠加曲线。</div>
          </div>

          <!-- Value table -->
          <div class="cmp-table-block" v-if="cmpSelectedDevices.length">
            <button class="btn-link btn cmp-table-toggle" @click="cmpTableOpen = !cmpTableOpen">{{ cmpTableOpen ? '收起' : '展开' }}数值表</button>
            <div class="table-wrap" v-show="cmpTableOpen">
              <table class="data-table mon-table" data-testid="cmp-value-table">
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>在线态</th>
                    <th>最近上报</th>
                    <th v-for="p in cmpTableProps" :key="p.identifier">{{ p.name }} <span class="th-sub" v-if="p.unit">{{ p.unit }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in cmpTableRows" :key="row.id">
                    <td><div class="cell-title">{{ row.name }}</div><div class="cell-sub"><code>{{ row.id }}</code></div></td>
                    <td>
                      <span class="mon-status-chip" :class="'mon-st-' + (row.online==='在线'?'online':(row.online==='离线'?'offline':'unknown'))">
                        <i class="mon-st-dot"></i>{{ row.online }}
                      </span>
                    </td>
                    <td class="mon-time-cell">{{ row.lastReportAt }}</td>
                    <td v-for="cell in row.cells" :key="cell.identifier" class="metric-cell">
                      <b class="metric-val">{{ cell.value == null || cell.value === '' ? '—' : cell.value }}</b>
                      <span class="metric-unit" v-if="cell.unit && cell.value != null && cell.value !== ''">{{ cell.unit }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="table-note">对比限制：同品类 · 最多 {{ CMP_MAX }} 台 · 属性来自品类 kind=property。深链示例 <code>#deviceCompare?ids=D001,D002</code>。</div>

          <!-- Drawer: pick devices -->
          <div class="overlay drawer-mode" v-if="cmpDrawerOpen" @click.self="closeCmpDrawer">
            <div class="drawer drawer-lg" data-testid="cmp-device-drawer">
              <div class="drawer-header">
                <span>添加对比设备 · {{ (CATEGORIES.find(c=>c.id===cmpCategoryId) || {}).name || cmpCategoryId }}</span>
                <button class="btn" @click="closeCmpDrawer">关闭</button>
              </div>
              <div class="drawer-body">
                <div class="toolbar" style="margin-bottom:12px">
                  <input class="input input-md" v-model="cmpDrawerSearch" placeholder="搜索设备名 / IMEI" />
                  <span class="cmp-tags-empty">已勾 {{ cmpDrawerPick.length }} / {{ CMP_MAX }}</span>
                </div>
                <div v-if="!cmpCandidateDevices.length" class="empty-hint">本品类暂无监控设备</div>
                <table class="data-table mon-table" v-else>
                  <thead>
                    <tr><th style="width:40px"></th><th>设备</th><th>在线态</th><th>最近上报</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in cmpCandidateDevices" :key="d.id">
                      <td>
                        <input type="checkbox" :checked="cmpDrawerPick.includes(d.id)" @change="toggleCmpDrawerPick(d.id)" />
                      </td>
                      <td>
                        <div class="cell-title">{{ d.name }}</div>
                        <div class="cell-sub"><code>{{ d.imei }}</code></div>
                      </td>
                      <td>
                        <span class="mon-status-chip" :class="'mon-st-' + (d.online==='在线'?'online':(d.online==='离线'?'offline':'unknown'))">
                          <i class="mon-st-dot"></i>{{ d.online }}
                        </span>
                      </td>
                      <td class="mon-time-cell">{{ d.lastReportAt }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="drawer-footer">
                <button class="btn" @click="closeCmpDrawer">取消</button>
                <button class="btn btn-primary" @click="confirmCmpDrawer">确定（{{ cmpDrawerPick.length }}）</button>
              </div>
            </div>
          </div>
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
                    <div class="cell-sub"><code>{{ d.imei }}</code></div>
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
          <div class="table-note">应报 = 24h ÷ 采集周期；漏报 = 该报没报。一期为示意统计。完整率/有效率在「数据可信」，不在本页做门槛。</div>
        </div>

        <!-- ===== 数据可信：品类标准 ===== -->
        <div v-else-if="module==='dataTrust' && screen==='categoryStandard'" class="page-card" data-screen="data-trust-standard">
          <div class="page-header">
            <div>
              <h1 class="page-title">品类标准</h1>
              <p class="page-desc">组件 <code>iot/iot-data-trust/IotDataTrustStandard</code> · 路由 <code>/iot/iot-data-trust-standard</code> · 本页 <code>#categoryStandard</code>。目录占位 <code>/iot/data-trust</code> 没有业务页。与品类详情入口打开的是同一份标准，不进上报属性 / 测点字典 / 安装参数模板。</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" @click="dtCreateDraft">新建版本</button>
              <button class="btn btn-primary" @click="dtPublish" :disabled="dtViewReadonly">发布</button>
              <button class="btn" @click="dtShowHistory=!dtShowHistory">查看历史版本</button>
            </div>
          </div>
          <div class="tabs" style="margin-bottom:12px">
            <div class="tab" :class="{active: dtStdTab==='standard'}" @click="dtStdTab='standard'">标准</div>
            <div class="tab" :class="{active: dtStdTab==='tip'}" @click="dtStdTab='tip'">口径说明</div>
          </div>

          <template v-if="dtStdTab==='tip'">
            <div class="info-section">
              <div class="info-section-title">口径</div>
              <ul class="dt-tip-list">
                <li>数据可信是独立模块。品类标准单独维护，不混进物模型三个页签。</li>
                <li>两个入口进同一份标准：品类详情「品类标准」、侧栏「数据可信 / 品类标准」。</li>
                <li>字段标识符和名称复用上报属性 / 测点字典（yewei、wendu、yaqiang 等），不另起一套字段名。</li>
              </ul>
            </div>
            <div class="info-section">
              <div class="info-section-title">数据三层（互不覆盖）</div>
              <ul class="dt-tip-list">
                <li>原始报文：本机数据 <code>iot_protocol_data</code>。入包后的 parsedJson 不因判断或 sample 覆盖而改写。</li>
                <li>拍平 sample：一条报文可对多条 sample。例：<code>PK015</code> → <code>S101</code>（全正常）与 <code>S102</code>（有异常）。</li>
                <li>判断记录：以 sample 为准、逐条判，都引用同一报文 id。无平台 id 时记 <code>externalId</code>（<code>S105</code> / <code>EXT-LEVEL-20260930-01</code>），流程相同。本期不做接入页。</li>
              </ul>
            </div>
            <div class="info-section">
              <div class="info-section-title">判断时机与链式规则</div>
              <ul class="dt-tip-list">
                <li>sample 入库（含同窗口覆盖更新）之后才判断。入库不被判断拦住。</li>
                <li>生效标准：设备覆盖 &gt; 项目覆盖 &gt; 品类当时已发布且在生效范围内的版本。例：D001 用设备间隔 120s；D002 无设备覆盖，用项目 PJ01 的 90s；D009 无项目无设备覆盖，用品类 60s。</li>
                <li>先跑完全部单条断言。三个指标都有问题就三个都打标记，不因第一个失败整单返回。<code>J102</code>：yewei 超上限、wendu 空值、yaqiang 通过。</li>
                <li>再跑关联。某指标单条已失败，则依赖它的关联记「未执行」；不依赖的继续。<code>J102</code> 跨字段 / 趋势 / 相邻依赖 yewei，未执行；同项目同品类只看 yaqiang，继续并通过。</li>
                <li>写判断记录，再回写 sample。总结果按各指标「且」汇总。</li>
              </ul>
            </div>
            <div class="info-section">
              <div class="info-section-title">qualityJson / judgeId</div>
              <ul class="dt-tip-list">
                <li><code>sample.judgeId</code>：一条 sample 只挂一个最新判断 id。多个指标共用这一个 id。</li>
                <li><code>sample.qualityJson</code> 与测值 JSON 同形。k = 指标标识，v = 标记码列表（可多项）。无异常的指标不出现；全部正常为 <code>{}</code>。测值 JSON 不改。</li>
                <li>覆盖重判：新建判断，更新 judgeId 与 qualityJson，旧判断留在判断表。<code>S103</code> 先有 <code>J103a</code>（yewei=3.38 通过），同窗口覆盖成 11.5 后写 <code>J103b</code>，<code>J103a</code> 仍可点开。报文 <code>PK016</code> 仍是入包时的 3.38。</li>
              </ul>
            </div>
            <div class="info-section">
              <div class="info-section-title">缺报、离线、相邻对照</div>
              <ul class="dt-tip-list">
                <li>缺报不算在当前这条合格 sample 上，也不创造测值。<code>G1</code> / <code>G5</code> 只有应报时点。</li>
                <li>补报落入窗口后改为已补回，并挂 <code>filledSampleId</code>。<code>G2</code> → <code>S106</code>（报文 <code>PK018</code>）。</li>
                <li>连续缺报达到阈值记离线时段（<code>G3</code> 离线中）；恢复上报后 <code>recovered</code>（<code>G4</code>）。</li>
                <li>相邻设备这一期手工指定设备对（D001–D002）。邻居缺数只记「对照对象缺失」，不把当前数据打成不合格，不写入 qualityJson。<code>J104</code> 总结果仍通过。</li>
              </ul>
            </div>
            <div class="info-section">
              <div class="info-section-title">版本与不做项</div>
              <ul class="dt-tip-list">
                <li>草稿 → 已发布（只读）→ 被新版本替代（历史只读）。改规则只能从当前版复制出新草稿再发布。积水仪地埋当前生效 v2，另有草稿 v3、历史 v1。</li>
                <li>不做：校准改测值；重复与冲突（维持同窗口覆盖写入，覆盖后按上面重判）；变频率 / 按需上报（只做固定频率）；通用规则引擎；用判断拦截入库；手工改标记。重判只随 sample 覆盖或后台重跑。</li>
                <li>完整率 = 应报次数 / 实收次数。有效率按有异常标记的指标统计。本期只做汇总，不做门槛拦截。</li>
                <li>字段与接口见 <code>docs/api/iot-data-trust.md</code>。</li>
              </ul>
            </div>
          </template>

          <template v-else>
            <div class="toolbar">
              <select class="select" :value="dtCategoryId" @change="jump('categoryStandard?categoryId=' + $event.target.value)">
                <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }} · {{ c.id }}</option>
              </select>
              <span v-if="dtDraftStandard" class="tag tag-orange">有未发布草稿 v{{ dtDraftStandard.version }}</span>
              <button v-if="dtViewStandard && dtViewStandard.status!=='published'" class="btn btn-sm" @click="dtBackToEffective">回到当前生效版</button>
              <div class="spacer"></div>
              <button v-if="dtDraftStandard && dtViewStandard && dtViewStandard.id!==dtDraftStandard.id" class="btn btn-sm" @click="dtViewVersion(dtDraftStandard)">打开草稿</button>
            </div>
            <div v-if="!dtViewStandard" class="empty-hint">本品类还没有品类标准。点「新建版本」会按上报属性生成草稿，量程能对上测点字典的会引用 min/max 与采集周期。</div>
            <template v-else>
              <div class="detail-meta" style="margin-bottom:10px">
                <span>品类：<b>{{ dtCategoryName(dtViewStandard.categoryId) }}</b>（{{ dtViewStandard.categoryId }}）</span>
                <span>版本：<b>v{{ dtViewStandard.version }}</b></span>
                <span>状态：<span class="tag" :class="dtStatusTag(dtViewStandard.status)">{{ dtStatusLabel(dtViewStandard.status) }}</span></span>
                <span>生效时间：<b>{{ dtViewStandard.effectiveAt || '—' }}</b></span>
                <span v-if="dtViewStandard.copiedFrom">复制自 v{{ dtViewStandard.copiedFrom }}</span>
                <span v-if="dtViewStandard.supersededAt">被替代于 {{ dtViewStandard.supersededAt }}</span>
              </div>
              <div v-if="dtViewReadonly" class="banner-tip">当前为{{ dtStatusLabel(dtViewStandard.status) }}，只读。改规则请「新建版本」，从当前版复制出草稿后再发布。判断只用当时已发布且在生效范围内的版本。</div>
              <div v-else class="banner-muted">草稿可改开关和参数。发布后本版只读，上一份已发布版本变为历史。</div>

              <div v-if="dtShowHistory" class="info-section">
                <div class="info-section-title">历史版本</div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>版本</th><th>状态</th><th>生效时间</th><th>创建时间</th><th>操作</th></tr></thead>
                    <tbody>
                      <tr v-for="s in dtStandardsOfCategory" :key="s.id">
                        <td>v{{ s.version }}</td>
                        <td><span class="tag" :class="dtStatusTag(s.status)">{{ dtStatusLabel(s.status) }}</span></td>
                        <td>{{ s.effectiveAt || '—' }}</td>
                        <td>{{ s.createdAt }}</td>
                        <td><button class="btn-link btn" @click="dtViewVersion(s)">查看</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="info-section">
                <div class="info-section-title">对照表 <span class="sub-nav-hint">标识符 / 名称只读引用物模型 · 是否参与判断</span></div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>标识符</th><th>名称</th><th>类型 / 单位</th><th>解析字段 / JSON 键</th><th>参与判断</th></tr></thead>
                    <tbody>
                      <tr v-for="m in dtViewMappings" :key="m.id">
                        <td><code>{{ m.identifier }}</code></td>
                        <td>{{ m.name }}</td>
                        <td>{{ m.dataType }} <span v-if="m.unit && m.unit!=='—'">{{ m.unit }}</span></td>
                        <td><code>{{ m.sourceKey }}</code></td>
                        <td>
                          <button class="btn-link btn" @click="dtToggleMapping(m)">
                            <span class="tag" :class="m.enabled ? 'tag-green' : 'tag-gray'">{{ m.enabled ? '参与' : '不参与' }}</span>
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!dtViewMappings.length"><td colspan="5"><div class="empty-hint">无对照</div></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="info-section">
                <div class="info-section-title">单条断言 <span class="sub-nav-hint">按指标 · 开关 + 参数 · 量程 / 周期优先引用测点字典</span></div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>标识符</th><th>名称</th><th>必报</th><th>类型与单位</th><th>量程</th><th>枚举</th><th>空值</th></tr></thead>
                    <tbody>
                      <tr v-for="g in dtViewAssertionGroups" :key="g.identifier">
                        <td><code>{{ g.identifier }}</code></td>
                        <td>{{ g.name }}</td>
                        <td>
                          <button v-if="g.byType.required" class="btn-link btn" @click="dtToggleAssertion(g.byType.required)"><span class="tag" :class="g.byType.required.enabled?'tag-green':'tag-gray'">{{ g.byType.required.enabled?'开':'关' }}</span></button>
                        </td>
                        <td>
                          <template v-if="g.byType.type">
                            <button class="btn-link btn" @click="dtToggleAssertion(g.byType.type)"><span class="tag" :class="g.byType.type.enabled?'tag-green':'tag-gray'">{{ g.byType.type.enabled?'开':'关' }}</span></button>
                            <div class="cell-sub">{{ g.byType.type.params.dataType || '—' }} {{ g.byType.type.params.unit || '' }} · 引用上报属性</div>
                          </template>
                        </td>
                        <td>
                          <template v-if="g.byType.range">
                            <button class="btn-link btn" @click="dtToggleAssertion(g.byType.range)"><span class="tag" :class="g.byType.range.enabled?'tag-green':'tag-gray'">{{ g.byType.range.enabled?'开':'关' }}</span></button>
                            <div class="dt-inline">
                              <input class="input" style="width:72px" type="number" v-model.number="g.byType.range.params.min" :disabled="dtViewReadonly || g.byType.range.params.cite==='point'" />
                              <span>~</span>
                              <input class="input" style="width:72px" type="number" v-model.number="g.byType.range.params.max" :disabled="dtViewReadonly || g.byType.range.params.cite==='point'" />
                              <span class="tag tag-gray" v-if="g.byType.range.params.cite==='point'">引用测点字典</span>
                              <span class="tag tag-blue" v-else>标准补</span>
                              <button v-if="!dtViewReadonly && g.byType.range.params.cite==='point'" class="btn-link btn" @click="dtSetRangeCite(g.byType.range,'standard')">改为标准补</button>
                            </div>
                          </template>
                        </td>
                        <td>
                          <template v-if="g.byType.enum">
                            <button class="btn-link btn" @click="dtToggleAssertion(g.byType.enum)"><span class="tag" :class="g.byType.enum.enabled?'tag-green':'tag-gray'">{{ g.byType.enum.enabled?'开':'关' }}</span></button>
                            <input class="input" style="width:120px" v-model="g.byType.enum.params.values" :disabled="dtViewReadonly || !g.byType.enum.enabled" placeholder="逗号分隔" />
                          </template>
                        </td>
                        <td>
                          <button v-if="g.byType.null" class="btn-link btn" @click="dtToggleAssertion(g.byType.null)"><span class="tag" :class="g.byType.null.enabled?'tag-green':'tag-gray'">{{ g.byType.null.enabled?'开':'关' }}</span></button>
                          <div class="cell-sub" v-if="g.byType.null">{{ g.byType.null.params.allowNull ? '允许空' : '不允许空' }}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="info-section">
                <div class="info-section-title">关联规则 <span class="sub-nav-hint">相邻设备这一期手工指定设备对</span></div>
                <div class="table-wrap" v-if="dtViewRelations.length">
                  <table class="data-table">
                    <thead><tr><th>类型</th><th>对象</th><th>字段</th><th>阈值</th><th>窗口(s)</th><th>启用</th></tr></thead>
                    <tbody>
                      <tr v-for="r in dtViewRelations" :key="r.id">
                        <td>{{ dtRelLabel(r.type) }}</td>
                        <td>{{ (r.targets && r.targets.length) ? r.targets.join('、') : '—' }}</td>
                        <td><code>{{ (r.fields || []).join('、') }}</code></td>
                        <td><input class="input" style="width:180px" v-model="r.threshold" :disabled="dtViewReadonly" /></td>
                        <td><input class="input" style="width:80px" type="number" v-model.number="r.windowSec" :disabled="dtViewReadonly" /></td>
                        <td><button class="btn-link btn" @click="dtToggleRelation(r)"><span class="tag" :class="r.enabled?'tag-green':'tag-gray'">{{ r.enabled?'开':'关' }}</span></button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-hint">本版没有关联规则</div>
              </div>

              <div class="info-section" v-if="dtViewTimeliness">
                <div class="info-section-title">时效与完整 <span class="sub-nav-hint">仅固定频率 · 补报窗口默认间隔的一半，左右对称</span></div>
                <div class="toolbar">
                  <span class="tag tag-blue">固定频率</span>
                  <label>间隔(s)</label>
                  <input class="input" style="width:100px" type="number" min="1" v-model.number="dtViewTimeliness.intervalSec" :disabled="dtViewReadonly" @input="dtOnIntervalInput(dtViewTimeliness)" />
                  <label>补报窗口(s)</label>
                  <input class="input" style="width:100px" type="number" min="0" v-model.number="dtViewTimeliness.windowSec" :disabled="dtViewReadonly" @input="dtMarkWindowManual(dtViewTimeliness)" />
                  <label>完整率</label>
                  <button class="btn-link btn" @click="dtViewReadonly ? dtGuardDraft() : (dtViewTimeliness.completenessEnabled = !dtViewTimeliness.completenessEnabled)">
                    <span class="tag" :class="dtViewTimeliness.completenessEnabled?'tag-green':'tag-gray'">{{ dtViewTimeliness.completenessEnabled?'启用':'关闭' }}</span>
                  </button>
                  <span class="cell-sub">{{ dtViewTimeliness.intervalCite }}{{ dtViewTimeliness.windowManual ? ' · 窗口已手改' : ' · 窗口随间隔' }}</span>
                </div>
              </div>

              <div class="info-section" v-if="dtViewOffline">
                <div class="info-section-title">离线</div>
                <div class="toolbar">
                  <label><input type="radio" :disabled="dtViewReadonly" :checked="dtViewOffline.thresholdCount != null" @change="dtSetOfflineMode(dtViewOffline,'count')" /> 连续缺报周期数</label>
                  <input class="input" style="width:80px" type="number" min="1" v-model.number="dtViewOffline.thresholdCount" :disabled="dtViewReadonly || dtViewOffline.thresholdCount==null" />
                  <label><input type="radio" :disabled="dtViewReadonly" :checked="dtViewOffline.thresholdCount == null" @change="dtSetOfflineMode(dtViewOffline,'duration')" /> 时长阈值(s)</label>
                  <input class="input" style="width:100px" type="number" min="1" v-model.number="dtViewOffline.thresholdDurationSec" :disabled="dtViewReadonly || dtViewOffline.thresholdCount!=null" />
                </div>
                <div class="table-note">二选一。达到阈值后记离线时段，不在缺报行上伪造测值。</div>
              </div>

              <div class="info-section">
                <div class="info-section-title">标记字典 <span class="sub-nav-hint">标记码与断言类型分开 · qualityJson 只写标记码</span></div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>标记码</th><th>名称</th><th>对应断言类型</th><th>本版引用</th></tr></thead>
                    <tbody>
                      <tr v-for="m in dtViewMarkRefs" :key="m.code">
                        <td><code>{{ m.code }}</code></td>
                        <td>{{ m.name }}</td>
                        <td>{{ dtAssertLabel(m.assertionType) || dtRelLabel(m.assertionType) }}</td>
                        <td>
                          <button v-if="m.row" class="btn-link btn" @click="dtToggleMark(m.row)"><span class="tag" :class="m.enabled?'tag-green':'tag-gray'">{{ m.enabled?'引用':'不引用' }}</span></button>
                          <span v-else>—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="info-section">
                <div class="info-section-title">生效覆盖 <span class="sub-nav-hint">项目 / 设备可覆盖间隔 · 窗口默认为一半 · 可恢复继承</span></div>
                <div class="banner-muted">没有单独的项目详情页，项目覆盖写在这里。设备档案「上报间隔」改的是同一张覆盖表。</div>
                <div class="toolbar">
                  <select class="select" v-model="dtOverrideScopeType" @change="dtOverrideScopeId = dtScopeOptions[0] ? dtScopeOptions[0].id : ''">
                    <option value="project">项目</option>
                    <option value="device">设备</option>
                  </select>
                  <select class="select" v-model="dtOverrideScopeId">
                    <option v-for="o in dtScopeOptions" :key="o.id" :value="o.id">{{ o.label }}</option>
                  </select>
                  <input class="input" style="width:100px" type="number" min="1" v-model.number="dtOverrideInterval" placeholder="间隔 s" />
                  <input class="input" style="width:100px" type="number" min="0" v-model.number="dtOverrideWindow" placeholder="窗口 s" />
                  <button class="btn btn-primary btn-sm" @click="dtSaveOverrideForm">保存覆盖</button>
                </div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>范围</th><th>对象</th><th>间隔(s)</th><th>窗口(s)</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                      <tr v-if="dtViewTimeliness && dtEffectiveStandard && dtViewStandard && dtViewStandard.id===dtEffectiveStandard.id">
                        <td>品类</td><td>{{ dtCategoryName(dtCategoryId) }}</td>
                        <td>{{ dtViewTimeliness.intervalSec }}</td><td>{{ dtViewTimeliness.windowSec }}</td>
                        <td><span class="tag tag-blue">继承自品类</span></td><td>—</td>
                      </tr>
                      <tr v-for="o in dtOverridesOfCategory" :key="o.id">
                        <td>{{ o.scopeType==='project' ? '项目' : '设备' }}</td>
                        <td>{{ o.scopeType==='project' ? dtProjectName(o.scopeId) : dtDeviceName(o.scopeId) }}</td>
                        <td>{{ o.intervalSec }}</td>
                        <td>{{ o.windowSec }}</td>
                        <td><span class="tag tag-orange">已覆盖</span></td>
                        <td><button class="btn-link btn" @click="dtRestoreOverride(o)">恢复默认</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="table-note">下面是本品类设备的生效结果（设备 &gt; 项目 &gt; 已发布品类）。</div>
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>设备</th><th>项目</th><th>生效间隔</th><th>窗口</th><th>来源</th></tr></thead>
                    <tbody>
                      <tr v-for="row in dtEffectivePreview" :key="row.device.id">
                        <td>{{ row.device.name }} <code>{{ row.device.id }}</code></td>
                        <td>{{ row.device.projectName || '未定义项目' }}</td>
                        <td>{{ row.eff.intervalSec == null ? '—' : row.eff.intervalSec + 's' }}</td>
                        <td>{{ row.eff.windowSec == null ? '—' : row.eff.windowSec + 's' }}</td>
                        <td><span class="tag" :class="row.eff.source==='device'?'tag-orange':'tag-blue'">{{ row.eff.label }}</span></td>
                      </tr>
                      <tr v-if="!dtEffectivePreview.length"><td colspan="5"><div class="empty-hint">本品类暂无设备</div></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- ===== 数据可信：判断查询 ===== -->
        <div v-else-if="module==='dataTrust' && screen==='dataTrustJudgement'" class="page-card" data-screen="data-trust-judgement">
          <div class="page-header">
            <div>
              <h1 class="page-title">判断查询</h1>
              <p class="page-desc">组件 <code>iot/iot-data-trust/IotDataTrustJudgement</code> · 路由 <code>/iot/iot-data-trust-judgement</code> · 本页 <code>#dataTrustJudgement</code>。不提供手工改标记。口径见品类标准「口径说明」。</p>
            </div>
          </div>
          <div class="banner-muted">列表测值是该次判断当时的 JSON。异常原因来自判断明细上的标记，没有则不展示。外部数据无报文 id 时看 externalId（<code>J105</code>）。</div>
          <div class="toolbar">
            <select class="select" v-model="dtJCategory"><option value="">全部品类</option><option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option></select>
            <select class="select" v-model="dtJProject"><option value="">全部项目</option><option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option></select>
            <select class="select" v-model="dtJDevice"><option value="">全部设备</option><option v-for="d in deviceList" :key="d.id" :value="d.id">{{ d.name }}</option></select>
            <input class="input" type="date" v-model="dtJBegin" />
            <input class="input" type="date" v-model="dtJEnd" />
            <select class="select" v-model="dtJMetric"><option value="">全部指标</option><option v-for="m in dtMetricOptions" :key="m.identifier" :value="m.identifier">{{ m.name }} · {{ m.identifier }}</option></select>
            <label class="dt-check"><input type="checkbox" v-model="dtJOnlyAbnormal" /> 仅看异常</label>
            <button class="btn" @click="dtJCategory=''; dtJProject=''; dtJDevice=''; dtJBegin=''; dtJEnd=''; dtJMetric=''; dtJOnlyAbnormal=false">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>时间</th><th>设备</th><th>各指标测值</th><th>异常原因</th><th>结果</th></tr></thead>
              <tbody>
                <tr v-for="j in dtFilteredJudgements" :key="j.id" class="row-clickable" :class="{'row-selected': dtJCurrentId===j.id}" @click="dtOpenJudgement(j.id)">
                  <td>{{ j.judgedAt }}<div class="cell-sub"><code>{{ j.id }}</code></div></td>
                  <td>{{ dtDeviceName(j.deviceId) }}<div class="cell-sub">{{ dtCategoryName(j.categoryId) }}</div></td>
                  <td><code>{{ dtFormatValues(j.values) }}</code></td>
                  <td>{{ dtJudgementReasonText(j) }}</td>
                  <td><span class="tag" :class="j.overallPass?'tag-green':'tag-red'">{{ j.overallPass ? '通过' : '不通过' }}</span></td>
                </tr>
                <tr v-if="!dtFilteredJudgements.length"><td colspan="5"><div class="empty-hint">无匹配判断</div></td></tr>
              </tbody>
            </table>
          </div>
          <div v-if="dtCurrentJudgement" class="info-section" data-block="judgement-detail">
            <div class="info-section-title">判断详情 · {{ dtCurrentJudgement.id }}</div>
            <div class="kv-grid">
              <div class="k">版本与范围</div>
              <div class="v">品类标准 v{{ dtCurrentJudgement.standardVersion }} · {{ dtScopeText(dtCurrentJudgement) }}</div>
              <div class="k">总结果</div>
              <div class="v"><span class="tag" :class="dtCurrentJudgement.overallPass?'tag-green':'tag-red'">{{ dtCurrentJudgement.overallPass ? '通过（各指标且）' : '不通过（各指标且）' }}</span></div>
              <div class="k">报文</div>
              <div class="v">
                <button v-if="dtCurrentJudgement.messageId" class="btn-link btn" @click="dtOpenMessage(dtCurrentJudgement)">{{ dtCurrentJudgement.messageId }}</button>
                <span v-else>externalId <code>{{ dtCurrentJudgement.externalId || '—' }}</code></span>
              </div>
              <div class="k">sample</div>
              <div class="v">
                <button class="btn-link btn" @click="dtOpenSample(dtCurrentJudgement)">{{ dtCurrentJudgement.sampleId }}</button>
                <span class="cell-sub" v-if="dtCurrentSample">当前测值 {{ dtFormatValues(dtCurrentSample.values) }} · judgeId {{ dtCurrentSample.judgeId }} · qualityJson {{ dtQualitySummary(dtCurrentSample) }}</span>
              </div>
            </div>
            <div v-if="dtPriorJudgement" class="banner-tip">覆盖重判：本 sample 另有判断 <button class="btn-link btn" @click="dtOpenJudgement(dtPriorJudgement.id)">{{ dtPriorJudgement.id }}</button>（{{ dtPriorJudgement.judgedAt }}，测值 {{ dtFormatValues(dtPriorJudgement.values) }}），仍留在判断表。当前 sample.judgeId 指向最新一条。</div>
            <div v-if="dtCurrentJudgement.id==='J104'" class="banner-muted">相邻对照缺对象只记「对照对象缺失」。本条 qualityJson 为空，总结果仍通过。</div>
            <div v-if="dtCurrentJudgement.id==='J102'" class="banner-muted">先跑完 yewei / wendu / yaqiang 全部单条断言，再跑关联。依赖 yewei 的关联为未执行；只依赖 yaqiang 的同项目同品类继续执行。</div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>指标</th><th>种类</th><th>结论</th><th>标记</th><th>原因</th><th>status</th><th>关联对象</th></tr></thead>
                <tbody>
                  <tr v-for="it in dtCurrentItems" :key="it.id">
                    <td><code>{{ it.identifier }}</code></td>
                    <td>{{ it.kind==='relation' ? ('关联 · ' + dtRelLabel(it.relationType)) : dtAssertLabel(it.assertType) }}</td>
                    <td>{{ it.pass ? '通过' : '不通过' }}</td>
                    <td>{{ (it.marks && it.marks.length) ? it.marks.map(dtMarkName).join('、') : '—' }}</td>
                    <td>{{ it.reason || '—' }}</td>
                    <td><span class="tag" :class="dtItemStatusTag(it.status)">{{ dtItemStatusLabel(it.status) }}</span></td>
                    <td>{{ (it.relatedRefs && it.relatedRefs.length) ? it.relatedRefs.join('、') : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ===== 数据可信：缺报与离线 ===== -->
        <div v-else-if="module==='dataTrust' && screen==='dataTrustGap'" class="page-card" data-screen="data-trust-gap">
          <div class="page-header">
            <div>
              <h1 class="page-title">缺报与离线</h1>
              <p class="page-desc">组件 <code>iot/iot-data-trust/IotDataTrustGap</code> · 路由 <code>/iot/iot-data-trust-gap</code> · 本页 <code>#dataTrustGap</code>。不展示伪造测值。缺报不记在合格 sample 头上。</p>
            </div>
          </div>
          <div class="toolbar">
            <select class="select" v-model="dtGDevice"><option value="">全部设备</option><option v-for="d in deviceList" :key="d.id" :value="d.id">{{ d.name }}</option></select>
            <input class="input" type="date" v-model="dtGBegin" />
            <input class="input" type="date" v-model="dtGEnd" />
            <select class="select" v-model="dtGStatus">
              <option value="">全部状态</option>
              <option value="missing">缺报中</option>
              <option value="filled">已补回</option>
              <option value="offline">离线中</option>
              <option value="recovered">已恢复</option>
            </select>
            <button class="btn" @click="dtGDevice=''; dtGBegin=''; dtGEnd=''; dtGStatus=''">重置</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>设备</th><th>应报时点 / 时段</th><th>类型</th><th>状态</th><th>补回的 sample</th><th>达到离线阈值</th></tr></thead>
              <tbody>
                <tr v-for="g in dtFilteredGaps" :key="g.id">
                  <td>{{ dtDeviceName(g.deviceId) }}</td>
                  <td>{{ dtGapWhen(g) }}</td>
                  <td>{{ g.type==='offline' ? '离线' : '缺报' }}</td>
                  <td><span class="tag" :class="dtGapStatusTag(g)">{{ dtGapStatusLabel(g) }}</span></td>
                  <td>
                    <button v-if="g.filledSampleId" class="btn-link btn" @click="dtOpenSample({ sampleId: g.filledSampleId, deviceId: g.deviceId })">{{ g.filledSampleId }}</button>
                    <span v-else>—</span>
                  </td>
                  <td>{{ g.offlineReached ? '是' : '否' }}</td>
                </tr>
                <tr v-if="!dtFilteredGaps.length"><td colspan="6"><div class="empty-hint">无缺报或离线记录</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-note">补报落入窗口后状态改为已补回，并挂 filledSampleId。连续缺报达到品类标准阈值后另记离线时段，恢复上报后为已恢复。</div>
        </div>

        <!-- ===== 数据可信：完整率/有效率 ===== -->
        <div v-else-if="module==='dataTrust' && screen==='dataTrustStats'" class="page-card" data-screen="data-trust-stats">
          <div class="page-header">
            <div>
              <h1 class="page-title">完整率 / 有效率</h1>
              <p class="page-desc">组件 <code>iot/iot-data-trust/IotDataTrustStats</code> · 路由 <code>/iot/iot-data-trust-stats</code> · 本页 <code>#dataTrustStats</code>。先做按品类 / 项目 / 设备的汇总，不做门槛拦截。</p>
            </div>
          </div>
          <div class="banner-muted">完整率 = 应报次数 / 实收次数。有效率 = 无异常标记的指标次数 / 参与判断的指标次数（异常来自 qualityJson）。本页只展示，不拦截入库，也不设门槛。</div>
          <div class="toolbar">
            <select class="select" v-model="dtSCategory"><option value="">全部品类</option><option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option></select>
            <select class="select" v-model="dtSProject"><option value="">全部项目</option><option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option></select>
            <select class="select" v-model="dtSDevice"><option value="">全部设备</option><option v-for="d in deviceList" :key="d.id" :value="d.id">{{ d.name }}</option></select>
            <button class="btn" @click="dtSCategory=''; dtSProject=''; dtSDevice=''">重置</button>
          </div>
          <div class="stat-row">
            <div class="stat-chip"><div class="sc-label">应报次数</div><div class="sc-value">{{ dtStatSummary.expected }}</div></div>
            <div class="stat-chip"><div class="sc-label">实收次数</div><div class="sc-value">{{ dtStatSummary.received }}</div></div>
            <div class="stat-chip accent"><div class="sc-label">完整率</div><div class="sc-value" style="font-size:22px">{{ dtStatCompleteness(dtStatSummary) }}</div></div>
            <div class="stat-chip"><div class="sc-label">判断指标</div><div class="sc-value">{{ dtStatSummary.judgedMetrics }}</div></div>
            <div class="stat-chip danger"><div class="sc-label">有异常标记</div><div class="sc-value">{{ dtStatSummary.abnormalMetrics }}</div></div>
            <div class="stat-chip ok"><div class="sc-label">有效率</div><div class="sc-value" style="font-size:22px">{{ dtStatValidity(dtStatSummary) }}</div></div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>品类</th><th>项目</th><th>设备</th><th>应报</th><th>实收</th><th>完整率</th><th>判断指标</th><th>异常指标</th><th>有效率</th></tr></thead>
              <tbody>
                <tr v-for="row in dtFilteredStats" :key="row.id">
                  <td>{{ dtCategoryName(row.categoryId) }}</td>
                  <td>{{ row.projectId ? dtProjectName(row.projectId) : '—' }}</td>
                  <td>{{ row.deviceId ? dtDeviceName(row.deviceId) : '汇总' }}</td>
                  <td>{{ row.expected }}</td>
                  <td>{{ row.received }}</td>
                  <td>{{ dtStatCompleteness(row) }}<div class="cell-sub">{{ row.expected }} / {{ row.received }}</div></td>
                  <td>{{ row.judgedMetrics }}</td>
                  <td>{{ row.abnormalMetrics }}</td>
                  <td>{{ dtStatValidity(row) }}</td>
                </tr>
                <tr v-if="!dtFilteredStats.length"><td colspan="9"><div class="empty-hint">无汇总</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-note">汇总为示意计数，公式按锁定口径现算。筛选后的顶部卡片优先加总设备行，没有设备行时加总当前结果。</div>
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
            <div class="form-item"><label>状态</label><select class="select input-full" v-model="categoryForm.status"><option>启用</option><option>草稿</option><option>停用</option></select></div>
          </div>
          <div class="form-item">
            <label>设备类型图标</label>
            <div class="icon-picker-current">
              <iconify-icon class="cat-icon cat-icon-card" :icon="categoryForm.icon || FALLBACK_ICONIFY" width="28" height="28" aria-hidden="true"></iconify-icon>
              <code class="icon-picker-id">{{ categoryForm.icon || '（空 → 按编码兜底）' }}</code>
            </div>
            <div class="icon-picker-grid" role="listbox" aria-label="推荐图标">
              <button
                type="button"
                class="icon-picker-cell"
                v-for="ic in ICON_CATALOG"
                :key="ic.id"
                :class="{ active: categoryForm.icon === ic.id }"
                :title="ic.labelZh + ' · ' + ic.id"
                @click="pickCategoryIcon(ic.id)"
              >
                <iconify-icon :icon="ic.id" width="22" height="22" aria-hidden="true"></iconify-icon>
                <span class="icon-picker-label">{{ ic.labelZh }}</span>
              </button>
            </div>
            <div class="icon-picker-free">
              <label class="icon-picker-free-label">自由填写 Iconify id</label>
              <input
                class="input input-full"
                v-model.trim="categoryForm.icon"
                placeholder="例如 mdi:water / mdi:pump（prefix:name）"
              />
              <div class="hint">存库字段 <code>icon</code> = Iconify id 字符串；留空则按品类编码走 DEFAULT_CODE_TO_ICONIFY。详见 docs/ICON_SPEC.md。</div>
            </div>
          </div>
          <div class="form-item"><label>品类说明</label><textarea class="textarea input-full" v-model="categoryForm.desc" placeholder="产品类型语义说明；测点/事件/阈值/安装模板/固件在详情中配置"></textarea></div>
          <div class="hint">品类不再绑定 AEP 产品。AEP 解析后由「归属规则」自动挂靠；规则在品类详情中维护。</div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showCategoryModal=false">取消</button><button class="btn btn-primary" @click="saveCategory">确定</button></div>
      </div>
    </div>

    <!-- 物模型：归属规则模态 -->
    <div v-if="showRuleModal" class="overlay" @click.self="showRuleModal=false">
      <div class="modal">
        <div class="modal-header"><span>{{ ruleModalMode==='create'?'新建归属规则':'编辑归属规则' }}</span><button class="close-x" @click="showRuleModal=false">×</button></div>
        <div class="modal-body">
          <div class="form-item"><label><span class="req">*</span>规则名称</label><input class="input input-full" v-model="ruleForm.name" placeholder="如 积水仪地埋 · 标准产品通用匹配" /></div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>规则类型</label>
              <select class="select input-full" v-model="ruleForm.type">
                <option>通用</option>
                <option>特殊</option>
              </select>
              <div class="hint">特殊处理规则优先于通用规则</div>
            </div>
            <div class="form-item"><label><span class="req">*</span>优先级</label>
              <input class="input input-full" v-model.number="ruleForm.priority" type="number" />
              <div class="hint">数值越小越优先（同类型内）</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>匹配 AEP 产品 ID</label><input class="input input-full" v-model="ruleForm.matchAepProduct" placeholder="如 AEP-LW-1001" /></div>
            <div class="form-item"><label>协议 ID / 名称</label><input class="input input-full" v-model="ruleForm.matchProtocol" placeholder="如 MQTT / level-proto-v2" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>启用</label>
              <select class="select input-full" v-model="ruleForm.enabled">
                <option :value="true">启用</option>
                <option :value="false">停用</option>
              </select>
            </div>
          </div>
          <div class="form-item"><label>备注</label><textarea class="textarea input-full" v-model="ruleForm.note"></textarea></div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showRuleModal=false">取消</button><button class="btn btn-primary" @click="saveRule">确定</button></div>
      </div>
    </div>

    <!-- 物模型：指令配置模态 — 对齐后端 kind=service -->
    <div v-if="showCommandModal" class="overlay" @click.self="showCommandModal=false">
      <div class="modal modal-lg">
        <div class="modal-header"><span>{{ commandModalMode==='create'?'新建指令':'编辑指令' }}</span><button class="close-x" @click="showCommandModal=false">×</button></div>
        <div class="modal-body">
          <div class="banner-muted" style="margin-bottom:12px">字节17–24 开关（bitIndex 1-based）；内容从 payloadOffset（1-based 内容起始字节）起写入。组包时选中指令自动置对应位。真正下发走 AEP CreateCommand（透传 hex，dataType=2）。</div>

          <div class="form-section-title">命令开关</div>
          <div class="hint" style="margin-top:-6px;margin-bottom:10px">对应协议字节17–24：命令位 1-based；bit=1 表示该指令执行（仅开关）。积水仪位 9 空缺。</div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>bitIndex（1-based 命令位）</label>
              <input class="input input-full" v-model.number="commandForm.bitIndex" type="number" min="1" max="64" placeholder="1～64" />
              <div class="hint">1-based 命令位；积水仪常用 1–8、10–12</div>
            </div>
            <div class="form-item"><label><span class="req">*</span>标识</label><input class="input input-full" v-model="commandForm.code" placeholder="如 reboot、installHeightMm" /></div>
            <div class="form-item"><label><span class="req">*</span>名称</label><input class="input input-full" v-model="commandForm.name" placeholder="如 重启、安装高度" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>启用</label>
              <select class="select input-full" v-model="commandForm.enabled">
                <option :value="true">启用</option>
                <option :value="false">停用</option>
              </select>
            </div>
            <div class="form-item"><label>读写方向（r/w）</label>
              <select class="select input-full" v-model="commandForm.access">
                <option v-for="a in COMMAND_ACCESS_OPTS" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
            <div class="form-item"><label>说明</label><input class="input input-full" v-model="commandForm.desc" placeholder="命令位用途说明" /></div>
          </div>

          <div class="form-section-title">命令内容</div>
          <div class="hint" style="margin-top:-6px;margin-bottom:10px">payloadOffset 为 1-based 内容起始字节（绝对位置，非相对 25 的偏移）。无参指令如 reboot：dataType=bool、unit=F0/0F。</div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>hasParam</label>
              <select class="select input-full" v-model.number="commandForm.hasParam" @change="onCommandHasParamChange">
                <option :value="0">0 无参</option>
                <option :value="1">1 带参</option>
              </select>
            </div>
            <div class="form-item"><label><span class="req">*</span>payloadOffset（1-based 内容起始字节）</label>
              <input class="input input-full" v-model.number="commandForm.payloadOffset" type="number" min="1" placeholder="如 25" />
              <div class="hint">绝对起始字节；reboot 示例为 25</div>
            </div>
            <div class="form-item"><label><span class="req">*</span>dataType</label>
              <select class="select input-full" v-model="commandForm.dataType">
                <option v-for="t in COMMAND_DATA_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>unit</label>
              <input class="input input-full" v-model="commandForm.unit" placeholder="如 mm / s / F0/0F" />
            </div>
            <div class="form-item"><label>required</label>
              <select class="select input-full" v-model="commandForm.required">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <div class="form-item" v-if="Number(commandForm.hasParam)"><label>paramMin</label>
              <input class="input input-full" v-model.number="commandForm.paramMin" type="number" placeholder="可空" />
            </div>
            <div class="form-item" v-if="Number(commandForm.hasParam)"><label>paramMax</label>
              <input class="input input-full" v-model.number="commandForm.paramMax" type="number" placeholder="可空" />
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showCommandModal=false">取消</button><button class="btn btn-primary" @click="saveCommand">确定</button></div>
      </div>
    </div>

    <!-- 设备台账：例外处理 · 人工改挂 -->
    <div v-if="showTransferModal" class="overlay" data-screen="ledger-device-transfer" @click.self="showTransferModal=false">
      <div class="modal">
        <div class="modal-header"><span>例外处理 · 人工改挂</span><button class="close-x" @click="showTransferModal=false">×</button></div>
        <div class="modal-body">
          <div class="banner-tip" style="margin-bottom:12px">非主路径：仅用于例外池清理或纠错。主路径为 OpenAPI 绑定自动建档（空 projectId 才写入，不覆盖已挂项目）。</div>
          <div class="form-item">
            <label>待改挂设备（{{ transferForm.deviceIds.length }} 台）</label>
            <div class="table-wrap" style="max-height:160px;overflow:auto">
              <table class="data-table">
                <thead><tr><th>IMEI</th><th>名称</th><th>当前项目</th></tr></thead>
                <tbody>
                  <tr v-for="id in transferForm.deviceIds" :key="id">
                    <td><code>{{ (deviceList.find(d=>d.id===id)||{}).imei }}</code></td>
                    <td>{{ (deviceList.find(d=>d.id===id)||{}).name }}</td>
                    <td>{{ displayProjectName(deviceList.find(d=>d.id===id)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="form-item"><label><span class="req">*</span>目标项目</label>
            <select class="select input-full" v-model="transferForm.targetProjectId">
              <option v-for="p in PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-item"><label>操作人</label><input class="input input-full" v-model="transferForm.operator" /></div>
          </div>
          <div class="form-item"><label>备注</label><textarea class="textarea input-full" v-model="transferForm.note" placeholder="例外改挂原因"></textarea></div>
          <div class="hint">改挂后写入操作人 / 时间 / 自 / 至 日志，可在设备档案「改挂记录」中查看。</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showTransferModal=false">取消</button>
          <button class="btn btn-primary" @click="confirmTransfer">确认改挂</button>
        </div>
      </div>
    </div>

        <!-- 物模型：上报属性新建/编辑 -->
    <div v-if="showPropertyModal" class="overlay" @click.self="showPropertyModal=false">
      <div class="modal">
        <div class="modal-header"><span>{{ propertyModalMode==='create'?'添加属性':'编辑属性' }}</span><button class="close-x" @click="showPropertyModal=false">×</button></div>
        <div class="modal-body">
          <div class="banner-muted" style="margin-bottom:12px">关闭「监控展示」后，该测点不出现在监控详情最新值 / 曲线 / 上报明细（列表测点列同源过滤）。默认开启，兼容存量。</div>
          <div class="form-row">
            <div class="form-item"><label><span class="req">*</span>标识符</label><input class="input input-full" v-model="propertyForm.identifier" placeholder="如 yewei、openAngle" :disabled="propertyModalMode==='edit'" /></div>
            <div class="form-item"><label><span class="req">*</span>名称</label><input class="input input-full" v-model="propertyForm.name" placeholder="如 液位" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>数据类型</label>
              <select class="select input-full" v-model="propertyForm.dataType">
                <option value="float">float</option>
                <option value="int">int</option>
                <option value="bool">bool</option>
                <option value="string">string</option>
                <option value="enum">enum</option>
              </select>
            </div>
            <div class="form-item"><label>单位</label><input class="input input-full" v-model="propertyForm.unit" placeholder="m / ℃ / —" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>访问</label>
              <select class="select input-full" v-model="propertyForm.access">
                <option>只读</option>
                <option>读写</option>
              </select>
            </div>
            <div class="form-item"><label>上报周期</label><input class="input input-full" v-model="propertyForm.reportCycle" placeholder="60s" /></div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>必报</label>
              <select class="select input-full" v-model="propertyForm.required">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <div class="form-item"><label>监控展示</label>
              <select class="select input-full" v-model="propertyForm.showInMonitor">
                <option :value="true">开（展示）</option>
                <option :value="false">关（不展示）</option>
              </select>
              <div class="hint">对应字段 <code>showInMonitor</code>；最终字段名等 BE。</div>
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn" @click="showPropertyModal=false">取消</button><button class="btn btn-primary" @click="saveProperty">确定</button></div>
      </div>
    </div>

    <div v-if="showDeleteConfirm" class="overlay" @click.self="showDeleteConfirm=false">
      <div class="modal confirm-box">
        <div class="modal-header"><span>{{ deleteTarget.blocked ? '删除失败' : '确认删除' }}</span><button class="close-x" @click="showDeleteConfirm=false">×</button></div>
        <div class="modal-body">
          <div class="confirm-icon">!</div>
          <div v-if="deleteTarget.blocked">
            <div style="font-weight:600;color:var(--error);margin-bottom:8px">{{ FIRMWARE_DELETE_REFUSED }}</div>
            <div v-if="deleteTarget.type==='固件批量'" style="font-size:13px;color:#666">整批未删除。</div>
          </div>
          <div v-else>
            <div style="font-weight:500;margin-bottom:6px">确定删除{{ deleteTarget.type }}「{{ deleteTarget.name }}」吗？</div>
            <div v-if="deleteTarget.type==='固件版本' || deleteTarget.type==='固件批量'" style="font-size:13px;color:#666">{{ FIRMWARE_DELETE_WARN }}</div>
            <div v-else style="font-size:13px;color:#666">删除后不可恢复，已关联设备将失去对应配置引用。</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDeleteConfirm=false">{{ deleteTarget.blocked ? '关闭' : '取消' }}</button>
          <button v-if="!deleteTarget.blocked" class="btn btn-danger" @click="doDelete">删除</button>
        </div>
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
          <div class="form-row">
            <div class="form-item"><label>AEP 产品 ID</label><input class="input input-full" v-model="projectForm.aepProductId" :placeholder="projectModalMode==='create'?'同步自 AEP 后自动回填':'AEP 产品 ID'" :disabled="projectModalMode==='edit' && !!projectForm.aepProductId" /></div>
            <div class="form-item"><label>AEP 产品名称</label><input class="input input-full" v-model="projectForm.aepProductName" placeholder="与产品 1:1" :disabled="projectModalMode==='edit' && !!projectForm.aepProductId" /></div>
          </div>
          <div class="form-item"><label>项目说明</label><textarea class="textarea input-full" v-model="projectForm.desc" placeholder="建设范围与目标"></textarea></div>
          <div class="hint">项目与 AEP 产品 1:1；正式环境以「同步自 AEP / SDK 产品列表」为准，手动新建仅作补录。</div>
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
              <li>下载 Excel 模板，按列填写 IMEI、名称、项目、品类、经纬度、安装参数等。</li>
              <li>IMEI 全局唯一；已存在 IMEI 将更新档案（生命周期为「报废」的跳过）。</li>
              <li>品类可由归属规则自动匹配；项目可留空（进入例外池「未定义项目」）。主路径仍为 OpenAPI 绑定建档。</li>
              <li>一期不校验 AEP 是否已存在；导入后可去「AEP 对账」点「同步自 AEP」处理清单差异。</li>
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
              <li>导出范围跟随当前列表筛选条件（项目 / 品类 / 生命周期 / IMEI）。</li>
              <li>字段含基础信息、坐标、安装参数扁平列、主从 IMEI。</li>
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

    <!-- 设备发送记录详情 -->
    <div v-if="showSendLogModal && currentSendLog" class="overlay" @click.self="closeSendLogDetail">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span>发送记录详情 · {{ formatIdentifiers(currentSendLog.identifiers) }}</span>
          <button class="close-x" @click="closeSendLogDetail">×</button>
        </div>
        <div class="modal-body">
          <div class="send-log-detail-grid">
            <div class="send-log-col">
              <div class="info-section-title">下发侧</div>
              <div class="kv-grid send-log-kv">
                <div class="k">identifiers</div><div class="v"><code>{{ formatIdentifiers(currentSendLog.identifiers) }}</code></div>
                <div class="k">paramsJson</div><div class="v"><pre class="json-block">{{ currentSendLog.paramsJson }}</pre></div>
                <div class="k">contentHex</div><div class="v"><pre class="hex-preview">{{ currentSendLog.contentHex }}</pre></div>
                <div class="k">aepRequestJson</div><div class="v"><pre class="json-block">{{ currentSendLog.aepRequestJson }}</pre></div>
              </div>
            </div>
            <div class="send-log-col">
              <div class="info-section-title">返回侧</div>
              <div class="kv-grid send-log-kv">
                <div class="k">aepResponseJson</div><div class="v"><pre class="json-block">{{ currentSendLog.aepResponseJson }}</pre></div>
                <div class="k">commandId</div><div class="v"><code>{{ currentSendLog.commandId || '—' }}</code></div>
                <div class="k">commandStatus</div><div class="v"><code>{{ currentSendLog.commandStatus || '—' }}</code></div>
                <div class="k">success</div><div class="v"><span class="tag" :class="sendLogSuccess(currentSendLog) ? 'tag-green' : 'tag-red'">{{ sendLogSuccess(currentSendLog) ? '成功' : '失败' }}</span></div>
                <div class="k">dryRun</div><div class="v">{{ sendLogDryRunLabel(currentSendLog) }}</div>
                <div class="k">类型</div><div class="v">{{ sendLogTypeLabel(currentSendLog) }}</div>
                <div class="k">aepCode</div><div class="v">{{ currentSendLog.aepCode == null ? '—' : currentSendLog.aepCode }}</div>
                <div class="k">aepMsg</div><div class="v">{{ currentSendLog.aepMsg || '—' }}</div>
                <div class="k">sendTime</div><div class="v">{{ currentSendLog.sendTime }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="closeSendLogDetail">关闭</button>
        </div>
      </div>
    </div>


    <!-- 设备 · 固件升级 OTA -->
    <div v-if="showDeviceOtaModal" class="overlay" @click.self="showDeviceOtaModal=false">
      <div class="modal">
        <div class="modal-header"><span>固件升级 · {{ currentDevice && currentDevice.name }}</span><button class="close-x" @click="showDeviceOtaModal=false">×</button></div>
        <div class="modal-body">
          <div class="banner-muted" style="margin-bottom:12px">当前固件：<code>{{ currentDevice && (currentDevice.firmware || '—') }}</code> · 型号 {{ currentDevice && (currentDevice.model || '—') }}。单台也走 <code>POST /iot/otaTask</code>，body 为 <code>deviceId</code> + <code>categoryId</code>。先创建升级任务，再挂本机升级记录。此为 OTA 固件包任务，非 bootUpgrade 指令。</div>
          <div class="banner-muted" style="margin-bottom:12px">品类 <code>{{ currentDevice && (currentDevice.categoryId || '—') }}</code> {{ currentDevice && (currentDevice.categoryName || '') }} · upgradeSupported <b>{{ currentDevice && isUpgradeSupported(CATEGORIES.find(c => c.id === currentDevice.categoryId)) ? 1 : 0 }}</b>。未打开的品类不能发起；选择器只含 <code>GET /iotCategory?upgradeSupported=1</code> 的结果。</div>
          <div class="banner-tip" v-if="deviceOtaRejectText" data-ota-reject="device">{{ deviceOtaRejectText }}</div>
          <div class="form-item">
            <label><span class="req">*</span>目标固件版本</label>
            <select class="select input-full" v-model="deviceOtaTargetVer" @change="onDeviceOtaTargetChange">
              <option value="">请选择</option>
              <option v-for="f in deviceOtaFirmwareOptions" :key="f.id" :value="f.upgradeVersion || f.currentVersion">
                {{ f.model }} · {{ f.upgradeVersion || f.currentVersion }}（{{ f.status }}）
              </option>
            </select>
          </div>
          <div class="form-item">
            <label><span class="req">*</span>包地址 packageUrl</label>
            <input class="input input-full" v-model="deviceOtaPackageUrl" placeholder="选版本后自动带出；可手填兜底" />
          </div>
          <div class="hint" v-if="!deviceOtaPackageUrl" style="color:#b45309">无包地址时需填写后才能提交。</div>
          <div class="hint">仅展示同型号固件基线；选版本带出 packageUrl。提交成功后本机记录带 taskId，并出现在升级任务与历史升级记录。</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDeviceOtaModal=false">取消</button>
          <button class="btn btn-primary" @click="submitDeviceOta">提交升级任务</button>
        </div>
      </div>
    </div>

    <!-- 品类 · 批量 OTA -->
    <div v-if="showCategoryOtaModal" class="overlay" @click.self="showCategoryOtaModal=false">
      <div class="modal modal-ota">
        <div class="modal-header"><span>批量固件升级 · {{ currentCategory && currentCategory.name }}</span><button class="close-x" @click="showCategoryOtaModal=false">×</button></div>
        <div class="modal-body">
          <div class="banner-muted" style="margin-bottom:12px">批量与单台同一接口 <code>POST /iot/otaTask</code>。body：<code>deviceIds</code> + <code>categoryId</code>（另需 packageUrl 或 firmwareId；deviceIds 合计 ≤ {{ OTA_DEVICE_CAP }}）。先创建升级任务，再挂设备升级记录。超时 timeoutMinutes 默认 {{ OTA_TIMEOUT_DEFAULT }} 分钟。</div>
          <div class="banner-tip" v-if="categoryOtaRejectText" data-ota-reject="category">{{ categoryOtaRejectText }}</div>
          <div class="form-item" style="margin-bottom:12px">
            <label><span class="req">*</span>品类 categoryId</label>
            <select class="select input-full" v-model="categoryOtaCategoryId" @change="onCategoryOtaCategoryChange">
              <option value="">请选择已开启升级的品类</option>
              <option v-for="c in upgradeSupportedCategories" :key="c.id" :value="c.id">{{ c.name }}（{{ c.code }} / {{ c.id }}）</option>
            </select>
            <div class="hint">来自 <code>GET /iotCategory?upgradeSupported=1</code>。未打开开关的品类不出现。若仍用 upgradeSupported=0 的品类创建，后端拒绝。</div>
          </div>
          <div class="form-row" style="gap:12px;flex-wrap:wrap;margin-bottom:12px">
            <div class="form-item" style="min-width:200px">
              <label><span class="req">*</span>目标版本</label>
              <select class="select input-full" v-model="categoryOtaTargetVer" @change="onCategoryOtaTargetChange">
                <option value="">请选择</option>
                <option v-for="f in categoryFirmwares" :key="f.id+'-ver'" :value="f.upgradeVersion || f.currentVersion">
                  {{ f.model }} · {{ f.upgradeVersion || f.currentVersion }}（{{ f.id }}）
                </option>
              </select>
            </div>
            <div class="form-item" style="min-width:220px;flex:1">
              <label>包地址 packageUrl</label>
              <input class="input input-full" v-model="categoryOtaPackageUrl" placeholder="与 firmwareId 至少填一项" />
            </div>
            <div class="form-item" style="min-width:120px">
              <label>firmwareId</label>
              <input class="input input-full" v-model="categoryOtaFirmwareId" placeholder="与 packageUrl 至少一项" />
            </div>
            <div class="form-item" style="min-width:140px">
              <label>超时 timeoutMinutes</label>
              <input class="input input-full" type="number" min="1" v-model.number="categoryOtaTimeoutMinutes" placeholder="30" />
            </div>
            <div class="form-item" style="padding-bottom:6px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" v-model="categoryOtaOnlineOnly" /> 仅在线
              </label>
            </div>
          </div>
          <div class="hint" style="margin-bottom:8px">留空或非法的 timeoutMinutes 按默认 30 分钟。关闭「仅在线」可看到待接入设备的预检排除。</div>
          <div class="form-item" style="margin-bottom:8px">
            <label>追加 deviceIds（可选，逗号分隔）</label>
            <input class="input input-full" v-model="categoryOtaExtraIds" placeholder="例如 D003,D-NOT-FOUND — 跨品类或不存在会在创建结果中排除" />
          </div>
          <div class="toolbar">
            <span style="color:#666;font-size:13px">可纳入 {{ categoryOtaUpgradeableDevices.length }} 台 · 预检排除 {{ categoryOtaCandidateDevices.length - categoryOtaUpgradeableDevices.length }} · 已选 {{ categoryOtaSelectedIds.length }} / {{ OTA_DEVICE_CAP }}</span>
            <div class="spacer"></div>
            <button class="btn btn-sm" @click="toggleCategoryOtaDevicesAll">全选可纳入</button>
          </div>
          <div class="table-wrap" style="max-height:280px;overflow:auto">
            <table class="data-table">
              <thead><tr><th style="width:40px"></th><th>设备</th><th>IMEI</th><th>当前固件</th><th>生命周期</th><th>预检</th></tr></thead>
              <tbody>
                <tr v-for="d in categoryOtaCandidateDevices" :key="d.id" :class="{'row-selected': isCategoryOtaDeviceSelected(d.id)}">
                  <td><input type="checkbox" :checked="isCategoryOtaDeviceSelected(d.id)" @change="toggleCategoryOtaDevice(d.id)" /></td>
                  <td>{{ d.name }}</td>
                  <td><code>{{ d.imei }}</code></td>
                  <td><code>{{ d.firmware || '—' }}</code></td>
                  <td>{{ d.lifecycle }}</td>
                  <td :class="{'ota-exclude-reason': !!d.excludeReason}">{{ d.excludeReason || '可纳入' }}</td>
                </tr>
                <tr v-if="!categoryOtaCandidateDevices.length"><td colspan="6"><div class="empty-hint">本品类在当前筛选下没有设备</div></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showCategoryOtaModal=false">取消</button>
          <button class="btn btn-primary" @click="submitCategoryOta">提交升级任务</button>
        </div>
      </div>
    </div>

    <div v-if="showCancelOtaConfirm" class="overlay" @click.self="showCancelOtaConfirm=false">
      <div class="modal">
        <div class="modal-header"><span>取消升级任务</span><button class="close-x" @click="showCancelOtaConfirm=false">×</button></div>
        <div class="modal-body">
          <p style="margin:0 0 12px">确认取消任务 <code>{{ cancelOtaTarget && cancelOtaTarget.id }}</code>？任务状态将变为 <b>2 已取消</b>。</p>
          <div class="banner-tip">未完成设备（0 排队 / 1 升级中）记为失败，失败原因「任务已取消」。已成功的设备不回滚。</div>
          <div class="banner-muted">本任务超时阈值 {{ otaTimeoutMinutesOf(cancelOtaTarget) }} 分钟。若未取消而设备无应答，失败原因为「{{ otaTaskTimeoutReason(cancelOtaTarget) }}」。</div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showCancelOtaConfirm=false">返回</button>
          <button class="btn btn-danger" @click="doCancelOtaTask">确认取消</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" class="toast" :class="'toast-'+toast.type">{{ toast.text }}</div>

  </div>
  `
}).mount('#app');
