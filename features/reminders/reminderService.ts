import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { settingsService } from '@/features/settings/settingsService';
import { getEffectiveDueAt, getReminderTriggerAt } from '@/lib/reminders';

const ORBIT_REMINDER_KIND = 'orbit-due-contact';

export interface ReminderSyncResult {
  scheduled: number;
  permissionGranted: boolean;
  notificationsEnabled: boolean;
}

async function ensurePermissions(requestPermissions: boolean) {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  if (!requestPermissions) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('orbit-reminders', {
    name: 'Orbit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Gentle reminders for people who are due.',
  });
}

async function cancelOrbitNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const orbitNotifications = scheduled.filter(
    (notification) => notification.content.data?.kind === ORBIT_REMINDER_KIND,
  );

  await Promise.all(
    orbitNotifications.map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)),
  );
}

export const reminderService = {
  configure() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  },
  async syncNotifications(options: { requestPermissions?: boolean } = {}): Promise<ReminderSyncResult> {
    contactsRepository.clearExpiredSnoozes();

    const notificationPreference = settingsService.getNotificationsPreference();
    let notificationsEnabled = notificationPreference === true;

    if (notificationPreference === null) {
      const legacyAllowed = await ensurePermissions(false);
      if (legacyAllowed) {
        settingsService.setNotificationsEnabled(true);
        notificationsEnabled = true;
      }
    }

    if (!notificationsEnabled) {
      await cancelOrbitNotifications();
      return { scheduled: 0, permissionGranted: false, notificationsEnabled: false };
    }

    const allowed = await ensurePermissions(options.requestPermissions ?? false);
    if (!allowed) {
      await cancelOrbitNotifications();
      return { scheduled: 0, permissionGranted: false, notificationsEnabled: true };
    }

    await ensureChannel();
    await cancelOrbitNotifications();

    const remindableContacts = contactsRepository.listRemindable();
    let scheduled = 0;

    for (const contact of remindableContacts) {
      const triggerAt = getReminderTriggerAt(getEffectiveDueAt(contact.nextDueAt, contact.cadenceSnoozedUntil));
      if (!triggerAt) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Orbit check-in`,
          body: `${contact.name} could use a little hello.`,
          data: {
            kind: ORBIT_REMINDER_KIND,
            contactId: contact.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerAt,
          channelId: 'orbit-reminders',
        },
      });
      scheduled += 1;
    }

    return { scheduled, permissionGranted: true, notificationsEnabled: true };
  },
  async setNotificationsEnabled(enabled: boolean): Promise<ReminderSyncResult> {
    if (!enabled) {
      settingsService.setNotificationsEnabled(false);
      await cancelOrbitNotifications();
      return { scheduled: 0, permissionGranted: false, notificationsEnabled: false };
    }

    settingsService.setNotificationsEnabled(true);

    let result: ReminderSyncResult;
    try {
      result = await this.syncNotifications({ requestPermissions: true });
    } catch (error) {
      settingsService.setNotificationsEnabled(false);
      await cancelOrbitNotifications();
      throw error;
    }

    if (!result.permissionGranted) {
      settingsService.setNotificationsEnabled(false);
      await cancelOrbitNotifications();
      return { scheduled: 0, permissionGranted: false, notificationsEnabled: false };
    }

    return result;
  },
};
