# 设备管控平台 · 物模型 / 设备台账 / 在线监控 — HTML 高保真原型

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

侧栏可切换 **物模型** / **设备台账** / **在线监控**（同壳同配色，高亮当前模块）。

## 产品口径（本期）

### 物模型
- 物模型定义**产品类型语义**（测点 / 事件 / 阈值 / 安装模板 / 固件）。
- **不再**在品类上直接绑定 AEP 产品/型号；无「绑定 AEP 产品」主流程。
- **无解析脚本 UI**：AEP 侧已完成设备数据解析。
- 品类配置 **归属规则**（通用规则默认匹配 + 特殊处理规则更高优先级）。匹配条件含 AEP 产品 ID、协议 ID/名称等自由文本。
- AEP 解析后由规则自动挂靠品类；未匹配 → **待归属**。

### 设备台账
- AEP 自注册且无项目的设备进入 **未定义项目** 池（未归属）。
- 支持未归属列表筛选 / 入口，以及 **设备转移**（记录操作人 / 时间 / 自 / 至）。
- 设备上品类默认 **自动匹配**（只读展示）；边缘场景可「改挂」。
- AEP 对账用于本地台账 vs AEP 清单差异，**不依赖**品类绑定 AEP 产品。

## 物模型屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 品类列表 | `#list` |
| 2 | 新建品类（模态） | `#createCategory` |
| 3 | 编辑品类（模态） | `#editCategory` |
| 4 | 物模型详情壳 + Tab | `#detail` |
| 4a–4f | 上报属性 / 异常事件 / 测点 / 安装参数 / 固件 / **归属规则** | `#props` `#events` `#points` `#install` `#firmware` `#rules` / `#categoryRules` |
| 5–7 | 编辑测点 / 安装字段 / 固件 | `#editPoint` `#editInstall` `#editFirmware` |
| 8 | 删除确认 | `#deleteConfirm` |

## 设备台账屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 项目列表（含未归属池入口） | `#projects` |
| 2 | 新建/编辑项目（模态） | `#createProject` `#editProject` |
| 3 | 设备列表 | `#devices` |
| 3b | **未归属设备 / 未定义项目** | `#unassignedDevices` |
| 3c | **设备转移**（模态） | `#deviceTransfer` |
| 4 | 设备档案详情（含转移记录） | `#deviceDetail` |
| 5 | 编辑设备档案 | `#editDevice` |
| 6 | AEP 对账（清单差异） | `#aepReconcile` |
| 7 | 导入说明弹窗 | `#importExport` |

## 在线监控屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 监控列表（在线态 / 告警摘要 / 可信 T0～T3+分数；筛项目/品类/在线/告警） | `#monitor` |
| 2 | 设备监控详情（最新测点、固件、近 24h 可信分；入口曲线） | `#monitorDetail` |
| 3 | 历史曲线（7 天 / 30 天；预警 orange / 报警 error / 故障 primary 参考线） | `#monitorCurve` |
| 3b | 长周期曲线（采集周期 >15 分钟 →「历史全量查、不分段」） | `#monitorCurveLong` |
| 4 | 在线率（该报没报：应报/实报/漏报统计卡片 + 简表） | `#monitorOnlineRate` |

测点时序为 **PostgreSQL 时序示意**，非实时接入。一期不做设施树、地图、通用指令。

## 配色

- 侧栏 `#DBE1F0` · 顶栏 `#F1E8EC` · 主区白
- primary `#0D6EFD` · error `#DC3545` · orange `#E78212`

## 文件结构

```
index.html   # 入口
styles.css   # 样式（物模型 + 台账 + 在线监控）
app.js       # Vue SPA
shots/       # 分屏截图（部分为改口径前截图，以页面为准）
take-shots.js # 截图脚本（需 puppeteer-core + Chrome）
```

## 截图

物模型见 `shots/01`–`12`（历史截图可能仍含旧「绑定 AEP」文案，请以当前页面为准）。

设备台账：
- `ledger-01-projects.png` 项目列表
- `ledger-02-create-project.png` 新建项目
- `ledger-03-devices.png` 设备列表
- `ledger-04-device-detail.png` 设备档案
- `ledger-05-edit-device.png` 编辑设备档案
- `ledger-06-aep-reconcile.png` AEP 对账
- `ledger-07-import.png` 导入说明

在线监控：
- `monitor-01-list.png` 监控列表
- `monitor-02-detail.png` 设备监控详情
- `monitor-03-curve.png` 历史曲线
- `monitor-04-online-rate.png` 在线率
- `monitor-05-curve-long-cycle.png` 长周期全量查提示
