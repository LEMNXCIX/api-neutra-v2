import config from "@/config/index.config";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Strategy as GitHubStrategy } from "passport-github2";
import { isProduction } from "@/core/domain/constants";

dotenv.config();

const {
    oauthClientID,
    oauthClientSecret,
    callbackURL,
    ENVIRONMENT,
    callbackURLDev,
    facebookAppID,
    facebookAppSecret,
    twitterConsumerID,
    twitterConsumerSecret,
    githubClientID,
    githubClientSecret,
} = config;

const callbackUrl = (provider: string) =>
    `${isProduction(ENVIRONMENT) ? callbackURL : callbackURLDev}/api/auth/${provider}/callback`;

const getProfile = (
    _accessToken: unknown,
    _refreshToken: unknown,
    profile: unknown,
    done: (error: unknown, user?: unknown) => void,
) => {
    done(null, { profile });
};

export const useGoogleStrategy = () => {
    return new GoogleStrategy(
        {
            clientID: oauthClientID as string,
            clientSecret: oauthClientSecret as string,
            callbackURL: callbackUrl("google"),
        },
        getProfile,
    );
};

export const useFacebookStrategy = () => {
    return new FacebookStrategy(
        {
            clientID: facebookAppID as string,
            clientSecret: facebookAppSecret as string,
            callbackURL: callbackUrl("facebook"),
            profileFields: ["id", "emails", "displayName", "name", "photos"],
        },
        getProfile,
    );
};

export const useTwitterStrategy = () => {
    return new TwitterStrategy(
        {
            consumerKey: twitterConsumerID as string,
            consumerSecret: twitterConsumerSecret as string,
            callbackURL: callbackUrl("twitter"),
            includeEmail: true,
        },
        getProfile,
    );
};

export const useGitHubStrategy = () => {
    return new GitHubStrategy(
        {
            clientID: githubClientID as string,
            clientSecret: githubClientSecret as string,
            callbackURL: callbackUrl("github"),
        },
        getProfile,
    );
};
