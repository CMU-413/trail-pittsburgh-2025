import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

import { UserService } from './UserService';

import { SESSION_DURATION_SECONDS } from '@/constants/session';
import { getGoogleUserData } from '@/lib/googleAuth';

export class AuthService {
    private oAuth2Client: OAuth2Client;
    private userService: UserService;

    constructor(userService: UserService, oAuth2Client: OAuth2Client) {
        this.oAuth2Client = oAuth2Client;
        this.userService = userService;
    }

    generateAuthUrl(redirectPath: string = '/') {
        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile openid email',
            state: redirectPath,
            prompt: 'consent'
        });
    }

    async handleGoogleCallback(code: string) {
        const { tokens } = await this.oAuth2Client.getToken(code);
        this.oAuth2Client.setCredentials(tokens);

        const userData = await getGoogleUserData(tokens.access_token!);

        const user = await this.userService.findOrCreateFromGoogle({
            email: userData.email,
            name: userData.name,
            picture: userData.picture
        });

        if (!user) {
            throw new Error('Failed to create or find user');
        }

        const token = jwt.sign(
            { 
                id: user.userId, 
                email: user.email,
                name: user.username,
                picture: user.profileImage
            },
            process.env.JWT_SECRET!,
            { expiresIn: SESSION_DURATION_SECONDS }
        );

        return { token, user };
    }
}
