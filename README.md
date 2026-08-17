# 看剧AI (kanju.ai) TVBox 视频源

基于 https://kanju.ai 逆向制作的多线路 TVBox 源（drpy2 格式）。

## 文件说明

| 文件 | 用途 |
|---|---|
| `kanju.js` | drpy2 spider 源本体（内置 HMAC-SHA256 签名，多线路播放） |
| `kanju接口配置.json` | 导入 TVBox 的接口配置模板 |

## 源能力

- 7 个分类：电影 / 剧集 / 动漫 / 综艺 / 短剧 / 纪录片 / 体育
- 关键词搜索（AI suggest 接口）
- 详情：片名 / 演员 / 导演 / 简介 / 集数
- 多线路播放：同一视频聚合多家资源站（1~20 条线路，播放器可切换）
- 播放 resolve 接口无需鉴权，直接返回 m3u8 直链

## 使用前提

你的 TVBox App 必须支持 drpy2 加载器（影视仓 / OK影视 / 皮皮虾 / 部分 TVBoxOS 定制版）。
标准原版 takagen99 / q215613905 TVBox 不支持 .js 源，需改走 T4 jar 方案。

## 部署步骤

1. 把 `kanju.js` 上传到 GitHub/Gitee，获取直链，例如：
   `https://raw.githubusercontent.com/你的用户名/tvbox/main/kanju.js`
2. 编辑 `kanju接口配置.json`，把两处 `你的仓库/main` 换成实际路径：
   - `spider` 字段：drpy2.js 的直链（若 App 已内置 drpy2 可删除该字段）
   - `ext` 字段：kanju.js 的直链
3. 把配置 JSON 内容粘贴到 App 的「配置地址」，或上传到仓库后用配置地址指向它

## 常用配置模板

```json
{
  "spider": "https://raw.githubusercontent.com/你的用户名/tvbox/main/drpy2.js",
  "sites": [
    {
      "key": "kanju",
      "name": "看剧AI",
      "type": 3,
      "api": "csp_DRPy2_kanju",
      "ext": "https://raw.githubusercontent.com/你的用户名/tvbox/main/kanju.js",
      "searchable": 1,
      "quickSearch": 1,
      "filterable": 0
    }
  ]
}
```

## 说明

- 签名密钥提取自 kanju.ai 站点 JS（HMAC-SHA256，时间戳窗口约数分钟，实时请求无影响）
- 播放直链来自 player.baipiaozhe.com resolve 接口（无鉴权）
- 站点若更新签名密钥需同步修改 kanju.js 中的 `SIGN_KEY`

## Spider 版配置（推荐）

### kanju.json（英文名，通用）
直接链：`https://raw.githubusercontent.com/z2004y/source/main/kanju.json`

该配置带 `spider` 字段，指向官方 drpy2 加载器（gh-proxy 加速）：
```json
{
  "spider": "https://gh-proxy.com/https://raw.githubusercontent.com/hjdhnx/dr_py/main/libs/drpy2.js",
  "sites": [
    {
      "key": "kanju",
      "name": "看剧AI",
      "type": 3,
      "api": "csp_DRPy2_kanju",
      "ext": "https://raw.githubusercontent.com/z2004y/source/main/kanju.js",
      "searchable": 1,
      "quickSearch": 1
    }
  ]
}
```

用法：复制 kanju.json 直链 → 影视仓/OK影视 → 设置 → 配置地址 → 粘贴 → 保存。
若 App 已内置 drpy2，可去掉 `spider` 字段用 kanju接口配置.json。
