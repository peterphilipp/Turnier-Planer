import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import * as auth from './auth.cjs';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===================== TURNIER-Endpoints =====================
app.get('/api/tournaments', async (_, res) => {
  try {
    const ts = await prisma.tournament.findMany({ orderBy: { startDate: 'desc' }, include: { club: true } });
    return res.json(ts || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Turniere fehlgeschlagen' });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const t = await prisma.tournament.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { club: true, groups: { include: { teams: true } }, matches: true, shifts: true, volunteerShifts: true }
    });
    return res.json(t || null);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Turnier fehlgeschlagen' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  try {
    const body = req.body;
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    const t = await prisma.tournament.create({ data: body });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Turnier konnte nicht erstellt werden' });
  }
});

app.patch('/api/tournaments/:id', async (req, res) => {
  try {
    const body = req.body;
    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);
    const t = await prisma.tournament.update({
      where: { id: parseInt(req.params.id) },
      data: body
    });
    return res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Turnier konnte nicht aktualisiert werden' });
  }
});

app.patch('/api/tournaments/:id/status', async (req, res) => {
  try {
    const t = await prisma.tournament.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status }
    });
    return res.json(t);
  } catch (err) {
    res.status(500).json({ error: 'Status konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/tournaments/:id', async (req, res) => {
  try {
    await prisma.tournament.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Turnier konnte nicht gelöscht werden' });
  }
});

// ===================== GRUPPEN-Endpoints =====================
app.get('/api/groups/:tournamentId', async (req, res) => {
  try {
    const gs = await prisma.group.findMany({
      where: { tournamentId: parseInt(req.params.tournamentId) },
      include: { teams: true }
    });
    return res.json(gs || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gruppen fehlgeschlagen' });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const g = await prisma.group.create({ data: req.body });
    res.status(201).json(g);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gruppe konnte nicht erstellt werden' });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    await prisma.group.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Gruppe konnte nicht gelöscht werden' });
  }
});

// ===================== TEAM-Endpoints =====================
app.post('/api/teams', async (req, res) => {
  try {
    const t = await prisma.team.create({ data: req.body });
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Team konnte nicht erstellt werden' });
  }
});

app.patch('/api/teams/:id', async (req, res) => {
  try {
    const t = await prisma.team.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    return res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Team konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Team konnte nicht gelöscht werden' });
  }
});

// ===================== SPIEL-Endpoints =====================
app.get('/api/matches/:tournamentId', async (req, res) => {
  try {
    if (!req.params.tournamentId) return res.json([]);
    const ms = await prisma.match.findMany({
      where: { tournamentId: parseInt(req.params.tournamentId) },
      include: { teamA: true, teamB: true }
    });
    return res.json(ms || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Spiele fehlgeschlagen' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const m = await prisma.match.create({ data: req.body });
    res.status(201).json(m);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Spiel konnte nicht erstellt werden' });
  }
});

app.patch('/api/matches/:id', async (req, res) => {
  try {
    const m = await prisma.match.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    return res.json(m);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Spiel konnte nicht aktualisiert werden' });
  }
});

// ===================== HELFER-Endpoints =====================
app.get('/api/volunteers', async (_, res) => {
  try {
    const vs = await prisma.volunteer.findMany();
    return res.json(vs?.map(v => ({ ...v, roles: typeof v.roles === 'string' ? JSON.parse(v.roles) : [] })) || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Helfer fehlgeschlagen' });
  }
});

app.post('/api/volunteers', async (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body.roles)) body.roles = JSON.stringify(body.roles);
    else body.roles = '["Helfer"]';
    const v = await prisma.volunteer.create({ data: { name: body.name, email: body.email || null, phone: body.phone || null, roles: body.roles } });
    return res.status(201).json(v);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Helfer konnte nicht erstellt werden' });
  }
});

app.patch('/api/volunteers/:id', async (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body.roles)) body.roles = JSON.stringify(body.roles);
    const v = await prisma.volunteer.update({ where: { id: parseInt(req.params.id) }, data: { name: body.name, email: body.email || null, phone: body.phone || null, roles: body.roles } });
    return res.json(v);
  } catch (err) {
    console.error('PATCH /api/volunteers/:id:', err.message);
    res.status(500).json({ error: err.message || 'Helfer konnte nicht aktualisiert werden' });
  }
});

app.patch('/api/volunteers/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Kein Passwort angegeben' });
    const hashed = await auth.hashPassword(password);
    await prisma.volunteer.update({ where: { id: parseInt(req.params.id) }, data: { password: hashed } });
    return res.json({ message: 'Passwort zurückgesetzt' });
  } catch (err) {
    console.error('PATCH /api/volunteers/:id/password:', err.message);
    res.status(500).json({ error: 'Passwort-Rücksetzung fehlgeschlagen' });
  }
});

app.delete('/api/volunteers/:id', async (req, res) => {
  try {
    await prisma.volunteerShift.deleteMany({ where: { volunteerId: parseInt(req.params.id) } });
    await prisma.volunteer.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Helfer konnte nicht gelöscht werden' });
  }
});

// ===================== HELFER-REGISTRIERUNG =====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, Email und Passwort sind erforderlich' });
    }
    
    // Prüfen ob Email schon existiert
    const existing = await prisma.volunteer.findFirst({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email bereits registriert' });
    }
    
    const hashed = await auth.hashPassword(password);
    
    // Aktives Turnier finden
    const activeTournament = await prisma.tournament.findFirst({ where: { status: 'aktiv' } });
    
    const volunteer = await prisma.volunteer.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashed,
        roles: JSON.stringify(['Helfer']),
        tournamentId: activeTournament?.id || null,
      },
    });
    
    const token = auth.generateToken(volunteer.id);
    return res.status(201).json({ 
      token, 
      volunteer: { id: volunteer.id, name: volunteer.name, email: volunteer.email, phone: volunteer.phone } 
    });
  } catch (err) {
    console.error('POST /api/auth/register:', err.message);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// ===================== HELFER-LOGIN =====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password: password ? '***' : 'NONE' });
    const volunteer = await prisma.volunteer.findFirst({ where: { email } });
    console.log('Found:', volunteer ? volunteer.name : 'NOT FOUND', 'pwd:', volunteer?.password ? 'HAS' : 'NONE');
    if (!volunteer || !volunteer.password) {
      return res.status(401).json({ error: 'Falsche Email oder kein Passwort gesetzt' });
    }
    const match = await auth.verifyPassword(password, volunteer.password);
    console.log('Password match:', match);
    if (!match) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }
    const token = auth.generateToken(volunteer.id);
    return res.json({ token, volunteer: { id: volunteer.id, name: volunteer.name, email: volunteer.email, phone: volunteer.phone, tournamentId: volunteer.tournamentId } });
  } catch (err) {
    console.error('POST /api/auth/login:', err.message, err.stack);
    res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

// ===================== PASSWORT ZURÜCKSETZEN =====================
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const volunteer = await prisma.volunteer.findFirst({ where: { email } });
    if (!volunteer) {
      return res.status(404).json({ error: 'Email nicht gefunden' });
    }
    const newPassword = 'TempPasswort123!';
    const hashed = await auth.hashPassword(newPassword);
    await prisma.volunteer.update({ where: { id: volunteer.id }, data: { password: hashed } });
    return res.json({ message: 'Passwort zurückgesetzt. Temporäres Passwort: TempPasswort123!', email: volunteer.email });
  } catch (err) {
    console.error('POST /api/auth/forgot-password:', err.message);
    res.status(500).json({ error: 'Passwort-Rücksetzung fehlgeschlagen' });
  }
});

// ===================== PASSWORT ÄNDERN =====================
app.patch('/api/auth/password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = auth.verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Nicht angemeldet' });
    
    const { currentPassword, newPassword } = req.body;
    const volunteer = await prisma.volunteer.findUnique({ where: { id: decoded.volunteerId } });
    if (!volunteer || !volunteer.password) {
      return res.status(401).json({ error: 'Kein Passwort gesetzt' });
    }
    const match = await auth.verifyPassword(currentPassword, volunteer.password);
    if (!match) return res.status(401).json({ error: 'Aktuelles Passwort falsch' });
    
    const hashed = await auth.hashPassword(newPassword);
    await prisma.volunteer.update({ where: { id: decoded.volunteerId }, data: { password: hashed } });
    return res.json({ message: 'Passwort geändert!' });
  } catch (err) {
    console.error('PATCH /api/auth/password:', err.message);
    res.status(500).json({ error: 'Passwort-Änderung fehlgeschlagen' });
  }
});

// ===================== STAMMDATEN: ARBEITSBEREICHE =====================
app.get('/api/arbeitsbereiche', async (_, res) => {
  try {
    const areas = await prisma.arbeitsbereich.findMany({ orderBy: { id: 'asc' } });
    return res.json(areas || []);
  } catch (err) {
    res.status(500).json({ error: 'Arbeitsbereiche konnten nicht geladen werden' });
  }
});

app.post('/api/arbeitsbereiche', async (req, res) => {
  try {
    const a = await prisma.arbeitsbereich.create({ data: req.body });
    return res.status(201).json(a);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Arbeitsbereich konnte nicht erstellt werden' });
  }
});

app.patch('/api/arbeitsbereiche/:id', async (req, res) => {
  try {
    const body = req.body;
    const a = await prisma.arbeitsbereich.update({
      where: { id: parseInt(req.params.id) },
      data: body
    });
    return res.json(a);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Arbeitsbereich nicht gefunden' });
    res.status(500).json({ error: err.message || 'Arbeitsbereich konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/arbeitsbereiche/:id', async (req, res) => {
  try {
    const usedShifts = await prisma.shift.findMany({
      where: { arbeitsbereichId: parseInt(req.params.id) },
      include: { tournament: true }
    });
    const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
    if (activeShifts.length > 0) {
      return res.status(409).json({
        error: 'Arbeitsbereich wird noch in einem aktiven Turnier verwendet.',
        activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
      });
    }
    if (usedShifts.length > 0) {
      return res.status(409).json({
        error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Bereich.'
      });
    }
    await prisma.arbeitsbereich.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Arbeitsbereich nicht gefunden' });
    res.status(500).json({ error: err.message || 'Arbeitsbereich konnte nicht gelöscht werden' });
  }
});

// ===================== STAMMDATEN: ZEITSLOTS =====================
app.get('/api/zeit-slots', async (_, res) => {
  try {
    const slots = await prisma.zeitslot.findMany({ orderBy: { order: 'asc' } });
    return res.json(slots || []);
  } catch (err) {
    res.status(500).json({ error: 'Zeitslots konnten nicht geladen werden' });
  }
});

app.post('/api/zeit-slots', async (req, res) => {
  try {
    const s = await prisma.zeitslot.create({ data: req.body });
    return res.status(201).json(s);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Zeitslot konnte nicht erstellt werden' });
  }
});

app.patch('/api/zeit-slots/:id', async (req, res) => {
  try {
    const body = req.body;
    const usedShifts = await prisma.shift.findMany({
      where: { zeitslotId: parseInt(req.params.id) }
    });
    if (usedShifts.length > 0) {
      return res.status(409).json({
        error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot und können nicht geändert werden.'
      });
    }
    const s = await prisma.zeitslot.update({
      where: { id: parseInt(req.params.id) },
      data: body
    });
    return res.json(s);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Zeitslot nicht gefunden' });
    res.status(500).json({ error: err.message || 'Zeitslot konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/zeit-slots/:id', async (req, res) => {
  try {
    const usedShifts = await prisma.shift.findMany({
      where: { zeitslotId: parseInt(req.params.id) },
      include: { tournament: true }
    });
    const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
    if (activeShifts.length > 0) {
      return res.status(409).json({
        error: 'Zeitslot wird noch in einem aktiven Turnier verwendet und kann nicht gelöscht werden.',
        activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
      });
    }
    if (usedShifts.length > 0) {
      return res.status(409).json({
        error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot.'
      });
    }
    await prisma.zeitslot.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Zeitslot nicht gefunden' });
    res.status(500).json({ error: err.message || 'Zeitslot konnte nicht gelöscht werden' });
  }
});

// ===================== TURNIER-SCHICHTEN (Job-Slots) =====================
app.get('/api/shifts', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    if (tournamentId) {
      const shifts = await prisma.shift.findMany({
        where: { tournamentId: parseInt(tournamentId) },
        include: { zeitslot: true, arbeitsbereich: true },
        orderBy: { date: 'asc' }
      });
      return res.json(shifts || []);
    }
    return res.json([]);
  } catch (err) {
    console.error('Error in shifts GET:', err.message);
    res.status(500).json({ error: 'Schichten konnten nicht geladen werden' });
  }
});

app.post('/api/shifts', async (req, res) => {
  try {
    const body = req.body;
    const { tournamentId, date, zeitslotId, arbeitsbereichId, maxVolunteers, description, slot } = body;
    if (!tournamentId) throw new Error('tournamentId fehlt');
    if (!date) throw new Error('Datum fehlt');
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) throw new Error('Ungültiges Datum');
    const s = await prisma.shift.create({
      data: {
        tournamentId: parseInt(tournamentId),
        date: validDate.toISOString(),
        zeitslotId: zeitslotId ? parseInt(zeitslotId) : null,
        arbeitsbereichId: arbeitsbereichId ? parseInt(arbeitsbereichId) : null,
        maxVolunteers: maxVolunteers || 8,
        description: description || null,
        slot: slot || null,
      }
    });
    return res.status(201).json(s);
  } catch (err) {
    console.error('Error in /api/shifts POST:', err.message);
    res.status(500).json({ error: 'Schicht konnte nicht erstellt werden' });
  }
});

app.delete('/api/shifts/:id', async (req, res) => {
  try {
    await prisma.shift.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Schicht konnte nicht gelöscht werden' });
  }
});

app.patch('/api/shifts/:id', async (req, res) => {
  try {
    const body = req.body;
    const validDate = body.date ? new Date(body.date) : undefined;
    const updated = await prisma.shift.update({
      where: { id: parseInt(req.params.id) },
      data: {
        date: validDate ? validDate.toISOString() : undefined,
        zeitslotId: body.zeitslotId ? parseInt(body.zeitslotId) : null,
        arbeitsbereichId: body.arbeitsbereichId ? parseInt(body.arbeitsbereichId) : null,
        maxVolunteers: body.maxVolunteers || 8,
        description: body.description || null,
        slot: body.slot || null,
      }
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error in /api/shifts PATCH:', err.message);
    res.status(500).json({ error: 'Schicht konnte nicht aktualisiert werden' });
  }
});

// ===================== HELFER-SCHICHTEN (VolunteerShifts) =====================
app.get('/api/volunteer-shifts', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const where = tournamentId ? { tournamentId: parseInt(tournamentId) } : {};
    const shifts = await prisma.volunteerShift.findMany({
      where,
      orderBy: { date: 'asc' },
      include: { volunteer: true },
    });
    return res.json(shifts);
  } catch (err) {
    console.error('Error in /api/volunteer-shifts GET:', err.message);
    res.status(500).json({ error: 'Einsätze konnten nicht geladen werden' });
  }
});

app.post('/api/volunteer-shifts', async (req, res) => {
  try {
    const body = req.body;
    const { volunteerId, tournamentId, date, slot, role, areaId } = body;
    if (!volunteerId) throw new Error('volunteerId fehlt');
    if (!date) throw new Error('Datum fehlt');
    if (!slot) throw new Error('Slot fehlt');
    if (!role) throw new Error('Rolle fehlt');
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) throw new Error('Ungültiges Datum');
    const s = await prisma.volunteerShift.create({
      data: {
        volunteerId: parseInt(volunteerId),
        tournamentId: tournamentId ? parseInt(tournamentId) : null,
        date: validDate.toISOString(),
        slot, role,
        areaId: areaId !== null && areaId !== undefined ? String(areaId) : null,
      },
      include: { volunteer: true }
    });
    return res.status(201).json(s);
  } catch (err) {
    console.error('Error in /api/volunteer-shifts POST:', err.message);
    res.status(500).json({ error: 'Einsatz konnte nicht erstellt werden' });
  }
});

app.delete('/api/volunteer-shifts/:id', async (req, res) => {
  try {
    await prisma.volunteerShift.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Einsatz konnte nicht gelöscht werden' });
  }
});

// ===================== HELFER SELF-SERVICE =====================
app.get('/api/self/available', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'NONE');
    const decoded = auth.verifyToken(token);
    console.log('Decoded:', decoded);
    if (!decoded) return res.status(401).json({ error: 'Nicht angemeldet' });
    
    const volunteer = await prisma.volunteer.findUnique({ where: { id: decoded.volunteerId } });
    if (!volunteer) return res.status(404).json({ error: 'Helfer nicht gefunden' });
    
    console.log('Self-service volunteer:', volunteer.id, 'tournamentId:', volunteer.tournamentId);
    
    let shifts = [];
    if (volunteer.tournamentId) {
      shifts = await prisma.shift.findMany({
        where: { tournamentId: volunteer.tournamentId },
        include: { zeitslot: true, arbeitsbereich: true },
        orderBy: { date: 'asc' },
      });
    } else {
      shifts = await prisma.shift.findMany({
        include: { zeitslot: true, arbeitsbereich: true },
        orderBy: { date: 'asc' },
      });
    }
    
    const volunteerShifts = await prisma.volunteerShift.findMany({
      where: { volunteerId: decoded.volunteerId },
      include: { shift: { include: { zeitslot: true, arbeitsbereich: true } } },
    });
    
    console.log('Shifts found:', shifts.length, 'VolunteerShifts:', volunteerShifts.length);
    return res.json({ shifts, volunteerShifts });
  } catch (err) {
    console.error('GET /api/self/available:', err.message, err.stack);
    res.status(500).json({ error: 'Daten konnten nicht geladen werden' });
  }
});

app.post('/api/self/assign', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = auth.verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Nicht angemeldet' });
    
    const { shiftId, date } = req.body;
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return res.status(404).json({ error: 'Job-Slot nicht gefunden' });
    
    const slotName = shift.zeitslot ? `${shift.zeitslot.name} (${shift.zeitslot.startTime}–${shift.zeitslot.endTime})` : shift.slot || '–';
    const area = shift.arbeitsbereich;
    
    const existing = await prisma.volunteerShift.findFirst({
      where: {
        volunteerId: decoded.volunteerId,
        date: new Date(date),
        slot: slotName,
        areaId: shift.arbeitsbereichId ? String(shift.arbeitsbereichId) : null,
      },
    });
    if (existing) return res.status(400).json({ error: 'Bereits zugewiesen' });
    
    const vs = await prisma.volunteerShift.create({
      data: {
        volunteerId: decoded.volunteerId,
        tournamentId: shift.tournamentId,
        shiftId: shift.id,
        date: new Date(date),
        slot: slotName,
        role: area ? `${area.name} Schicht` : 'Schicht',
        areaId: shift.arbeitsbereichId ? String(shift.arbeitsbereichId) : null,
      },
      include: { volunteer: true },
    });
    return res.json(vs);
  } catch (err) {
    console.error('POST /api/self/assign:', err.message);
    res.status(500).json({ error: 'Zuweisung fehlgeschlagen' });
  }
});

app.delete('/api/self/unassign/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = auth.verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Nicht angemeldet' });
    
    const vs = await prisma.volunteerShift.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!vs || vs.volunteerId !== decoded.volunteerId) return res.status(403).json({ error: 'Nicht berechtigt' });
    
    await prisma.volunteerShift.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/self/unassign/:id:', err.message);
    res.status(500).json({ error: 'Abmeldung fehlgeschlagen' });
  }
});

app.patch('/api/volunteer-shifts/:id', async (req, res) => {
  try {
    const body = req.body;
    const { slot, role, volunteerId, areaId, date } = body;
    const validDate = date ? new Date(date) : undefined;
    const updated = await prisma.volunteerShift.update({
      where: { id: parseInt(req.params.id) },
      data: {
        slot: slot || body.slot,
        role: role || body.role,
        volunteerId: volunteerId ? parseInt(volunteerId) : body.volunteerId,
        areaId: (areaId !== null && areaId !== undefined ? String(areaId) : body.areaId) || null,
        date: validDate ? validDate.toISOString() : undefined,
      },
      include: { volunteer: true }
    });
    return res.json(updated);
  } catch (err) {
    console.error('Error in /api/volunteer-shifts PATCH:', err.message);
    res.status(500).json({ error: 'Einsatz konnte nicht aktualisiert werden' });
  }
});

// ===================== MATERIAL-ITEMS =====================
app.get('/api/material/:tournamentId', async (req, res) => {
  try {
    const items = await prisma.materialItem.findMany({
      where: { tournamentId: parseInt(req.params.tournamentId) },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(items || []);
  } catch (err) {
    res.status(500).json({ error: 'Material-Liste konnte nicht geladen werden' });
  }
});

app.post('/api/material', async (req, res) => {
  try {
    const item = await prisma.materialItem.create({ data: req.body });
    return res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Material-Item konnte nicht erstellt werden' });
  }
});

app.patch('/api/material/:id', async (req, res) => {
  try {
    const item = await prisma.materialItem.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    return res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Material-Item konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/material/:id', async (req, res) => {
  try {
    await prisma.materialItem.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Material-Item konnte nicht gelöscht werden' });
  }
});

// ===================== CLUB-Endpoints =====================
app.get('/api/clubs', async (_, res) => {
  try {
    const clubs = await prisma.club.findMany({ orderBy: { name: 'asc' } });
    return res.json(clubs || []);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Clubs fehlgeschlagen' });
  }
});

app.post('/api/clubs', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.logo) console.log('Logo stored:', data.logo.length, 'bytes');
    const club = await prisma.club.create({ data });
    return res.status(201).json(club);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Club konnte nicht erstellt werden' });
  }
});

app.put('/api/clubs/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.logo) console.log('Logo updated:', data.logo.length, 'bytes');
    const club = await prisma.club.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    return res.json(club);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Club konnte nicht aktualisiert werden' });
  }
});

app.delete('/api/clubs/:id', async (req, res) => {
  try {
    await prisma.club.delete({ where: { id: parseInt(req.params.id) } });
    return res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Club konnte nicht gelöscht werden' });
  }
});

// ===================== DATABASE-Health Check =====================
app.get('/api/health', async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'OK', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'ERR', db: 'disconnected', detail: err.message });
  }
});

// ===================== Server Start & DB-Verbindung =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('[OK] Backend läuft auf Port ' + PORT + ' & DB verbunden');
  } catch (connectionError) {
    console.error('[FATAL ERROR] Datenbankverbindung fehlgeschlagen:', connectionError.message);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('DB getrennt - Server gestoppt');
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
