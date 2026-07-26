import prisma from '../config/prisma.js';

/**
 * Löscht ein Benutzerkonto DSGVO-konform: Schicht-/Spenden-Historie wird
 * anonymisiert (userId auf null - rechtliche Aufbewahrung der operativen
 * Daten), personenbezogene Zusatzdaten (Kinder, offene Reset-Tokens) werden
 * gelöscht, das Konto selbst zum Schluss. Gemeinsam genutzt von der
 * Selbst-Löschung (DELETE /api/auth/account) und der automatischen
 * Inaktivitäts-Bereinigung (scheduler.ts) - beide Wege müssen identisch
 * vorgehen, sonst würde eine Kopie beim Anlegen einer neuen Löschroutine
 * leicht abweichen und Daten inkonsistent hinterlassen.
 */
export async function deleteUserAccount(userId: number): Promise<void> {
  await prisma.volunteerShift.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.foodDonation.updateMany({ where: { userId }, data: { userId: null } });
  await prisma.userChild.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.pushSubscription.deleteMany({ where: { userId } });
  await prisma.webAuthnCredential.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}
