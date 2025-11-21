import mongoose from 'mongoose';
import config from './index.config';

const { dbUsername, dbPassword, dbHost, dbName } = config;

const connection = async function () {
  const conn = await mongoose.connect(
    `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`
  );
};

export { connection, mongoose };
