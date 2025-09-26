const time = () => new Date().toISOString();

function safeStringify(obj: any) {
  try {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
  } catch (err) {
    return String(obj);
  }
}

export function info(payload: any) {
  console.log(
    safeStringify({ level: 'info', time: time(), ...payload })
  );
}

export function warn(payload: any) {
  console.warn(
    safeStringify({ level: 'warn', time: time(), ...payload })
  );
}

export function error(payload: any) {
  console.error(
    safeStringify({ level: 'error', time: time(), ...payload })
  );
}

export default { info, warn, error };
