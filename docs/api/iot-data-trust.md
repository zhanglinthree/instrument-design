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
3. 再跑关联。某指标单条已失败，则依赖它的关联中停，明细 `status=skip`（未执行）；不依赖该指标的关联继续。
4. 先写判断记录，再回写 sample。总结果按各指标「且」汇总（`overallPass`）。

### 1.5 sample 回写

| 列 | 含义 |
|---|---|
| `judgeId` | 一条 sample 只挂 1 个最新判断 id。多个指标共用这一个 id |
| `qualityJson` | 与测值 JSON 同形的 k-v。k = 指标标识；v = 异常标记码列表（可多项）。无异常的指标不出现。全部正常为 `{}` 或空。测值 JSON 不改 |

覆盖重判：新建一条判断记录，把 sample 的 `judgeId` 和 `qualityJson` 更新为新记录，旧判断留在判断表。

不提供手工改标记的接口。重判只随 sample 覆盖，或后台重跑。

### 1.6 缺报与离线

- 缺报不算在当前这条合格 sample 上，不创造测值。
- 补报落入窗口：状态改为已补回，写 `filledSampleId`。窗口默认是间隔的一半，左右对称，可改。
- 连续缺报达到 `thresholdCount` 或 `thresholdDuration`：记一条离线时段。恢复上报后 `status=recovered`。
- 只做固定频率。不做变频率 / 按需上报。

### 1.7 相邻对照

这一期相邻设备只支持手工指定设备对。邻居缺数只记「对照对象缺失」：不把当前 sample 打成不合格，不把该标记写入 `qualityJson`。

### 1.8 不做

- 校准改测值
- 重复与冲突（维持当前同窗口覆盖写入；覆盖后按 1.5 重判）
- 变频率 / 按需上报
- 通用规则引擎
- 用判断拦截入库
- 手工改标记
- 完整率 / 有效率的门槛拦截（本期只汇总）

### 1.9 汇总公式

- 完整率 = 应报次数 / 实收次数
- 有效率 = 无异常标记的指标次数 / 参与判断的指标次数（异常看 `qualityJson`）

按品类 / 项目 / 设备汇总。不做门槛。

## 2. 页面

| 页面 | 组件 | FE 路由 | Hash |
|---|---|---|---|
| 目录（无页） | — | `/iot/data-trust` | — |
| 品类标准 | `iot/iot-data-trust/IotDataTrustStandard` | `/iot/iot-data-trust-standard` | `#categoryStandard` |
| 判断查询 | `iot/iot-data-trust/IotDataTrustJudgement` | `/iot/iot-data-trust-judgement` | `#dataTrustJudgement` |
| 缺报与离线 | `iot/iot-data-trust/IotDataTrustGap` | `/iot/iot-data-trust-gap` | `#dataTrustGap` |
| 完整率/有效率 | `iot/iot-data-trust/IotDataTrustStats` | `/iot/iot-data-trust-stats` | `#dataTrustStats` |

深链示例：`#categoryStandard?categoryId=C001`，`#categoryStandard?tab=tip`，`#dataTrustJudgement?id=J102`。

监控列表 / 曲线 / 上报明细：测值仍读原来的 JSON（`latest_json` 或 sample 测值）。异常高亮按指标读 `qualityJson`。点击用 `judgeId` 打开判断详情。

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
| type | string | `required` 必报 / `type` 类型与单位 / `range` 量程 / `enum` 枚举 / `null` 空值 |
| enabled | bool | |
| params | object | 见下 |

`params`：

- `type`：`dataType`、`unit`、`cite=property`（引用上报属性）
- `range`：`min`、`max`、`cite=point|standard`、`pointCode`。`cite=point` 时 min/max 来自测点字典，标准页不可改；不够时改为 `standard` 再补
- `enum`：`values` 逗号分隔
- `null`：`allowNull`
- `required`：无额外参数

### 3.4 关联

| 字段 | 类型 | 说明 |
|---|---|---|
| standardId | string | |
| type | string | `cross` 跨字段 / `trend` 同时段趋势 / `peer` 同项目同品类 / `neighbor` 相邻设备 |
| targets | string[] | 对象。相邻设备这一期是手工设备 id 对 |
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

原型内置：`RANGE_HIGH` / `RANGE_LOW` / `TYPE_MISMATCH` / `UNIT_MISMATCH` / `ENUM_INVALID` / `NULL_VALUE` / `REQUIRED_MISS` / `TREND_JUMP` / `CROSS_FIELD` / `PEER_DEVIATION` / `NEIGHBOR_MISS` / `NEIGHBOR_DIFF`。

`NEIGHBOR_MISS` 只出现在判断明细的原因里，不写入当前 sample 的 `qualityJson`。

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
| filledSampleId | string \| null | 仅已补回 |
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

完整率、有效率由上面的公式现算，不落门槛字段。

## 7. 接口

路径挂在现有 `/iot` 前缀下。分页沿用 `pageNum` / `pageSize`。

### 7.1 标准

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/iot/iotDataTrustStandard?categoryId=` | 当前生效版本 + 是否有草稿 |
| GET | `/iot/iotDataTrustStandard/{id}` | 含对照、断言、关联、时效、离线、标记引用 |
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

没有「修改标记」接口。

sample 查询沿用 `GET /iot/iotDeviceSample`，响应增加 `judgeId`、`qualityJson`。报文查询沿用本机数据，按 `messageId` 关联 sample 做异常摘要，不改 `parsedJson`。

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
