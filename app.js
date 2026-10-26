const { createApp, ref, computed, reactive, watch, nextTick } = Vue;

/* ========== 物模型 Mock ========== */
const CATEGORIES = [
  { id: 'C001', name: '积水仪地埋', code: 'flood_buried', industry: '市政排水', deviceCount: 128, modelVersion: 'v1.2.0', updatedAt: '2026-09-28 14:22', status: '启用', ruleCount: 3 },
  { id: 'C006', name: '积水仪侧壁', code: 'flood_sidewall', industry: '市政排水', deviceCount: 64, modelVersion: 'v1.0.0', updatedAt: '2026-10-08 10:15', status: '启用', ruleCount: 1 },
  { id: 'C002', name: '水质监测站', code: 'water_quality', industry: '环保监测', deviceCount: 56, modelVersion: 'v2.0.1', updatedAt: '2026-09-26 09:10', status: '启用', ruleCount: 2 },
  { id: 'C003', name: '管网压力表', code: 'pipe_pressure', industry: '供水', deviceCount: 0, modelVersion: 'v0.9.0', updatedAt: '2026-09-20 16:45', status: '草稿', ruleCount: 2 },
  { id: 'C004', name: '泵站机组', code: 'pump_unit', industry: '市政排水', deviceCount: 34, modelVersion: 'v1.0.3', updatedAt: '2026-09-18 11:30', status: '启用', ruleCount: 2 },
  { id: 'C005', name: '雨量计', code: 'rain_gauge', industry: '气象水文', deviceCount: 12, modelVersion: 'v1.1.0', updatedAt: '2026-09-12 08:05', status: '停用', ruleCount: 2 },
];

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
];

/* 上报属性（kind=property）：按品类挂靠，在线监控动态列取自本品类定义 */
const PROPERTIES = [
  /* 积水仪地埋 C001 */
  { id: 'P1', categoryId: 'C001', kind: 'property', identifier: 'yewei', name: '液位', dataType: 'float', unit: 'm', access: '只读', reportCycle: '60s', required: true },
  { id: 'P2', categoryId: 'C001', kind: 'property', identifier: 'wendu', name: '温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '120s', required: true },
  { id: 'P3', categoryId: 'C001', kind: 'property', identifier: 'yaqiang', name: '压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '60s', required: true },
  { id: 'P4', categoryId: 'C001', kind: 'property', identifier: 'dianya', name: '电池电压', dataType: 'float', unit: 'V', access: '只读', reportCycle: '300s', required: false },
  /* 积水仪侧壁 C006：同测点标识，独立品类物模型 */
  { id: 'P61', categoryId: 'C006', kind: 'property', identifier: 'yewei', name: '液位', dataType: 'float', unit: 'm', access: '只读', reportCycle: '60s', required: true },
  { id: 'P62', categoryId: 'C006', kind: 'property', identifier: 'wendu', name: '温度', dataType: 'float', unit: '℃', access: '只读', reportCycle: '120s', required: true },
  { id: 'P63', categoryId: 'C006', kind: 'property', identifier: 'yaqiang', name: '压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '60s', required: true },
  /* 水质监测站 C002：测点集与积水仪不同 */
  { id: 'P21', categoryId: 'C002', kind: 'property', identifier: 'ph', name: 'pH', dataType: 'float', unit: '', access: '只读', reportCycle: '300s', required: true },
  { id: 'P22', categoryId: 'C002', kind: 'property', identifier: 'do', name: '溶解氧', dataType: 'float', unit: 'mg/L', access: '只读', reportCycle: '300s', required: true },
  { id: 'P23', categoryId: 'C002', kind: 'property', identifier: 'turb', name: '浊度', dataType: 'float', unit: 'NTU', access: '只读', reportCycle: '300s', required: false },
  /* 管网压力表 C003 */
  { id: 'P31', categoryId: 'C003', kind: 'property', identifier: 'yaqiang', name: '管网压强', dataType: 'float', unit: 'kPa', access: '只读', reportCycle: '900s', required: true },
  /* 泵站机组 C004 */
  { id: 'P41', categoryId: 'C004', kind: 'property', identifier: 'cur', name: '运行电流', dataType: 'float', unit: 'A', access: '只读', reportCycle: '120s', required: true },
  { id: 'P42', categoryId: 'C004', kind: 'property', identifier: 'vib', name: '振动', dataType: 'float', unit: 'mm/s', access: '只读', reportCycle: '120s', required: true },
  /* 雨量计 C005 */
  { id: 'P51', categoryId: 'C005', kind: 'property', identifier: 'rain', name: '雨量', dataType: 'float', unit: 'mm', access: '只读', reportCycle: '1800s', required: true },
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
  { id: 'F1', model: 'MF-LW-100', currentVersion: '1.2.0', upgradeVersion: '1.3.0', releaseDate: '2026-09-15', status: '可升级', changelog: '优化液位滤波算法；修复低电量误报' },
  { id: 'F2', model: 'MF-LW-100', currentVersion: '1.1.2', upgradeVersion: '1.2.0', releaseDate: '2026-07-01', status: '基线', changelog: '支持 AEP 物模型 v1.2' },
  { id: 'F3', model: 'MF-LW-200', currentVersion: '2.0.1', upgradeVersion: '', releaseDate: '2026-08-20', status: '最新', changelog: '新硬件平台首发固件' },
];

/* 指令配置：物模型侧定义该品类「能下什么」（非实时点发台）
 * 积水仪 FAFA…ADAD：字节17–24 为命令开关（bitIndex 1-based，bit=1 执行；位 9 空缺）；
 * payloadOffset 为内容区 1-based 绝对起始字节（内容从该字节起写入）。
 * 字段对齐后端 kind=service：bitIndex / payloadOffset / hasParam / paramMin / paramMax + identifier·name·dataType·unit·required·access。
 * 真正下发走 AEP CreateCommand（透传 hex，dataType=2） */
const COMMANDS = [
  { id: 'CMD01', categoryId: 'C001', code: 'reboot', name: '重启', hasParam: 0, bitIndex: 1, payloadOffset: 25, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, enabled: true, desc: '命令位 1；内容起始字节 25（F0 重启 / 0F 不重启）', params: null },
  { id: 'CMD02', categoryId: 'C001', code: 'factoryReset', name: '恢复出厂', hasParam: 0, bitIndex: 2, payloadOffset: 26, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, enabled: true, desc: '命令位 2；内容起始字节 26（F0/0F）', params: null },
  { id: 'CMD03', categoryId: 'C001', code: 'clearData', name: '清零', hasParam: 0, bitIndex: 3, payloadOffset: 27, dataType: 'bool', unit: 'F0/0F', required: true, access: 'w', paramMin: null, paramMax: null, enabled: true, desc: '命令位 3；内容起始字节 27（F0/0F）', params: null },
  { id: 'CMD04', categoryId: 'C001', code: 'installHeightMm', name: '安装高度', hasParam: 1, bitIndex: 4, payloadOffset: 28, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 10000, enabled: true, desc: '命令位 4；内容起始字节 28（2 字节 mm）；params.value',
    params: { value: { label: '安装高度', min: 0, max: 10000, unit: 'mm' } } },
  { id: 'CMD05', categoryId: 'C001', code: 'syncTime', name: '对时', hasParam: 1, bitIndex: 5, payloadOffset: 30, dataType: 'int', unit: 's', required: true, access: 'w', paramMin: null, paramMax: null, enabled: true, desc: '命令位 5；内容起始字节 30（4 字节 unix 秒）；params.value',
    params: { value: { label: 'unix 秒', min: null, max: null, unit: 's' } } },
  { id: 'CMD06', categoryId: 'C001', code: 'switchThreshold', name: '切换频率', hasParam: 1, bitIndex: 6, payloadOffset: 34, dataType: 'object', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 65535, enabled: true, desc: '命令位 6；内容起始字节 34（高低水位 4 字节）；params.high / params.low，high＞low',
    params: {
      high: { label: '高水位', min: 0, max: 65535, unit: 'mm' },
      low: { label: '低水位', min: 0, max: 65535, unit: 'mm' }
    } },
  { id: 'CMD07', categoryId: 'C001', code: 'resendRange', name: '重发区间', hasParam: 1, bitIndex: 7, payloadOffset: 38, dataType: 'object', unit: '-', required: true, access: 'w', paramMin: 0, paramMax: 16777215, enabled: true, desc: '命令位 7；内容起始字节 38（起止包序列号 6 字节）；params.start / params.end，start≤end',
    params: {
      start: { label: '起始包序列号', min: 0, max: 16777215 },
      end: { label: '结束包序列号', min: 0, max: 16777215 }
    } },
  { id: 'CMD08', categoryId: 'C001', code: 'sampleInterval', name: '采样频率', hasParam: 1, bitIndex: 8, payloadOffset: 44, dataType: 'object', unit: 'min', required: true, access: 'w', paramMin: 1, paramMax: 65535, enabled: true, desc: '命令位 8；内容起始字节 44（长/中/短采样间隔）；params.longMin / midMin / shortMin',
    params: {
      longMin: { label: '长(无水)分钟', min: 1, max: 65535, unit: 'min' },
      midMin: { label: '中', min: 1, max: 255, unit: 'min' },
      shortMin: { label: '短', min: 1, max: 255, unit: 'min' }
    } },
  { id: 'CMD09', categoryId: 'C001', code: 'raiseHeightMm', name: '上凸高度', hasParam: 1, bitIndex: 10, payloadOffset: 50, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 5000, enabled: true, desc: '命令位 10（位 9 空缺）；内容起始字节 50（2 字节 mm）；params.value',
    params: { value: { label: '上凸高度', min: 0, max: 5000, unit: 'mm' } } },
  { id: 'CMD10', categoryId: 'C001', code: 'sinkHeightMm', name: '下沉高度', hasParam: 1, bitIndex: 11, payloadOffset: 52, dataType: 'int', unit: 'mm', required: true, access: 'w', paramMin: 0, paramMax: 5000, enabled: true, desc: '命令位 11；内容起始字节 52（2 字节 mm）；params.value',
    params: { value: { label: '下沉高度', min: 0, max: 5000, unit: 'mm' } } },
  { id: 'CMD11', categoryId: 'C001', code: 'sendInterval', name: '发送频率', hasParam: 1, bitIndex: 12, payloadOffset: 54, dataType: 'object', unit: 'min', required: true, access: 'w', paramMin: 1, paramMax: 65535, enabled: true, desc: '命令位 12；内容起始字节 54（长/中/短发送间隔）；params.longMin / midMin / shortMin',
    params: {
      longMin: { label: '长(无水)分钟', min: 1, max: 65535, unit: 'min' },
      midMin: { label: '中', min: 1, max: 255, unit: 'min' },
      shortMin: { label: '短', min: 1, max: 255, unit: 'min' }
    } },
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
  { id: 'D001', imei: 'MF20260901001', name: '东湖路井-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'AEP-DEV-10001', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153576, lat: 30.287459, address: '杭州市上城区东湖路与环城东路交叉口东南侧检查井', installDate: '2026-04-12', installer: '张伟', masterId: '', masterImei: '', slaves: ['D002', 'D015'], photos: ['现场全景', '井内安装', '铭牌特写'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.3', well_no: 'JW-2026-001', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D002', imei: 'MF20260901002', name: '东湖路井-01从机', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'probe:MF20260901002', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153610, lat: 30.287480, address: '杭州市上城区东湖路检查井（从机）', installDate: '2026-04-12', installer: '张伟', masterId: 'D001', masterImei: 'MF20260901001', slaves: [], photos: ['从机安装'], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.5', well_no: 'JW-2026-001-S', cover_type: '铸铁' }, updatedAt: '2026-09-29 18:20' },
  { id: 'D003', imei: 'MF20260520011', name: '南湖入口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '离线', aepDeviceId: 'AEP-DEV-20011', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.148220, lat: 30.265110, address: '南湖公园北门入湖口', installDate: '2026-06-01', installer: '刘洋', masterId: '', masterImei: '', slaves: [], photos: ['站房外观', '采水口'], installParams: { sample_depth: '1.2', station_code: 'NH-IN-01' }, updatedAt: '2026-09-28 09:11' },
  { id: 'D004', imei: 'MF20251108088', name: '解放路压力-12', projectId: 'PJ03', projectName: '老城供水管网', categoryId: 'C003', categoryName: '管网压力表', categoryMatch: 'manual', categoryRuleId: '', lifecycle: '停用', aepDeviceId: '', model: 'MF-PP-50', firmware: '0.9.0', lng: 120.165001, lat: 30.274880, address: '解放路 88 号门前阀门井', installDate: '2025-12-05', installer: '孙磊', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { pipe_diameter: '300', install_depth: '1.5' }, updatedAt: '2026-08-10 14:00' },
  { id: 'D005', imei: 'MF20260915030', name: '城东泵站1#机组', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C004', categoryName: '泵站机组', categoryMatch: 'auto', categoryRuleId: 'R401', lifecycle: '在线', aepDeviceId: 'AEP-DEV-30120', model: 'MF-PU-300', firmware: '1.0.3', lng: 120.160100, lat: 30.291200, address: '城东排涝泵站泵房', installDate: '2026-05-20', installer: '赵强', masterId: '', masterImei: '', slaves: [], photos: ['机组铭牌', '控制柜'], installParams: { rated_power: '75', pump_no: '1#' }, updatedAt: '2026-09-30 08:05' },
  { id: 'D006', imei: 'MF20260120001', name: '气象局雨量-03', projectId: 'PJ05', projectName: '雨量站扩容', categoryId: 'C005', categoryName: '雨量计', categoryMatch: 'auto', categoryRuleId: 'R501', lifecycle: '报废', aepDeviceId: 'AEP-DEV-RG-03', model: 'MF-RG-10', firmware: '1.0.0', lng: 120.172000, lat: 30.300000, address: '市气象局观测场', installDate: '2024-03-01', installer: '周伟', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { mount_height: '1.2' }, updatedAt: '2026-07-01 10:00' },
  { id: 'D007', imei: 'MF20260928050', name: '望江路井-待接入', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '待接入', aepDeviceId: '', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.155800, lat: 30.282100, address: '望江路与秋涛路交叉口', installDate: '2026-09-28', installer: '张伟', masterId: '', masterImei: '', slaves: [], photos: ['待装现场'], installParams: { well_depth: '7.2', pipe_diameter: '800', install_height: '0.3', well_no: 'JW-2026-050', cover_type: '复合材料' }, updatedAt: '2026-09-28 16:40' },
  { id: 'D008', imei: 'MF20260601022', name: '南湖出口站', projectId: 'PJ02', projectName: '南湖水质专项', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '在线', aepDeviceId: 'AEP-DEV-20022', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.151100, lat: 30.258900, address: '南湖出水闸附近', installDate: '2026-06-08', installer: '刘洋', masterId: '', masterImei: '', slaves: [], photos: ['站房', '仪表盘'], installParams: { sample_depth: '0.8', station_code: 'NH-OUT-01' }, updatedAt: '2026-09-29 21:00' },
  { id: 'D009', imei: 'MF20261001001', name: 'AEP自注册-液位-01', projectId: null, projectName: '未定义项目', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'AEP-DEV-91001', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.158200, lat: 30.289100, address: '待现场补录', installDate: '2026-10-01', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-01 09:12' },
  { id: 'D010', imei: 'MF20261001088', name: 'AEP自注册-未知协议', projectId: null, projectName: '未定义项目', categoryId: '', categoryName: '待归属', categoryMatch: 'none', categoryRuleId: '', lifecycle: '待接入', aepDeviceId: 'AEP-DEV-91088', model: 'UNKNOWN', firmware: '', lng: null, lat: null, address: '', installDate: '', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-02 11:05' },
  { id: 'D011', imei: 'AEP-AUTO-7721', name: '临时水质终端-7721', projectId: null, projectName: '未定义项目', categoryId: 'C002', categoryName: '水质监测站', categoryMatch: 'auto', categoryRuleId: 'R201', lifecycle: '在线', aepDeviceId: 'AEP-DEV-7721', model: 'MF-WQ-200', firmware: '2.0.1', lng: 120.149500, lat: 30.261000, address: '滨江临时点位', installDate: '2026-10-03', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: { sample_depth: '1.0' }, updatedAt: '2026-10-03 14:30' },
  { id: 'D012', imei: 'MF20261005012', name: 'AEP自注册-泵站探头', projectId: null, projectName: '未定义项目', categoryId: 'C004', categoryName: '泵站机组', categoryMatch: 'auto', categoryRuleId: 'fallback:0042', lifecycle: '离线', aepDeviceId: 'AEP-DEV-91200', model: 'MF-PU-300', firmware: '1.0.3', lng: 120.161000, lat: 30.292000, address: '', installDate: '2026-10-05', installer: '', masterId: '', masterImei: '', slaves: [], photos: [], installParams: {}, updatedAt: '2026-10-05 08:40' },
  { id: 'D013', imei: 'MF20261008013', name: '庆春路侧壁-01', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C006', categoryName: '积水仪侧壁', categoryMatch: 'auto', categoryRuleId: 'R601', lifecycle: '在线', aepDeviceId: 'AEP-DEV-60013', model: 'MF-FS-60', firmware: '1.0.0', lng: 120.168200, lat: 30.278500, address: '庆春路与环城东路交叉口侧壁', installDate: '2026-08-18', installer: '张伟', masterId: '', masterImei: '', slaves: [], photos: ['侧壁安装'], installParams: { install_height: '0.2' }, updatedAt: '2026-10-08 11:20' },
  { id: 'D014', imei: 'MF20261008014', name: '艮山路侧壁-02', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C006', categoryName: '积水仪侧壁', categoryMatch: 'auto', categoryRuleId: 'R601', lifecycle: '在线', aepDeviceId: 'AEP-DEV-60014', model: 'MF-FS-60', firmware: '1.0.0', lng: 120.170100, lat: 30.281200, address: '艮山路立交侧壁', installDate: '2026-08-20', installer: '赵强', masterId: '', masterImei: '', slaves: [], photos: ['侧壁铭牌'], installParams: { install_height: '0.25' }, updatedAt: '2026-10-08 11:22' },
  { id: 'D015', imei: 'MF20260901003', name: '东湖路井-01探头B', projectId: 'PJ01', projectName: '城东排涝一期', categoryId: 'C001', categoryName: '积水仪地埋', categoryMatch: 'auto', categoryRuleId: 'R101', lifecycle: '在线', aepDeviceId: 'probe:MF20260901003', model: 'MF-LW-100', firmware: '1.2.0', lng: 120.153620, lat: 30.287490, address: '杭州市上城区东湖路检查井（探头B）', installDate: '2026-04-12', installer: '张伟', masterId: 'D001', masterImei: 'MF20260901001', slaves: [], photos: [], installParams: { well_depth: '8.5', pipe_diameter: '600', install_height: '0.6', well_no: 'JW-2026-001-P2', cover_type: '铸铁' }, updatedAt: '2026-10-19 15:00' },
];

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

const LIFECYCLES = ['待接入', '在线', '离线', '停用', '报废'];
const LC_CLASS = { '待接入': 'lc-pending', '在线': 'lc-online', '离线': 'lc-offline', '停用': 'lc-disabled', '报废': 'lc-scrapped' };
const LC_TAG = { '待接入': 'tag-orange', '在线': 'tag-green', '离线': 'tag-gray', '停用': 'tag-gray', '报废': 'tag-red' };
const PJ_STATUS_TAG = { '进行中': 'tag-blue', '已完工': 'tag-green', '筹备中': 'tag-orange', '已暂停': 'tag-gray' };

/* ========== 驾驶舱 Mock ========== */
const COCKPIT_TODOS = [
  { id: 'CT1', type: '未挂项目', title: 'AEP自注册-液位-01', imei: 'MF20261001001', detail: '例外池：SDK 缺产品映射，待人工改挂', severity: 'warn', target: 'unassignedDevices', time: '2026-10-01 09:12' },
  { id: 'CT2', type: '未挂项目', title: 'AEP自注册-未知协议', imei: 'MF20261001088', detail: '例外池：品类待归属 + 未定义项目', severity: 'danger', target: 'unassignedDevices', time: '2026-10-02 11:05' },
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

/* ========== 在线监控 Mock（设备数据集中入口） ========== */
const TRUST_TAG = { T0: 'tag-red', T1: 'tag-orange', T2: 'tag-blue', T3: 'tag-green' };
const TRUST_LABEL = { T0: '不可信', T1: '低可信', T2: '中可信', T3: '高可信' };
// AEP status（后端 6587b2d2）：0=待确认 / 1=在线 / 2=离线 / 9=忽略；在线态 UI：1→在线、2→离线，0/空→未知
const ONLINE_TAG = { '在线': 'tag-green', '离线': 'tag-gray', '未知': 'tag-orange' };

/** 按品类取物模型上报属性（kind=property），供监控动态列 / 详情卡片使用 */
function getCategoryProperties(categoryId) {
  if (!categoryId) return [];
  return PROPERTIES.filter(p => p.categoryId === categoryId && (p.kind || 'property') === 'property');
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

createApp({
  setup() {
    const module = ref('cockpit'); // cockpit | thing | ledger | monitor
    const screen = ref('cockpit');
    const detailTab = ref('points');
    const searchKeyword = ref('');
    const filterIndustry = ref('');

    const showCategoryModal = ref(false);
    const categoryModalMode = ref('create');
    const categoryForm = reactive({ id: '', name: '', code: '', industry: '市政排水', desc: '', status: '启用' });

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
    const COMMAND_DATA_TYPES = ['bool', 'int', 'float', 'string', 'enum', 'object'];
    const COMMAND_ACCESS_OPTS = ['r', 'w'];

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
    const projectForm = reactive({ id: '', name: '', status: '筹备中', owner: '', region: '', startedAt: '2026-09-30', desc: '', aepProductId: '', aepProductName: '' });

    const deviceProjectFilter = ref('');
    const deviceCategoryFilter = ref('');
    const deviceLifecycleFilter = ref('');
    const deviceImeiSearch = ref('');
    const deviceMasterFilter = ref('');
    const showProbeDevices = ref(false);
    function isProbeAepId(id) { return !!(id && String(id).startsWith('probe:')); }
    function displayAepDeviceId(id) {
      if (!id) return '—';
      if (isProbeAepId(id)) return id + '（合成键，非真 AEP ID）';
      return id;
    }
    const deviceList = ref(DEVICES.map(d => ({ ...d })));
    const currentDevice = ref(deviceList.value[0]);
    const selectedDeviceIds = ref([]);

    const showImportModal = ref(false);
    const importMode = ref('import'); // import | export

    const showDisableConfirm = ref(false);
    const showTransferModal = ref(false);
    const transferForm = reactive({
      targetProjectId: 'PJ01', note: '', operator: '张三', deviceIds: []
    });
    const transferLogs = ref(TRANSFER_LOGS.map(t => ({ ...t })));
    const showCategoryOverride = ref(false);

    /* ---- 设备档案 · Tab：档案 / 本机数据 / 指令 / 设备发送记录 / 子设备 ---- */
    const deviceDetailTab = ref('profile'); // profile | localData | dispatch | sendLog | children
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
      id: '', imei: '', name: '', projectId: '', categoryId: '', lifecycle: '待接入',
      aepDeviceId: '', model: '', firmware: '', lng: '', lat: '', address: '',
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

    const filteredCategories = computed(() => {
      return CATEGORIES.filter(c => {
        const kw = searchKeyword.value.trim();
        if (kw && !(c.name.includes(kw) || c.code.includes(kw) || c.id.includes(kw))) return false;
        if (filterIndustry.value && c.industry !== filterIndustry.value) return false;
        return true;
      });
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
        if (deviceCategoryFilter.value && d.categoryId !== deviceCategoryFilter.value) return false;
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

    /** 当前物模型详情品类的上报属性（kind=property） */
    const currentCategoryProperties = computed(() => {
      return getCategoryProperties(currentCategory.value?.id);
    });

    /** 监控列表：选中品类时的动态测点列（来自该品类物模型 property） */
    const monMetricColumns = computed(() => {
      const cid = monCategoryFilter.value;
      if (!cid) return [];
      return getCategoryProperties(cid);
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
      const defs = getCategoryProperties(row.categoryId);
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
      if (!getCategoryProperties(row.categoryId).length) return '该品类未配置上报属性，无法按物模型展示指标';
      return '暂无测点数据';
    });

    /** 曲线区空态文案（精确口径） */
    const monCurveEmptyHint = computed(() => {
      const row = currentMonitor.value;
      if (!row) return '所选时间范围内暂无可用历史曲线数据';
      if (!row.categoryId) return '设备未关联品类，无法按物模型展示曲线';
      if (!getCategoryProperties(row.categoryId).length) return '该品类未配置上报属性，无法按物模型展示曲线';
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
        return { parent: '设备管控', current: '驾驶舱' };
      }
      if (module.value === 'monitor') {
        if (screen.value === 'monitorList') return { parent: '设备管控', current: '在线监控 · 设备数据' };
        if (screen.value === 'monitorDetail') return { parent: '在线监控', current: (currentMonitor.value?.name || '设备') + ' · 设备数据' };
        if (screen.value === 'monitorCurve') return { parent: currentMonitor.value?.name || '设备', current: '历史曲线' };
        if (screen.value === 'monitorOnlineRate') return { parent: '在线监控', current: '在线率统计' };
        return { parent: '设备管控', current: '在线监控' };
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
            children: '子设备',
          })[deviceDetailTab.value] || '档案';
          return { parent: '设备台账', current: name + ' · ' + tabLabel };
        }
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
      if (module.value === 'cockpit') return '一期原型 · 驾驶舱 / 工作台';
      if (module.value === 'ledger') return '一期原型 · 设备台账';
      if (module.value === 'monitor') return '一期原型 · 在线监控';
      return '一期原型 · 物模型';
    });

    function goCockpit() { module.value = 'cockpit'; screen.value = 'cockpit'; }

    const cockpitStats = computed(() => {
      const all = deviceList.value;
      const online = all.filter(d => d.lifecycle === '在线').length;
      const offlineAbnormal = all.filter(d => ['离线', '待接入', '停用', '报废'].includes(d.lifecycle)).length;
      const pendingDiff = aepDiffs.value.filter(d => d.action === 'pending').length;
      return {
        deviceTotal: all.length,
        online,
        offlineAbnormal,
        projectCount: PROJECTS.length,
        unassigned: unassignedCount.value,
        pendingDiff,
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
      Object.assign(categoryForm, { id: '', name: '', code: '', industry: '市政排水', desc: '', status: '启用' });
      showCategoryModal.value = true;
    }
    function openEditCategory(cat) {
      categoryModalMode.value = 'edit';
      Object.assign(categoryForm, {
        id: cat.id, name: cat.name, code: cat.code, industry: cat.industry,
        desc: cat.desc || '', status: cat.status
      });
      showCategoryModal.value = true;
    }
    function saveCategory() { showCategoryModal.value = false; }

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
    function categoryMatchLabel(m) {
      if (m === 'auto') return '自动匹配';
      if (m === 'manual') return '人工改挂';
      if (m === 'none') return '待归属';
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

    function openDevicesForProject(p) {
      deviceProjectFilter.value = p.id;
      deviceCategoryFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      selectedDeviceIds.value = [];
      goDevices();
    }

    /** 品类侧双向挂靠：从设备数跳转台账设备列表并按品类筛选 */
    function openDevicesForCategory(c) {
      const id = typeof c === 'string' ? c : (c && c.id);
      deviceCategoryFilter.value = id || '';
      deviceProjectFilter.value = '';
      deviceLifecycleFilter.value = '';
      deviceImeiSearch.value = '';
      selectedDeviceIds.value = [];
      goDevices();
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
          categoryName: device.categoryName || '待归属',
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
      const defs = getCategoryProperties(currentMonitor.value.categoryId);
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
      const allowed = ['profile', 'localData', 'dispatch', 'sendLog', 'children'];
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
        imei: d.imei || '',
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
          name: deviceForm.name,
          projectId: deviceForm.projectId || null,
          projectName: deviceForm.projectId ? (proj ? proj.name : deviceForm.projectId) : UNASSIGNED_PROJECT_NAME,
          categoryId: deviceForm.categoryId || '',
          categoryName: deviceForm.categoryId ? (cat ? cat.name : deviceForm.categoryId) : '待归属',
          categoryMatch: showCategoryOverride.value ? 'manual' : (deviceForm.categoryMatch || 'auto'),
          categoryRuleId: showCategoryOverride.value ? '' : (deviceForm.categoryRuleId || ''),
          lifecycle: deviceForm.lifecycle,
          aepDeviceId: deviceForm.aepDeviceId,
          model: deviceForm.model,
          firmware: deviceForm.firmware,
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
      const c = CATEGORIES.find(x => x.id === id);
      return c ? c.name : id;
    }

    /* ---- 在线监控 actions ---- */
    function goMonitorList() { module.value = 'monitor'; screen.value = 'monitorList'; }
    function goMonitorOnlineRate() { module.value = 'monitor'; screen.value = 'monitorOnlineRate'; }
    function openMonitorDetail(row) {
      currentMonitor.value = row;
      const defs = getCategoryProperties(row.categoryId);
      const pts = MONITOR_POINTS[row.id] || [];
      monCurvePointCode.value = defs.length ? defs[0].identifier : (pts.length ? pts[0].code : '');
      monCurveRange.value = 7;
      module.value = 'monitor';
      screen.value = 'monitorDetail';
    }
    function openMonitorCurve(row, pointCode) {
      if (row) currentMonitor.value = row;
      const defs = getCategoryProperties(currentMonitor.value.categoryId);
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
        categoryName: device.categoryName || '待归属',
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
      const defs = getCategoryProperties(row.categoryId);
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
    }

    function jump(hash) {
      resetOverlays();
      let tabFromQuery = null;
      let key = hash || '';
      if (key.includes('?')) {
        const parts = key.split('?');
        key = parts[0];
        try {
          tabFromQuery = new URLSearchParams(parts.slice(1).join('?')).get('tab');
        } catch (e) { tabFromQuery = null; }
      }
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
        editCommand: () => { openDetail(CATEGORIES[0]); detailTab.value = 'commands'; openEditCommand(commandList.value.find(c => c.code === 'installHeightMm') || commandList.value.find(c => Number(c.hasParam) === 1) || commandList.value[0]); },
        editPoint: () => { openDetail(CATEGORIES[0]); openEditPoint(POINTS[0]); },
        editInstall: () => { openDetail(CATEGORIES[0]); openEditInstall(INSTALL_FIELDS[0]); },
        editFirmware: () => { openDetail(CATEGORIES[0]); openCreateFirmware(); },
        deleteConfirm: () => { goList(); confirmDelete('品类', 'C003', '管网压力表'); },
        // ledger
        projects: () => goProjects(),
        createProject: () => { goProjects(); openCreateProject(); },
        editProject: () => { goProjects(); openEditProject(PROJECTS[0]); },
        devices: () => { deviceProjectFilter.value = ''; deviceCategoryFilter.value = ''; goDevices(); },
        unassignedDevices: () => goUnassignedDevices(),
        deviceDetail: () => openDeviceDetail(deviceList.value[0], tabFromQuery || 'profile'),
        deviceLocalData: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'localData'),
        devicePackets: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'localData'), // 旧 hash → 本机数据
        deviceDispatch: () => openDeviceDetail(deviceList.value.find(d => d.categoryId === 'C001') || deviceList.value[0], 'dispatch'),
        deviceSendLog: () => openDeviceDetail(deviceList.value.find(d => d.id === 'D001') || deviceList.value[0], 'sendLog'),
        editDevice: () => { openDeviceDetail(deviceList.value[0]); openEditDevice(deviceList.value[0]); },
        aepReconcile: () => goAepReconcile(),
        importExport: () => { goDevices(); openImportModal(); },
        exportHelp: () => { goDevices(); openExportModal(); },
        deviceTransfer: () => { goUnassignedDevices(); openTransferModal(unassignedDevices.value[0] || null); },
        // monitor
        monitor: () => goMonitorList(),
        monitorList: () => goMonitorList(),
        monitorDetail: () => openMonitorDetail(MONITOR_ROWS[0]),
        monitorCurve: () => openMonitorCurve(MONITOR_ROWS[0], 'yewei'),
        monitorOnlineRate: () => goMonitorOnlineRate(),
        monitorCurveLong: () => openMonitorCurve(MONITOR_ROWS.find(r => r.id === 'D006') || MONITOR_ROWS[0], 'rain'),
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
      showCategoryModal, showRuleModal, showCommandModal, showDeleteConfirm, showProjectModal, showImportModal, showDisableConfirm, showTransferModal
    };

    return {
      module, screen, detailTab, searchKeyword, filterIndustry,
      goCockpit, cockpitStats, cockpitSyncStatus, COCKPIT_TODOS, COCKPIT_ACTIVITIES,
      filteredCategories, industries, breadcrumb, topbarHint, currentCategory,
      CATEGORIES, PROPERTIES, EVENTS, POINTS, INSTALL_FIELDS, FIRMWARES, COMMANDS,
      currentCategoryProperties, getCategoryProperties,
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
      pointForm, pointFormMode, installForm, installFormMode, firmwareForm, firmwareFormMode,
      goList, openDetail, openCreateCategory, openEditCategory, saveCategory,
      confirmDelete, doDelete,
      openCreatePoint, openEditPoint, savePoint,
      openCreateInstall, openEditInstall, saveInstall,
      openCreateFirmware, openEditFirmware, saveFirmware,
      jump,
      // ledger
      PROJECTS, DEVICES, deviceList, LIFECYCLES, LC_CLASS, LC_TAG, PJ_STATUS_TAG,
      UNASSIGNED_PROJECT_ID, UNASSIGNED_PROJECT_NAME,
      projectSearch, projectStatusFilter, filteredProjects,
      showProjectModal, projectModalMode, projectForm,
      openCreateProject, openEditProject, saveProject, openDevicesForProject, openDevicesForCategory,
      goProjects, goDevices, goUnassignedDevices, goAepReconcile,
      deviceProjectFilter, deviceCategoryFilter, deviceLifecycleFilter, deviceImeiSearch, deviceMasterFilter, showProbeDevices, isProbeAepId, displayAepDeviceId,
      filteredDevices, deviceStats, currentDevice, openDeviceDetail,
      deviceDetailTab, setDeviceDetailTab, deviceDispatchCommands, dispatchSelectedCmds,
      dispatchSelected, dispatchParams, dispatchPreviewHex, dispatchPreviewOk,
      isDispatchSelected, toggleDispatchCmd, dryRunDispatch, sendDispatch, toast,
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
      showTransferModal, transferForm, transferLogs, currentDeviceTransferLogs,
      openTransferModal, confirmTransfer,
      aepDiffTab, aepLastSyncedAt, filteredAepDiffs, aepCounts, resolveAepDiff, syncFromAep,
      projectName, categoryName,
      // monitor
      MONITOR_ROWS, TRUST_TAG, TRUST_LABEL, ONLINE_TAG,
      monProjectFilter, monCategoryFilter, monOnlineFilter, monAlarmFilter, monSearch,
      filteredMonitorRows, monListStats, currentMonitor,
      monMetricColumns, monHasCategoryFilter, monSelectedCategoryName,
      monLatestPoints, monSelectedPoint, monCurveRange, monCurvePointCode, monCurveMode, monHoverT,
      monChartablePoints, monCurveCharts, monHoverReadout, monPointsEmptyHint, monCurveEmptyHint,
      monCurveSeries, monCurveSvg, monCycleFullQueryTip,
      onMonCurveMove, onMonCurveLeave, setMonCurveMode, isFiniteMetricValue,
      monOnlineRateSummary, monOnlineRateRows,
      goMonitorList, goMonitorOnlineRate, openMonitorDetail, openMonitorCurve, openMonitorForDevice,
      latestPointEntries, latestMetricValue, formatMetricCell, latestSummaryText, selectCurvePoint, FLOOD_POINT_KEYS,
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
        <div class="nav-group-title">设备管控</div>
        <div class="nav-item" :class="{active: module==='cockpit'}" @click="jump('cockpit')"><span class="dot"></span>驾驶舱 / 工作台</div>
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
        <!-- ===== 驾驶舱 / 工作台 ===== -->
        <div v-if="module==='cockpit'" class="page-card cockpit-page" data-screen="cockpit">
          <div class="page-header">
            <div>
              <h1 class="page-title">驾驶舱</h1>
              <p class="page-desc">登录后的工作台首页。项目与 AEP 产品 1:1；AEP 同步为主路径；「未定义项目」为例外池。非 GIS 大屏。</p>
            </div>
            <button class="btn btn-primary" @click="jump('aepReconcile')">同步自 AEP</button>
          </div>

          <div class="stat-row cockpit-stats">
            <div class="stat-chip accent" style="cursor:pointer" @click="jump('devices')"><div class="sc-label">设备总数</div><div class="sc-value">{{ cockpitStats.deviceTotal }}</div></div>
            <div class="stat-chip ok" style="cursor:pointer" @click="jump('monitor')"><div class="sc-label">在线</div><div class="sc-value">{{ cockpitStats.online }}</div></div>
            <div class="stat-chip danger" style="cursor:pointer" @click="jump('devices')"><div class="sc-label">离线 / 异常</div><div class="sc-value">{{ cockpitStats.offlineAbnormal }}</div></div>
            <div class="stat-chip" style="cursor:pointer" @click="jump('projects')"><div class="sc-label">项目数</div><div class="sc-value">{{ cockpitStats.projectCount }}</div></div>
            <div class="stat-chip warn" style="cursor:pointer" @click="jump('unassignedDevices')" title="例外池，非主路径"><div class="sc-label">例外池（未定义项目）</div><div class="sc-value">{{ cockpitStats.unassigned }}</div></div>
            <div class="stat-chip warn" style="cursor:pointer" @click="jump('aepReconcile')"><div class="sc-label">待处理对账差异</div><div class="sc-value">{{ cockpitStats.pendingDiff }}</div></div>
          </div>

          <div class="cockpit-mid">
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>最近 AEP 同步</h3>
                <span class="tag" :class="cockpitSyncStatus.ok ? 'tag-green' : 'tag-orange'">{{ cockpitSyncStatus.result }}</span>
              </div>
              <div class="cockpit-sync-body">
                <div class="sync-row"><span class="k">最近同步</span><span class="v">{{ cockpitSyncStatus.lastAt }}</span></div>
                <div class="sync-row"><span class="k">同步结果</span><span class="v">{{ cockpitSyncStatus.ok ? '清单一致' : cockpitSyncStatus.summary }}</span></div>
                <div class="sync-row"><span class="k">口径</span><span class="v">周期对账 · OpenAPI 绑定为主 · 例外池不覆盖已挂项目</span></div>
                <div class="cockpit-sync-actions">
                  <button class="btn btn-primary" @click="jump('aepReconcile')">查看对账差异</button>
                  <button class="btn" @click="syncFromAep">立即同步</button>
                </div>
              </div>
            </div>
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>快捷入口</h3>
              </div>
              <div class="quick-chips">
                <button class="quick-chip" @click="jump('list')">物模型 · 品类</button>
                <button class="quick-chip" @click="jump('projects')">项目列表</button>
                <button class="quick-chip" @click="jump('devices')">设备列表</button>
                <button class="quick-chip accent" @click="jump('aepReconcile')">AEP 对账</button>
                <button class="quick-chip warn" @click="jump('unassignedDevices')">例外池 · 未定义项目 <span class="tag tag-orange" style="margin-left:4px">{{ cockpitStats.unassigned }}</span></button>
                <button class="quick-chip" @click="jump('monitor')">在线监控</button>
                <span class="quick-chip muted" title="一期未开放">告警（未开放）</span>
              </div>
            </div>
          </div>

          <div class="cockpit-bottom">
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>例外待办</h3>
                <span class="sub-nav-hint">未挂项目设备 · 对账待处理</span>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>类型</th><th>对象</th><th>说明</th><th>时间</th><th>操作</th></tr></thead>
                  <tbody>
                    <tr v-for="t in COCKPIT_TODOS" :key="t.id">
                      <td><span class="tag" :class="t.severity==='danger'?'tag-red':'tag-orange'">{{ t.type }}</span></td>
                      <td>
                        <div>{{ t.title }}</div>
                        <code style="font-size:12px;color:#888">{{ t.imei }}</code>
                      </td>
                      <td style="max-width:280px;white-space:normal">{{ t.detail }}</td>
                      <td>{{ t.time }}</td>
                      <td class="actions"><button class="btn-link btn" @click="jump(t.target)">处理</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="cockpit-panel">
              <div class="cockpit-panel-hd">
                <h3>近期动态</h3>
              </div>
              <ul class="cockpit-timeline">
                <li v-for="a in COCKPIT_ACTIVITIES" :key="a.id" :class="'tone-'+a.tone">
                  <div class="tl-dot"></div>
                  <div class="tl-body">
                    <div class="tl-meta"><span class="tl-time">{{ a.time }}</span><span class="tl-actor">{{ a.actor }}</span></div>
                    <div class="tl-action">{{ a.action }}</div>
                    <div class="tl-result">{{ a.result }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- ===== 物模型：品类列表 ===== -->
        <div v-else-if="module==='thing' && screen==='list'" class="page-card" data-screen="category-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">物模型 · 品类管理</h1>
              <p class="page-desc">物模型定义产品类型语义（测点 / 事件 / 阈值 / 安装模板 / 固件 / 指令）。AEP 完成设备数据解析后，由归属规则自动挂靠品类；未匹配进入「待归属」。</p>
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
              <thead><tr><th>品类 ID</th><th>品类名称</th><th>编码</th><th>行业</th><th>归属规则</th><th>设备数</th><th>物模型版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="c in filteredCategories" :key="c.id">
                  <td>{{ c.id }}</td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDetail(c)">{{ c.name }}</a></td>
                  <td><code>{{ c.code }}</code></td>
                  <td>{{ c.industry }}</td>
                  <td><span class="tag tag-blue">{{ categoryRules.filter(r => r.categoryId===c.id).length }} 条</span></td>
                  <td>
                    <a class="btn-link btn" style="padding:0" @click="openDevicesForCategory(c)" :title="'查看挂靠「'+c.name+'」的设备'">{{ c.deviceCount }}</a>
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
            <div style="display:flex;gap:8px">
              <button class="btn" @click="openDevicesForCategory(currentCategory)">查看设备</button>
              <button class="btn" @click="openEditCategory(currentCategory)">编辑品类</button>
              <button class="btn btn-primary" @click="detailTab='rules'">归属规则</button>
            </div>
          </div>
          <div class="banner-tip" style="margin-bottom:12px">AEP 侧已完成设备数据解析；本平台通过归属规则自动挂靠品类。无需维护解析脚本。未匹配设备进入「待归属」。</div>
          <div class="tabs">
            <div class="tab" :class="{active: detailTab==='props'}" @click="detailTab='props'">上报属性</div>
            <div class="tab" :class="{active: detailTab==='events'}" @click="detailTab='events'">异常事件</div>
            <div class="tab" :class="{active: detailTab==='points'}" @click="detailTab='points'">测点字典</div>
            <div class="tab" :class="{active: detailTab==='install'}" @click="detailTab='install'">安装参数模板</div>
            <div class="tab" :class="{active: detailTab==='firmware'}" @click="detailTab='firmware'">固件基线</div>
            <div class="tab" :class="{active: detailTab==='commands'}" @click="detailTab='commands'">指令</div>
            <div class="tab" :class="{active: detailTab==='rules'}" @click="detailTab='rules'">归属规则</div>
          </div>
          <div v-if="detailTab==='props'">
            <div class="toolbar"><span style="color:#666;font-size:13px">设备按周期上报的属性定义（与 AEP 解析后的属性对齐）</span><div class="spacer"></div><button class="btn btn-primary btn-sm">＋ 添加属性</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>标识符</th><th>名称</th><th>数据类型</th><th>单位</th><th>访问</th><th>上报周期</th><th>必报</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="p in currentCategoryProperties" :key="p.id"><td><code>{{ p.identifier }}</code></td><td>{{ p.name }}</td><td>{{ p.dataType }}</td><td>{{ p.unit || '—' }}</td><td>{{ p.access }}</td><td>{{ p.reportCycle }}</td><td><span class="tag" :class="p.required?'tag-blue':'tag-gray'">{{ p.required?'是':'否' }}</span></td><td class="actions"><button class="btn-link btn">编辑</button><button class="btn-link btn danger" @click="confirmDelete('上报属性', p.id, p.name)">删除</button></td></tr>
                <tr v-if="!currentCategoryProperties.length"><td colspan="8"><div class="empty-hint">本品类暂无上报属性（kind=property）</div></td></tr>
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
            <div class="toolbar"><span style="color:#666;font-size:13px">固件型号、当前版本、可升级版本登记</span><div class="spacer"></div><button class="btn btn-primary btn-sm" @click="openCreateFirmware">＋ 登记固件版本</button></div>
            <div class="table-wrap"><table class="data-table"><thead><tr><th>型号</th><th>当前版本</th><th>可升版</th><th>发布日期</th><th>状态</th><th>变更说明</th><th>操作</th></tr></thead>
              <tbody><tr v-for="f in FIRMWARES" :key="f.id"><td><code>{{ f.model }}</code></td><td>{{ f.currentVersion }}</td><td>{{ f.upgradeVersion || '—' }}</td><td>{{ f.releaseDate }}</td><td><span class="tag" :class="f.status==='可升级'?'tag-orange':(f.status==='最新'?'tag-green':'tag-blue')">{{ f.status }}</span></td><td style="max-width:240px;white-space:normal">{{ f.changelog }}</td><td class="actions"><button class="btn-link btn" @click="openEditFirmware(f)">编辑</button><button class="btn-link btn danger" @click="confirmDelete('固件版本', f.id, f.model+' '+f.currentVersion)">删除</button></td></tr></tbody></table></div>
          </div>
          <div v-else-if="detailTab==='commands'">
            <div class="banner-muted">字节17–24 为命令开关（bitIndex 1-based，bit=1 执行；积水仪位 9 空缺）；内容从 payloadOffset（1-based 内容起始字节）起写入。组包时选中指令自动置对应位。</div>
            <div class="toolbar">
              <span style="color:#666;font-size:13px">配置本品类「能下什么」：命令位 vs 内容载荷。本 Tab 只配定义，不是实时点发。</span>
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
                    <td colspan="8"><div class="empty-hint">暂无归属规则；未匹配设备将进入「待归属」</div></td>
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
              <h1 class="page-title">{{ deviceProjectFilter===UNASSIGNED_PROJECT_ID ? '例外池 · 未定义项目' : (deviceCategoryFilter ? ('设备列表 · ' + categoryName(deviceCategoryFilter)) : '设备列表') }}</h1>
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
              <option v-for="c in CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
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
            <button class="btn" @click="deviceProjectFilter=''; deviceCategoryFilter=''; deviceLifecycleFilter=''; deviceImeiSearch=''; deviceMasterFilter=''; showProbeDevices=false; selectedDeviceIds=[]">重置</button>
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
                  <td><a class="btn-link btn" style="padding:0" @click="openDeviceDetail(d)">{{ d.name }}</a></td>
                  <td>
                    <span v-if="!d.projectId" class="tag tag-orange">未定义项目</span>
                    <span v-else>{{ d.projectName }}</span>
                  </td>
                  <td>
                    <span v-if="!d.categoryId" class="tag tag-gray">待归属</span>
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
          <div class="table-note">品类默认由归属规则自动匹配；「挂靠规则」列=categoryRuleId（含 fallback:型号）。列表默认隐藏 aepDeviceId 以 probe: 开头的探头子设备（选主机或勾选「显示探头」可见）。probe:{SN} 为合成键，真 AEP ID 看父一体机。</div>
        </div>

        <!-- ===== 设备台账：设备档案详情 ===== -->
        <div v-else-if="module==='ledger' && screen==='deviceDetail'" class="page-card detail-shell" data-screen="ledger-device-detail">
          <button class="back-link" @click="goDevices">← 返回设备列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentDevice.name }}</h1>
              <div class="detail-meta">
                <span>IMEI：<b>{{ currentDevice.imei }}</b></span>
                <span>项目：
                  <b v-if="!currentDevice.projectId" style="color:#E78212">未定义项目 · 例外池</b>
                  <b v-else>{{ currentDevice.projectName }}</b>
                </span>
                <span>品类：
                  <b v-if="!currentDevice.categoryId" style="color:#8c8c8c">待归属</b>
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
              <button class="btn" @click="setDeviceDetailTab('sendLog')">设备发送记录</button>
              <button class="btn" v-if="canShowChildDevices" @click="setDeviceDetailTab('children')">子设备（探头） · {{ currentDeviceSlaves.length }}</button>
              <button class="btn" @click="openMonitorForDevice(currentDevice)">{{ canShowChildDevices ? '曲线 · 先选探头' : '曲线（在线监控）' }}</button>
              <button class="btn" @click="openTransferModal(currentDevice)">例外处理 · 人工改挂</button>
              <button class="btn" @click="openEditDevice(currentDevice)">编辑档案</button>
              <button class="btn btn-danger" @click="openDisableDevice" :disabled="currentDevice.lifecycle==='停用'||currentDevice.lifecycle==='报废'">停用</button>
            </div>
          </div>

          <div class="tabs" style="margin-top:4px">
            <div class="tab" :class="{active: deviceDetailTab==='profile'}" @click="setDeviceDetailTab('profile')">档案</div>
            <div class="tab" :class="{active: deviceDetailTab==='localData'}" @click="setDeviceDetailTab('localData')">本机数据</div>
            <div class="tab" :class="{active: deviceDetailTab==='dispatch'}" @click="setDeviceDetailTab('dispatch')">指令</div>
            <div class="tab" :class="{active: deviceDetailTab==='sendLog'}" @click="setDeviceDetailTab('sendLog')">设备发送记录</div>
            <div class="tab" v-if="canShowChildDevices" :class="{active: deviceDetailTab==='children'}" @click="setDeviceDetailTab('children')">子设备</div>
          </div>

          <template v-if="deviceDetailTab==='profile'">
          <div class="info-section">
            <div class="info-section-title">基础信息</div>
            <div class="kv-grid">
              <div class="k">设备 ID</div><div class="v">{{ currentDevice.id }}</div>
              <div class="k">AEP 设备 ID</div><div class="v">
                <template v-if="isProbeAepId(currentDevice.aepDeviceId)">
                  <code>{{ currentDevice.aepDeviceId }}</code>
                  <span class="tag tag-gray" style="margin-left:6px">合成键 · 非真 AEP ID</span>
                  <div class="hint" style="margin-top:4px">真 AEP 设备 id 请看主机：{{ (currentDeviceMaster && currentDeviceMaster.aepDeviceId) || '—' }}</div>
                </template>
                <template v-else>{{ currentDevice.aepDeviceId || '—' }}</template>
              </div>
              <div class="k">物模型品类</div><div class="v">{{ currentDevice.categoryName || '待归属' }} <span class="tag" :class="currentDevice.categoryMatch==='auto'?'tag-blue':(currentDevice.categoryMatch==='manual'?'tag-orange':'tag-gray')">{{ categoryMatchLabel(currentDevice.categoryMatch) }}</span></div>
              <div class="k">挂靠规则 ID</div><div class="v"><code v-if="currentDevice.categoryRuleId">{{ currentDevice.categoryRuleId }}</code><span v-else>—</span> <span class="sub-nav-hint">解绑品类时清空；型号兜底形如 fallback:0042</span></div>
              <div class="k">所属项目</div><div class="v">{{ displayProjectName(currentDevice) }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentDevice.model }}</div>
              <div class="k">固件版本</div><div class="v">{{ currentDevice.firmware }}</div>
              <div class="k">安装日期</div><div class="v">{{ currentDevice.installDate || '—' }}</div>
              <div class="k">安装人</div><div class="v">{{ currentDevice.installer || '—' }}</div>
              <div class="k">安装地址</div><div class="v">{{ currentDevice.address || '—' }}</div>
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
                    <td>{{ s.name }}</td>
                    <td>
                      <span v-if="isProbeAepId(s.aepDeviceId)" class="tag tag-gray">{{ s.aepDeviceId }}</span>
                      <span v-else>{{ s.aepDeviceId || '—' }}</span>
                    </td>
                    <td><span class="tag" :class="LC_TAG[s.lifecycle]">{{ s.lifecycle }}</span></td>
                    <td>{{ s.categoryName || '待归属' }}</td>
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
            <div v-if="!currentDevice.categoryId" class="empty-hint">设备待归属品类，无法加载指令</div>
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
                <input class="input input-full" :value="(CATEGORIES.find(c=>c.id===deviceForm.categoryId)||{}).name || '待归属'" disabled />
                <div class="hint">
                  由归属规则自动挂靠 · {{ categoryMatchLabel(deviceForm.categoryMatch) }}
                  <a class="btn-link btn" style="padding:0;margin-left:8px" @click="showCategoryOverride=true">改挂</a>
                </div>
              </div>
              <div v-else>
                <select class="select input-full" v-model="deviceForm.categoryId">
                  <option value="">待归属</option>
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
            <div style="display:flex;gap:8px">
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
            已选品类「{{ monSelectedCategoryName }}」· 测点列 {{ monMetricColumns.length }} 个（
            <template v-for="(col, idx) in monMetricColumns" :key="col.id"><code>{{ col.identifier }}</code><span v-if="idx < monMetricColumns.length - 1"> · </span></template>）
          </div>
          <div class="banner-muted mon-hint" v-else>选择品类以展开测点列</div>
          <div class="table-wrap">
            <table class="data-table mon-table" data-testid="mon-list-table">
              <thead>
                <tr>
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
                    <td v-for="col in monMetricColumns" :key="col.identifier" class="metric-cell">
                      <b class="metric-val">{{ latestMetricValue(d, col.identifier) == null ? '—' : latestMetricValue(d, col.identifier) }}</b>
                      <span class="metric-unit" v-if="col.unit && latestMetricValue(d, col.identifier) != null">{{ col.unit }}</span>
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
                  <td :colspan="monHasCategoryFilter ? (5 + monMetricColumns.length) : 6"><div class="empty-hint">无匹配监控设备</div></td>
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
                <span>IMEI：<b>{{ currentMonitor.imei }}</b></span>
                <span>项目：<b>{{ currentMonitor.projectName }}</b></span>
                <span>品类：<b>{{ currentMonitor.categoryName }}</b></span>
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
            <div class="info-section-title">最新数据 <span class="sub-nav-hint">指标源=品类 kind=property 属性（顺序同物模型）· 值取 MONITOR_POINTS / latest_json[identifier] · 无有效数值的属性不参与下方曲线</span></div>
            <div class="banner-muted" style="margin-bottom:10px">仅展示本设备品类物模型 property；未关联品类或品类无属性时不扫 history / latest_json 全字段。</div>
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
              <div class="k">设备 ID</div><div class="v">{{ currentMonitor.id }}</div>
              <div class="k">硬件型号</div><div class="v">{{ currentMonitor.model }}</div>
              <div class="k">固件版本</div><div class="v">{{ currentMonitor.firmware }}</div>
              <div class="k">告警摘要</div><div class="v">{{ alarmSummaryText(currentMonitor) }}</div>
              <div class="k">可信说明</div><div class="v">{{ TRUST_LABEL[currentMonitor.trustLevel] }}（{{ currentMonitor.trustLevel }} / {{ currentMonitor.trustScore }} 分）</div>
              <div class="k">latest_json</div><div class="v"><code style="font-size:12px">{{ latestSummaryText(currentMonitor) }}</code></div>
            </div>
          </div>
          <div class="table-note">测点与曲线仅按品类 property 标识符对齐；无有效数值的属性不画曲线（如 D001 dianya / D006·D007 全空演示空态）。PG 时序示意，非实时接入。</div>
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
            <div class="form-item"><label>状态</label><select class="select input-full" v-model="categoryForm.status"><option>启用</option><option>草稿</option><option>停用</option></select></div>
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

    <div v-if="toast.show" class="toast" :class="'toast-'+toast.type">{{ toast.text }}</div>

  </div>
  `
}).mount('#app');
