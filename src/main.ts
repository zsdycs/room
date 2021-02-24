import "./style.scss";
import 'alpinejs';
import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { settings } from './app-settings';

function room() {

    // 创建 Agora 本地客户端
    const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    const rtc = {
        // 本地客户端
        client,
        // 本地音视频频轨道对象
        localAudioTrack: null,
        localVideoTrack: null,
    };

    async function joinChannel(options: any) {
        const uid = await rtc.client.join(options.appId, options.channel, options.token, null);
    }

    return {
        title: 'Room',
        clientOptions: {
            channel: 'room', // 频道名
            token: '',
            password: '',
            username: '',
        },
        isDisabledJoin: false,
        isShowShare: false,
        isShowLeave: false,
        initRoom() {
            // the demo can auto join channel with params in url
            const urlParams = new URL(location.href).searchParams;
            this.clientOptions.channel = urlParams.get("channel") as string; // 频道
            this.clientOptions.token = urlParams.get("token") as string;
        },
        async join() {
            if (settings.app_id && this.clientOptions.password && this.clientOptions.username) {
                this.isDisabledJoin = true;
                // TODO
            }
        },
        async leave() {
            // TODO
        }
    }
}

// 将 room 定义在 window 对象中，供 alpinejs 使用
(window as any).room = room;
