import {Injectable, EventEmitter} from "@angular/core";
import {Http, Headers} from "@angular/http";
import {Observable} from 'rxjs/Rx';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/map';

import {IAuth} from "x-common-lib";
import {WindowService} from "x-common-lib";

@Injectable()
export class OAuthService implements IAuth {
    private oAuthCallbackUrl: string;
    private oAuthTokenUrl: string;
    private oAuthUserUrl: string;
    private oAuthUserNameField: string;
    private logoutUrl: string;
    private authed: boolean = false;
    private token_type: string;
    private id_token: string;
    private access_token: string;
    private expires: any = 0;
    private state: string;
    private session_state: string;
    private userInfo: any = {};
    private windowHandle: any = null;
    private intervalId: any = null;
    private expiresTimerId: any = null;
    private loopCount = 600;
    private intervalLength = 100;

    private locationWatcher = new EventEmitter();  // @TODO: switch to RxJS Subject instead of EventEmitter
    private subscription: any;

    constructor(private windows: WindowService, private http: Http, private config: any) {
        this.oAuthCallbackUrl = config.callbackUrl;
        this.oAuthTokenUrl = config.implicitGrantUrl;
        this.oAuthTokenUrl = this.oAuthTokenUrl
            .replace("__callbackUrl__", config.callbackUrl)
            .replace("__clientId__", config.clientId)
            .replace("__scopes__", config.scopes);
        this.oAuthUserUrl = config.userInfoUrl;
        this.oAuthUserNameField = config.userInfoNameField;

        /*
        http.get("/app/shared/auth/oauth.json")
            .map((res: any) => res.json())
            .subscribe((config: any) => {
                this.oAuthCallbackUrl = config.callbackUrl;
                this.oAuthTokenUrl = config.implicitGrantUrl;
                this.oAuthTokenUrl = this.oAuthTokenUrl
                    .replace("__callbackUrl__", config.callbackUrl)
                    .replace("__clientId__", config.clientId)
                    .replace("__scopes__", config.scopes);
                this.oAuthUserUrl = config.userInfoUrl;
                this.oAuthUserNameField = config.userInfoNameField;
            });
        */
    }

    public subscribe(onNext: (value: any) => void, onThrow?: (exception: any) => void, onReturn?: () => void) {
        return this.locationWatcher.subscribe(onNext, onThrow, onReturn);
    }

    public login() {
        let loopCount = this.loopCount;
        this.windowHandle = this.windows.createWindow(this.oAuthTokenUrl, "OAuth2 Login", 500, 850);

        this.intervalId = setInterval(() => {
            if (loopCount-- < 0) {
                clearInterval(this.intervalId);
                this.emitAuthStatus(false);
                this.windowHandle.close();
            } else {
                let href: string;
                try {
                    href = this.windowHandle.location.href;
                } catch (e) {
                    // console.log("Error:", e);
                }
                if (href != null) {
                    let re = /id_token=(.*)/;
                    let found = href.match(re);
                    if (found) {
                        console.log("Callback URL:", href);
                        clearInterval(this.intervalId);
                        let parsed = this.parse(href.substr(this.oAuthCallbackUrl.length + 1));
                        let expiresSeconds = Number(parsed.expires_in) || 1800;
                        this.token_type = parsed.token_type;
                        this.id_token = parsed.id_token;
                        this.access_token = parsed.access_token;

                        // TODO verify returned state and session_state are correct
                        this.state = parsed.state;
                        this.session_state = parsed.session_state;

                        if (this.id_token) {
                            this.authed = true;
                        }

                        this.startExpiresTimer(expiresSeconds);
                        this.expires = new Date();
                        this.expires = this.expires.setSeconds(this.expires.getSeconds() + expiresSeconds);

                        this.windowHandle.close();
                        this.emitAuthStatus(true);
                        this.fetchUserInfo();

                        this.logoutUrl = this.config.logoutUrl
                            .replace("__token__", this.getSession().id_token)
                            .replace("__logoutCallbackUrl__", this.config.logoutCallbackUrl);

/*
                        this.http.get("config/app.config.json")
                            .map((res: any) => res.json())
                            .subscribe((config: any) => {
                                this.logoutUrl = config.logoutUrl
                                    .replace("__token__", this.getSession().id_token)
                                    .replace("__logoutCallbackUrl__", config.logoutCallbackUrl);
                            });
                            */
                    }
                }
            }
        }, this.intervalLength);
    }

    public authenticated() {
        return this.authed;
    }

    public getSession() {
        return {authenticated: this.authed, id_token: this.id_token, access_token: this.access_token, expires: this.expires};
    }

    public getUserInfo() {
        return this.userInfo;
    }

    public getUserName() {
        return this.userInfo ? this.userInfo[this.oAuthUserNameField] : null;
    }

    public logout() {
        this.clearSession();
        this.emitAuthStatus(true);
        this.windowHandle = this.windows.createWindow(this.logoutUrl, "OAuth2 Logout", 500, 300);
    }

    private clearSession() {
        this.authed = false;
        this.expiresTimerId = null;
        this.expires = 0;
        this.id_token = null;
        this.access_token = null;
        this.emitAuthStatus(true);
        console.log("Session has been cleared");
    }

    private fetchUserInfo() {
        if (this.id_token != null) {
            let headers = new Headers();
            headers.append("Authorization", `Bearer ${this.access_token}`);
            this.http.get(this.oAuthUserUrl, {headers: headers})
                .map((res: any) => res.json())
                .subscribe((info: any) => {
                    this.userInfo = info;
                    console.log("Retrieved user info: ", info);
                }, (err: any) => {
                    console.error("Failed to fetch user info: ", err);
                });
        }
    }

    private startExpiresTimer(seconds: number) {
        if (this.expiresTimerId != null) {
            clearTimeout(this.expiresTimerId);
        }
        this.expiresTimerId = setTimeout(() => {
            console.log("Session has expired");
            this.logout();
        }, seconds * 1000);
        console.log("Token expiration timer set for", seconds, "seconds");
    }

    private parse(str: string) { // lifted from https://github.com/sindresorhus/query-string
        if (typeof str !== "string") {
            return {};
        }

        str = str.trim().replace(/^(\?|#|&)/, "");

        if (!str) {
            return {};
        }

        return str.split("&").reduce(function (ret: any, param: any) {
            let parts = param.replace(/\+/g, " ").split("=");
            // Firefox (pre 40) decodes `%3D` to `=`
            // https://github.com/sindresorhus/query-string/pull/37
            let key = parts.shift();
            let val = parts.length > 0 ? parts.join("=") : undefined;

            key = decodeURIComponent(key);

            // missing `=` should be `null`:
            // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
            val = val === undefined ? null : decodeURIComponent(val);

            if (!ret.hasOwnProperty(key)) {
                ret[key] = val;
            } else if (Array.isArray(ret[key])) {
                ret[key].push(val);
            } else {
                ret[key] = [ret[key], val];
            }

            return ret;
        }, {});
    };

    private emitAuthStatus(success: boolean) {

        let authStatus: any = this.getSession();
        authStatus.success = success;

        // this.locationWatcher.emit({success: success, authenticated: this.authenticated, id_token: this.id_token, access_token: this.access_token, expires: this.expires});

        this.locationWatcher.emit(authStatus);
    }
}

