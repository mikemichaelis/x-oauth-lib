"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var core_1 = require("@angular/core");
var http_1 = require("@angular/http");
require('rxjs/add/operator/map');
require('rxjs/add/operator/map');
var x_common_lib_1 = require("x-common-lib");
exports.OAUTHSERVICE_CONFIG_TOKEN = new core_1.OpaqueToken("OAuthService_Config_Token");
var OAuthService = (function () {
    function OAuthService(windows, http, config) {
        this.windows = windows;
        this.http = http;
        this.config = config;
        this.authed = false;
        this.expires = 0;
        this.userInfo = {};
        this.windowHandle = null;
        this.intervalId = null;
        this.expiresTimerId = null;
        this.loopCount = 600;
        this.intervalLength = 100;
        this.locationWatcher = new core_1.EventEmitter(); // @TODO: switch to RxJS Subject instead of EventEmitter
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
    OAuthService.prototype.subscribe = function (onNext, onThrow, onReturn) {
        return this.locationWatcher.subscribe(onNext, onThrow, onReturn);
    };
    OAuthService.prototype.login = function () {
        var _this = this;
        var loopCount = this.loopCount;
        this.windowHandle = this.windows.createWindow(this.oAuthTokenUrl, "OAuth2 Login", 500, 850);
        this.intervalId = setInterval(function () {
            if (loopCount-- < 0) {
                clearInterval(_this.intervalId);
                _this.emitAuthStatus(false);
                _this.windowHandle.close();
            }
            else {
                var href = void 0;
                try {
                    href = _this.windowHandle.location.href;
                }
                catch (e) {
                }
                if (href != null) {
                    var re = /id_token=(.*)/;
                    var found = href.match(re);
                    if (found) {
                        console.log("Callback URL:", href);
                        clearInterval(_this.intervalId);
                        var parsed = _this.parse(href.substr(_this.oAuthCallbackUrl.length + 1));
                        var expiresSeconds = Number(parsed.expires_in) || 1800;
                        _this.token_type = parsed.token_type;
                        _this.id_token = parsed.id_token;
                        _this.access_token = parsed.access_token;
                        // TODO verify returned state and session_state are correct
                        _this.state = parsed.state;
                        _this.session_state = parsed.session_state;
                        if (_this.id_token) {
                            _this.authed = true;
                        }
                        _this.startExpiresTimer(expiresSeconds);
                        _this.expires = new Date();
                        _this.expires = _this.expires.setSeconds(_this.expires.getSeconds() + expiresSeconds);
                        _this.windowHandle.close();
                        _this.emitAuthStatus(true);
                        _this.fetchUserInfo();
                        _this.logoutUrl = _this.config.logoutUrl
                            .replace("__token__", _this.getSession().id_token)
                            .replace("__logoutCallbackUrl__", _this.config.logoutCallbackUrl);
                    }
                }
            }
        }, this.intervalLength);
    };
    OAuthService.prototype.authenticated = function () {
        return this.authed;
    };
    OAuthService.prototype.getSession = function () {
        return { authenticated: this.authed, id_token: this.id_token, access_token: this.access_token, expires: this.expires };
    };
    OAuthService.prototype.getUserInfo = function () {
        return this.userInfo;
    };
    OAuthService.prototype.getUserName = function () {
        return this.userInfo ? this.userInfo[this.oAuthUserNameField] : null;
    };
    OAuthService.prototype.logout = function () {
        this.clearSession();
        this.emitAuthStatus(true);
        this.windowHandle = this.windows.createWindow(this.logoutUrl, "OAuth2 Logout", 500, 300);
    };
    OAuthService.prototype.clearSession = function () {
        this.authed = false;
        this.expiresTimerId = null;
        this.expires = 0;
        this.id_token = null;
        this.access_token = null;
        this.emitAuthStatus(true);
        console.log("Session has been cleared");
    };
    OAuthService.prototype.fetchUserInfo = function () {
        var _this = this;
        if (this.id_token != null) {
            var headers = new http_1.Headers();
            headers.append("Authorization", "Bearer " + this.access_token);
            this.http.get(this.oAuthUserUrl, { headers: headers })
                .map(function (res) { return res.json(); })
                .subscribe(function (info) {
                _this.userInfo = info;
                console.log("Retrieved user info: ", info);
            }, function (err) {
                console.error("Failed to fetch user info: ", err);
            });
        }
    };
    OAuthService.prototype.startExpiresTimer = function (seconds) {
        var _this = this;
        if (this.expiresTimerId != null) {
            clearTimeout(this.expiresTimerId);
        }
        this.expiresTimerId = setTimeout(function () {
            console.log("Session has expired");
            _this.logout();
        }, seconds * 1000);
        console.log("Token expiration timer set for", seconds, "seconds");
    };
    OAuthService.prototype.parse = function (str) {
        if (typeof str !== "string") {
            return {};
        }
        str = str.trim().replace(/^(\?|#|&)/, "");
        if (!str) {
            return {};
        }
        return str.split("&").reduce(function (ret, param) {
            var parts = param.replace(/\+/g, " ").split("=");
            // Firefox (pre 40) decodes `%3D` to `=`
            // https://github.com/sindresorhus/query-string/pull/37
            var key = parts.shift();
            var val = parts.length > 0 ? parts.join("=") : undefined;
            key = decodeURIComponent(key);
            // missing `=` should be `null`:
            // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
            val = val === undefined ? null : decodeURIComponent(val);
            if (!ret.hasOwnProperty(key)) {
                ret[key] = val;
            }
            else if (Array.isArray(ret[key])) {
                ret[key].push(val);
            }
            else {
                ret[key] = [ret[key], val];
            }
            return ret;
        }, {});
    };
    ;
    OAuthService.prototype.emitAuthStatus = function (success) {
        var authStatus = this.getSession();
        authStatus.success = success;
        // this.locationWatcher.emit({success: success, authenticated: this.authenticated, id_token: this.id_token, access_token: this.access_token, expires: this.expires});
        this.locationWatcher.emit(authStatus);
    };
    OAuthService = __decorate([
        core_1.Injectable(),
        __param(2, core_1.Inject(exports.OAUTHSERVICE_CONFIG_TOKEN)), 
        __metadata('design:paramtypes', [x_common_lib_1.WindowService, http_1.Http, Object])
    ], OAuthService);
    return OAuthService;
}());
exports.OAuthService = OAuthService;
//# sourceMappingURL=oauth-service.js.map