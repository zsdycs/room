# Room

## 项目简介

ROOM——房间，这是一个基于 [Agora.io](https://www.agora.io/cn) 提供音视频服务的 web 应用。  
在浏览器输入简短的域名进入房间，即可视频通话。

### 开发列表

- [ ] 无需登录
- [ ] 页面关闭即离开
- [ ] 记住昵称
- [ ] 修改昵称
- [ ] 关闭麦克风
- [ ] 关闭摄像头

## 依赖服务

- [Alpine.js](https://github.com/alpinejs/alpine)
- [Agora.io](https://www.agora.io/cn)

## 运行指南

1. node 环境 [安装 node](https://nodejs.org/en/download/)
2. 命令行，执行 `npm i`
3. 命令行，执行 `npm run serve`
4. 浏览器，打开 `http://localhost:8080`

> 直接 `npm i` 安装可能会出现 node-sass 安装错误，请使用以下步骤安装 node-sass:
>
> 1. `npm cache clean -force`
> 2. `npm install -g mirror-config-china`
> 3. `npm install node-sass`
