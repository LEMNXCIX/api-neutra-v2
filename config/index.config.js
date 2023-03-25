/**
 *  Lista de variables de entorno para el proyecto
 */
require("dotenv").config();

const config = {
	env: process.env.NODE_ENV,
	production: process.env.NODE_ENV === "production",
	development: process.env.NODE_ENV === "development",
	port: process.env.PORT,
	sesionSecret: process.env.SESSION_SECRET,
	jwtSecret: process.env.JWT_SECRET,
	dbUsername: process.env.DB_USERNAME,
	dbPassword: process.env.DB_PASSWORD,
	dbHost: process.env.DB_HOST,
	dbName: process.env.DB_NAME,
	oauthClientID: process.env.OAUTH_CLIENT_ID,
	oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
	facebookAppID: process.env.FACEBOOK_APP_ID,
	facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
	githubClientID: process.env.GITHUB_CLIENT_ID,
	githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
	twitterConsumerID: process.env.TWITTER_CONSUMER_ID,
	twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callbackURL: process.env.CALLBACK_URL,
	callbackURLDev: process.env.CALLBACK_URL_DEVELOPMENT,
};


module.exports = config;
