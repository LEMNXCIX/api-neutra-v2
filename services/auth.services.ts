/// <reference path="../types/api-response.d.ts" />
/// <reference path="../types/request-dto.d.ts" />
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const { jwtSecret } = require("../config/index.config");
const User = require("./users.services");

class Auth {
  async login(data: any) {
    const re = /^[\w\.-]+@[\w]+\.[\.\w]+$/;
    const { email, password } = data;

    if (email == "") {
      return {
        success: false,
        code: 400,
        message: "Ingrese el correo electrónico",
        errors: ["Ingrese el correo electrónico"],
      };
    }

    if (password == "") {
      return {
        success: false,
        code: 400,
        message: "Ingrese la contraseña",
        errors: ["Ingrese la contraseña"],
      };
    }
    if (!re.test(email)) {
      return {
        success: false,
        code: 400,
        message: "Ingrese un correo electrónico valido",
        errors: ["Ingrese un correo electrónico valido"],
      };
    }
    const userServ = new User();
    const userByEmail = await userServ.getByEmail(email, true);
    const user = userByEmail.data;
    if (user && (await this.#compare(password, user.password))) {
      const payload = this.#getUserData(user);
      // Return payload containing both user and token so downstream helper can set cookie and include data
      return {
        success: true,
        code: 200,
        message: "Se ha iniciado sesión correctamente :)",
        // flatten data: place user fields at top-level and include token
        data: { ...payload.user, token: payload.token },
      };
    }

    return {
      success: false,
      code: 401,
      message: "No se ha podido iniciar sesión",
      errors: ["Las credenciales son incorrectas"],
    };
  }

  async signup(data: any) {
    if (data && data.password) {
      const encrypted = await this.#encrypt(data.password);
      if (encrypted) {
        data.password = encrypted;
      }
    }
    data.provider = {
      local: true,
    };

    const userServ = new User();
    const result = await userServ.create(data);
    if (!result || (result as any).success === false) {
      return {
        success: false,
        code: 400,
        message: (result && (result as any).message) || "Error",
        errors: (result && (result as any).errors) || undefined,
      };
    }

    const createdUser = (result as any).data?.user || (result as any).user;
    const payload = this.#getUserData(createdUser);
    return {
      success: true,
      code: 201,
      message: "Se ha creado el usuario",
      data: { ...payload.user, token: payload.token },
    };
  }

  async socialLogin(data: any) {
    const userServ = new User();
    const user = {
      idProvider: data.id,
      name: data.displayName,
      email: data.emails[0].value,
      profilePic: data.photos[0].value,
      provider: data.provider,
    };
    const result = await userServ.getOrCreateByProvider(user);

    if (!result || (result as any).success === false) {
      return {
        success: false,
        code: 400,
        message: "No se ha podido iniciar sesión",
        errors: (result && (result as any).errors) || undefined,
      };
    }

    const created = (result as any).data?.user || (result as any).user;
    const payload = this.#getUserData(created);
    return {
      success: true,
      code: 200,
      message: "Se ha iniciado sesión correctamente",
      data: { ...payload.user, token: payload.token },
    };
  }

  #getUserData(user: any) {
    const resolvedId = user && (user._id || user.id) ? String(user._id || user.id) : undefined;
    const userData = {
      role: user.role,
      name: user.name,
      email: user.email,
      provider: user.provider,
      idProvider: user.idProvider,
      id: resolvedId,
    };

    const token = this.#createToken(userData);
    // Return the raw data (user + token). Callers create the ApiPayload envelope.
    return { user: userData, token };
  }

  #createToken(payload: any) {
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: "7d",
    });
    return token;
  }

  async #encrypt(string: string) {
    try {
      const salt = await bcrypt.genSalt();
      const hash = await bcrypt.hash(string, salt);

      return hash;
    } catch (error) {}
  }

  async #compare(string: string, hash: string) {
    try {
      return await bcrypt.compare(string, hash);
    } catch (error) {
      return false;
    }
  }
}

export = Auth;
