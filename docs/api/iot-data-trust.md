# 数据可信 / 品类标准 · 字段与接口

给 FE / BE 对齐用。原型页面在同一份 `index.html` 里，不另建 tip HTML。

标识符与名称复用物模型上报属性 / 测点字典（`identifier` / `name`，如 `yewei`、`wendu`、`yaqiang`），不另起字段名。量程和采集周期优先引用测点字典已有 `min` / `max` / `cycle`，对不上再在标准里补。

## 1. 口径

数据可信是独立模块。品类标准单独维护，不进物模型「上报属性 / 测点字典 / 安装参数模板」。

两个入口进同一份标准：

- 品类详情按钮「品类标准」
- 侧栏目录「数据可信」下的「品类标准」

侧栏「数据可信」只是目录，占位路径 `/iot/data-trust`，没有业务页。

### 1.1 三层数据（互不覆盖）

| 层 | 存什么 | 说明 |
|---|---|---|
| 原始报文 | `iot_protocol_data` | 本机数据。入包 `parsedJson` 不因判断或 sample 覆盖而改写 |
| 拍平 sample | sample 表 | 一条报文可对多条 sample |
| 判断记录 | 判断头 + 明细 | 以 sample 为准、逐条判，都引用同一报文 id |

无本平台报文 id 时记 `externalId`，后面的流程相同。这一期页面只加注解，不做接入 UI。

### 1.2 时机

sample 入库（含同窗口覆盖更新）之后才判断。判断不拦截入库。

### 1.3 生效标准

设备覆盖 > 项目覆盖 > 品类当时已发布、且在生效范围内的版本。

版本：草稿 → 已发布（只读）→ 被新版本替代（历史只读）。改规则只能从当前版复制出新草稿再发布。

### 1.4 执行顺序

1. 取上面的生效标准。
2. 先跑完全部单条断言。多个指标都有问题就都打标记，不因第一个失败整单返回。
3. 再跑关联。某指标的必报 / 类型与单位 / 量程 / 枚举 / 空值已失败，则依赖它的关联中停，明细 `status=skip`（未执行）；不依赖该指标的关联继续。
4. 跳变二次标记是确认步骤，不是另一套规则引擎。该指标若已有基础失败（必报 / 类型与单位 / 量程 / 枚举 / 空值），二次标记同样 `skip`。只有极值、跳变初次失败时，二次标记仍执行。确认成立才把 `JUMP_CONFIRM` 写入 `qualityJson`；不成立不写，已有标记保留。
5. 先写判断记录，再回写 sample 的 `judgeId` / `qualityJson`。总结果按各指标「且」汇总（`overallPass`）。判断不写 `repairJson`，不改测值。

跳变初次按第 9 节锁定：相对「上一条已接受测值」的百分比，不按绝对差值。第二次仍对照跳变前的同一个初始值；达到次数后校准，撤销 `JUMP_FIRST`，不另打连续跳变，不写 `JUMP_CONT`。既有判断页里带 `JUMP_CONT` 的记录是更早的示意，试运行不沿用。

单条断言类型：必报、类型与单位、量程（优先测点字典 min/max）、极值（统计 / 历史极端，单独配置，不是字典量程）、枚举、空值、跳变初次标记（只跟本设备自身上一条已接受测值比）。

关联类型：同包跨字段（读原始报文包内数据集，不读修复层）、T-1 / 同时段趋势、同项目同品类、关联设备同时段、跳变二次标记（用 T-1 或关联设备确认初次跳变）。

### 1.5 sample 回写

sample 仍是一条一行。测值 JSON 不拆成一行一个指标。

| 列 | 含义 |
|---|---|
| 测值 JSON | 拍平后的原始测值，k = 指标标识，v = 测值。判断和修复都不改这列 |
| `judgeId` | 单独一列。一条 sample 只挂 1 个最新判断 id。多个指标共用这一个 id |
| `qualityJson` | k = 指标标识；v = 异常原因码列表（可多项）。无异常的指标不出现。全部正常为 `{}` 或空。测值 JSON 不改 |
| `repairJson` | 与测值 JSON 同形的 k-v。只写修过的指标。修复值只进这一列，不回写原始报文，也不覆盖测值 JSON。没有修复为 `{}` 或空 |

覆盖重判：新建一条判断记录，把 sample 的 `judgeId` 和 `qualityJson` 更新为新记录，旧判断留在判断表。不因重判去改 `repairJson`。

不提供手工改标记的接口。重判只随 sample 覆盖，或后台重跑。修复回退只撤 `repairJson` 里对应的键，不改标记、不改测值。

链：报文 id → sample id → `judgeId`。修复记录挂同一个 sample id。没有 sample 的缺报填入只挂缺报 id，不另造数据集。

### 1.6 缺报与离线

- 缺报不算在当前这条合格 sample 上，不创造测值，也不写进一条不存在的 sample 的 `qualityJson`。缺报留在缺报 / 离线表。
- 补报落入窗口：状态改为已补回，写 `filledSampleId`。这是真实报文产生的 sample。窗口默认是间隔的一半，左右对称，可改。
- 治理填洞只写修复层（修复记录挂 `gapId`）。不创建 sample，不把状态改成已补回，不写 `filledSampleId`。
- 连续缺报达到 `thresholdCount` 或 `thresholdDuration`：记一条离线时段。恢复上报后 `status=recovered`。
- 只做固定频率。不做变频率 / 按需上报。

### 1.7 关联设备同时段

这一期只支持手工指定设备对。邻居缺数只记「对照对象缺失」：不把当前 sample 打成不合格，不把该标记写入 `qualityJson`。跳变二次标记缺对照时同样处理。

### 1.8 不做

- 校准改原始测值（修复只写 `repairJson`，不是校准）
- 重复与冲突（维持当前同窗口覆盖写入；覆盖后按 1.5 重判）
- 变频率 / 按需上报
- 通用规则引擎（修复方式只有函数 / 相邻点 / T-1，参数是固定算子，不是脚本）
- 用判断拦截入库
- 手工改标记
- 工单
- 完整率 / 有效率的门槛拦截（本期只汇总）

### 1.9 汇总公式

- 完整率 = 应报次数 / 实收次数
- 有效率 = 无异常标记的指标次数 / 参与判断的指标次数（异常看 `qualityJson`）

按品类 / 项目 / 设备汇总。不做门槛。修复层不改变应报、实收和 `qualityJson`。

### 1.10 修复层（治理，第三周实现；本 tip 先锁字段）

实时修复在品类标准上按品类或按指标配置，三档：

| 方式 | 含义 |
|---|---|
| `function` | 固定算子，例如夹到量程后再取上一有效点。不是通用表达式引擎 |
| `adjacent` | 本设备相邻有效点的原始测值 |
| `t1` | 上一时段 / T-1 |

每条修复必须有依据，并且可以回退。没有依据来源时不发明数值。

离线工作台覆盖的是修复层：曲线调整、表格调整，以及把缺报从关联设备的原始测值填进修复层。不往原始报文或 sample 测值 JSON 里写。

监控列表、最新值卡片、曲线、上报明细仍是原来的在线监控页，按同一个指标键读数：

- 默认：`repairJson` 有该键就用修复值，否则用测值 JSON / `latest_json`
- 可切换为只看原始测值，或原始与修复叠加
- 异常高亮仍读 `qualityJson`，点击用 `judgeId` 下钻
- 缺报不进这些表

## 2. 页面

| 页面 | 组件 | FE 路由 | Hash |
|---|---|---|---|
| 目录（无页） | — | `/iot/data-trust` | — |
| 品类标准 | `iot/iot-data-trust/IotDataTrustStandard` | `/iot/iot-data-trust-standard` | `#categoryStandard` |
| 数据异常 | `iot/iot-data-trust/IotDataTrustAnomaly` | `/iot/iot-data-trust-anomaly` | `#dataTrustAnomaly` |
| 判断查询 | `iot/iot-data-trust/IotDataTrustJudgement` | `/iot/iot-data-trust-judgement` | `#dataTrustJudgement` |
| 缺报与离线 | `iot/iot-data-trust/IotDataTrustGap` | `/iot/iot-data-trust-gap` | `#dataTrustGap` |
| 完整率/有效率 | `iot/iot-data-trust/IotDataTrustStats` | `/iot/iot-data-trust-stats` | `#dataTrustStats` |
| 修复策略（标准页页签，治理） | 仍是 `IotDataTrustStandard` | 同上，`tab=repair` | `#categoryStandard?tab=repair` |
| 离线工作台（治理，第三周） | `iot/iot-data-trust/IotDataTrustWorkbench` | `/iot/iot-data-trust-workbench` | `#dataTrustWorkbench` |
| 修复记录（治理，第三周） | `iot/iot-data-trust/IotDataTrustRepairLog` | `/iot/iot-data-trust-repair-log` | `#dataTrustRepairLog` |
| 试运行（列表 / 结果同一组件，不进侧栏） | `iot/iot-data-trust/IotDataTrustTrial` | `/iot/iot-data-trust-trial` | `#dataTrustTrial` · `#dataTrustTrial?id={trialId}` |
| 按数据推荐（草稿上的面板，不进侧栏） | 仍是 `IotDataTrustStandard` | 同上 | `#categoryStandard?categoryId=C001&versionId=STD-C001-3&recommend=1` |
| 正式开跑 | 结果仍在 `IotDataTrustJudgement` | `/iot/iot-data-trust-judgement` | `#dataTrustJudgeRun` · `#dataTrustJudgement` |

品类标准、判断查询、缺报与离线、完整率/有效率这四个路由保持不变。数据异常是后加的同级查看页，不替换判断查询，也不把缺报并进来。侧栏「数据可信」仍只是目录（`/iot/data-trust` 没有业务页），与「物联网」同级。修复策略、离线工作台、修复记录仍是后加的治理入口，不替换上面的页面。试运行不进侧栏，从品类标准草稿的「试运行」进入。按数据推荐也在这份草稿上，不进侧栏。正式开跑挂在已有「数据可信」目录下，供前端放按钮和页面；本期不另写、不执行菜单 SQL。OTA 菜单不动。

侧栏顺序：品类标准、数据异常、判断查询、正式开跑、缺报与离线、完整率/有效率，其后是治理入口（修复策略页签、离线工作台、修复记录）。没有「试运行」，也没有「按数据推荐」。

分工：

| 页面 | 看什么 |
|---|---|
| 数据异常 | 当前异常。只读。一行 = 一条 sample × 一个 `qualityJson` 里有非空标记列表的指标。同一指标多个标记留在同一行。数据源是该 sample 最新 `qualityJson` + 最新 `judgeId`，不收被覆盖掉的旧判断 |
| 判断查询 | 全部判断记录的审计。一行 = 一条判断（1 sample : 1 judgeId），含通过、不通过、未执行，以及覆盖重判后留下的历史。可筛「仅看异常」，但不改成异常清单 |
| 监控列表 / 曲线 | 看一台设备随时间的测值。高亮仍读 `qualityJson`，`valueMode=repair\|original\|overlay`。不是异常台账 |
| 缺报与离线 | 只放缺报和离线。不进数据异常 |
| 修复记录 / 离线工作台 | 治理。数据异常只链出去，不在本页改修复值、不回退、不改标记 |

深链示例：`#categoryStandard?categoryId=C001`，`#categoryStandard?tab=tip`，`#categoryStandard?tab=repair`，`#categoryStandard?categoryId=C001&versionId=STD-C001-3`，`#categoryStandard?categoryId=C001&versionId=STD-C001-3&recommend=1`，`#dataTrustAnomaly`，`#dataTrustAnomaly?deviceId=D001`，`#dataTrustAnomaly?identifier=yewei`，`#dataTrustAnomaly?mark=RANGE_HIGH`，`#dataTrustAnomaly?repairStatus=none`，`#dataTrustJudgement?id=J102`，`#dataTrustJudgement?id=J108`，`#dataTrustJudgeRun`，`#dataTrustWorkbench?deviceId=D001&metric=yewei`，`#dataTrustTrial`，`#dataTrustTrial?id=TR20261110001`。

监控列表 / 曲线 / 上报明细：按指标键读。默认 `repairJson` 有该键用修复值，否则用原来的测值 JSON（`latest_json` 或 sample 测值）。可切换原始或叠加。异常高亮按指标读 `qualityJson`。点击用 `judgeId` 打开判断详情。查询参数 `valueMode=repair|original|overlay`。

报文详情继续展示包内数据集，并列出本包各 sample 的异常摘要。

## 3. 标准

### 3.1 主表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| categoryId | string | 品类 |
| version | int | 从 1 递增 |
| status | string | `draft` 草稿 / `published` 已发布 / `superseded` 被新版本替代 |
| effectiveAt | datetime | 发布时写入；草稿为空 |
| supersededAt | datetime | 被新版本替代的时间，可空 |
| createdAt | datetime | |
| copiedFrom | int | 复制来源版本号，可空 |

同一品类同时最多一份草稿、一份已发布。判断只用 `published` 且 `effectiveAt` 落在判断时刻生效范围内的那一版（被替代后，历史判断仍指向当时的 `standardVersion`）。

### 3.2 对照

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| identifier | string | 只读引用物模型 |
| sourceKey | string | 解析字段或 JSON 键，如 `data[].yewei` |
| enabled | bool | 是否参与判断 |

### 3.3 单条断言

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| identifier | string | |
| type | string | `required` 必报 / `type` 类型与单位 / `range` 量程 / `extreme` 极值 / `enum` 枚举 / `null` 空值 / `jumpFirst` 跳变初次标记。`jumpCont` 不再作为本期标记 |
| enabled | bool | |
| params | object | 见下 |

`params`：

- `type`：`dataType`、`unit`、`cite=property`（引用上报属性）
- `range`：`min`、`max`、`cite=point|standard`、`pointCode`。`cite=point` 时 min/max 来自测点字典，标准页不可改；不够时改为 `standard` 再补
- `extreme`：`low`、`high`、`method`（如 `historyP99`）、`cite=standard`。统计或历史极端，不引用测点字典 min/max，标准页可改
- `enum`：`values` 逗号分隔
- `null`：`allowNull`
- `required`：无额外参数
- `jumpFirst`：`percent`、`count`（默认 2）、`baseline=prevAccepted`。见第 9.4 节。只跟本设备自己的上一条已接受测值比，不另配一条基线。不使用绝对差值 `delta`

### 3.4 关联

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| type | string | `cross` 同包跨字段 / `trend` T-1 或同时段趋势 / `peer` 同项目同品类 / `neighbor` 关联设备同时段 / `jumpSecond` 跳变二次标记 |
| targets | string[] | 对象。关联设备这一期是手工设备 id 对。趋势、二次标记可以含 `T-1` |
| note | string | 可选。同包跨字段注明读原始报文数据集 |
| fields | string[] | 指标标识 |
| threshold | string | 阈值 |
| windowSec | int | 窗口秒。同时刻可为 0 |
| enabled | bool | |

### 3.5 时效

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| mode | string | 固定 `fixed`。不做变频率 |
| intervalSec | int | 上报间隔。优先测点 `cycle`，否则上报属性 `reportCycle`，再不够用标准补 |
| windowSec | int | 补报窗口。默认 `intervalSec / 2`，左右对称 |
| windowManual | bool | 窗口是否手改 |
| completenessEnabled | bool | 是否纳入完整率 |
| intervalCite | string | 引用说明，如 `point.yewei.cycle` |

### 3.6 离线

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| thresholdCount | int \| null | 连续缺报周期数。与时长二选一 |
| thresholdDurationSec | int \| null | 时长阈值秒 |

### 3.7 标记字典

与断言类型分开。标准按 code 引用。

| 字段 | 类型 | 说明 |
|---|---|---|
| code | string | 写入 `qualityJson` 的标记码 |
| name | string | |
| assertionType | string | 对应断言或关联类型，不是标记码本身 |
| standardId + enabled | | 本版是否引用 |

原型内置：`RANGE_HIGH` / `RANGE_LOW` / `EXTREME_HIGH` / `EXTREME_LOW` / `TYPE_MISMATCH` / `UNIT_MISMATCH` / `ENUM_INVALID` / `NULL_VALUE` / `REQUIRED_MISS` / `JUMP_FIRST` / `JUMP_CONT` / `TREND_JUMP` / `CROSS_FIELD` / `PEER_DEVIATION` / `NEIGHBOR_MISS` / `NEIGHBOR_DIFF` / `JUMP_CONFIRM`。

`NEIGHBOR_MISS` 只出现在判断明细的原因里，不写入当前 sample 的 `qualityJson`。跳变二次标记未证实、或对照缺失时，同样不写 `JUMP_CONFIRM`。

### 3.9 修复策略

挂在标准版本上，随草稿复制。已发布只读。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| standardId | string | |
| scope | string | `category` 品类默认 / `metric` 指标 |
| identifier | string | 品类默认时空串 |
| mode | string | `function` / `adjacent` / `t1` / `none` |
| params | object | 固定算子参数，如 `{ "op": "clipToRangeThenPrev" }` 或 `{ "windowSec": 600 }` |
| basis | string | 依据模板，执行时抄进修复记录 |
| enabled | bool | |

### 3.8 覆盖

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| scopeType | string | `project` / `device` |
| scopeId | string | 项目 id 或设备 id |
| categoryId | string | |
| intervalSec | int | |
| windowSec | int | 默认可随间隔一半计算 |
| windowManual | bool | |
| enabled | bool | 恢复继承即删除或停用本条 |

## 4. 判断

### 4.1 头

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | sample.judgeId 指向最新一条 |
| messageId | string \| null | 平台报文 id |
| externalId | string \| null | 无 messageId 时 |
| sampleId | string | |
| deviceId | string | |
| projectId | string \| null | |
| categoryId | string | |
| standardVersion | int | 判断当时的已发布版本号 |
| scopeType | string | `device` / `project` / `category` |
| scopeId | string | 命中的覆盖对象；品类级可记 categoryId |
| intervalSec / windowSec | int | 当时生效的间隔和窗口 |
| judgedAt | datetime | |
| overallPass | bool | 各指标「且」 |
| values | object | 该次判断当时的测值 JSON，不随后来的覆盖改写 |

### 4.2 明细

| 字段 | 类型 | 说明 |
|---|---|---|
| judgementId | string | |
| identifier | string | 指标 |
| kind | string | `assert` 单条 / `relation` 关联 |
| assertType | string | 断言类型或关联类型 |
| relationType | string | 仅关联 |
| pass | bool | |
| marks | string[] | 标记码。未执行或对照对象缺失时可空 |
| reason | string | |
| status | string | `pass` 已执行通过 / `fail` 已执行失败 / `skip` 未执行 |
| relatedRefs | string[] | 关联对象：字段、项目、设备 id 等 |

## 5. 缺报 / 离线

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| deviceId | string | |
| categoryId / projectId | string | |
| slotTime | datetime | 缺报应报时点。离线时段可空 |
| periodStart / periodEnd | datetime | 离线时段。未恢复时 periodEnd 空 |
| type | string | `missing` / `offline` |
| status | string | `open` 缺报中或离线中 / `filled` 已补回 / `recovered` 已恢复 |
| filledSampleId | string \| null | 仅已补回。真实报文落入窗口才写 |
| repairId | string \| null | 治理填入修复层时的修复记录 id。不改变 status，也不等于 filledSampleId |
| offlineReached | bool | 是否已达到离线阈值 |

界面状态：缺报中（`missing+open`）、已补回（`filled`）、离线中（`offline+open`）、已恢复（`recovered`）。

列表不返回测值。

## 6. 完整率 / 有效率汇总

| 字段 | 说明 |
|---|---|
| categoryId | 可空筛选 |
| projectId | 空表示不限定项目 |
| deviceId | 空表示该范围汇总行 |
| expected | 应报次数 |
| received | 实收次数 |
| judgedMetrics | 参与判断的指标次数 |
| abnormalMetrics | `qualityJson` 里出现过的指标次数 |

完整率、有效率由上面的公式现算，不落门槛字段。修复层不改变应报、实收和 `qualityJson`，因此不改变这两个率。

## 6.1 修复记录

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | |
| sampleId | string \| null | 有 sample 时必填。与报文、判断同一条链 |
| gapId | string \| null | 只在缺报填入、当时还没有 sample 时填写。不另造 sample |
| messageId | string \| null | 来自 sample 的报文 id |
| judgeId | string \| null | 当时 sample 上的判断 id。修复不新建判断 |
| deviceId / categoryId | string | |
| channel | string | `realtime` 实时 / `workbench` 离线工作台 |
| strategy | string | `function` / `adjacent` / `t1` / `curve` 曲线调整 / `table` 表格调整 / `gapFill` 缺报填入 |
| basis | string | 依据。缺依据不发明数值 |
| before | object \| null | 与测值 JSON 同形。缺报填入为空 |
| after | object | 与测值 JSON 同形。只含本次写入的指标 |
| operator | string | 实时为 `system` |
| status | string | `effective` 生效 / `reverted` 已回退 |
| createdAt / revertedAt | datetime | 回退时间可空 |

回退：本条改为 `reverted`。若 sample 上该指标没有更早的生效修复，就从 `repairJson` 删掉该键；有则回到上一条生效值。不改测值 JSON，不改 `qualityJson`，不改报文。

## 6.2 当前数据异常（派生，无新表）

不新增持久化表。列表从 sample 现态摊开：最新 `qualityJson` + 最新 `judgeId` + 测值 JSON + `repairJson`。被覆盖的旧判断不参与。`qualityJson` 为空、没有该指标、或标记列表为空的不返回。缺报 / 离线不在这张结果里。

一行一个 `(sampleId, identifier)`。

| 字段 | 类型 | 说明 |
|---|---|---|
| sampleId | string | |
| judgeId | string | sample 上的最新判断 id |
| messageId | string \| null | 来自 sample。无平台报文时为空 |
| deviceId | string | |
| projectId | string \| null | |
| categoryId | string | |
| identifier | string | 指标标识，复用物模型 |
| identifierName | string | 上报属性 / 测点字典上的名称 |
| marks | string[] | `qualityJson[identifier]`，同一指标的多项标记 |
| originalValue | number \| string \| null | 该键在 sample 测值 JSON 里的原值。不读 `repairJson`。测值为空时为 null |
| repairValue | number \| string \| null | `repairJson` 有该键时的修复值，否则 null |
| sampleTime | datetime | 采样时间。默认排序键 |
| judgedAt | datetime | 最新判断的时间，随行返回 |
| standardVersion | int \| null | 该 judgeId 上的标准版本号 |
| repaired | bool | `repairJson` 含该 identifier 键，且值非空，则为 true |

默认排序：`sampleTime` 降序。同一采样时间保持 `qualityJson` 键的写入顺序。

`repaired=true`（界面「已修复」）= `repairJson` 有同一个 identifier 键。`repaired=false`（「未修复」）= 没有该键。筛选默认不限，先返回全部当前异常。

## 7. 接口

路径挂在现有 `/iot` 前缀下。除 7.5 外，分页沿用 `pageNum` / `pageSize`。数据异常列表的分页参数是 `page` / `pageSize`。

### 7.1 标准

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustStandard?categoryId=` | 当前生效版本 + 是否有草稿 |
| GET | `/iot/iotDataTrustStandard/{id}` | 含对照、断言、关联、时效、离线、标记引用、修复策略 |
| PUT | `/iot/iotDataTrustStandard/{id}` | 只允许改 `status=draft`。已发布 / 历史返回只读 |
| POST | `/iot/iotDataTrustStandard` | 新建草稿。body：`categoryId`，可选 `copyFromId`（缺省复制当前已发布；没有已发布则按物模型生成） |
| POST | `/iot/iotDataTrustStandard/{id}/publish` | 草稿 → 已发布，写 `effectiveAt`；同品类上一份已发布改为 `superseded` |
| GET | `/iot/iotDataTrustStandard/history?categoryId=` | 历史只读，含已发布与被替代 |

### 7.2 覆盖

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustOverride?categoryId=` | 该品类的项目 / 设备覆盖 |
| PUT | `/iot/iotDataTrustOverride` | body：`scopeType`、`scopeId`、`categoryId`、`intervalSec`、`windowSec?`。同一范围已有则更新 |
| DELETE | `/iot/iotDataTrustOverride/{id}` | 恢复继承 |

设备档案与品类标准页写的是同一资源。

### 7.3 查询

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustJudgement` | 筛选 `categoryId`、`projectId`、`deviceId`、`judgedAtBegin`、`judgedAtEnd`、`identifier`、`abnormalOnly` |
| GET | `/iot/iotDataTrustJudgement/{id}` | 头 + 明细 + sample 的当前 `judgeId` / `qualityJson`（测值仍是 sample 原 JSON） |
| GET | `/iot/iotDataTrustGap` | 筛选 `deviceId`、时段、`status` |
| GET | `/iot/iotDataTrustStats` | 筛选 `categoryId`、`projectId`、`deviceId`。返回汇总行，不含门槛 |

没有「修改标记」接口。没有工单接口。

sample 查询沿用 `GET /iot/iotDeviceSample`，响应增加 `judgeId`、`qualityJson`、`repairJson`。报文查询沿用本机数据，按 `messageId` 关联 sample 做异常摘要和修复摘要，不改 `parsedJson`。

### 7.4 修复（治理）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustRepair` | 筛选 `deviceId`、`sampleId`、`gapId`、`status` |
| POST | `/iot/iotDataTrustRepair` | 写修复层。body：`sampleId` 或 `gapId` 二选一、`strategy`、`basis`、`after`。有 sample 时只更新该 sample 的 `repairJson`，不改测值 JSON |
| POST | `/iot/iotDataTrustRepair/{id}/revert` | 回退。见 6.1 |

实时修复由入库后的判断流程按标准里的修复策略触发，走同一张修复记录，`channel=realtime`。不单独做一套数据。

### 7.5 当前数据异常

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustAnomaly` | 当前异常清单。见 6.2。只读，没有改标记、写修复、回退的方法 |

查询参数：

| 参数 | 说明 |
|---|---|
| deviceId | 可空 |
| projectId | 可空 |
| categoryId | 可空 |
| identifier | 指标标识，可空 |
| mark | 标记码，如 `RANGE_HIGH`、`JUMP_FIRST`。命中该指标 `marks` 中的一项即可，可空 |
| repairStatus | `none` 未修复 / `repaired` 已修复。缺省或空 = 全部。原型默认全部 |
| sampleTimeBegin | 采样时间起，含边界。别名 `from` |
| sampleTimeEnd | 采样时间止，含边界。只传到日期时补 `23:59:59`。别名 `to` |
| page | 从 1 起。本接口用 `page`，不用本节开头的 `pageNum` |
| pageSize | 页大小 |

时间筛的是 `sampleTime`。`judgedAt` 在每行里返回，方便对照判断查询，不另做一条时间轴。以上条件可同时使用。

本接口不写 `repairJson`，不改测值 JSON，不改报文，不改 `qualityJson`。

## 8. 原型里能对上的例子

| 现象 | 记录 |
|---|---|
| 积水仪地埋已发布标准，另有草稿和历史 | `STD-C001-2` 已发布，`STD-C001-3` 草稿，`STD-C001-1` 被替代 |
| 一条报文对多条 sample | `PK015` → `S101`、`S102` |
| 完全正常 | `S101` / `J101`，`qualityJson={}` |
| 多指标都打标，关联有未执行、有继续 | `S102` / `J102` |
| 覆盖重判，旧判断还在 | `S103`：`J103a` 留下，`judgeId=J103b`。报文 `PK016` 仍是覆盖前的数据集 |
| 相邻缺对象，当前数据仍合格 | `S104` / `J104` |
| 外部数据 | `S105`，`externalId=EXT-LEVEL-20260930-01` |
| 缺报已补回 | `G2`，`filledSampleId=S106`，报文 `PK018` |
| 缺报中 / 离线中 / 已恢复 | `G1`、`G5` / `G3` / `G4` |
| 设备覆盖与项目覆盖 | `OV-D001` 间隔 120s；`OV-PJ01` 间隔 90s。D002 显示「继承自项目」 |
| 列表按 qualityJson 高亮，测值仍是原 JSON | 管网压力 `D004` / `S201` / `J201`，`yaqiang=280`，标记 `RANGE_HIGH` |
| 量程内但超统计极值，并初次跳变；二次标记成立 | `S108` / `J108` / 报文 `PK019`。测值 yewei=6.8，`repairJson.yewei=4.2`，标记 `EXTREME_HIGH`、`JUMP_FIRST`、`TREND_JUMP`、`JUMP_CONFIRM` |
| 连续跳变；二次标记不成立 | `S109` / `J109` / 报文 `PK020`。测值 yewei=8.9，无修复层。不写 `JUMP_CONFIRM` |
| 实时修复不改测值 | `R001` 挂 `S102`。测值 yewei 仍 11.2，repairJson 为 3.55 |
| 工作台曲线调整 | `R002` 挂 `S201`。测值 280，修复层 148 |
| 缺报只填修复层 | `G5` 仍缺报中，`repairId=R003`，无 sample、无 filledSampleId |
| 修复可回退 | `R004` 曾挂 `S103`，已回退。`S103.repairJson` 为空，测值仍 11.5 |
| 数据异常当前行（最新 qualityJson） | `S102`/`J102` 拆成两行：`yewei` 标记 `RANGE_HIGH`，原始 11.2，`repairJson` 3.55，已修复；`wendu` 标记 `NULL_VALUE`，原始 null，无修复键，未修复。`S201`/`J201` `yaqiang` `RANGE_HIGH`，原始 280，修复 148，已修复。`S108`/`J108` `yewei` 为 `EXTREME_HIGH`、`JUMP_FIRST`、`TREND_JUMP`、`JUMP_CONFIRM`，原始 6.8，修复 4.2，已修复。`S109`/`J109` `yewei` 为 `EXTREME_HIGH`、`JUMP_FIRST`、`JUMP_CONT`、`TREND_JUMP`，无 `JUMP_CONFIRM`，原始 8.9，未修复。`S103` 只出最新 `J103b`：`yewei` `RANGE_HIGH`，原始 11.5，未修复 |
| 数据异常不收 | `S101`/`J101`（`qualityJson` 空，通过）；历史判断 `J103a`（`S103` 的最新标记已不是那次通过）；缺报 / 离线 `G1`–`G5` |
| 试运行（不进侧栏） | `TR20261110001`。口径见第 9 节。上表 `J109` 的 `JUMP_CONT` 是更早的判断页示意，试运行不打这个标记 |

## 9. 试运行（规则预运行）

草稿保存之后，用当时的规则在历史实收样本上预跑一遍，看会产生什么标记，再由人决定发不发布。试运行结束不会自动发布。v1 也不禁用「发布」按钮，页面文案提示先试运行再决定。

和正式判断共用一个引擎，`mode=trial`。试运行只写下面两张表。

本期是同步接口，对齐后端 `e270318a`、前端 `e1ea554c`。`POST /iot/iotDataTrustTrial` 带上 `categoryId`，在这一次请求里跑完，直接返回这条记录的结果。没有异步任务队列。

试运行不做这些事：

- 不改原始报文，不改测值
- 不写 `sample.judgeId`、`sample.qualityJson`
- 不写判断查询 / 异常列表用的正式判断记录
- 不写 `repairJson`，不跑修复
- 不创建、不修改缺报 / 离线记录
- 不自动发布
- 不把试运行有效率写进正式「完整率 / 有效率」

只判断对照表里「对外展示且参与判断」的指标。子探头用探头自己的 sample，不用父设备的报文解析。

每次 POST 新建一条历史记录。以往的记录保留，不覆盖。

必须先有已保存的草稿。没有草稿，请求失败，不建记录（没有快照可冻）。启动时把当时的对照、单条断言、关联、时效冻成 `standardSnapshot`。之后再改草稿，这条记录和它的结果不变。

没有实收样本也建记录：`status=done`，`receivedCount=0`，结果里说明该时段没有收到样本。不编造测值。执行失败写 `errorMessage`，`status=failed`，同样不改正式数据。

实现顺序：正式引擎能写 `qualityJson` 之后再做试运行，不必等异常列表页。新表的 SQL 由后端另行给出，跑之前要先宣布；本文只描述字段，不附可执行的迁移脚本。候选接口 `883047d8` 没有新 SQL。

### 9.0 本期不做（异步队列）

此前稿里的异步队列不在本期，留到后面的单独事项：POST 返回 `trialId` + `status=queued`、再轮询 GET、`POST /{id}/cancel`、状态 `running` / `cancelled`、`progress`。本期页面和接口都不要按那套做。

### 9.1 页面

组件 `IotDataTrustTrial`。没有 `id` 是列表，有 `id` 是这一条的结果。不进侧栏。

| | |
|---|---|
| 列表 | `/iot/iot-data-trust-trial` · `#dataTrustTrial` |
| 结果 | `/iot/iot-data-trust-trial?id={trialId}` · `#dataTrustTrial?id={trialId}` |

入口只有品类标准草稿页按钮「试运行」。必须先保存草稿。页面上还没保存的修改不能拿来跑。已发布且没有草稿的页面不提供这个按钮。创建后进入该条结果页。列表用来打开以往的记录。

列表筛选：品类、状态、操作人、创建时间。按创建时间倒序。

列：`trialId`、创建时间、品类、标准版本（草稿写「草稿 + 快照时间」）、数据范围（起止、项目或「未定义项目」、设备台数）、状态、实收样本数（不含上下文）、异常指标数、试运行有效率（失败或没有参与判断的指标时留空）、操作人。操作：查看结果。失败展示 `errorMessage`。

状态：`done` 已完成 / `failed` 失败。

权限：读 `iot:device:query`；发起 `iot:device:update`。本期没有取消。

结果页头：返回列表、范围、快照版本、状态、操作人。同步返回，打开时结果已经在。

完成后三块，都只属于这条记录：

1. 汇总：实收样本、参与判断指标、异常指标、有效指标、试运行有效率。
2. 标记分布：`RANGE`、`EXTREME`、`NULL_VALUE`、类型/单位、`ENUM`、`REQUIRED_MISS`、`JUMP_FIRST`、关联未执行。一个指标可以有多项标记，所以类型次数可以大于异常指标数。
3. 明细：一行是一条样本 × 一个指标。设备、采样时间、标识、名称、本次试运行用的测值、试运行标记、未执行原因。可按设备、指标、标记筛选，并可下钻该样本在本试运行中的结果。本页不展示正式 `qualityJson`。

和正式 `qualityJson` 对照、试运行完整率，留到后面，这一版页面不做。完整率即使以后要算，也不能写缺报记录。

### 9.2 创建参数

`categoryId`、`standardId` 必填。`standardId` 是已保存的草稿。`categoryId` 与该草稿一致。

`from` / `to` 必填，按 `sampleTime` 筛选。默认最近 7 天，最长 30 天。

`projectId` 必填。选了「未定义项目」时传空字符串 `""`。省略 `projectId` 这个字段则失败，不建记录。不能再用「不传项目 = 全部项目」。

`deviceIds` 可选。不传表示跑该项目下、当前窗口里的全部候选。要收窄时传这些候选的子集。候选之外的设备不要传。

### 9.3 候选（不用设备列表）

不要用 `GET /iot/iotDevice?categoryId=`。那条默认隐藏探头子设备。COD 等实收在子探头上，只按品类查设备会得到空列表。

对齐后端 `883047d8`。没有新 SQL。先项目，后设备。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustTrial/projects` | 必填 `categoryId`。`from` / `to` 可选，不传则默认最近 7 天。只返回这个品类在该窗口里有实收样本的项目 |
| GET | `/iot/iotDataTrustTrial/devices` | 必填 `categoryId`、`projectId`。时间窗与上一步相同（不传则默认最近 7 天）。只返回该项目下、窗口内有实收样本的设备 |

项目行：`id`、`name`。样本不在已定义项目下时，`id` 为空字符串。下一步的 devices 和 POST 都要把这个空字符串当作 `projectId` 传上去，不能省略字段。界面沿用现有文案「未定义项目」。

设备行：`id`、`name`、`categoryId`。本品类的子探头要出现在列表里，按探头自己的品类从父设备下面列出，不和一体机父设备混成一行。探头带 `masterId`、`masterName`、`masterSn`（父设备的 `deviceSn`）。窗内没有实收样本的设备不返回。窗口前只为「上一条」准备的上下文不算实收。

选定项目后，默认跑该项目全部候选（POST 不传 `deviceIds`）。用户可以取消勾选，只跑剩下的（POST 传 `deviceIds`）。

超过 30 天的窗口，候选请求失败，不返回列表。

### 9.4 上一条（试运行内重放）

试运行里的「上一条」用这份草稿，按采样时间重放历史样本，得到接受链。不掺正式环境已经接受过的链。

窗口开始之前的上下文也用同一份草稿走一遍，只为取出窗口起点的上一条。这些点不计入实收样本，也不出现在明细里。上下文至少取该设备该指标窗口前 2 个点，或向前 1 天，取足以覆盖这两者的点。

T-1、同时段、同项目同品类、关联设备，也只用这段上下文，不把上下文点算进实收。

单条断言先全部跑完。必报 / 类型与单位 / 量程 / 枚举 / 空值失败时，依赖该指标的关联记未执行（`skip`），和正式一样。极值、跳变初次失败不因此跳过跳变二次标记。基础失败的点不写入上一条。

### 9.5 跳变初次（算法 1，本期锁定）

本期只做算法 1。算法 2 不做。

- 参数是 `params.percent`，相对初始值，不是绝对差值。
- 初始值 = 该设备该指标在这次跳变之前的上一条已接受测值。不是单独配置的基线。
- 第一次相对该初始值超过 `percent`：打 `JUMP_FIRST`。初始值不动。
- 第一次跳变之后，下一次比较仍然对着同一个跳变前初始值，不改去对着刚跳过的那个点。若第二次也超过 `percent`（默认 `count=2`），校准：撤销 `JUMP_FIRST`，当前值成为新的上一条。不打 `JUMP_CONT`。
- 若第二次改去对着刚跳过的点，变化会变成 0，校准永远不会发生。不能那样比。

没有 `percent` 的旧快照，试运行不把绝对差值换算成跳变，也不写 `JUMP_FIRST`。

### 9.6 有效率

与正式相同：无异常标记的指标次数 / 参与判断的指标次数。只记在这条试运行上。失败、或没有参与判断的指标时留空，不除零。

### 9.7 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustTrial/projects` | 见 9.3 |
| GET | `/iot/iotDataTrustTrial/devices` | 见 9.3 |
| POST | `/iot/iotDataTrustTrial` | body：`categoryId`、`standardId`、`from`、`to`、`projectId`（可为空字符串）、`deviceIds?`。同步跑完。响应就是这一条已结束的记录，字段与 GET `/{id}` 相同，含 `status`（`done` 或 `failed`）、汇总、`markBreakdown`。没有样本时 `status=done`。不返回 `status=queued` |
| GET | `/iot/iotDataTrustTrial` | 列表。筛选 `categoryId`、`status`、`operator`、创建时间 |
| GET | `/iot/iotDataTrustTrial/{id}` | 范围、快照摘要、状态、汇总、`markBreakdown`。本期没有进度 |
| GET | `/iot/iotDataTrustTrial/{id}/items` | 明细分页。筛选设备、指标、标记 |

列表和明细分页沿用 `pageNum` / `pageSize`。

没有已保存草稿：请求失败，不建记录。省略 `projectId`：请求失败，不建记录，并说明必须带上项目（未定义项目传空字符串）。

### 9.8 表

新表和 SQL 由后端稍后提供。这里只列字段，不提供现在就可以拿去执行的迁移。候选接口没有新表。

`iot_data_trust_trial`：

| 字段 | 说明 |
|---|---|
| id | trialId |
| standardId | 已保存的草稿 |
| categoryId | 来自该草稿 |
| standardSnapshot | JSON。对照、断言、关联、时效 |
| fromTime / toTime | 采样时间范围 |
| projectId | 必填。空字符串表示未定义项目，不是全部项目 |
| deviceIds | 空表示该项目下本次全部候选 |
| status | `done` / `failed`。`queued` / `running` / `cancelled` 不在本期 |
| receivedCount | 实收样本数，不含上下文 |
| judgedMetrics / abnormalMetrics / validMetrics | 参与判断、有异常标记、无异常标记的指标次数 |
| markBreakdown | JSON。第 9.1 节的分桶 |
| errorMessage | 失败原因。没有样本不是失败 |
| operator | |
| createdAt / finishedAt | 同步返回时两者都有。本期不写 `progress` |

`iot_data_trust_trial_item`：

| 字段 | 说明 |
|---|---|
| id | |
| trialId | |
| sampleId / deviceId / sampleTime | |
| identifier / identifierName | 复用物模型标识 |
| value | 本次试运行用的测值。不读 `repairJson` |
| qualityJson | 与正式同形：k = 指标，v = 标记码列表。只含标记，无异常为 `{}`。不回写 sample |
| skipJson | 可选。关联未执行时 `{ "status": "skip", "relations": [], "reason": "" }` |

### 9.9 原型例子

`TR20261110001`：草稿 `STD-C001-3` 在 `2026-11-10 09:20:00` 的快照，范围 2026-09-30，项目 PJ01，设备 D001 与探头 D002。液位 `percent=30`、`count=2`。

窗口前上下文 4 条（D001、D002 各 2 点）不计入实收。实收 8，参与判断 24，异常指标 6，有效指标 18，试运行有效率 75%。标记分布：量程 2、极值 4、空值 1、`JUMP_FIRST` 2、关联未执行 8。类型 / 枚举 / 缺必报为 0。

链（只看 D001 液位，初始值来自上下文，最后一条已接受值是 3.10）：

| 样本 | 测值 | 结果 |
|---|---|---|
| S108 | 6.8 | 相对 3.10 超过 30%，先记 `JUMP_FIRST`，初始值不动。随后 S109 校准，这个标记被撤销。仍留 `EXTREME_HIGH` |
| S109 | 8.9 | 第二次仍对照 3.10，不是对照 6.8。超过 30%。校准：撤销 `JUMP_FIRST`，8.9 成为新的上一条。不写 `JUMP_CONT`。仍留 `EXTREME_HIGH` |
| S102 | 11.2 | 相对新的上一条 8.9 未超过 30%，不打跳变。量程失败，依赖液位的关联未执行。本点不写入上一条 |
| S101 | 3.42 | 相对仍为 8.9 的上一条超过 30%，记 `JUMP_FIRST`。窗口里没有下一点，校准未发生 |

D002 的 S103 用探头自己的 sample（液位 11.5），不读 D001 的报文。量程失败，所以虽有 `JUMP_FIRST`，但不进入校准计数。这一天的候选里，PJ01 会列出 D001 和探头 D002（`masterId=D001`，`masterName` 东湖路井-01，`masterSn=MF20260901001`）。D015 窗内没有实收，不出现。未挂项目的 D009 单独成一行，`id` 为空。

`TR20261109003`：项目 PJ01、最近 7 天没有实收样本，`status=done`，说明没有数据。`TR20261108004` 同步失败，`errorMessage` 说明没有改正式数据。

## 10. 按数据推荐（拟定，后端确认）

挂在品类标准草稿上，不是新的侧栏模块，也不单开路由页。仓库里还没有 `IotDataTrustSuggest` 的实现。下面是给前端今晚能挂按钮用的拟定接口，后端确认后再定稿。不要当成已经发布的合同，也不要附 SQL。

- 对照表里已经有「参与判断」的指标之后，才出现「按数据推荐」。新建草稿不会自动跑。
- 窗口默认最近 7 天，最长 30 天。
- 建议只来自当前草稿对照里已经展示、且参与判断的字段。用户可以指定本次的核心考察字段；不指定则这些字段都算。
- 量程、极值、跳变按天拆开，放在时间轴上。不要只给整窗一个合计数。
- 测点字典的量程只引用，不用窗口里观测到的最小、最大去覆盖字典。
- 类型 / 单位默认不推荐，保持关闭。
- 不要根据单台设备去推荐同项目同品类或关联设备规则。
- 人确认后只写入当前草稿。不自动发布。
- 顺序是：人确认写入草稿 → 保存 → 试运行 → 再决定是否发布。
- 本期不根据试运行结果自动改阈值。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/iot/iotDataTrustSuggest` | body：`categoryId`、`standardId`（当前草稿）、`from`、`to`、`identifiers?`（核心考察字段；不传表示全部参与判断的对照字段）。返回本次建议 id，以及按天的量程 / 极值 / 跳变观察 |
| GET | `/iot/iotDataTrustSuggest` | 按 `standardId` 看这次草稿上的建议。可再按 id 取一条 |
| POST | `/iot/iotDataTrustSuggest/{id}/apply` | 把人确认的内容写入当前草稿。量程保持 `cite=point`（有字典时）。不把观测 min/max 写进标准。不打开类型 / 单位。不新增 peer / neighbor。不发布 |

按天一行至少能看出：日期、`identifier`、样本数、观测最小、观测最大、超出字典量程的次数、超出当前极值的次数、相对本设备上一个数值超过当前 `percent` 的次数。最后一项只是观察，不自动改 `percent`。

## 11. 正式开跑

和试运行分开。试运行不写正式数据。标准发布之后，正式判断只用已发布且生效的标准：设备覆盖 > 项目覆盖 > 品类已发布。会写判断记录，并回写 `sample.judgeId` / `qualityJson`。

引擎已在 `866403e3`：定时任务，加上人工 `POST /iot/iotDataTrustJudge/run`。没有新 SQL，没有新表。请求体以后端该次提交为准，本文不另造字段。

页面：判断查询上放「正式开跑」，进入 `#dataTrustJudgeRun`。结果仍在判断查询和数据异常里看，不另做一套判断表。权限与其它数据可信页相同：看 `iot:device:query`，触发 `iot:device:update`。

数据可信与物联网同级，目录已经在。本页挂在这个目录下。不另写菜单 SQL，也不在本期执行菜单脚本。OTA 的升级任务、升级监控、历史升级记录保持不动。

本页说明定时与人工走同一条引擎，不在页面上配置 cron 表达式。页面上的触发示意不是新的运行历史表。
