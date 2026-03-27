import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { contactsRepository } from '@/db/repositories/contactsRepository';
import { getReminderTriggerAt } from '@/lib/reminders';

const ORBIT_REMINDER_KIND = 'orbit-due-contact';

async function ensurePermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

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
  async syncNotifications() {
    contactsRepository.clearExpiredSnoozes();

    const allowed = await ensurePermissions();
    if (!allowed) {
      await cancelOrbitNotifications();
      return { scheduled: 0, permissionGranted: false };
    }

    await ensureChannel();
    await cancelOrbitNotifications();

    const remindableContacts = contactsRepository.listRemindable();
    let scheduled = 0;

    for (const contact of remindableContacts) {
      const triggerAt = getReminderTriggerAt(contact.nextDueAt);
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

    return { scheduled, permissionGranted: true };
  },
};
