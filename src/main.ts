import "./style.scss";
import 'alpinejs';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import { settings } from './app-settings';
import * as Crypto from 'crypto-js';

function room() {

    // ************************************************** 接口 **************************************************
    interface RTC {
        client: IAgoraRTCClient,
        localAudioTrack: IMicrophoneAudioTrack | null,
        localVideoTrack: ICameraVideoTrack | null,
    }

    interface Client {
        channel: string,
        token: string | null,
        password: string,
        username: string,
    }
    // ************************************************** 变量 **************************************************
    const title = 'Room';
    const clientOptions: Client = {
        channel: 'room', // 频道名
        token: '',
        password: '',
        username: '',
    };

    // 创建 Agora 本地客户端
    const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const rtc: RTC = {
        // 本地客户端
        client,
        // 本地音视频频轨道对象
        localAudioTrack: null,
        localVideoTrack: null,
    };

    // ************************************************** 函数 **************************************************
    // SHA256 加密
    function cryptographicEncryption(password: string) {
        if (!password) {
            return '';
        }

        const str = Crypto.SHA256(password);
        return str.toString();
    }
    // ************************************************** return **************************************************
    return {
        title,
        clientOptions,
        isDisabledJoin: false,
        isShowShare: false,
        isShowLeave: false,
        initRoom() {
            this.clientOptions.username = localStorage.getItem('ROOM/USR') ? localStorage.getItem('ROOM/USR') as string : ''; // 频道
            // this.clientOptions.token = TODO;
        },
        async join() {
            if (settings.appId && this.clientOptions.password && this.clientOptions.username) {
                // Join 按钮 Disabled
                this.isDisabledJoin = true;

                const pwd = cryptographicEncryption(this.clientOptions.password);
                localStorage.setItem('ROOM/USR', this.clientOptions.username);
                sessionStorage.setItem('ROOM/PWD', pwd);

                if (pwd === settings.pwd) {
                    // 加入目标频道
                    rtc.client.join(settings.appId, this.clientOptions.channel, this.clientOptions.token || null, null)
                    .then(async (uid)=> {
                        // tslint:disable-next-line: no-console
                        console.log(`Successfully joined! UID: ${uid}`);
                        rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                        rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                        // 将音视频轨道对象发布到频道中
                        rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
                    })
                    .catch((err)=> {
                        // tslint:disable-next-line: no-console
                        console.log(`Error joining channel!\n${err}`);
                    });
                } else {
                    // 密码错误
                }
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
