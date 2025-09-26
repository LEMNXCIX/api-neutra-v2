import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const { jwtSecret } = require('../config/index.config');
const User = require('./users.services');

class Auth {
  async login(data: LoginDto) {
    const re = /^[\w\.-]+@[\w]+\.[\.\w]+$/;
    const { email, password } = data;

    if (email == '') {
      return { success: false, code: 400, message: 'Ingrese el correo electrónico', errors: ['Ingrese el correo electrónico'] };
    }

    if (password == '') {
      return { success: false, code: 400, message: 'Ingrese la contraseña', errors: ['Ingrese la contraseña'] };
    }
    if (!re.test(email)) {
      return { success: false, code: 400, message: 'Ingrese un correo electrónico valido', errors: ['Ingrese un correo electrónico valido'] };
    }
    const userServ = new User();
    const user = await userServ.getByEmail(email);

    if (user && (await this.#compare(password, user.password))) {
      return { success: true, code: 200, message: 'Se ha iniciado sesión correctamente', data: this.#getUserData(user) };
    }

    return { success: false, code: 401, message: 'No se ha podido iniciar sesión', errors: ['Las credenciales son incorrectas'] };
  }

  async signup(data: CreateUserDto) {
    if (data && data.password) {
      data.password = await this.#encrypt(data.password);
    }
    data.provider = {
      local: true,
    };

    const userServ = new User();
    const result = await userServ.create(data);
    if (!result || (result as any).success === false) {
      return { success: false, code: 400, message: (result && (result as any).message) || 'Error', errors: (result && (result as any).errors) || undefined };
    }

    return { success: true, code: 201, message: 'Signup successful', data: this.#getUserData((result as any).data?.user || (result as any).user, 'Signup') };
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
      return { success: false, code: 400, message: 'No se ha podido iniciar sesión', errors: (result && (result as any).errors) || undefined };
    }

    return { success: true, code: 200, message: 'Social login successful', data: this.#getUserData((result as any).data?.user || (result as any).user) };
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
    return { success: true, code: 200, message: op ? 'Se ha creado el usuario' : 'Se ha iniciado sesión correctamente', data: { user: userData, token } };
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
