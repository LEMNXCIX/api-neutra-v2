const {
  oauthClientID,
  oauthClientSecret,
  callbackURL,
  production,
  callbackURLDev,
  facebookAppID,
  facebookAppSecret,
  twitterConsumerID,
  twitterConsumerSecret,
  githubClientID,
  githubClientSecret,
} = require('../config/index.config');
require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const callbackUrl = (provider: string) =>
  `${production ? callbackURL : callbackURLDev}/api/auth/${provider}/callback`;

const getProfile = (accesToken: any, refreshToken: any, profile: any, done: any) => {
  done(null, { profile });
};

const useGoogleStrategy = () => {
  return new GoogleStrategy(
    {
      clientID: oauthClientID,
      clientSecret: oauthClientSecret,
      callbackURL: callbackUrl('google'),
    },
    getProfile
  );
};
const useFacebookStrategy = () => {
  return new FacebookStrategy(
    {
      clientID: facebookAppID,
      clientSecret: facebookAppSecret,
      callbackURL: callbackUrl('facebook'),
      profileFields: ['id', 'emails', 'displayName', 'name', 'photos'],
    },
    getProfile
  );
};

const useTwitterStrategy = () => {
  return new TwitterStrategy(
    {
      consumerKey: twitterConsumerID,
      consumerSecret: twitterConsumerSecret,
      callbackURL: callbackUrl('twitter'),
      includeEmail: true,
    },
    getProfile
  );
};

const useGitHubStrategy = () => {
  return new GitHubStrategy(
    {
      clientID: githubClientID,
      clientSecret: githubClientSecret,
      callbackURL: callbackUrl('github'),
      scope: ['user:email'],
    },
    getProfile
  );
};
export = {
  useGoogleStrategy,
  useFacebookStrategy,
  useTwitterStrategy,
  useGitHubStrategy,
};
