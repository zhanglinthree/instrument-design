# 品类图标规范（ICON_SPEC）

## 库选型

| 项 | 选择 |
| --- | --- |
| 图标库 | **[Iconify](https://iconify.design/)** |
| 本 mock 加载 | CDN Web Component：`iconify-icon@2.1.0`（`https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js`） |
| 默认图标集 | **Material Design Icons**（Iconify 前缀 `mdi`） |
| UI 壳风格 | 本原型为 Vue 3 CDN + **自研 Ant Design 风格 CSS**（未引入 Element Plus / Ant Design Vue 组件库） |

**正式 FE 推荐包（与 mock 对齐）：**

- Vue 3：`@iconify/vue`（`<Icon icon="mdi:water" />`）或继续用 `iconify-icon` Web Component
- 若需离线/打包：`@iconify-json/mdi` + `@iconify/vue` 按需注册
- **不要**把 Element / Ant Design **组件名**写入 `category.icon`；落库一律为 Iconify id 字符串

> 短期：FE 本地 `DEFAULT_CODE_TO_ICONIFY` + 推荐目录 `ICON_CATALOG`。  
> 中期：BE `iot_category.icon`（varchar，存 Iconify id）；空值由 FE/BE 按 `code` 查默认表。

## 存储格式

- 字段：`category.icon`（字符串）
- 值：**Iconify id**，形如 `prefix:name`，例如 `mdi:water`、`mdi:pump`
- **无业务 key 白名单层**：不存 `flood_buried` 这类业务 code 当图标；业务 code 仍在 `category.code`
- `icon` 为空 / null → 回退 `DEFAULT_CODE_TO_ICONIFY[category.code]` → 再回退 `mdi:devices`

## 解析顺序（工作台 / 列表共用）

1. `category.icon`（已是 Iconify id）
2. `DEFAULT_CODE_TO_ICONIFY[category.code]`
3. 合成桶：`aio` / `uncategorized` / 子设备无品类 → `probe`
4. `mdi:devices`

工作台继续：`resolveCategoryIcon(category)`（兼容旧名 `resolveCategoryIconKey`）。

## DEFAULT_CODE_TO_ICONIFY（兜底表）

| code | Iconify id |
| --- | --- |
| `aio` | `mdi:monitor-dashboard` |
| `flood_buried` | `mdi:pipe` |
| `flood_sidewall` | `mdi:wall` |
| `water_quality` | `mdi:water-check` |
| `pipe_pressure` | `mdi:gauge` |
| `pump_unit` | `mdi:pump` |
| `rain_gauge` | `mdi:weather-pouring` |
| `flow_doppler` | `mdi:waves` |
| `water_cod` | `mdi:flask-outline` |
| `probe` | `mdi:antenna` |
| `uncategorized` | `mdi:help-box-outline` |
| `device` | `mdi:devices` |

## 挑选器 UX（物模型品类新建 / 编辑）

1. **推荐网格**：`ICON_CATALOG`（约 28 个 IoT/设备相关 `mdi:*`），点击即写入 `categoryForm.icon`
2. **自由填写**：输入任意 Iconify id（`prefix:name`），支持推荐集以外的图标
3. 顶部预览当前选中 id；确定后写入品类 `icon` 字段
4. 品类列表 / 工作台分布：按解析顺序渲染 `<iconify-icon :icon="…" />`

## FE 接入要点

```ts
// 读
const icon = category.icon || DEFAULT_CODE_TO_ICONIFY[category.code] || 'mdi:devices';

// 写（创建/编辑品类）
payload.icon = selectedIconifyId; // e.g. 'mdi:water'；允许 '' 表示走 code 兜底
```

```vue
<!-- @iconify/vue -->
<script setup>
import { Icon } from '@iconify/vue';
</script>
<template>
  <Icon :icon="icon" width="20" height="20" />
</template>
```

候选推荐 id（与 mock `ICON_CATALOG` 一致，可增删）：  
`mdi:devices` · `mdi:monitor-dashboard` · `mdi:pipe` · `mdi:wall` · `mdi:water` · `mdi:water-check` · `mdi:gauge` · `mdi:pump` · `mdi:weather-pouring` · `mdi:waves` · `mdi:flask-outline` · `mdi:antenna` · `mdi:help-box-outline` · `mdi:valve` · `mdi:gate` · `mdi:cctv` · `mdi:weather-partly-cloudy` · `mdi:battery-outline` · `mdi:signal` · `mdi:thermometer` · `mdi:hydraulic-oil-level` · `mdi:server-network` · `mdi:access-point` · `mdi:chip` · `mdi:map-marker-radius` · `mdi:alert-circle-outline` · `mdi:lightning-bolt` · `mdi:fan`
