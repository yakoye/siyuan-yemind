# YeMind 主题颜色与边框识别结果

本文件是 YeMind 19 套命名主题的完整颜色源，包含背景、文字、节点背景、节点边框和三段父子连线颜色。

## 分支编号与循环规则

- 分支 1：右上；分支 2：右中；分支 3：右下；分支 4：左下；分支 5：左中；分支 6：左上。
- 第 `n` 个一级分支使用：`(n - 1) % cycleLength`。因此第 7 个一级分支回到第 1 色，第 8 个一级分支使用第 2 色。
- `transparent` 表示截图中没有识别到独立可见的节点描边或背景框。

## 字段说明

| 字段 | 含义 |
|---|---|
| background | 导图背景色 |
| centerText / centerBackground / centerBorder | 中心主题文字色 / 背景色 / 边框色 |
| centerToLevel1Line | 中心主题到一级节点连线 |
| level1Text / level1Background / level1Border | 一级节点文字色 / 背景色 / 边框色 |
| level1ToLevel2Line | 一级节点到二级节点连线 |
| level2Text / level2Background / level2Border | 二级节点文字色 / 背景色 / 边框色 |
| level2ToNormalLine | 二级节点到普通节点连线 |
| normalText / normalBackground / normalBorder | 普通节点文字色 / 背景色 / 边框色 |

## 缤纷

### 晨曦

- 导图背景：`#FFFFFF`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`6`；第 7 分支色：`#FF6B6B`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FF6B6B` | `#000000` | `#FF6B6B` | `transparent` | `#FF6B6B` | `#660000` | `#FEE0E0` | `transparent` | `#FF6B6B` | `#660000` | `transparent` | `transparent` |
| 2 | `#FF9F69` | `#000000` | `#FF9F69` | `transparent` | `#FF9F69` | `#662400` | `#FEEBE0` | `transparent` | `#FF9F69` | `#662400` | `transparent` | `transparent` |
| 3 | `#97D3B6` | `#000000` | `#97D3B6` | `transparent` | `#97D3B6` | `#1E4733` | `#E9F5EF` | `transparent` | `#97D3B6` | `#1E4733` | `transparent` | `transparent` |
| 4 | `#88E2D7` | `#000000` | `#88E2D7` | `transparent` | `#88E2D7` | `#13524A` | `#E7F9F7` | `transparent` | `#88E2D7` | `#13524A` | `transparent` | `transparent` |
| 5 | `#6FD0F9` | `#000000` | `#6FD0F9` | `transparent` | `#6FD0F9` | `#044661` | `#E2F6FE` | `transparent` | `#6FD0F9` | `#044661` | `transparent` | `transparent` |
| 6 | `#E18BEE` | `#000000` | `#E18BEE` | `transparent` | `#E18BEE` | `#4E0D58` | `#F9E8FC` | `transparent` | `#E18BEE` | `#4E0D58` | `transparent` | `transparent` |

### 彩虹

- 导图背景：`#FFFFFF`；中心文字：`#000229`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`6`；第 7 分支色：`#F9423A`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#F9423A` | `#FFFFFF` | `#F9423A` | `transparent` | `#F9423A` | `#620703` | `#FDD8D7` | `transparent` | `#F9423A` | `#620703` | `transparent` | `transparent` |
| 2 | `#F6A04D` | `#000000` | `#F6A04D` | `transparent` | `#F6A04D` | `#613204` | `#FCEBDA` | `transparent` | `#F6A04D` | `#613204` | `transparent` | `transparent` |
| 3 | `#F3D321` | `#000000` | `#F3D321` | `transparent` | `#F3D321` | `#605205` | `#FCF5D2` | `transparent` | `#F3D321` | `#605205` | `transparent` | `transparent` |
| 4 | `#00BC7B` | `#000000` | `#00BC7B` | `transparent` | `#00BC7B` | `#006642` | `#CCF2E5` | `transparent` | `#00BC7B` | `#006642` | `transparent` | `transparent` |
| 5 | `#486AFF` | `#FFFFFF` | `#486AFF` | `transparent` | `#486AFF` | `#001266` | `#DAE1FF` | `transparent` | `#486AFF` | `#001266` | `transparent` | `transparent` |
| 6 | `#4D49BE` | `#FFFFFF` | `#4D49BE` | `transparent` | `#4D49BE` | `#1C1A4B` | `#DBDBF2` | `transparent` | `#4D49BE` | `#1C1A4B` | `transparent` | `transparent` |

### 活力

- 导图背景：`#FFFFFF`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`3`；第 7 分支色：`#F22816`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#F22816` | `#FFFFFF` | `#F22816` | `transparent` | `#F22816` | `#600C05` | `#FCD4D0` | `transparent` | `#F22816` | `#600C05` | `transparent` | `transparent` |
| 2 | `#F2B807` | `#000000` | `#F2B807` | `transparent` | `#F2B807` | `#634B02` | `#FCF1CD` | `transparent` | `#F2B807` | `#634B02` | `transparent` | `transparent` |
| 3 | `#233ED9` | `#FFFFFF` | `#233ED9` | `transparent` | `#233ED9` | `#0E1957` | `#D3D8F7` | `transparent` | `#233ED9` | `#0E1957` | `transparent` | `transparent` |
| 4 | `#F22816` | `#FFFFFF` | `#F22816` | `transparent` | `#F22816` | `#600C05` | `#FCD4D0` | `transparent` | `#F22816` | `#600C05` | `transparent` | `transparent` |
| 5 | `#F2B807` | `#000000` | `#F2B807` | `transparent` | `#F2B807` | `#634B02` | `#FCF1CD` | `transparent` | `#F2B807` | `#634B02` | `transparent` | `transparent` |
| 6 | `#233ED9` | `#FFFFFF` | `#233ED9` | `transparent` | `#233ED9` | `#0E1957` | `#D3D8F7` | `transparent` | `#233ED9` | `#0E1957` | `transparent` | `transparent` |

### 舞动

- 导图背景：`#FFFFFF`；中心文字：`#363026`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`3`；第 7 分支色：`#4E60EF`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#4E60EF` | `#FFFFFF` | `#4E60EF` | `transparent` | `#4E60EF` | `#08115D` | `#DCDFFC` | `transparent` | `#4E60EF` | `#08115D` | `transparent` | `transparent` |
| 2 | `#EB4758` | `#FFFFFF` | `#EB4758` | `transparent` | `#EB4758` | `#5C0A12` | `#FBDADE` | `transparent` | `#EB4758` | `#5C0A12` | `transparent` | `transparent` |
| 3 | `#AA0E1D` | `#FFFFFF` | `#AA0E1D` | `transparent` | `#AA0E1D` | `#5E0710` | `#EECFD2` | `transparent` | `#AA0E1D` | `#5E0710` | `transparent` | `transparent` |
| 4 | `#4E60EF` | `#FFFFFF` | `#4E60EF` | `transparent` | `#4E60EF` | `#08115D` | `#DCDFFC` | `transparent` | `#4E60EF` | `#08115D` | `transparent` | `transparent` |
| 5 | `#EB4758` | `#FFFFFF` | `#EB4758` | `transparent` | `#EB4758` | `#5C0A12` | `#FBDADE` | `transparent` | `#EB4758` | `#5C0A12` | `transparent` | `transparent` |
| 6 | `#AA0E1D` | `#FFFFFF` | `#AA0E1D` | `transparent` | `#AA0E1D` | `#5E0710` | `#EECFD2` | `transparent` | `#AA0E1D` | `#5E0710` | `transparent` | `transparent` |

### 代码

- 导图背景：`#2C2D30`；中心文字：`#FFFFFF`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`4`；第 7 分支色：`#FFF0B8`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FFF0B8` | `#000000` | `#FFF0B8` | `transparent` | `#FFF0B8` | `#FFFFFF` | `#56544B` | `transparent` | `#FFF0B8` | `#FFFFFF` | `transparent` | `transparent` |
| 2 | `#CBFFB8` | `#000000` | `#CBFFB8` | `transparent` | `#CBFFB8` | `#FFFFFF` | `#4C574B` | `transparent` | `#CBFFB8` | `#FFFFFF` | `transparent` | `transparent` |
| 3 | `#DB8FFF` | `#000000` | `#DB8FFF` | `transparent` | `#DB8FFF` | `#FFFFFF` | `#4F4159` | `transparent` | `#DB8FFF` | `#FFFFFF` | `transparent` | `transparent` |
| 4 | `#8ABEFF` | `#000000` | `#8ABEFF` | `transparent` | `#8ABEFF` | `#FFFFFF` | `#3F4A59` | `transparent` | `#8ABEFF` | `#FFFFFF` | `transparent` | `transparent` |
| 5 | `#FFF0B8` | `#000000` | `#FFF0B8` | `transparent` | `#FFF0B8` | `#FFFFFF` | `#56544B` | `transparent` | `#FFF0B8` | `#FFFFFF` | `transparent` | `transparent` |
| 6 | `#CBFFB8` | `#000000` | `#CBFFB8` | `transparent` | `#CBFFB8` | `#FFFFFF` | `#4C574B` | `transparent` | `#CBFFB8` | `#FFFFFF` | `transparent` | `transparent` |

### 和风

- 导图背景：`#FFFFFF`；中心文字：`#191959`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`4`；第 7 分支色：`#FFABAA`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FFABAA` | `#000000` | `#FFABAA` | `transparent` | `#FFABAA` | `#660100` | `#FFEEEE` | `transparent` | `#FFABAA` | `#660100` | `transparent` | `transparent` |
| 2 | `#FF7B31` | `#000000` | `#FF7B31` | `transparent` | `#FF7B31` | `#662400` | `#FFE5D6` | `transparent` | `#FF7B31` | `#662400` | `transparent` | `transparent` |
| 3 | `#8CB5FF` | `#000000` | `#8CB5FF` | `transparent` | `#8CB5FF` | `#002466` | `#E7EFFE` | `transparent` | `#8CB5FF` | `#002466` | `transparent` | `transparent` |
| 4 | `#4A51D9` | `#FFFFFF` | `#4A51D9` | `transparent` | `#4A51D9` | `#111454` | `#DBDCF7` | `transparent` | `#4A51D9` | `#111454` | `transparent` | `transparent` |
| 5 | `#FFABAA` | `#000000` | `#FFABAA` | `transparent` | `#FFABAA` | `#660100` | `#FFEEEE` | `transparent` | `#FFABAA` | `#660100` | `transparent` | `transparent` |
| 6 | `#FF7B31` | `#000000` | `#FF7B31` | `transparent` | `#FF7B31` | `#662400` | `#FFE5D6` | `transparent` | `#FF7B31` | `#662400` | `transparent` | `transparent` |

### 岛屿

- 导图背景：`#FFE8D6`；中心文字：`#6B705C`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`4`；第 7 分支色：`#DDBEA9`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#DDBEA9` | `#000000` | `#DDBEA9` | `transparent` | `#DDBEA9` | `#492E1C` | `#F8E0CD` | `transparent` | `#DDBEA9` | `#492E1C` | `transparent` | `transparent` |
| 2 | `#CB997E` | `#000000` | `#CB997E` | `transparent` | `#CB997E` | `#482C1D` | `#F5D9C4` | `transparent` | `#CB997E` | `#482C1D` | `transparent` | `transparent` |
| 3 | `#B7B7A4` | `#000000` | `#B7B7A4` | `transparent` | `#B7B7A4` | `#38392D` | `#F0DECB` | `transparent` | `#B7B7A4` | `#38392D` | `transparent` | `transparent` |
| 4 | `#A5A58D` | `#000000` | `#A5A58D` | `transparent` | `#A5A58D` | `#38392D` | `#EDDBC7` | `transparent` | `#A5A58D` | `#38392D` | `transparent` | `transparent` |
| 5 | `#DDBEA9` | `#000000` | `#DDBEA9` | `transparent` | `#DDBEA9` | `#492E1C` | `#F8E0CD` | `transparent` | `#DDBEA9` | `#492E1C` | `transparent` | `transparent` |
| 6 | `#CB997E` | `#000000` | `#CB997E` | `transparent` | `#CB997E` | `#482C1D` | `#F5D9C4` | `transparent` | `#CB997E` | `#482C1D` | `transparent` | `transparent` |

### 玫瑰

- 导图背景：`#FFF0F3`；中心文字：`#A4133C`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`3`；第 7 分支色：`#FFB3C1`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FFB3C1` | `#000000` | `#FFB3C1` | `transparent` | `#FFB3C1` | `#660012` | `#FFE4E9` | `transparent` | `#FFB3C1` | `#660012` | `transparent` | `transparent` |
| 2 | `#FF758F` | `#000000` | `#FF758F` | `transparent` | `#FF758F` | `#660013` | `#FFD7DF` | `transparent` | `#FF758F` | `#660013` | `transparent` | `transparent` |
| 3 | `#C9184A` | `#FFFFFF` | `#C9184A` | `transparent` | `#C9184A` | `#5B0A21` | `#F4C5D1` | `transparent` | `#C9184A` | `#5B0A21` | `transparent` | `transparent` |
| 4 | `#FFB3C1` | `#000000` | `#FFB3C1` | `transparent` | `#FFB3C1` | `#660012` | `#FFE4E9` | `transparent` | `#FFB3C1` | `#660012` | `transparent` | `transparent` |
| 5 | `#FF758F` | `#000000` | `#FF758F` | `transparent` | `#FF758F` | `#660013` | `#FFD7DF` | `transparent` | `#FF758F` | `#660013` | `transparent` | `transparent` |
| 6 | `#C9184A` | `#FFFFFF` | `#C9184A` | `transparent` | `#C9184A` | `#5B0A21` | `#F4C5D1` | `transparent` | `#C9184A` | `#5B0A21` | `transparent` | `transparent` |

### 薄荷

- 导图背景：`#FFFFFF`；中心文字：`#046562`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`3`；第 7 分支色：`#9CEAEF`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#9CEAEF` | `#000000` | `#9CEAEF` | `transparent` | `#9CEAEF` | `#0E5357` | `#EBFBFC` | `transparent` | `#9CEAEF` | `#0E5357` | `transparent` | `transparent` |
| 2 | `#68D8D6` | `#000000` | `#68D8D6` | `transparent` | `#68D8D6` | `#14514F` | `#E1F7F7` | `transparent` | `#68D8D6` | `#14514F` | `transparent` | `transparent` |
| 3 | `#06AFA9` | `#000000` | `#06AFA9` | `transparent` | `#06AFA9` | `#03625F` | `#CDEFEE` | `transparent` | `#06AFA9` | `#03625F` | `transparent` | `transparent` |
| 4 | `#9CEAEF` | `#000000` | `#9CEAEF` | `transparent` | `#9CEAEF` | `#0E5357` | `#EBFBFC` | `transparent` | `#9CEAEF` | `#0E5357` | `transparent` | `transparent` |
| 5 | `#68D8D6` | `#000000` | `#68D8D6` | `transparent` | `#68D8D6` | `#14514F` | `#E1F7F7` | `transparent` | `#68D8D6` | `#14514F` | `transparent` | `transparent` |
| 6 | `#06AFA9` | `#000000` | `#06AFA9` | `transparent` | `#06AFA9` | `#03625F` | `#CDEFEE` | `transparent` | `#06AFA9` | `#03625F` | `transparent` | `transparent` |

### 绿茶

- 导图背景：`#1F2B1D`；中心文字：`#D6D9C3`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`4`；第 7 分支色：`#B6AD90`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#B6AD90` | `#000000` | `#B6AD90` | `transparent` | `#B6AD90` | `#FFFFFF` | `#3D4534` | `transparent` | `#B6AD90` | `#FFFFFF` | `transparent` | `transparent` |
| 2 | `#579360` | `#FFFFFF` | `#579360` | `transparent` | `#579360` | `#FFFFFF` | `#2A3F2A` | `transparent` | `#579360` | `#FFFFFF` | `transparent` | `transparent` |
| 3 | `#656D4A` | `#FFFFFF` | `#656D4A` | `transparent` | `#656D4A` | `#FFFFFF` | `#2D3826` | `transparent` | `#656D4A` | `#FFFFFF` | `transparent` | `transparent` |
| 4 | `#265834` | `#FFFFFF` | `#265834` | `transparent` | `#265834` | `#FFFFFF` | `#213421` | `transparent` | `#265834` | `#FFFFFF` | `transparent` | `transparent` |
| 5 | `#B6AD90` | `#000000` | `#B6AD90` | `transparent` | `#B6AD90` | `#FFFFFF` | `#3D4534` | `transparent` | `#B6AD90` | `#FFFFFF` | `transparent` | `transparent` |
| 6 | `#579360` | `#FFFFFF` | `#579360` | `transparent` | `#579360` | `#FFFFFF` | `#2A3F2A` | `transparent` | `#579360` | `#FFFFFF` | `transparent` | `transparent` |

## 经典

### 永恒

- 导图背景：`#FFFFFF`；中心文字：`#3949AB`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#141414`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |
| 2 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |
| 3 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |
| 4 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |
| 5 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |
| 6 | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `#EEEEEE` | `transparent` | `#141414` | `#000000` | `transparent` | `transparent` |

### 奶油

- 导图背景：`#FFE0E5`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#FFFFFF`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |
| 2 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |
| 3 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |
| 4 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |
| 5 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |
| 6 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#000000` | `transparent` | `transparent` |

### 花海

- 导图背景：`#FFFFFF`；中心文字：`#A61D39`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#4A1019`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |
| 2 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |
| 3 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |
| 4 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |
| 5 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |
| 6 | `#4A1019` | `#FFFFFF` | `#D02F48` | `transparent` | `#4A1019` | `#000000` | `#E5E5E5` | `transparent` | `#4A1019` | `#000000` | `transparent` | `transparent` |

### 珊瑚

- 导图背景：`#140407`；中心文字：`#EF6C70`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#FDF1F1`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |
| 2 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |
| 3 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |
| 4 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |
| 5 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |
| 6 | `#FDF1F1` | `#FFFFFF` | `#D02F48` | `transparent` | `#FDF1F1` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FDF1F1` | `#FFFFFF` | `transparent` | `transparent` |

### 绚丽

- 导图背景：`#D02F48`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#FFFFFF`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |
| 2 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |
| 3 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |
| 4 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |
| 5 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |
| 6 | `#FFFFFF` | `#000000` | `#FFFFFF` | `transparent` | `#FFFFFF` | `#FFFFFF` | `#7C1C2B` | `transparent` | `#FFFFFF` | `#FFFFFF` | `transparent` | `transparent` |

### 香槟

- 导图背景：`#EEE8E6`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#88675E`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |
| 2 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |
| 3 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |
| 4 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |
| 5 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |
| 6 | `#88675E` | `#000000` | `#C1ABA5` | `transparent` | `#88675E` | `#000000` | `#E6DDDA` | `transparent` | `#88675E` | `#000000` | `transparent` | `transparent` |

### 香水

- 导图背景：`#EFE6C6`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#201E14`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |
| 2 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |
| 3 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |
| 4 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |
| 5 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |
| 6 | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `#AB9446` | `transparent` | `#201E14` | `#000000` | `transparent` | `transparent` |

### 禅心

- 导图背景：`#FFFFFF`；中心文字：`#000000`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#232323`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |
| 2 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |
| 3 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |
| 4 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |
| 5 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |
| 6 | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `#D6D6D6` | `transparent` | `#232323` | `#000000` | `transparent` | `transparent` |

### 律动

- 导图背景：`#FFFFFF`；中心文字：`#F44336`；中心背景：`transparent`；中心边框：`transparent`；循环长度：`1`；第 7 分支色：`#F44336`。

| 分支 | 中心→一级线 | 一级文字 | 一级背景 | 一级边框 | 一级→二级线 | 二级文字 | 二级背景 | 二级边框 | 二级→普通线 | 普通文字 | 普通背景 | 普通边框 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
| 2 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
| 3 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
| 4 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
| 5 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
| 6 | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#FFFFFF` | `#F44336` | `transparent` | `#F44336` | `#000000` | `transparent` | `transparent` |
