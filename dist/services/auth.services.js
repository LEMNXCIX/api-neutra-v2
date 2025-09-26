"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Auth_instances, _Auth_getUserData, _Auth_createToken, _Auth_encrypt, _Auth_compare;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const { jwtSecret } = require('../config/index.config');
const User = require('./users.services');
class Auth {
    constructor() {
        _Auth_instances.add(this);
    }
    async login(data) {
        const re = /^[\w\.-]+@[\w]+\.[\.\w]+$/;
        const { email, password } = data;
        if (email == '') {
            return {
                success: false,
                errors: ['Ingrese el correo electrónico'],
            };
        }
        if (password == '') {
            return {
                success: false,
                errors: ['Ingrese la contraseña'],
            };
        }
        if (!re.test(email)) {
            return {
                success: false,
                errors: ['Ingrese un correo electrónico valido'],
            };
        }
        const userServ = new User();
        const user = await userServ.getByEmail(email);
        if (user && (await __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_compare).call(this, password, user.password))) {
            return __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_getUserData).call(this, user);
        }
        return {
            success: false,
            errors: ['Las credenciales son incorrectas'],
            message: 'No se ha podido iniciar sesión',
        };
    }
    async signup(data) {
        if (data && data.password) {
            data.password = await __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_encrypt).call(this, data.password);
        }
        data.provider = {
            local: true,
        };
        const userServ = new User();
        const result = await userServ.create(data);
        if (!result.created) {
            return {
                success: false,
                error: result.message,
            };
        }
        return __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_getUserData).call(this, result.user, 'Signup');
    }
    async socialLogin(data) {
        const userServ = new User();
        const user = {
            idProvider: data.id,
            name: data.displayName,
            email: data.emails[0].value,
            profilePic: data.photos[0].value,
            provider: data.provider,
        };
        const result = await userServ.getOrCreateByProvider(user);
        if (!result.created) {
            return {
                success: false,
                errors: result.errors,
                message: 'No se ha podido iniciar sesión',
            };
        }
        return __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_getUserData).call(this, result.user);
    }
}
_Auth_instances = new WeakSet(), _Auth_getUserData = function _Auth_getUserData(user, op) {
    const userData = {
        role: user.role,
        name: user.name,
        email: user.email,
        provider: user.provider,
        idProvider: user.idProvider,
        id: user.id,
    };
    const token = __classPrivateFieldGet(this, _Auth_instances, "m", _Auth_createToken).call(this, userData);
    return {
        success: true,
        user: userData,
        message: op ? 'Se ha creado el usuario' : 'Se ha iniciado sesión correctamente',
        token,
    };
}, _Auth_createToken = function _Auth_createToken(payload) {
    const token = jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: '7d',
    });
    return token;
}, _Auth_encrypt = async function _Auth_encrypt(string) {
    try {
        const salt = await bcrypt_1.default.genSalt();
        const hash = await bcrypt_1.default.hash(string, salt);
        return hash;
    }
    catch (error) { }
}, _Auth_compare = async function _Auth_compare(string, hash) {
    try {
        return await bcrypt_1.default.compare(string, hash);
    }
    catch (error) {
        return false;
    }
};
module.exports = Auth;
