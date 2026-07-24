import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getDeleteImpact = async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const numId = Number(id);
    
    if (isNaN(numId)) {
      return res.status(400).json({ message: 'Ungültige ID' });
    }

    const impact: string[] = [];

    switch (type) {
      case 'yearGroup': {
        const teams = await prisma.team.count({ where: { yearGroupId: numId } });
        const matches = await prisma.match.count({ where: { yearGroupId: numId } });
        const groups = await prisma.group.count({ where: { yearGroupId: numId } });
        const foodSlots = await prisma.foodDonationSlot.count({ where: { yearGroupId: numId } });
        const timeSlots = await prisma.timeSlot.count({ where: { yearGroupId: numId } });
        const fields = await prisma.field.count({ where: { yearGroupId: numId } });
        const brackets = await prisma.knockoutBracket.count({ where: { yearGroupId: numId } });

        if (teams > 0) impact.push(`${teams} Team(s)`);
        if (matches > 0) impact.push(`${matches} Spiel(e)`);
        if (groups > 0) impact.push(`${groups} Gruppe(n)`);
        if (foodSlots > 0) impact.push(`${foodSlots} Verpflegungs-Slot(s)`);
        if (timeSlots > 0) impact.push(`${timeSlots} Zeitslot(s)`);
        if (fields > 0) impact.push(`${fields} Spielfeld(er)`);
        if (brackets > 0) impact.push(`${brackets} K.O.-Runde(n)`);
        break;
      }
      
      case 'foodCategory': {
        const items = await prisma.foodItem.count({ where: { categoryId: numId } });
        if (items > 0) impact.push(`${items} Artikel`);
        break;
      }

      case 'foodItem': {
        const slots = await prisma.foodDonationSlot.count({ where: { foodItemId: numId } });
        const donations = await prisma.foodDonation.count({ where: { foodItemId: numId } });
        if (slots > 0) impact.push(`${slots} Verpflegungs-Slot(s)`);
        if (donations > 0) impact.push(`${donations} getätigte Spende(n)`);
        break;
      }

      case 'volunteer': {
        const shifts = await prisma.volunteerShift.count({ where: { userId: numId } });
        const slots = await prisma.foodDonationSlot.count({ where: { userId: numId } });
        const donations = await prisma.foodDonation.count({ where: { userId: numId } });
        if (shifts > 0) impact.push(`${shifts} Helferschicht(en)`);
        if (slots > 0) impact.push(`${slots} übernommene Verpflegungs-Slot(s)`);
        if (donations > 0) impact.push(`${donations} getätigte Spende(n)`);
        break;
      }

      case 'timeSlot': {
        const shifts = await prisma.shift.count({ where: { zeitslotId: numId } });
        if (shifts > 0) impact.push(`${shifts} Helferschicht(en) (Struktur)`);
        break;
      }

      case 'workArea': {
        const shifts = await prisma.shift.count({ where: { arbeitsbereichId: numId } });
        if (shifts > 0) impact.push(`${shifts} Helferschicht(en) (Struktur)`);
        break;
      }

      case 'club': {
        const teams = await prisma.team.count({ where: { clubId: numId } });
        const tournaments = await prisma.tournamentClub.count({ where: { clubId: numId } });
        if (teams > 0) impact.push(`${teams} Team(s)`);
        if (tournaments > 0) impact.push(`Zugeordnet zu ${tournaments} Turnier(en)`);
        break;
      }

      case 'tournament': {
        const teams = await prisma.team.count({ where: { tournamentId: numId } });
        const matches = await prisma.match.count({ where: { tournamentId: numId } });
        const groups = await prisma.group.count({ where: { tournamentId: numId } });
        const shifts = await prisma.shift.count({ where: { tournamentId: numId } });
        const foodSlots = await prisma.foodDonationSlot.count({ where: { tournamentId: numId } });
        const materials = await prisma.materialItem.count({ where: { tournamentId: numId } });

        if (teams > 0) impact.push(`${teams} Team(s)`);
        if (matches > 0) impact.push(`${matches} Spiel(e)`);
        if (groups > 0) impact.push(`${groups} Gruppe(n)`);
        if (shifts > 0) impact.push(`${shifts} Helferschichten`);
        if (foodSlots > 0) impact.push(`${foodSlots} Verpflegungs-Slots`);
        if (materials > 0) impact.push(`${materials} Materialien`);
        break;
      }

      default:
        return res.status(400).json({ message: 'Unbekannter Typ' });
    }

    return res.json({ count: impact.length, details: impact });
  } catch (error) {
    console.error('Error fetching delete impact:', error);
    return res.status(500).json({ message: 'Fehler bei der Impact-Analyse', error });
  }
};
