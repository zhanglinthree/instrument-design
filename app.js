const { createApp, ref, computed, reactive, watch, nextTick } = Vue;

const CATEGORIES = [
  { id: 'C001', name: '液位监测井', code: 'level_well', industry: '市政排水', aepBound: true, aepProductId: 'AEP-LW-1001', deviceCount: 128, modelVersion: 'v1.2.0', updatedAt: '2026-09-28 14:22', status: '启用' },
  { id: 'C002', name: '水质监测站', code: 'water_quality', industry: '环保监测', aepBound: true, aepProductId: 'AEP-WQ-2003', deviceCount: 56, modelVersion: 'v2.0.1', updatedAt: '2026-09-26 09:10', status: '启用' },
  { id: 'C003', name: '管网压力表', code: 'pipe_pressure', industry: '供水', aepBound: false, aepProductId: '', deviceCount: 0, modelVersion: 'v0.9.0', updatedAt: '2026-09-20 16:45', status: '草稿' },
  { id: 'C004', name: '泵站机组', color: '', code: 'pump_unit', industry: '市政排水', aepBound: true, aepProductId: 'AEP-PU-3012', deviceCount: 34, modelVersion: 'v1.0.3', updatedAt: '2026-09-18 11:30', status: '启用' },
  { id: 'C005', name: '雨量计', code: 'rain_gauge', industry: '气象水文', aepBound: false, aepProductId: '', deviceCount: 12, modelVersion: 'v1.1.0', updatedAt: '2026-09-12 08:05', status: '停用' },
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

createApp({
  setup() {
    const screen = ref('list'); // list | detail | editPoint | editInstall | editFirmware
    const detailTab = ref('points'); // props | events | points | install | firmware
    const searchKeyword = ref('');
    const filterIndustry = ref('');
    const filterAep = ref('');

    const showCategoryModal = ref(false);
    const categoryModalMode = ref('create'); // create | edit
    const categoryForm = reactive({
      id: '', name: '', code: '', industry: '市政排水', desc: '', aepProductId: '', status: '启用'
    });

    const showAepModal = ref(false);
    const aepForm = reactive({ categoryId: '', aepProductId: '', aepProductName: '' });

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

    const breadcrumb = computed(() => {
      if (screen.value === 'list') return { parent: '设备管控', current: '物模型 · 品类列表' };
      if (screen.value === 'detail') return { parent: '物模型', current: currentCategory.value.name + ' · 详情' };
      if (screen.value === 'editPoint') return { parent: currentCategory.value.name, current: pointFormMode.value === 'create' ? '添加测点' : '编辑测点' };
      if (screen.value === 'editInstall') return { parent: currentCategory.value.name, current: installFormMode.value === 'create' ? '添加安装字段' : '编辑安装字段' };
      if (screen.value === 'editFirmware') return { parent: currentCategory.value.name, current: firmwareFormMode.value === 'create' ? '登记固件版本' : '编辑固件版本' };
      return { parent: '设备管控', current: '物模型' };
    });

    function goList() { screen.value = 'list'; }
    function openDetail(cat) {
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
    function saveCategory() {
      showCategoryModal.value = false;
    }

    function openBindAep(cat) {
      aepForm.categoryId = cat.id;
      aepForm.aepProductId = cat.aepProductId || '';
      aepForm.aepProductName = cat.name;
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

    // Deep-link / demo helpers for screenshots
    function resetOverlays() {
      showCategoryModal.value = false;
      showAepModal.value = false;
      showDeleteConfirm.value = false;
    }
    function jump(hash) {
      resetOverlays();
      const map = {
        list: () => { screen.value = 'list'; },
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
      };
      if (map[hash]) map[hash]();
    }

    // hash routing
    function applyHash() {
      const h = (location.hash || '#list').replace('#', '');
      jump(h || 'list');
    }
    window.addEventListener('hashchange', applyHash);
    nextTick(applyHash);

    // expose for screenshot automation
    window.__protoApp = { jump, screen, detailTab, showCategoryModal, showDeleteConfirm };

    return {
      screen, detailTab, searchKeyword, filterIndustry, filterAep,
      filteredCategories, industries, breadcrumb, currentCategory,
      CATEGORIES, PROPERTIES, EVENTS, POINTS, INSTALL_FIELDS, FIRMWARES,
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
        <div class="nav-item"><span class="dot"></span>设备台账</div>
        <div class="nav-item"><span class="dot"></span>设备监控</div>
        <div class="nav-item active" @click="jump('list')"><span class="dot"></span>物模型</div>
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
          <span>一期原型 · 物模型</span>
          <div class="avatar">张</div>
        </div>
      </header>

      <main class="content">
        <!-- ========== 1. 品类列表 ========== -->
        <div v-if="screen === 'list'" class="page-card" data-screen="category-list">
          <div class="page-header">
            <div>
              <h1 class="page-title">物模型 · 品类管理</h1>
              <p class="page-desc">维护设备品类、绑定 AEP 产品，并配置测点字典 / 安装参数 / 固件基线</p>
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
              <option value="">AEP 绑定状态</option>
              <option value="bound">已绑定</option>
              <option value="unbound">未绑定</option>
            </select>
            <button class="btn" @click="searchKeyword=''; filterIndustry=''; filterAep=''">重置</button>
            <div class="spacer"></div>
            <button class="btn btn-orange" @click="openBindAep(CATEGORIES[2])">绑 AEP</button>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>品类 ID</th>
                  <th>品类名称</th>
                  <th>编码</th>
                  <th>行业</th>
                  <th>AEP 绑定</th>
                  <th>设备数</th>
                  <th>物模型版本</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in filteredCategories" :key="c.id">
                  <td>{{ c.id }}</td>
                  <td><a class="btn-link btn" style="padding:0" @click="openDetail(c)">{{ c.name }}</a></td>
                  <td><code>{{ c.code }}</code></td>
                  <td>{{ c.industry }}</td>
                  <td>
                    <span v-if="c.aepBound" class="badge-aep">
                      <span class="dot-online"></span>
                      <span class="tag tag-green">{{ c.aepProductId }}</span>
                    </span>
                    <span v-else class="badge-aep">
                      <span class="dot-offline"></span>
                      <span class="tag tag-gray">未绑定</span>
                    </span>
                  </td>
                  <td>{{ c.deviceCount }}</td>
                  <td>{{ c.modelVersion }}</td>
                  <td>
                    <span class="tag" :class="c.status==='启用'?'tag-blue':(c.status==='草稿'?'tag-orange':'tag-gray')">{{ c.status }}</span>
                  </td>
                  <td>{{ c.updatedAt }}</td>
                  <td class="actions">
                    <button class="btn-link btn" @click="openDetail(c)">物模型</button>
                    <button class="btn-link btn" @click="openEditCategory(c)">编辑</button>
                    <button class="btn-link btn" @click="openBindAep(c)">{{ c.aepBound ? '换绑' : '绑 AEP' }}</button>
                    <button class="btn-link btn danger" @click="confirmDelete('品类', c.id, c.name)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination">
            <span>共 {{ filteredCategories.length }} 条</span>
            <button class="page-btn active">1</button>
            <button class="page-btn">2</button>
            <button class="page-btn">›</button>
          </div>
        </div>

        <!-- ========== 4. 物模型详情壳 ========== -->
        <div v-else-if="screen === 'detail'" class="page-card detail-shell" data-screen="thing-detail">
          <button class="back-link" @click="goList">← 返回品类列表</button>
          <div class="detail-top">
            <div>
              <h1 class="page-title">{{ currentCategory.name }}</h1>
              <div class="detail-meta">
                <span>品类 ID：<b>{{ currentCategory.id }}</b></span>
                <span>编码：<b>{{ currentCategory.code }}</b></span>
                <span>行业：<b>{{ currentCategory.industry }}</b></span>
                <span>物模型：<b>{{ currentCategory.modelVersion }}</b></span>
                <span>AEP：
                  <b v-if="currentCategory.aepBound">{{ currentCategory.aepProductId }}</b>
                  <b v-else style="color:#E78212">未绑定</b>
                </span>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" @click="openEditCategory(currentCategory)">编辑品类</button>
              <button class="btn btn-orange" @click="openBindAep(currentCategory)">绑 AEP</button>
            </div>
          </div>

          <div class="tabs">
            <div class="tab" :class="{active: detailTab==='props'}" @click="detailTab='props'">上报属性</div>
            <div class="tab" :class="{active: detailTab==='events'}" @click="detailTab='events'">异常事件</div>
            <div class="tab" :class="{active: detailTab==='points'}" @click="detailTab='points'">测点字典</div>
            <div class="tab" :class="{active: detailTab==='install'}" @click="detailTab='install'">安装参数模板</div>
            <div class="tab" :class="{active: detailTab==='firmware'}" @click="detailTab='firmware'">固件基线</div>
          </div>

          <!-- Tab: 上报属性 -->
          <div v-if="detailTab==='props'" data-tab="props">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">设备按周期上报的属性定义（与 AEP 物模型属性对齐）</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm">＋ 添加属性</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>标识符</th><th>名称</th><th>数据类型</th><th>单位</th><th>访问</th><th>上报周期</th><th>必报</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in PROPERTIES" :key="p.id">
                    <td><code>{{ p.identifier }}</code></td>
                    <td>{{ p.name }}</td>
                    <td>{{ p.dataType }}</td>
                    <td>{{ p.unit }}</td>
                    <td>{{ p.access }}</td>
                    <td>{{ p.reportCycle }}</td>
                    <td><span class="tag" :class="p.required?'tag-blue':'tag-gray'">{{ p.required?'是':'否' }}</span></td>
                    <td class="actions">
                      <button class="btn-link btn">编辑</button>
                      <button class="btn-link btn danger" @click="confirmDelete('上报属性', p.id, p.name)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: 异常事件 -->
          <div v-else-if="detailTab==='events'" data-tab="events">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">预警 / 报警 / 故障事件定义</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm">＋ 添加事件</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>标识符</th><th>事件名称</th><th>级别</th><th>触发条件</th><th>说明</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in EVENTS" :key="e.id">
                    <td><code>{{ e.identifier }}</code></td>
                    <td>{{ e.name }}</td>
                    <td>
                      <span class="tag" :class="e.level==='报警'?'tag-red':(e.level==='预警'?'tag-orange':'tag-gray')">{{ e.level }}</span>
                    </td>
                    <td>{{ e.trigger }}</td>
                    <td>{{ e.desc }}</td>
                    <td class="actions">
                      <button class="btn-link btn">编辑</button>
                      <button class="btn-link btn danger" @click="confirmDelete('异常事件', e.id, e.name)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: 测点字典 -->
          <div v-else-if="detailTab==='points'" data-tab="points">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">测点含单位、范围、采集周期、预警/报警/故障阈值（一期核心）</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" @click="openCreatePoint">＋ 添加测点</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>编码</th><th>名称</th><th>单位</th><th>类型</th><th>范围</th><th>采集周期(s)</th>
                    <th>预警</th><th>报警</th><th>故障</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in POINTS" :key="m.id">
                    <td><code>{{ m.code }}</code></td>
                    <td>{{ m.name }}</td>
                    <td>{{ m.unit }}</td>
                    <td>{{ m.dataType }}</td>
                    <td>{{ m.min }} ~ {{ m.max }}</td>
                    <td>{{ m.cycle }}</td>
                    <td>
                      <span class="tag tag-orange">
                        {{ m.warnLow !== '' ? '↓'+m.warnLow : '' }}{{ (m.warnLow!==''&&m.warnHigh!=='')?' / ':'' }}{{ m.warnHigh !== '' ? '↑'+m.warnHigh : '' }}{{ m.warnLow===''&&m.warnHigh===''?'—':'' }}
                      </span>
                    </td>
                    <td>
                      <span class="tag tag-red">
                        {{ m.alarmLow !== '' ? '↓'+m.alarmLow : '' }}{{ (m.alarmLow!==''&&m.alarmHigh!=='')?' / ':'' }}{{ m.alarmHigh !== '' ? '↑'+m.alarmHigh : '' }}{{ m.alarmLow===''&&m.alarmHigh===''?'—':'' }}
                      </span>
                    </td>
                    <td>
                      <span class="tag tag-gray">
                        {{ m.faultLow !== '' ? '↓'+m.faultLow : '' }}{{ (m.faultLow!==''&&m.faultHigh!=='')?' / ':'' }}{{ m.faultHigh !== '' ? '↑'+m.faultHigh : '' }}{{ m.faultLow===''&&m.faultHigh===''?'—':'' }}
                      </span>
                    </td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openEditPoint(m)">编辑</button>
                      <button class="btn-link btn danger" @click="confirmDelete('测点', m.id, m.name)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: 安装参数模板 -->
          <div v-else-if="detailTab==='install'" data-tab="install">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">现场安装登记字段模板，如井深、管径、安装高度等</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" @click="openCreateInstall">＋ 添加字段</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>字段编码</th><th>字段名称</th><th>数据类型</th><th>单位</th><th>必填</th><th>默认值</th><th>示例</th><th>说明</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in INSTALL_FIELDS" :key="f.id">
                    <td><code>{{ f.code }}</code></td>
                    <td>{{ f.name }}</td>
                    <td>{{ f.dataType }}</td>
                    <td>{{ f.unit }}</td>
                    <td><span class="tag" :class="f.required?'tag-blue':'tag-gray'">{{ f.required?'是':'否' }}</span></td>
                    <td>{{ f.defaultVal || '—' }}</td>
                    <td>{{ f.example }}</td>
                    <td>{{ f.desc }}</td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openEditInstall(f)">编辑</button>
                      <button class="btn-link btn danger" @click="confirmDelete('安装字段', f.id, f.name)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: 固件基线 -->
          <div v-else-if="detailTab==='firmware'" data-tab="firmware">
            <div class="toolbar">
              <span style="color:#666;font-size:13px">固件型号、当前版本、可升级版本登记</span>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" @click="openCreateFirmware">＋ 登记固件版本</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>型号</th><th>当前版本</th><th>可升版</th><th>发布日期</th><th>状态</th><th>变更说明</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in FIRMWARES" :key="f.id">
                    <td><code>{{ f.model }}</code></td>
                    <td>{{ f.currentVersion }}</td>
                    <td>{{ f.upgradeVersion || '—' }}</td>
                    <td>{{ f.releaseDate }}</td>
                    <td>
                      <span class="tag" :class="f.status==='可升级'?'tag-orange':(f.status==='最新'?'tag-green':'tag-blue')">{{ f.status }}</span>
                    </td>
                    <td style="max-width:240px;white-space:normal">{{ f.changelog }}</td>
                    <td class="actions">
                      <button class="btn-link btn" @click="openEditFirmware(f)">编辑</button>
                      <button class="btn-link btn danger" @click="confirmDelete('固件版本', f.id, f.model+' '+f.currentVersion)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========== 5. 编辑测点表单 ========== -->
        <div v-else-if="screen === 'editPoint'" class="page-card" data-screen="edit-point">
          <button class="back-link" @click="screen='detail'; detailTab='points'">← 返回测点字典</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">{{ pointFormMode==='create'?'添加测点':'编辑测点' }}</h1>
              <p class="page-desc">品类：{{ currentCategory.name }} · 配置单位、范围、采集周期与预警/报警/故障阈值</p>
            </div>
          </div>

          <div class="form-section-title">基本信息</div>
          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>测点编码</label>
              <input class="input input-full" v-model="pointForm.code" placeholder="如 LL" />
            </div>
            <div class="form-item">
              <label><span class="req">*</span>测点名称</label>
              <input class="input input-full" v-model="pointForm.name" placeholder="如 液位" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>数据类型</label>
              <select class="select input-full" v-model="pointForm.dataType">
                <option value="float">float</option>
                <option value="int">int</option>
                <option value="bool">bool</option>
                <option value="string">string</option>
              </select>
            </div>
            <div class="form-item">
              <label><span class="req">*</span>单位</label>
              <input class="input input-full" v-model="pointForm.unit" placeholder="如 m / V / ℃ / dBm" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>量程下限</label>
              <input class="input input-full" v-model="pointForm.min" type="number" />
            </div>
            <div class="form-item">
              <label>量程上限</label>
              <input class="input input-full" v-model="pointForm.max" type="number" />
            </div>
            <div class="form-item">
              <label><span class="req">*</span>采集周期 (秒)</label>
              <input class="input input-full" v-model="pointForm.cycle" type="number" />
            </div>
          </div>

          <div class="form-section-title">阈值配置（预警 / 报警 / 故障）</div>
          <div class="alert-levels">
            <div class="alert-card warn">
              <h4>预警阈值</h4>
              <div class="form-row">
                <div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.warnLow" type="number" /></div>
                <div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.warnHigh" type="number" /></div>
              </div>
            </div>
            <div class="alert-card alarm">
              <h4>报警阈值</h4>
              <div class="form-row">
                <div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.alarmLow" type="number" /></div>
                <div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.alarmHigh" type="number" /></div>
              </div>
            </div>
            <div class="alert-card fault">
              <h4>故障阈值</h4>
              <div class="form-row">
                <div class="form-item"><label>下限</label><input class="input input-full" v-model="pointForm.faultLow" type="number" /></div>
                <div class="form-item"><label>上限</label><input class="input input-full" v-model="pointForm.faultHigh" type="number" /></div>
              </div>
            </div>
            <div class="alert-card info">
              <h4>说明</h4>
              <p style="margin:0;font-size:12px;color:#666;line-height:1.6">优先级：故障 &gt; 报警 &gt; 预警。留空表示不启用该侧阈值。与一期告警规则引擎对齐。</p>
            </div>
          </div>

          <div class="form-item" style="margin-top:16px">
            <label>备注说明</label>
            <textarea class="textarea input-full" v-model="pointForm.desc" placeholder="测点业务含义"></textarea>
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="btn" @click="screen='detail'; detailTab='points'">取消</button>
            <button class="btn btn-primary" @click="savePoint">保存</button>
          </div>
        </div>

        <!-- ========== 6. 编辑安装字段表单 ========== -->
        <div v-else-if="screen === 'editInstall'" class="page-card" data-screen="edit-install">
          <button class="back-link" @click="screen='detail'; detailTab='install'">← 返回安装参数模板</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">{{ installFormMode==='create'?'添加安装字段':'编辑安装字段' }}</h1>
              <p class="page-desc">品类：{{ currentCategory.name }} · 示例字段：井深、管径、安装高度</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>字段编码</label>
              <input class="input input-full" v-model="installForm.code" placeholder="如 well_depth" />
            </div>
            <div class="form-item">
              <label><span class="req">*</span>字段名称</label>
              <input class="input input-full" v-model="installForm.name" placeholder="如 井深" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>数据类型</label>
              <select class="select input-full" v-model="installForm.dataType">
                <option value="float">float</option>
                <option value="int">int</option>
                <option value="string">string</option>
                <option value="enum">enum</option>
              </select>
            </div>
            <div class="form-item">
              <label>单位</label>
              <input class="input input-full" v-model="installForm.unit" placeholder="如 m / mm" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>是否必填</label>
              <select class="select input-full" v-model="installForm.required">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <div class="form-item">
              <label>默认值</label>
              <input class="input input-full" v-model="installForm.defaultVal" />
            </div>
            <div class="form-item">
              <label>示例值</label>
              <input class="input input-full" v-model="installForm.example" placeholder="如 8.5" />
            </div>
          </div>
          <div class="form-item">
            <label>字段说明</label>
            <textarea class="textarea input-full" v-model="installForm.desc"></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" @click="screen='detail'; detailTab='install'">取消</button>
            <button class="btn btn-primary" @click="saveInstall">保存</button>
          </div>
        </div>

        <!-- ========== 7. 登记固件版本表单 ========== -->
        <div v-else-if="screen === 'editFirmware'" class="page-card" data-screen="edit-firmware">
          <button class="back-link" @click="screen='detail'; detailTab='firmware'">← 返回固件基线</button>
          <div class="page-header">
            <div>
              <h1 class="page-title">{{ firmwareFormMode==='create'?'登记固件版本':'编辑固件版本' }}</h1>
              <p class="page-desc">品类：{{ currentCategory.name }} · 登记型号、当前版、可升版</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>硬件型号</label>
              <input class="input input-full" v-model="firmwareForm.model" placeholder="如 MF-LW-100" />
            </div>
            <div class="form-item">
              <label><span class="req">*</span>当前版本</label>
              <input class="input input-full" v-model="firmwareForm.currentVersion" placeholder="如 1.2.0" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>可升级版本</label>
              <input class="input input-full" v-model="firmwareForm.upgradeVersion" placeholder="如 1.3.0，无可升则留空" />
            </div>
            <div class="form-item">
              <label>发布日期</label>
              <input class="input input-full" v-model="firmwareForm.releaseDate" type="date" />
            </div>
            <div class="form-item">
              <label>状态</label>
              <select class="select input-full" v-model="firmwareForm.status">
                <option>可升级</option>
                <option>基线</option>
                <option>最新</option>
                <option>废弃</option>
              </select>
            </div>
          </div>
          <div class="form-item">
            <label>变更说明</label>
            <textarea class="textarea input-full" v-model="firmwareForm.changelog" placeholder="相对上一版本的功能与修复说明"></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn" @click="screen='detail'; detailTab='firmware'">取消</button>
            <button class="btn btn-primary" @click="saveFirmware">保存</button>
          </div>
        </div>
      </main>
    </div>

    <!-- ========== 2. 新建品类 / 3. 编辑品类 模态 ========== -->
    <div v-if="showCategoryModal" class="overlay" data-screen="category-modal" @click.self="showCategoryModal=false">
      <div class="modal">
        <div class="modal-header">
          <span>{{ categoryModalMode==='create'?'新建品类':'编辑品类' }}</span>
          <button class="close-x" @click="showCategoryModal=false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label><span class="req">*</span>品类名称</label>
            <input class="input input-full" v-model="categoryForm.name" placeholder="如 液位监测井" />
          </div>
          <div class="form-row">
            <div class="form-item">
              <label><span class="req">*</span>品类编码</label>
              <input class="input input-full" v-model="categoryForm.code" placeholder="如 level_well" :disabled="categoryModalMode==='edit'" />
              <div class="hint" v-if="categoryModalMode==='edit'">编码创建后不可修改</div>
            </div>
            <div class="form-item">
              <label><span class="req">*</span>所属行业</label>
              <select class="select input-full" v-model="categoryForm.industry">
                <option v-for="i in industries" :key="i" :value="i">{{ i }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label>AEP 产品 ID</label>
              <input class="input input-full" v-model="categoryForm.aepProductId" placeholder="可选，也可稍后绑定" />
            </div>
            <div class="form-item">
              <label>状态</label>
              <select class="select input-full" v-model="categoryForm.status">
                <option>启用</option>
                <option>草稿</option>
                <option>停用</option>
              </select>
            </div>
          </div>
          <div class="form-item">
            <label>品类说明</label>
            <textarea class="textarea input-full" v-model="categoryForm.desc" placeholder="用途、适用场景等"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showCategoryModal=false">取消</button>
          <button class="btn btn-primary" @click="saveCategory">确定</button>
        </div>
      </div>
    </div>

    <!-- 绑 AEP 抽屉 -->
    <div v-if="showAepModal" class="overlay drawer-mode" @click.self="showAepModal=false">
      <div class="drawer">
        <div class="drawer-header">
          <span>绑定 AEP 产品</span>
          <button class="close-x" @click="showAepModal=false">×</button>
        </div>
        <div class="drawer-body">
          <div class="form-item">
            <label>品类 ID</label>
            <input class="input input-full" :value="aepForm.categoryId" disabled />
          </div>
          <div class="form-item">
            <label><span class="req">*</span>AEP 产品 ID</label>
            <input class="input input-full" v-model="aepForm.aepProductId" placeholder="如 AEP-LW-1001" />
          </div>
          <div class="form-item">
            <label>AEP 产品名称</label>
            <input class="input input-full" v-model="aepForm.aepProductName" placeholder="从 AEP 同步的名称" />
          </div>
          <div class="hint">绑定后可将物模型属性/事件与电信 AEP 产品对齐同步。</div>
        </div>
        <div class="drawer-footer">
          <button class="btn" @click="showAepModal=false">取消</button>
          <button class="btn btn-orange" @click="saveAep">确认绑定</button>
        </div>
      </div>
    </div>

    <!-- ========== 8. 删除确认 ========== -->
    <div v-if="showDeleteConfirm" class="overlay" data-screen="delete-confirm" @click.self="showDeleteConfirm=false">
      <div class="modal confirm-box">
        <div class="modal-header">
          <span>确认删除</span>
          <button class="close-x" @click="showDeleteConfirm=false">×</button>
        </div>
        <div class="modal-body">
          <div class="confirm-icon">!</div>
          <div>
            <div style="font-weight:500;margin-bottom:6px">确定删除{{ deleteTarget.type }}「{{ deleteTarget.name }}」吗？</div>
            <div style="font-size:13px;color:#666">删除后不可恢复，已关联设备将失去对应配置引用。</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showDeleteConfirm=false">取消</button>
          <button class="btn btn-danger" @click="doDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
  `
}).mount('#app');
