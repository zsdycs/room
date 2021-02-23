import "./style.scss";
import 'alpinejs';
import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { settings } from './app-settings';

// create Agora client
const basicVideoCallClient: IAgoraRTCClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

function basicVideoCall() {
    return {
        title: 'Video Call',
        clientOptions: {
            channel: '',
            uid: '',
            token: ''
        },
        isDisabledJoin: false,
        isShowShare: false,
        isShowLeave: false,
        initBasicVideoCall() {
            // the demo can auto join channel with params in url
            const urlParams = new URL(location.href).searchParams;
            this.clientOptions.channel = urlParams.get("channel") as string; // 频道
            this.clientOptions.token = urlParams.get("token") as string;
        },
        async join() {
            this.isDisabledJoin = true;
            if (settings.app_id) {
                // TODO
            }
        },
        async leave() {
            // TODO
        }
    }
}

// 将 basicVideoCall 定义在 window 对象中，供 alpinejs 使用
(window as any).basicVideoCall = basicVideoCall;

async function joinChannel() {
    // TODO
}
