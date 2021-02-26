import "./style.scss";
import 'alpinejs';
import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack, ICameraVideoTrack } from "agora-rtc-sdk-ng";
import { settings } from './app-settings';
import CryptoJS from 'crypto-js';

function room() {

    // ************************************************** 接口 **************************************************
    interface RTC {
        client: IAgoraRTCClient,
        localAudioTrack: IMicrophoneAudioTrack | null,
        localVideoTrack: ICameraVideoTrack | null,
    }

    interface Client {
        channel: string,
        password: string | null,
        username: string | null,
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
        username: '',
    };

    const rtc: RTC = {
        // 本地客户端
        client: AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }),
        // 本地音视频频轨道对象
        localAudioTrack: null,
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
            const { username, password } = msgObj as Client;
            if (!username) {
                const usernameMsg = '• 请输入你在房间中的用户名\n';
                msgContent = msgContent ? msgContent + usernameMsg : usernameMsg;
            }
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
                const playerContainer = document.createElement('div');
                playerContainer.id = user.uid.toString();
                playerContainer.style.width = '640px';
                playerContainer.style.height = '480px';
                document.body.append(playerContainer);

                remoteVideoTrack?.play(playerContainer);
            }

            // 音频
            if (mediaType === 'audio') {
                // 订阅完成后，从 `user` 中获取远端音频轨道对象。
                const remoteAudioTrack = user.audioTrack;
                remoteAudioTrack?.play();
            }
        });
    }
    // ************************************************** return **************************************************
    return {
        title, // 标题
        clientOptions, // client 参数
        rtc,
        isShowJoin: true, // Join 按钮
        isShowShare: false, // Share 按钮
        isDisabledPassword: false, // Password 文本框
        isShowLeave: false, // Leave 按钮
        isShowModal: false, // Modal 消息确认
        modalMsgTitle: '', // 消息标题
        modalMsgContent: '', // 消息内容
        isShowCheckDevices: true, // Check Devices 按钮
        localDevices, // 本地设备
        initRoom() {
            this.clientOptions.username = localStorage.getItem('ROOM/USR');
            this.clientOptions.password = sessionStorage.getItem('ROOM/PWD');
            this.isDisabledPassword = sessionStorage.getItem('ROOM/PWD') ? true : false;
            userPublished();
        },
        async join() {
            if (this.clientOptions.password && this.clientOptions.username) {
                localStorage.setItem('ROOM/USR', this.clientOptions.username);
                const pwd = pwdStorage(this.clientOptions.password);
                if (settings.pwd === pwd) {
                    this.isShowJoin = false;
                    this.isDisabledPassword = true;
                    this.checkDevices();
                    if (!this.localDevices.hasAudioDevice && !this.localDevices.hasVideoDevice) {
                        return;
                    }
                    // 加入目标频道
                    this.rtc.client.join(settings.appId, this.clientOptions.channel, null, null)
                        .then(async (uid) => {
                            // tslint:disable-next-line: no-console
                            console.log(`Successfully joined! UID: ${uid}`);
                            this.isShowLeave = true;
                            this.isShowCheckDevices = false;

                            // 将音视频轨道对象发布到频道中
                            if (this.localDevices.hasAudioDevice) {
                                this.rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                                this.rtc.client.publish(this.rtc.localAudioTrack);
                            }
                            if (this.localDevices.hasVideoDevice) {
                                this.rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                                this.rtc.client.publish(this.rtc.localVideoTrack);
                            }
                            this.isShowShare = true;
                        })
                        .catch((err) => {
                            // tslint:disable-next-line: no-console
                            console.log(`Error joining channel!\n${err}`);
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
            }
        },
        async leave() {
            // 销毁本地音视频轨道
            if (this.rtc.localAudioTrack) {
                this.rtc.localAudioTrack.close();
            }
            if (this.rtc.localVideoTrack) {
                this.rtc.localVideoTrack.close();
            }
            // 离开频道
            await this.rtc.client.leave();
            this.isShowLeave = false;
            this.isShowJoin = true;
            this.isShowCheckDevices = true;
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
            this.clientOptions.username = '';
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
                });
        },
        copyLink() {
            const textArea = document.createElement('textarea');
            textArea.value = `我正在使用 Room，点击链接：\n${location.href}\n加入房间吧!`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            const { msgTitle, msgContent } = setMsg('copyMsg', { copyValue: textArea.value });
            this.modalMsgTitle = msgTitle;
            this.modalMsgContent = msgContent;
            this.isShowModal = true;
            document.body.removeChild(textArea);
        }
    }
}

// alpinejs
(window as any).room = room;
