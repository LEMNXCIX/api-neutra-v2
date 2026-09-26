import config from "@/config/index.config";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type {
    StrategyOptions as GoogleStrategyOptions,
    VerifyCallback,
} from "passport-google-oauth20";
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

/**
 * Shared by all four OAuth strategies. `passport-oauth2`'s VerifyCallback is the
 * common denominator, so it is the honest type for `done` (a two-parameter
 * callback is not assignable to it, which is why Google needed a double
 * assertion before).
 */
const getProfile = (
    _accessToken: string,
    _refreshToken: string,
    profile: unknown,
    done: VerifyCallback,
) => {
    // SAFETY: the OAuth flow authenticates passport with `{ profile }`, which is
    // NOT an AuthenticatedUser (it carries no `role` and no JWT claims) — the
    // invariant TypeScript cannot check. Reported, not fixed: the value is
    // forwarded unchanged and only its type is made explicit here.
    done(null, { profile } as unknown as Express.User);
};

export const useGoogleStrategy = () => {
    const options: GoogleStrategyOptions = {
        clientID: oauthClientID as string,
        clientSecret: oauthClientSecret as string,
        callbackURL: callbackUrl("google"),
    };

    return new GoogleStrategy(options, getProfile);
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
