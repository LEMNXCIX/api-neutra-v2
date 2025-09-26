/// <reference path="../types/api.d.ts" />
/// <reference path="../types/requests.d.ts" />
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const { jwtSecret } = require("../config/index.config");
const User = require("./users.services");

class Auth {
  async login(data: LoginDto) {
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
    const userByEmail = await userServ.getByEmail(email);
    const user = userByEmail.data;
    console.log(user);
    if (user && (await this.#compare(password, user.password))) {
      const payload = this.#getUserData(user);
      return {
        success: true,
        code: 200,
        message: "Se ha iniciado sesión correctamente",
        data: payload,
      };
    }

    return {
      success: false,
      code: 401,
      message: "No se ha podido iniciar sesión",
      errors: ["Las credenciales son incorrectas"],
    };
  }

  async signup(data: CreateUserDto) {
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
      data: payload,
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
      data: payload,
    };
  }

  #getUserData(user: any) {
    const userData = {
      role: user.role,
      name: user.name,
      email: user.email,
      provider: user.provider,
      idProvider: user.idProvider,
      id: user.id,
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
      console.log(string);
      console.log(hash);
      return await bcrypt.compare(string, hash);
    } catch (error) {
      return false;
    }
  }
}

export = Auth;
