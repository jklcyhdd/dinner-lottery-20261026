# 今晚吃什么

一个为 iPhone 设计的私人晚餐抽签静态网页。它从 60 道不重复的家常荤菜中抽一道，记录确认吃过的菜，并生成适合截图发给家人的完整菜谱卡。

## 功能

- 每轮 60 道，确认过的菜本轮不再出现；60 道确认完后自动开始下一轮。
- “换一道”不消耗次数，只有点击“确认今晚吃这道”才写入历史并计入进度。
- 首页、历史、全部菜谱三页，支持按菜名、蛋白质、做法和食材搜索。
- 每道菜包含一人份食材、详细步骤、预计时间、熟透判断和调味建议。
- 专用截图卡在一屏内显示菜图、食材、步骤、熟透判断、调味建议和固定搭配。
- 记录只写入当前浏览器的 `localStorage`，不上传、不登录、不依赖数据库。
- 支持 JSON 备份与恢复、添加到主屏幕和离线使用。
- 无框架、无运行时接口、无遥测、无付费服务。

晚餐固定搭配是一小碗米饭和一份炒青菜。

## 本地运行

需要 Node.js 20.11 或更高版本。浏览器不能直接用 `file://` 完整运行 ES 模块和离线缓存，请启动本地 HTTP 服务：

```powershell
node scripts/serve.mjs
```

打开 `http://127.0.0.1:4173`。

## iPhone 日常使用

1. 用 Safari 打开已部署的 HTTPS 地址。
2. 点击 Safari 分享按钮，选择“添加到主屏幕”。
3. 打开主屏幕图标，点击“抽一道菜”。
4. 想换时点“换一道”；确定后点“确认今晚吃这道”。
5. 点“今晚截图卡”，用 iPhone 截屏后发给妈妈。
6. 下次从已确认区点“再抽一道”；从历史页可以回看过去的菜。

第一次打开需要联网。缓存完成后，菜谱、图片和抽签逻辑可离线使用。

记录绑定当前网址的 Safari 网站数据。清理网站数据、卸载浏览器或更换部署域名都会让应用看不到旧记录。定期从右上角菜单导出 JSON 备份；迁移域名前先导出，在新域名恢复。

## 免费部署

`dist/` 是只包含运行文件的静态站点，可以免费放到任意静态托管服务。

生成或刷新部署目录：

```powershell
node scripts/build-deploy.mjs
```

GitHub Pages 是低维护方案：

1. 新建一个公开 GitHub 仓库。
2. 把 `dist/` 内的全部内容上传到仓库根目录。
3. 在仓库 `Settings > Pages` 中选择 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
4. 等待 GitHub Pages 发布，用 iPhone Safari 打开生成的 `https://<用户名>.github.io/<仓库名>/`。
5. 添加到主屏幕后正常使用。页面记录仍然只留在你的 Safari，不会上传到 GitHub。

也可以用 Cloudflare Pages 或 Netlify 的免费静态托管。它们都只需要 `dist/`，不需要构建命令或服务端函数。

## 测试

```powershell
node --test tests/*.test.mjs
node --check app.js
node --check src/state.js
node --check src/recipes.js
node --check sw.js
```

测试覆盖 60 道菜的数量、唯一性、禁用食材、食材用量、步骤完整性、做法差异、本地图片与来源清单，以及抽签、确认幂等、历史恢复、轮次切换和备份数据恢复。

## 图片与菜谱来源

菜品图片来自 [HowToCook](https://github.com/Anduin2017/HowToCook) 的原菜目录，项目按
[Unlicense](https://github.com/Anduin2017/HowToCook/blob/master/LICENSE) 发布。应用内保存的是压缩后的 WebP 副本，不依赖远程图片接口。

每张图对应的原始路径见 [data/image-sources.json](data/image-sources.json)，完整说明见 [IMAGE_CREDITS.md](IMAGE_CREDITS.md)。菜谱文字为本项目重新整理的一人份家常做法。

## 项目结构

```text
index.html                 页面结构
styles.css                 移动端与截图卡样式
app.js                     交互、渲染、分享与备份
src/recipes.js             60 道菜谱
src/state.js               抽签、确认、轮次与状态校验
sw.js                      离线缓存
manifest.webmanifest       PWA 与主屏幕元数据
assets/dishes/             60 张本地菜品图
data/image-sources.json    逐图来源路径
tests/                     自动测试
scripts/build-deploy.mjs   生成 dist 部署目录
dist/                      可直接部署的静态站点
```
