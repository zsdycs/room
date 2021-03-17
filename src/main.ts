import "./style.scss";
import 'alpinejs';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack, CameraVideoTrackInitConfig } from "agora-rtc-sdk-ng";
import { settings } from './app-settings';
import CryptoJS from 'crypto-js';

function room() {

    // ************************************************** 接口 **************************************************
    interface RTC {
        client: IAgoraRTCClient,
        localAudioTrack: IMicrophoneAudioTrack,
        localVideoTrack: ICameraVideoTrack,
    }

    interface Client {
        channel: string,
        password: string | null,
    }

    interface ModalMsg {
        msgTitle: string,
        msgContent: string,
    }
    interface LocalDevices {
        hasAudioDevice: boolean;
        hasVideoDevice: boolean;
    }
    // ************************************************** 变量 **************************************************
    const title = 'Room';
    const clientOptions: Client = {
        channel: 'room', // 频道名
        password: '',
    };

    const config = {
        cameraVideo: {
            encoderConfig: '720p_2',
            facingMode: 'user', // environment 前置摄像头
        },
        microphoneAudio: {
            AEC: true, // 回声消除
            ANS: true, // 噪声抑制
            AGC: true, // 自动增益
        }
    }

    const rtc: RTC = {
        // 本地客户端
        client: AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }),
        // @ts-ignore
        localAudioTrack: null,
        // @ts-ignore
        localVideoTrack: null,
    };

    const localDevices: LocalDevices = {
        hasAudioDevice: false,
        hasVideoDevice: false,
    }

    // ************************************************** handle **************************************************
    // SHA256 加密
    function cryptographicEncryption(password: string | null) {
        if (!password) {
            return '';
        }

        const str = CryptoJS.SHA256(password);
        return str.toString();
    }
    // 密码保持
    function pwdStorage(pwd: string | null): string | null {
        if (sessionStorage.getItem('ROOM/PWD') === null) {
            pwd = cryptographicEncryption(pwd);
            sessionStorage.setItem('ROOM/PWD', pwd);
        } else {
            pwd = sessionStorage.getItem('ROOM/PWD');
        }
        return pwd;
    }
    // 消息弹框
    function setMsg(modalType: string, msgObj: any): ModalMsg {
        let msgContent: string = '';
        let msgTitle: string = '';
        if (modalType === 'formMsg') {
            msgTitle = '表单验证';
            const { password } = msgObj as Client;
            if (!password) {
                const passwordMsg = '• 请输入房间密码\n';
                msgContent = msgContent ? msgContent + passwordMsg : passwordMsg;
            }
        }
        if (modalType === 'pwdMsg') {
            msgTitle = '表单验证';
            msgContent = '• 密码错误';
        }
        if (modalType === 'devicesMsg') {
            const localDeviceObj = msgObj as LocalDevices;
            msgTitle = '设备检测';
            if (!localDeviceObj.hasAudioDevice) {
                const audioDeviceMsg = '• 检测不到麦克风\n';
                msgContent = msgContent ? msgContent + audioDeviceMsg : audioDeviceMsg;
            }
            if (!localDeviceObj.hasVideoDevice) {
                const videoDeviceMsg = '• 检测不到摄像头\n';
                msgContent = msgContent ? msgContent + videoDeviceMsg : videoDeviceMsg;
            }
            if (localDeviceObj.hasVideoDevice && localDeviceObj.hasAudioDevice) {
                msgContent = '• 麦克风存在\n• 摄像头存在';
            }
        }
        if (modalType === 'copyMsg') {
            msgTitle = '复制操作';
            msgContent = `<strong>已复制内容：</strong>\n\n${msgObj.copyValue}`;
        }
        if (modalType === 'rtcMsg') {
            msgTitle = '音视频处理';
            msgContent = `<strong>处理出错：</strong>\n\n${msgObj.err}`;
        }
        return { msgTitle, msgContent };
    }
    // 订阅远端处理
    function userPublished() {
        rtc.client.on('user-published', async (user, mediaType) => {
            await rtc.client.subscribe(user, mediaType);
            // 视频
            if (mediaType === 'video') {
                const remoteVideoTrack = user.videoTrack;
                const playerContainer = `<div id="userID_${user.uid.toString()}" class="remote-player"></div>`;
                document.querySelector('#remote-playerList')?.insertAdjacentHTML('beforeend', playerContainer);
                remoteVideoTrack?.play(`userID_${user.uid.toString()}`);
            }

            // 音频
            if (mediaType === 'audio') {
                // 订阅完成后，从 `user` 中获取远端音频轨道对象。
                const remoteAudioTrack = user.audioTrack;
                remoteAudioTrack?.play();
            }
        });
    }
    // 取消订阅远端处理
    function userUnPublished() {
        rtc.client.on('user-unpublished', async (user) => {
            document.querySelector(`#userID_${user.uid}`)?.remove();
        });
    }
    // ************************************************** return **************************************************
    return {
        title, // 标题
        clientOptions, // client 参数
        rtc,
        isShowJoin: true, // Join 按钮
        isPlaying: false, // 是否在视频通话
        isLocalPlaying: false, // 是否打开了摄像头
        isMicrophoneUsing: false, // 是否打开了麦克风
        fullscreen: false, // 是否全屏
        isDisabledPassword: false, // Password 文本框
        isShowModal: false, // Modal 消息确认
        modalMsgTitle: '', // 消息标题
        modalMsgContent: '', // 消息内容
        isShowCheckDevices: true, // Check Devices 按钮
        localDevices, // 本地设备
        initRoom() {
            this.clientOptions.password = sessionStorage.getItem('ROOM/PWD');
            this.isDisabledPassword = sessionStorage.getItem('ROOM/PWD') ? true : false;
            userPublished();
            userUnPublished();
        },
        async join() {
            if (this.clientOptions.password) {
                const pwd = pwdStorage(this.clientOptions.password);
                if (settings.pwd === pwd) {
                    this.isDisabledPassword = true;
                    // 加入目标频道
                    this.rtc.client.join(settings.appId, this.clientOptions.channel, null, null)
                        .then(async (uid) => {
                            this.rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(config.microphoneAudio);
                            this.rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack((config.cameraVideo as CameraVideoTrackInitConfig));
                            // 将音视频轨道对象发布到频道中
                            this.rtc.client.publish(this.rtc.localAudioTrack);
                            this.isMicrophoneUsing = true;
                            this.rtc.client.publish(this.rtc.localVideoTrack);
                            this.rtc.localVideoTrack.play('local-player');
                            this.isLocalPlaying = true;
                            this.isShowCheckDevices = false;
                            this.isShowJoin = false;
                            this.isPlaying = true;
                        })
                        .catch((err) => {
                            const { msgTitle, msgContent } = setMsg('rtcMsg', { err });
                            this.modalMsgTitle = msgTitle;
                            this.modalMsgContent = msgContent;
                            this.isShowModal = true;
                        });
                } else {
                    // 密码错误
                    const { msgTitle, msgContent } = setMsg('pwdMsg', this.clientOptions);
                    this.modalMsgTitle = msgTitle;
                    this.modalMsgContent = msgContent;
                    this.clientOptions.password = '';
                    sessionStorage.removeItem('ROOM/PWD');
                    this.isShowModal = true;
                }
            } else {
                const { msgTitle, msgContent } = setMsg('formMsg', this.clientOptions);
                this.modalMsgTitle = msgTitle;
                this.modalMsgContent = msgContent;
                this.isShowModal = true;
                this.isShowJoin = true;
                this.isShowCheckDevices = true;
            }
        },
        async leave() {
            // 销毁本地音视频轨道
            if (this.rtc.localAudioTrack) {
                this.rtc.localAudioTrack.close();
            }
            if (this.rtc.localVideoTrack) {
                this.rtc.localVideoTrack.stop();
                this.rtc.localVideoTrack.close();
            }
            // 离开频道
            await this.rtc.client.leave();
            // 移除用于视频播放的盒子
            if (document.querySelector('.remote-player')) {
                document.querySelector(`#remote-playerList`)?.removeChild((document.querySelector('.remote-player') as Element));
            }
            this.isShowJoin = true;
            this.isShowCheckDevices = true;
            this.isPlaying = false;
        },
        async localVideoSwitch() {
            try {
                if (this.isLocalPlaying) {
                    this.rtc.localVideoTrack.close();
                    await this.rtc.client.unpublish(this.rtc.localVideoTrack);
                    this.isLocalPlaying = false;
                } else {
                    this.rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    this.rtc.client.publish(this.rtc.localVideoTrack);
                    this.rtc.localVideoTrack.play('local-player');
                    this.isLocalPlaying = true;
                }
            } catch (err) {
                const { msgTitle, msgContent } = setMsg('rtcMsg', { err });
                this.modalMsgTitle = msgTitle;
                this.modalMsgContent = msgContent;
                this.isShowModal = true;
            }
        },
        async localAudioSwitch() {
            try {
                if (this.isMicrophoneUsing) {
                    this.rtc.localAudioTrack.close();
                    await this.rtc.client.unpublish(this.rtc.localAudioTrack);
                    this.isMicrophoneUsing = false;
                } else {
                    this.rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    this.rtc.client.publish(this.rtc.localAudioTrack);
                    this.isMicrophoneUsing = true;
                }
            } catch (err) {
                const { msgTitle, msgContent } = setMsg('rtcMsg', { err });
                this.modalMsgTitle = msgTitle;
                this.modalMsgContent = msgContent;
                this.isShowModal = true;
            }
        },
        fullScreen() {
            if (!this.fullscreen) {
                if (document.querySelector('.video-group')?.requestFullscreen) {
                    document.querySelector('.video-group')?.requestFullscreen();
                    document.querySelector('.video-group')?.classList.add('fullscreen');
                    this.fullscreen = true;
                    return;
                }
                // TODO css class
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                    document.querySelector('.video-group')?.classList.remove('fullscreen');
                    this.fullscreen = false;
                    return;
                }
                // TODO css class
            }
        },
        ok() {
            this.isShowModal = false;
        },
        cleanPassword() {
            this.clientOptions.password = '';
            sessionStorage.removeItem('ROOM/PWD');
            this.isDisabledPassword = false;
        },
        cleanName() {
            localStorage.removeItem('ROOM/USR');
        },
        checkDevices() {
            AgoraRTC.getDevices()
                .then((device: MediaDeviceInfo[]) => {
                    const audioDevices = device.filter((item) => {
                        return item.kind === "audioinput";
                    });
                    const videoDevices = device.filter((item) => {
                        return item.kind === "videoinput";
                    });
                    const devices = {
                        hasAudioDevice: audioDevices.length > 0 ? true : false,
                        hasVideoDevice: videoDevices.length > 0 ? true : false,
                    }
                    this.localDevices = devices;

                    if (!devices.hasAudioDevice || !devices.hasVideoDevice) {
                        this.isShowCheckDevices = true;
                        const { msgTitle, msgContent } = setMsg('devicesMsg', devices);
                        this.modalMsgTitle = msgTitle;
                        this.modalMsgContent = msgContent;
                        this.isShowModal = true;
                        if (!devices.hasAudioDevice && !devices.hasVideoDevice) {
                            // 麦克风和摄像头都没有时，不可进入
                            this.isShowJoin = false;
                        }
                    } else {
                        // 麦克风和摄像头都检测到了
                        this.isShowCheckDevices = false;
                        const { msgTitle, msgContent } = setMsg('devicesMsg', devices);
                        this.modalMsgTitle = msgTitle;
                        this.modalMsgContent = msgContent;
                        this.isShowModal = true;
                    }
                })
                .catch((err) => {
                    const { msgTitle, msgContent } = setMsg('rtcMsg', { err });
                    this.modalMsgTitle = msgTitle;
                    this.modalMsgContent = msgContent;
                    this.isShowModal = true;
                });;
        },
        copyLink() {
            const textArea = document.createElement('textarea');
            textArea.value = `${location.href}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            const { msgTitle, msgContent } = setMsg('copyMsg', { copyValue: textArea.value });
            this.modalMsgTitle = msgTitle;
            this.modalMsgContent = msgContent;
            this.isShowModal = true;
            document.body.removeChild(textArea);
        },
        blowUp($event: any) {
            // #remote-playerList
            // #local-player
            console.log($event.target);
        }
    }
}

// alpinejs
(window as any).room = room;
