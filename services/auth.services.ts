import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const { jwtSecret } = require('../config/index.config');
const User = require('./users.services');

class Auth {
  async login(data: any) {
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

    if (user && (await this.#compare(password, user.password))) {
      return this.#getUserData(user);
    }

    return {
      success: false,
      errors: ['Las credenciales son incorrectas'],
      message: 'No se ha podido iniciar sesión',
    };
  }

  async signup(data: any) {
    if (data && data.password) {
      data.password = await this.#encrypt(data.password);
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

    return this.#getUserData(result.user, 'Signup');
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

    if (!result.created) {
      return {
        success: false,
        errors: result.errors,
        message: 'No se ha podido iniciar sesión',
      };
    }

    return this.#getUserData(result.user);
  }

  #getUserData(user: any, op?: string) {
    const userData = {
      role: user.role,
      name: user.name,
      email: user.email,
      provider: user.provider,
      idProvider: user.idProvider,
      id: user.id,
    };

    const token = this.#createToken(userData);
    return {
      success: true,
      user: userData,
      message: op ? 'Se ha creado el usuario' : 'Se ha iniciado sesión correctamente',
      token,
    };
  }

  #createToken(payload: any) {
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: '7d',
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
