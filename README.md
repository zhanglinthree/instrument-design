# 设备管控平台 · 物模型 HTML 高保真设计稿

Vue 3 CDN + Ant Design 风格 CSS，1440 管理后台壳。

## 打开方式

**直接打开（需联网加载 Vue CDN）：**
```
index.html
```

**或使用本地静态服务：**
```bash
python3 -m http.server 8877
# 浏览器打开 http://127.0.0.1:8877/
```

## 包含屏幕

| # | 屏幕 | Hash 直达 |
|---|------|-----------|
| 1 | 品类列表（搜索 / 绑 AEP / 新建 / 表格） | `#list` |
| 2 | 新建品类（模态） | `#createCategory` |
| 3 | 编辑品类（模态） | `#editCategory` |
| 4 | 物模型详情壳 + Tab | `#detail` |
| 4a | · 上报属性 | `#props` |
| 4b | · 异常事件 | `#events` |
| 4c | · 测点字典 | `#points` |
| 4d | · 安装参数模板 | `#install` |
| 4e | · 固件基线 | `#firmware` |
| 5 | 编辑测点表单 | `#editPoint` |
| 6 | 编辑安装字段表单 | `#editInstall` |
| 7 | 登记固件版本表单 | `#editFirmware` |
| 8 | 删除确认 | `#deleteConfirm` |

侧栏高亮「物模型」；顶栏面包屑随屏切换。

## 配色

- 侧栏 `#DBE1F0` · 顶栏 `#F1E8EC` · 主区白
- primary `#0D6EFD` · error `#DC3545` · orange `#E78212`

## 文件结构

```
index.html   # 入口
styles.css   # 样式
app.js       # Vue SPA（全部屏幕）
shots/       # 关键屏截图
take-shots.js # 截图脚本（需 puppeteer-core + Chrome）
```

## 截图

见 `shots/`：
- `01-category-list.png` 品类列表
- `02-create-category.png` 新建品类
- `03-point-dictionary.png` 测点字典
- `04-edit-point.png` 编辑测点
- `05-install-params.png` 安装参数模板
- `06-firmware-baseline.png` 固件基线
- `07-edit-category.png` 编辑品类
- `08-delete-confirm.png` 删除确认
- `09-edit-install.png` 编辑安装字段
- `10-edit-firmware.png` 登记固件
- `11-report-props.png` 上报属性
- `12-exception-events.png` 异常事件
