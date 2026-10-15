# 设备管控平台 · 驾驶舱 / 物模型 / 设备台账 / 在线监控 — HTML 高保真原型

替代 Figma 限额，可本地直接打开。Vue 3 CDN + 自研 Ant Design 风格 CSS，1440 管理后台壳。

## 打开方式

**文件路径：**
```
file:///workspace/mfish-thing-model-html/index.html
```

**推荐本地静态服务（需联网加载 Vue CDN）：**
```bash
cd /workspace/mfish-thing-model-html
python3 -m http.server 8877
# 浏览器打开 http://127.0.0.1:8877/
```

## 模块切换

侧栏可切换 **驾驶舱 / 工作台** / **物模型** / **设备台账** / **在线监控**（同壳同配色，高亮当前模块）。登录默认进入驾驶舱。

## 产品口径（本期）

### 物模型
- 物模型定义**产品类型语义**（测点 / 事件 / 阈值 / 安装模板 / 固件 / **指令**）。
- **指令 Tab** = 配置该品类「能下什么」：**命令位（开关）** vs **内容载荷**；**不是**实时点发。字段对齐后端 `kind=service`：`bitIndex`（**1-based 命令位**）、`payloadOffset`（**1-based 内容起始字节**）、`hasParam`（0/1）、`paramMin`/`paramMax`（可空），并复用 `identifier`/`name`/`dataType`/`unit`/`required`/`access`。积水仪 `FAFA…ADAD`：字节17–24 开关（位 1–8、10–12，位 9 空缺）；内容如 reboot→字节25·`bool`·`F0/0F`，高度/对时等从各自 `payloadOffset` 起写。组包时选中指令自动置对应 bit。真正下发走 AEP CreateCommand（透传 hex，dataType=2），应答另解析入库。
- **不再**在品类上直接绑定 AEP 产品/型号；无「绑定 AEP 产品」主流程。
- **无解析脚本 UI**：AEP 侧已完成设备数据解析。
- 品类配置 **归属规则**（通用规则默认匹配 + 特殊处理规则更高优先级）。匹配条件含 AEP 产品 ID、协议 ID/名称等自由文本。
- AEP 解析后由规则自动挂靠品类；未匹配 → **待归属**。
- **归属仍在品类侧**，与「项目 ↔ AEP 产品 1:1」相互独立。
- **双向挂靠**：品类列表/详情展示 **设备数**（`deviceCount`），可点击或「查看设备」跳转台账 `#devices` 并按该品类筛选；设备列表「匹配」列展示 `categoryMatch`（如自动匹配）。

### 设备台账
- 本地 **项目与 AEP 产品 1:1 对齐**（SDK 产品列表同步）；同步为准，手动新建/编辑仅补录。
- 设备建档 **主路径** = **OpenAPI 绑定** → 自动创建项目/设备；**仅当 projectId 为空时写入**，不覆盖人工已挂项目。
- **未定义项目** = **例外池**（SDK 缺产品 / 临时设备等），**不是**主路径。
- **设备转移 / 人工改挂** = **例外处理**（记录操作人 / 时间 / 自 / 至）；品类「改挂」同理为例外。
- AEP 对账主 CTA **「同步自 AEP」**（拉取并生成差异）；行内接入/忽略为二次操作；支持 **周期对账**。对账**不依赖**品类绑定 AEP 产品。

## 驾驶舱 / 工作台

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 0 | 驾驶舱（工作台首页；空 hash / `#workbench` / `#home` 同义） | `#cockpit` |

布局：统计卡片（设备总数 / 在线 / 离线异常 / 项目数 / 例外池 / 待处理对账）→ 最近 AEP 同步 + 快捷入口 → 例外待办 + 近期动态。非 GIS 大屏。

## 物模型屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 品类列表 | `#list` |
| 2 | 新建品类（模态） | `#createCategory` |
| 3 | 编辑品类（模态） | `#editCategory` |
| 4 | 物模型详情壳 + Tab | `#detail` |
| 4a–4g | 上报属性 / 异常事件 / 测点 / 安装参数 / 固件 / **指令** / **归属规则** | `#props` `#events` `#points` `#install` `#firmware` `#commands` `#rules` / `#categoryRules` |
| 4h | 新建/编辑指令（模态：bitIndex 1-based / payloadOffset 1-based / hasParam / paramMin·paramMax / dataType·unit·required） | `#editCommand` |
| 5–7 | 编辑测点 / 安装字段 / 固件 | `#editPoint` `#editInstall` `#editFirmware` |
| 8 | 删除确认 | `#deleteConfirm` |

## 设备台账屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 项目列表（AEP 产品同步；含例外池入口） | `#projects` |
| 2 | 新建/编辑项目（模态） | `#createProject` `#editProject` |
| 3 | 设备列表 | `#devices` |
| 3b | **例外池 · 未定义项目** | `#unassignedDevices` |
| 3c | **例外处理 · 人工改挂**（模态） | `#deviceTransfer` |
| 4 | 设备档案详情（含改挂记录；「数据」→ 在线监控详情） | `#deviceDetail` |
| 5 | 编辑设备档案 | `#editDevice` |
| 6 | AEP 对账（同步自 AEP / 清单差异） | `#aepReconcile` |
| 7 | 导入说明弹窗 | `#importExport` |

### 在线监控（设备数据集中入口）

- **列表即设备数据枢纽**：侧栏「在线监控」进入；按 **项目 / 品类**（及在线态 / 告警）筛选。
- **测点列随品类动态变化**：筛选某一品类后，列头取该品类物模型 `kind=property` 的 `identifier` / `name` / `unit`，单元格取 `latest_json[identifier]`（积水仪：`yewei`/`wendu`/`yaqiang`；水质站：`ph`/`do`/`turb` 等）。
- **未选品类（跨品类总览）**：仅公共列（设备、项目、品类、在线、最近上报）+ 单列「最新数据」摘要，不展开全部测点列。
- 点击行 → **设备数据详情**：最新数据 **卡片**由该设备品类 property 定义驱动 + **历史曲线**（7 天 / 30 天，含预警 / 报警 / 故障参考线）。
- 台账设备列表 / 档案「**数据**」按钮可跳入同一详情（不另造平行屏）。

## 在线监控屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 设备数据列表（在线态 / latest_json 最新测点 / 品类·项目；筛项目/品类/在线/告警） | `#monitor` / `#monitorList` |
| 2 | 设备数据详情（最新值卡片 + 内嵌 7d/30d 曲线；全屏曲线入口） | `#monitorDetail` |
| 3 | 历史曲线全屏（7 天 / 30 天；预警 orange / 报警 error / 故障 primary 参考线） | `#monitorCurve` |
| 3b | 长周期曲线（采集周期 >15 分钟 →「历史全量查、不分段」） | `#monitorCurveLong` |
| 4 | 在线率（该报没报：应报/实报/漏报统计卡片 + 简表） | `#monitorOnlineRate` |

测点时序为 **PostgreSQL 时序示意**，非实时接入。各品类 mock 的 `latest_json` 与物模型 `kind=property` 标识符对齐。一期不做设施树、地图；**物模型可配置指令模板**，设备运行时下发台后续在设备档案 / 监控中提供。

## 配色

- 侧栏 `#DBE1F0` · 顶栏 `#F1E8EC` · 主区白
- primary `#0D6EFD` · error `#DC3545` · orange `#E78212`

## 文件结构

```
index.html   # 入口
styles.css   # 样式（驾驶舱 + 物模型 + 台账 + 在线监控）
app.js       # Vue SPA
shots/       # 分屏截图（部分为改口径前截图，以页面为准）
take-shots.js # 截图脚本（需 puppeteer-core + Chrome）
```

## 截图

驾驶舱：
- `cockpit-01-home.png` 驾驶舱 / 工作台首页

物模型见 `shots/01`–`12`（历史截图可能仍含旧「绑定 AEP」文案，请以当前页面为准）。
- `thing-commands-01.png` 物模型详情 · **指令** Tab
- `thing-commands-02-edit.png` 新建/编辑指令模态

设备台账：
- `ledger-01-projects.png` 项目列表
- `ledger-02-create-project.png` 新建项目
- `ledger-03-devices.png` 设备列表
- `ledger-04-device-detail.png` 设备档案
- `ledger-05-edit-device.png` 编辑设备档案
- `ledger-06-aep-reconcile.png` AEP 对账
- `ledger-07-import.png` 导入说明

在线监控（设备数据）：
- `monitor-01-list.png` 设备数据列表（latest_json 测点列）
- `monitor-02-detail.png` 设备数据详情（最新值卡片 + 曲线）
- `monitor-03-curve.png` 历史曲线全屏
- `monitor-04-online-rate.png` 在线率
- `monitor-05-curve-long-cycle.png` 长周期全量查提示
