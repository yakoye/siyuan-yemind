# YeMind v0.8.1 插件身份与兼容边界

## 当前身份

```text
产品名：YeMind
工程名：siyuan-yemind
plugin.json.name：siyuan-yemind
安装目录：data/plugins/siyuan-yemind/
数据目录：data/storage/petal/siyuan-yemind/
```

## 历史兼容

旧 ID `siyuan-yemind-zen` 不再作为当前安装目录、资源 URL 或诊断身份使用，但保留两项兼容：

1. 解析历史 `siyuan://plugins/siyuan-yemind-zen?...` 导图链接；
2. 新 ID 对应数据为空时，从旧 petal 存储只复制 maps/settings/checkpoints。

迁移不删除旧数据，也不覆盖新 ID 下已经存在的有效数据。

## 旧标签页

思源自定义标签类型包含插件 ID，旧会话中由旧 ID 恢复的标签可能不能复用。建议升级前关闭旧 YeMind 标签，重启后从 Dock 重新打开；导图数据会通过存储迁移保留。
