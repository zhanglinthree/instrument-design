# 设备管控平台 · 接口字段清单 v0.2（物模型 + 设备台账）

> 相对 v0.1：按 `mf-iot` / 老项目硬约束修订  
> 来源：HTML Mock + 后端对照结论（2026-10-08）  
> 范围：列表 / 详情 / 筛选；在线监控第二批  
> 仓库沉淀：建议落 `instrument-design/docs/`（与原型同仓）

---

## 0. 公共约定（硬约束）

| 项 | 约定 |
|---|---|
| 分页 | `pageNum` / `pageSize`；返回走现网 `Result` / `PageResult`（照 `IotDeviceController`） |
| 字典下拉 | `sys_dict` + `sys_dict_item`；前端 `GET /dictItem/{dictCode}`，禁止页面硬编码枚举文案 |
| 设备主表 | **扩** `iot_device`，保留 `/iotDevice` 与 AEP 接入；**勿另起设备主表** |
| SN | 库字段 / API：`serialNum`；设计稿「SN」均映射此字段（不再用独立 `sn`） |
| AEP status | 现有 `status`：`0` 待完善 / `1` 正常 / `9` 忽略；**仅表示 AEP 态**，勿与生命周期混用 |
| 生命周期 lifecycle | **新字段**（或字典）；与 `status`、监控 online **三套语义分开** |
| 品类 | 台账「品类」≠ `DeviceTypeEnum`（后者只服务协议解析） |
| 未定义项目 | `projectId = null`；展示名固定「未定义项目」 |
| 品类挂靠 | AEP 已解析；本侧归属规则；`categoryMatch` 走字典 |
| 租户/组织 | 现 `iot_*` 无 `tenant_id`/`org_id`；一期可不补，要数据权限再按 demo 加 |
| 路径策略 | 一期少动 `/iotDevice` 路径，**多扩字段**；物模型/项目等新资源另开路径 |

### 0.1 建议字典码（需新插 `sys_dict` 种子）

| dictCode | 用途 | 建议项（value / label） |
|---|---|---|
| `iot_device_lifecycle` | 台账生命周期 | pending 待接入 / online 在线 / offline 离线 / disabled 停用 / scrapped 报废 |
| `iot_category_match` | 品类挂靠方式 | auto 自动 / manual 手动 / none 未归属 |
| `iot_category_status` | 品类状态 | draft 草稿 / enabled 启用 / disabled 停用 |
| `iot_project_status` | 项目状态 | preparing 筹备中 / ongoing 进行中 / done 已完工 / paused 已暂停 |
| `iot_rule_type` | 归属规则类型 | general 通用 / special 特殊 |
| `iot_event_level` | 异常事件等级 | warn 预警 / alarm 报警 / fault 故障 |
| `iot_aep_diff_type` | AEP 对账类型 | extra AEP有台账无 / missing 台账有AEP无 |
| `iot_aep_diff_action` | 对账动作态 | pending 待处理 / ignored 已忽略 / imported 已接入 |

> AEP `status` 若已有字典则复用，不再新建。行业 `industry` 若可进字典则用 dict；否则一期字符串亦可。

---

## 1. 物模型（新开表 / 新开路径）

> 现网无物模型/品类表 → 全部新开。路径示意可按现网风格改名，前端等本清单字典码落地后再绑筛选项。

### 1.1 品类 Category

**列表筛选**：`keyword`（name/code）、`industry`、`status`（dict: `iot_category_status`）+ 分页

**列表行**

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| name | string | |
| code | string | 如 `level_well`，唯一 |
| industry | string | 或 dict |
| deviceCount | int | 只读统计 |
| modelVersion | string | 如 `v1.2.0` |
| ruleCount | int | 只读统计 |
| status | string | dict: `iot_category_status` |
| updatedAt | datetime | |

**创建/编辑**：`name*`, `code*`, `industry*`, `desc`, `status*`  
**详情**：列表行 + `desc` + 子资源

**路径示意**：`GET/POST /iotCategory`，`GET/PUT/DELETE /iotCategory/{id}`

---

### 1.2 归属规则 CategoryRule

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| categoryId | string | |
| name | string | |
| type | string | dict: `iot_rule_type`；特殊优先于通用 |
| matchAepProduct | string | AEP 产品 ID |
| matchProtocol | string | 协议标识；可「任意」 |
| priority | int | **越小越优先**（待产品确认） |
| enabled | bool | |
| note | string | |

路径示意：`/iotCategory/{id}/rules` 或独立 `/iotCategoryRule`

---

### 1.3 上报属性 Property

| 字段 | 说明 |
|---|---|
| id, categoryId, identifier, name, dataType, unit, access, reportCycle, required | 同 v0.1；`access` 建议 dict 或固定只读/读写 |

### 1.4 异常事件 Event

| 字段 | 说明 |
|---|---|
| id, categoryId, identifier, name, level, trigger, desc | `level` → dict: `iot_event_level` |

### 1.5 测点字典 Point

| 字段 | 说明 |
|---|---|
| id, categoryId, code, name, unit, dataType, min, max, cycle | |
| warnLow/High, alarmLow/High, faultLow/High, desc | 阈值可空 |

### 1.6 安装参数模板 InstallField

| 字段 | 说明 |
|---|---|
| id, categoryId, code, name, dataType, unit, required, defaultVal, example, desc | 设备 `installParams` 按 code 校验 |

### 1.7 固件基线 Firmware

| 字段 | 说明 |
|---|---|
| id, categoryId, model, currentVersion, upgradeVersion?, releaseDate, status, changelog | **挂品类下**（categoryId 必填） |

---

## 2. 设备台账

### 2.1 项目 Project（新开）

**筛选**：`keyword`、`status`（dict: `iot_project_status`）+ 分页  

| 字段 | 说明 |
|---|---|
| id, name, status, owner, region, startedAt, desc, deviceCount | deviceCount 只读 |

「未定义项目」为虚拟项，**不进**项目 CRUD。

路径示意：`/iotProject`

---

### 2.2 设备 Device（扩 `iot_device` + `/iotDevice`）

**列表筛选**（叠在现有 `/iotDevice` 查询上）

| 参数 | 说明 |
|---|---|
| pageNum / pageSize | 复用 |
| projectId | 空/`null` 筛未定义；勿用独立主表 |
| categoryId | 品类，≠ DeviceTypeEnum |
| lifecycle | dict: `iot_device_lifecycle` |
| serialNum / keyword | SN / 名称 / aepDeviceId 模糊（与现网参数名对齐） |
| status | **仅** AEP 态 0/1/9（现有语义） |

**列表行（复用 + 扩）**

| 字段 | 说明 |
|---|---|
| id | 现有 |
| serialNum | 展示为 SN |
| name | 现有或扩 |
| status | AEP 态，勿当生命周期 |
| lifecycle | **新**；dict |
| projectId | **新**；null=未定义项目 |
| projectName | 展示用（联表或回填） |
| categoryId | **新**；空=待归属 |
| categoryName | 展示用 |
| categoryMatch | **新**；dict: `iot_category_match` |
| aepDeviceId / product 相关 | 现有 AEP 字段保留 |
| model / firmware | 型号、固件（现有有则复用） |
| updatedAt | |

**详情档案 = 上表 +**

| 字段 | 说明 |
|---|---|
| lng, lat, address | |
| installDate, installer | |
| masterId / masterSn, slaves | 主从 |
| photos | URL 列表 |
| installParams | object，key=模板 code |

**写操作**：继续走 `/iotDevice`；body 扩上述新字段。一期不改路径名。

---

### 2.3 设备转移 Transfer（新开）

**请求**：`deviceIds[]`, `targetProjectId`（**可为 null**，退回未定义项目）, `note`（operator 取当前用户）  

**日志只读**：id, deviceId, serialNum, deviceName, fromProjectId/Name, toProjectId/Name, operator, time, note  

路径示意：`POST /iotDevice/transfer`；日志 `GET /iotDevice/{id}/transferLogs`

---

### 2.4 AEP 对账 AepDiff（新开）

| 字段 | 说明 |
|---|---|
| id, type, serialNum, aepDeviceId?, aepName?, productId | type → dict |
| localId?, localName? | missing 时 |
| hint, action | action → dict |

动作：接入（进未定义项目）/ 忽略 / missing 侧补建或忽略  

路径示意：`GET /iotDevice/aepDiff`；`POST /iotDevice/aepDiff/{id}/action`

---

## 3. 前后端落地对照

| 能力 | 前端 | 后端 |
|---|---|---|
| 分页/返回体 | PageResult | 照 IotDeviceController |
| 下拉 | GET /dictItem/{dictCode} | 插字典种子 |
| 设备 CRUD | 仍 `/iotDevice`，SN=`serialNum` | 扩表字段，不新建主表 |
| AEP status vs lifecycle | 两列/两标签分开展示 | status 不动；lifecycle 新列 |
| 品类筛选 | 等字典 + 品类 API | 新品类表；≠ DeviceTypeEnum |
| 项目 / 转移 / 对账 / 物模型子资源 | 新页面能力 | 新表新接口 |

---

## 4. 已确认（设计 2026-10-08）

1. `priority`：数值越小越优先，**定稿**。  
2. 转移：**允许**退回「未定义项目」。  
3. 固件基线：**挂在品类下**（与现 HTML 一致）。  
4. `industry`：**进 `sys_dict`**（建议 dictCode：`iot_industry`）。  
5. 监控 online vs 台账 lifecycle：**分开展示**——台账用「生命周期」标签；监控用「在线状态 / 在线率」；文案和颜色都不要共用「在线」一个词当主标签。

---

## 5. 变更摘要（v0.1 → v0.2）

- `sn` → 统一 `serialNum`  
- 拆清 `status`(AEP) / `lifecycle` / 监控 online  
- 明确设备扩表 + `/iotDevice`，不另起主表  
- 品类与 `DeviceTypeEnum` 解耦  
- 枚举改为建议 `dictCode`，前端禁止硬编码  
- 分页/返回体对齐现网 `PageResult`  
- 标注新开：品类及子资源、项目、转移、AEP 对账、字典种子  
