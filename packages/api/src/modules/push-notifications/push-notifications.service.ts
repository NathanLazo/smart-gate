import { Injectable, Logger } from '@nestjs/common';
import webPush, { PushSubscription } from 'web-push';

import { Role } from '../../enums/role.enum';
import { Config } from '../config/config';
import { PushNotificationRepository } from '../repository/push-notification.repository';
import { SendPushNotificationDto } from './dto/send-push-notification.dto';
import { SubscribePushNotificationDto } from './dto/subscribe-push-notification.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger: Logger = new Logger(PushNotificationsService.name);

  constructor(
    private readonly config: Config,
    private readonly pushNotificationRepository: PushNotificationRepository,
  ) {
    const { pushNotifications, mailer } = config;
    const { publicVapidKey, privateVapidKey } = pushNotifications;
    const { replyTo } = mailer;

    if (publicVapidKey && privateVapidKey) {
      webPush.setVapidDetails(`mailto:${replyTo}`, publicVapidKey, privateVapidKey);
    }
  }

  async subscribe({ subscription, userPromise }: SubscribePushNotificationDto): Promise<void> {
    this.logger.log('New subscriber');
    await this.pushNotificationRepository.create({
      user: userPromise,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }

  private async getSubscriptions(roles?: [Role] | undefined) {
    if (!roles) {
      return this.pushNotificationRepository.find();
    }

    return this.pushNotificationRepository.findByRoles(roles);
  }

  async send({ title, body, options, roles }: SendPushNotificationDto): Promise<void> {
    this.logger.log('Sending...');

    const subscriptions = await this.getSubscriptions(roles);

    if (!subscriptions.length) {
      this.logger.log('No subscriptions');
      return;
    }

    const payload: PushNotificationPayload = {
      title,
      options: {
        body,
        ...options,
      },
    };

    const sendNotificationsPromises = subscriptions.map(({ endpoint, p256dh, auth }) => {
      const sub: PushSubscription = { endpoint, keys: { p256dh, auth } };
      return webPush.sendNotification(sub, JSON.stringify(payload));
    });

    try {
      await Promise.all(sendNotificationsPromises);

      const sendTotal = sendNotificationsPromises.length;
      this.logger.log(`Sent ${sendTotal} ${sendTotal > 1 ? 'notifications' : 'notification'}`);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
