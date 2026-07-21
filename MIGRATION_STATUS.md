# YeMind v0.8.1 迁移状态

- 当前稳定版本：v0.8.5。
- 当前产品名、工程名、插件 ID 和安装目录分别为 YeMind、`siyuan-yemind`、`siyuan-yemind` 和 `data/plugins/siyuan-yemind/`。
- 用户已手动把旧插件安装文件夹整体改名为 `siyuan-yemind`。思源插件数据实际位于 `data/storage/petal/<插件ID>/`，不随安装文件夹自动改名。
- v0.8.1 首次启动时，若新 ID 下对应数据为空，会从 `data/storage/petal/siyuan-yemind-zen/` 只复制 `maps.json`、`settings.json` 和 `checkpoints.json` 到新 ID 存储；旧数据保留，新位置已有数据时不覆盖。
- 发布包不包含用户数据文件，可关闭思源后直接解压覆盖现有安装目录。
- `siyuan-yemind-zen` 只作为历史协议链接别名保留，不再用于当前资源路径或安装目录。
- 旧会话中已经打开的插件标签建议在升级前关闭；升级并重启后从 YeMind Dock 重新打开。

