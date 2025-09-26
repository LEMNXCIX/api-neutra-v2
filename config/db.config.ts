import mongoose from 'mongoose';
const { dbUsername, dbPassword, dbHost, dbName } = require('./index.config');

const connection = async function () {
  const conn = await mongoose.connect(
    `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`
  );
  // console.log('Usando: ' + conn.connection.host);
};

export = { connection, mongoose };
