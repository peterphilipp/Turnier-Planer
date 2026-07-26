import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Exportiert die SQLite-Datenbank als Base64-encoded string.
 * Der Client kann dies herunterladen oder in eine neue DB importieren.
 */
export const dumpDatabase = async (req: Request, res: Response) => {
  try {
    // Pfad zur SQLite-DB aus der Prisma config lesen
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const dbUrlMatch = schemaContent.match(/url\s*=\s*"file:(.+?)"/);
    
    if (!dbUrlMatch) {
      return res.status(500).json({ error: 'Konnte Datenbank-Pfad nicht aus schema.prisma lesen' });
    }

    const dbPath = path.resolve(__dirname, `../../prisma/${dbUrlMatch[1]}`);
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Datenbank-Datei nicht gefunden' });
    }

    // DB als Base64 encoden (für sicheren Transfer)
    const dbBuffer = fs.readFileSync(dbPath);
    const base64Data = dbBuffer.toString('base64');

    res.json({
      success: true,
      databaseSize: dbBuffer.length,
      timestamp: new Date().toISOString(),
      // Base64-encoded SQLite DB - kann vom Client gespeichert werden
      database: base64Data
    });
  } catch (error) {
    console.error('[DB DUMP ERROR]', error);
    res.status(500).json({ error: 'Fehler beim Exportieren der Datenbank' });
  }
};

/**
 * Importiert eine Base64-encoded SQLite-Datenbank.
 * Überschreibt die aktuelle DB nach Backup.
 */
export const importDatabase = async (req: Request, res: Response) => {
  try {
    const { database } = req.body;
    
    if (!database || typeof database !== 'string') {
      return res.status(400).json({ error: 'Base64-encoded Datenbank erforderlich' });
    }

    // Pfad zur SQLite-DB aus der Prisma config lesen
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const dbUrlMatch = schemaContent.match(/url\s*=\s*"file:(.+?)"/);
    
    if (!dbUrlMatch) {
      return res.status(500).json({ error: 'Konnte Datenbank-Pfad nicht aus schema.prisma lesen' });
    }

    const dbPath = path.resolve(__dirname, `../../prisma/${dbUrlMatch[1]}`);
    const dbDir = path.dirname(dbPath);

    // Backup der aktuellen DB erstellen
    const backupPath = path.join(dbDir, `backup-${Date.now()}.db`);
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // Base64 dekodieren und schreiben
    const dbBuffer = Buffer.from(database, 'base64');
    fs.writeFileSync(dbPath, dbBuffer);

    // DB-Verbindung neu aufbauen (Prisma)
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Datenbank erfolgreich importiert',
      databaseSize: dbBuffer.length,
      backupPath: backupPath.replace(process.cwd(), '') // Relativer Pfad für Logs
    });
  } catch (error) {
    console.error('[DB IMPORT ERROR]', error);
    res.status(500).json({ error: 'Fehler beim Importieren der Datenbank' });
  }
};
