# IoT 设备管控平台 v0.2 API 备注（设计仓沉淀 · 与 mfish-nocode 后端对齐）

> 范围：一期物模型 + 设备台账已落地后端接口  
> 约定：分页 `pageNum`/`pageSize`；返回 `Result` / `PageResult`；字典走 `GET /dictItem/{dictCode}`  
> 权限：设备 `iot:device:*`；品类及子资源 `iot:category:*`；项目 `iot:project:*`  
> 设计确认：`priority` 越小越优先；转移目标可为 null（未定义项目）；固件挂品类；`industry`→`iot_industry`；lifecycle ≠ AEP status ≠ 监控 online  
> 菜单种子：后端仓 `db/iot_menu_permission_v0.2.sql`（品类/项目；执行后角色勾选；**勿把库密码写进文档**）
> 同源字段清单：`docs/api/iot-v0.2-field-list.md`


> **联调路径（单实例）**：`application-gateway.yml` 将 `cn.com.mfish.iot` 挂在网关前缀 `/iot` 下。文档里的 Controller 路径（如 `/iotDevice`）联调时实际请求为 **`/iot` + Controller**（如 `/iot/iotDevice`、`/iot/iotCategory`、`/iot/iotProject`）。字典等非 IoT 包仍按其自身前缀（如 `/sys/dict`）。

## 1. 品类 Category

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/iotCategory` | query | 筛选 keyword/industry/status；回填 deviceCount、ruleCount |
| POST | `/iotCategory` | insert | body: name*, code*, industry*, description, status*（默认 draft） |
| PUT | `/iotCategory` | update | |
| DELETE | `/iotCategory/{id}` | delete | **有设备引用则拒绝**；否则事务内级联删子资源后删品类 |
| DELETE | `/iotCategory/batch/{ids}` | delete | 同上（任一 id 有设备引用则整批失败） |
| GET | `/iotCategory/{id}` | query | 含 deviceCount、ruleCount |
| GET | `/iotCategory/{categoryId}/rules` | query | 嵌套便利：该品类规则列表（完整 CRUD 见下） |

### 删除策略（2026-10-08）

1. **拦截**：`iot_device.category_id` 仍指向该品类时，返回错误（提示设备台数），**不**自动清空设备品类。  
2. **级联**（同事务）：删除 `iot_category_rule` / `property` / `event` / `point` / `install_field` / `firmware` 中该 `categoryId` 行，再删品类。  
3. 批量删除：先检查全部 id 的设备引用，再逐个清子表后 `removeByIds`。

## 2. 品类子资源（扁平路径，均需 categoryId）

统一 CRUD 形态：`GET/POST /{res}`，`PUT /{res}`，`GET/DELETE /{res}/{id}`，`DELETE /{res}/batch/{ids}`  
权限均复用 `iot:category:query|insert|update|delete`。

| 资源 | 路径 | 列表筛选要点 | 备注 |
|------|------|--------------|------|
| 归属规则 | `/iotCategoryRule` | categoryId, type, enabled, keyword | 默认 priority=100、enabled=1、type=general；**按 priority 升序** |
| 上报属性 | `/iotCategoryProperty` | categoryId, keyword(identifier/name) | required 默认 0 |
| 异常事件 | `/iotCategoryEvent` | categoryId, level, keyword | level→`iot_event_level`；触发条件字段 `triggerExpr` |
| 测点字典 | `/iotCategoryPoint` | categoryId, keyword(code/name) | 阈值字段可空 |
| 安装参数模板 | `/iotCategoryInstallField` | categoryId, keyword(code/name) | code 对应设备 `installParams` 的 key |
| 固件基线 | `/iotCategoryFirmware` | categoryId*, model, status, keyword | **categoryId 必填**（挂品类下） |

## 3. 项目 Project

| 方法 | 路径 | 权限 |
|------|------|------|
| GET/POST | `/iotProject` | query / insert |
| PUT | `/iotProject` | update |
| GET/DELETE | `/iotProject/{id}` | query / delete |
| DELETE | `/iotProject/batch/{ids}` | delete |

「未定义项目」为虚拟项，**不进**本表 CRUD。筛选：keyword、status（`iot_project_status`）。

## 4. 设备 Device（扩字段，路径不变）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/iotDevice` | query | 筛 status(AEP)/lifecycle/projectId/categoryId/keyword…；回填 projectName（空→未定义项目）、categoryName |
| POST/PUT | `/iotDevice` | insert/update | body 含 lifecycle、projectId、categoryId、model、lng/lat、address、install*、photos、installParams 等；**勿改坏 AEP 字段语义** |
| POST | `/iotDevice/transfer` | update | `{deviceIds[], targetProjectId(null=未定义), note}`；写 `iot_device_transfer_log` |
| GET | `/iotDevice/{id}/transferLogs` | query | 转移日志分页 |
| GET | `/iotDevice/aepDiff` | query | type/action/keyword |
| POST | `/iotDevice/aepDiff/{id}/action` | update | `{action: pending\|ignored\|imported}`；extra+imported→ensureDevice 并落入未定义项目 |
| GET/DELETE… | 既有 CRUD/export | | |

## 5. 字典 dictCode

`iot_device_lifecycle`、`iot_category_match`、`iot_category_status`、`iot_project_status`、`iot_rule_type`、`iot_event_level`、`iot_aep_diff_type`、`iot_aep_diff_action`、`iot_industry`

## 6. 冒烟建议

1. `POST /iotCategory` 建品类 → 记 id  
2. `POST /iotCategoryRule`：`{"categoryId":"...","name":"默认","type":"general","priority":10,"enabled":1}`  
3. `GET /iotCategory/{id}/rules` 与 `GET /iotCategoryRule?categoryId=...` 应一致且 priority 小的在前  
4. 依次 POST Property / Event / Point / InstallField / Firmware（Firmware 必须带 categoryId）  
5. `GET /iotCategory/{id}` 看 deviceCount、ruleCount  
6. 无设备绑定该品类后 `DELETE /iotCategory/{id}` 应失败；解绑后再删，子资源应一并消失  
7. 设备转移与 aepDiff 见 phase2  

## 7. 已知缺口

- AEP 对账差异自动生成 / 远端同步未做  
- missing 侧 AEP 补建延后  
- 前端页面仍待  
- 菜单 SQL 需在目标库手工执行 `db/iot_menu_permission_v0.2.sql` 后角色授权  
