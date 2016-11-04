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
var core_1 = require('@angular/core');
var oauth_service_1 = require('./services/oauth-service');
exports.OAuthService = oauth_service_1.OAuthService;
exports.OAUTHSERVICE_CONFIG_TOKEN = oauth_service_1.OAUTHSERVICE_CONFIG_TOKEN;
var XNG2OAuthLibModule = (function () {
    function XNG2OAuthLibModule() {
    }
    XNG2OAuthLibModule = __decorate([
        core_1.NgModule({}), 
        __metadata('design:paramtypes', [])
    ], XNG2OAuthLibModule);
    return XNG2OAuthLibModule;
}());
exports.XNG2OAuthLibModule = XNG2OAuthLibModule;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = XNG2OAuthLibModule;
//# sourceMappingURL=x-oauth-lib.js.map