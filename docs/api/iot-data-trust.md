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
4. 跳变二次标记是确认步骤，不是另一套规则引擎。该指标若已有上一条里的基础失败，二次标记同样 `skip`。只有极值、跳变初次、连续跳变失败时，二次标记仍执行。确认成立才把 `JUMP_CONFIRM` 写入 `qualityJson`；不成立不写，已有标记保留。
5. 先写判断记录，再回写 sample 的 `judgeId` / `qualityJson`。总结果按各指标「且」汇总（`overallPass`）。判断不写 `repairJson`，不改测值。

单条断言类型：必报、类型与单位、量程（优先测点字典 min/max）、极值（统计 / 历史极端，单独配置，不是字典量程）、枚举、空值、跳变初次标记（只跟本设备自身历史比）、连续跳变。

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
| 判断查询 | `iot/iot-data-trust/IotDataTrustJudgement` | `/iot/iot-data-trust-judgement` | `#dataTrustJudgement` |
| 缺报与离线 | `iot/iot-data-trust/IotDataTrustGap` | `/iot/iot-data-trust-gap` | `#dataTrustGap` |
| 完整率/有效率 | `iot/iot-data-trust/IotDataTrustStats` | `/iot/iot-data-trust-stats` | `#dataTrustStats` |
| 修复策略（标准页页签，治理） | 仍是 `IotDataTrustStandard` | 同上，`tab=repair` | `#categoryStandard?tab=repair` |
| 离线工作台（治理，第三周） | `iot/iot-data-trust/IotDataTrustWorkbench` | `/iot/iot-data-trust-workbench` | `#dataTrustWorkbench` |
| 修复记录（治理，第三周） | `iot/iot-data-trust/IotDataTrustRepairLog` | `/iot/iot-data-trust-repair-log` | `#dataTrustRepairLog` |

一期四个路由不变。侧栏「数据可信」仍只是目录。修复策略、离线工作台、修复记录是后加的子页，不替换上面四页。

深链示例：`#categoryStandard?categoryId=C001`，`#categoryStandard?tab=tip`，`#categoryStandard?tab=repair`，`#dataTrustJudgement?id=J102`，`#dataTrustJudgement?id=J108`，`#dataTrustWorkbench?deviceId=D001&metric=yewei`。

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
| type | string | `required` 必报 / `type` 类型与单位 / `range` 量程 / `extreme` 极值 / `enum` 枚举 / `null` 空值 / `jumpFirst` 跳变初次标记 / `jumpCont` 连续跳变 |
| enabled | bool | |
| params | object | 见下 |

`params`：

- `type`：`dataType`、`unit`、`cite=property`（引用上报属性）
- `range`：`min`、`max`、`cite=point|standard`、`pointCode`。`cite=point` 时 min/max 来自测点字典，标准页不可改；不够时改为 `standard` 再补
- `extreme`：`low`、`high`、`method`（如 `historyP99`）、`cite=standard`。统计或历史极端，不引用测点字典 min/max，标准页可改
- `enum`：`values` 逗号分隔
- `null`：`allowNull`
- `required`：无额外参数
- `jumpFirst`：`delta`、`baseline=selfHistory`、`lookback`。只跟本设备自身历史比
- `jumpCont`：`delta`、`count`。连续次数达到 `count` 且每次差值超过 `delta`。与初次跳变分开打标

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

## 7. 接口

路径挂在现有 `/iot` 前缀下。分页沿用 `pageNum` / `pageSize`。

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
