import { Injectable, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import * as bcrypt from 'bcrypt';

import { CookieResponse } from '../../interfaces/cookie-types';
import { GeneratedTokens } from '../../interfaces/token-types';
import { UserEntity } from '../database/entities/user.entity';
import { InvitationRepository } from '../repository/invitation.repository';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';
import { UserRepository } from '../repository/user.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginUserInfo } from './interfaces/login-user-info';
import { TokenService } from './token/token.service';
import { TokenCookieService } from './token/token-cookie.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly invitationsRepository: InvitationRepository,
    private readonly usersRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenCookieService: TokenCookieService,
  ) {}

  public async login(
    { email, password, keepMeLoggedIn }: LoginDto,
    res: CookieResponse,
  ): Promise<LoginUserInfo> {
    const user = await this.validateUser(email, password);

    try {
      const [refreshToken, expirationDate] = await this.tokenService.generateToken(
        'REFRESH',
        user,
        keepMeLoggedIn,
      );

      const [accessToken] = await this.tokenService.generateToken('ACCESS', user, keepMeLoggedIn);

      let logoutToken: string | undefined;

      if (!keepMeLoggedIn) {
        [logoutToken] = await this.tokenService.generateToken('LOGOUT', user, keepMeLoggedIn);
      }

      const generateTokens: GeneratedTokens = {
        tokens: {
          logoutToken,
          accessToken,
          refreshToken,
        },
        expiration: expirationDate,
      };

      this.tokenCookieService.setCookieTokens(generateTokens, res);

      const { firstName, lastName, roles } = user;

      return {
        user: {
          email,
          firstName,
          lastName,
          roles,
        },
        expirationDate: expirationDate.getTime(),
      };
    } catch (e) {
      Sentry.captureException(e);
      throw e;
    }
  }

  public async getUser(userId: string): Promise<UserEntity> {
    return this.usersRepository.findByIdOrFail(userId);
  }

  public async logout(response: CookieResponse, userId: string): Promise<void> {
    const refreshToken = this.tokenCookieService.getCookieToken('REFRESH');
    this.tokenCookieService.clearAllCookieTokens(response);

    try {
      await this.refreshTokenRepository.repository.delete({ id: refreshToken, userId });
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  public async logoutFromAllDevices(response: CookieResponse, userId: string) {
    const refreshToken = this.tokenCookieService.getCookieToken('REFRESH');
    this.tokenCookieService.clearAllCookieTokens(response);

    try {
      await this.refreshTokenRepository.findOneWithUserIdOrFail(refreshToken, userId);

      await this.refreshTokenRepository.deleteAllWithUserId(userId);
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  public async register(registerDto: RegisterDto): Promise<UserEntity> {
    const { password, firstName, lastName, email, code } = registerDto;

    const { roles, expirationDate } = await this.invitationsRepository.findWithCredentialsOrFail(
      email,
      code,
    );

    if (expirationDate.getTime() < Date.now()) {
      throw new Error('Invitation expired');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);

    const newUser = await this.usersRepository.create({
      password: hash,
      firstName,
      lastName,
      email,
      roles,
    });

    await this.invitationsRepository.deleteById(code);

    return newUser;
  }

  private async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOneByEmailOrFail(email);
    const { password: passwordHash } = user;
    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      throw new NotFoundException('User password mismatch');
    }
    return user;
  }
}
