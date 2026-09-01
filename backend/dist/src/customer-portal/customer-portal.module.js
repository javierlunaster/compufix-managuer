"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerPortalModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const customer_portal_controller_1 = require("./customer-portal.controller");
const customer_portal_service_1 = require("./customer-portal.service");
const customer_jwt_strategy_1 = require("./customer-jwt.strategy");
let CustomerPortalModule = class CustomerPortalModule {
};
exports.CustomerPortalModule = CustomerPortalModule;
exports.CustomerPortalModule = CustomerPortalModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get("JWT_SECRET"),
                    signOptions: {
                        expiresIn: config.get("JWT_EXPIRES_IN") ?? "8h",
                    },
                }),
            }),
        ],
        controllers: [customer_portal_controller_1.CustomerPortalController],
        providers: [customer_portal_service_1.CustomerPortalService, customer_jwt_strategy_1.CustomerJwtStrategy],
    })
], CustomerPortalModule);
