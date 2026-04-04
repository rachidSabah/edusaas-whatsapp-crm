/**
 * Baileys Session Service
 * Manages WhatsApp connections via Baileys with Turso persistence
 */

import { getDbContext } from './db-context';

interface BaileysSession {
  id: string;
  phoneNumber: string;
  sessionData: string;
  qrCode: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export class BaileysSessionService {
  /**
   * Get database context lazily (only when needed)
   */
  private static getDb() {
    return getDbContext();
  }

  /**
   * Create or update a session
   */
  static async saveSession(
    phoneNumber: string,
    sessionData: string,
    qrCode?: string
  ): Promise<BaileysSession> {
    const db = this.getDb();
    const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
    const now = new Date().toISOString();

    try {
      const existing = await this.getSession(phoneNumber);

      if (existing) {
        // Update existing session
        await db.execute(
          `UPDATE baileys_sessions 
           SET sessionData = ?, qrCode = ?, status = ?, updatedAt = ?
           WHERE id = ?`,
          [sessionData, qrCode || existing.qrCode, 'connected', now, id]
        );
      } else {
        // Create new session
        await db.execute(
          `INSERT INTO baileys_sessions 
           (id, phoneNumber, sessionData, qrCode, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, phoneNumber, sessionData, qrCode || null, 'connected', now, now]
        );
      }

      return this.getSession(phoneNumber) as Promise<BaileysSession>;
    } catch (error) {
      console.error('Error saving Baileys session:', error);
      throw error;
    }
  }

  /**
   * Get a session by phone number
   */
  static async getSession(phoneNumber: string): Promise<BaileysSession | null> {
    const db = this.getDb();
    
    try {
      const result = await db.query<BaileysSession>(
        `SELECT * FROM baileys_sessions WHERE phoneNumber = ?`,
        [phoneNumber]
      );

      if (result.length > 0) {
        const session = result[0];
        
        // If QR code is missing in baileys_sessions, try to get it from organizations
        if (!session.qrCode) {
          const orgResult = await db.query<{ whatsappQRCode: string }>(
            `SELECT whatsappQRCode FROM organizations WHERE id = ?`,
            [phoneNumber]
          );
          if (orgResult.length > 0 && orgResult[0].whatsappQRCode) {
            session.qrCode = orgResult[0].whatsappQRCode;
          }
        }
        
        return session;
      }

      // If no session in baileys_sessions, check if we have a QR code in organizations
      const orgResult = await db.query<{ whatsappQRCode: string }>(
        `SELECT whatsappQRCode FROM organizations WHERE id = ?`,
        [phoneNumber]
      );
      
      if (orgResult.length > 0 && orgResult[0].whatsappQRCode) {
        return {
          id: `baileys_${phoneNumber}`,
          phoneNumber,
          sessionData: '{}',
          qrCode: orgResult[0].whatsappQRCode,
          status: 'connecting',
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as BaileysSession;
      }

      return null;
    } catch (error) {
      console.error('Error getting Baileys session:', error);
      return null;
    }
  }

  /**
   * Get all active sessions
   */
  static async getAllSessions(): Promise<BaileysSession[]> {
    const db = this.getDb();
    
    try {
      const result = await db.query<BaileysSession>(
        `SELECT * FROM baileys_sessions WHERE status = 'connected' ORDER BY lastActivity DESC`
      );
      return result;
    } catch (error) {
      console.error('Error getting all Baileys sessions:', error);
      return [];
    }
  }

  /**
   * Update QR code for a session
   */
  static async updateQRCode(phoneNumber: string, qrCode: string): Promise<void> {
    const db = this.getDb();
    
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await db.execute(
        `UPDATE baileys_sessions SET qrCode = ?, updatedAt = ? WHERE id = ?`,
        [qrCode, new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error updating QR code:', error);
      throw error;
    }
  }

  /**
   * Update session status
   */
  static async updateStatus(
    phoneNumber: string,
    status: 'connected' | 'disconnected' | 'connecting'
  ): Promise<void> {
    const db = this.getDb();
    
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await db.execute(
        `UPDATE baileys_sessions SET status = ?, updatedAt = ? WHERE id = ?`,
        [status, new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  /**
   * Update last activity timestamp
   */
  static async updateLastActivity(phoneNumber: string): Promise<void> {
    const db = this.getDb();
    
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await db.execute(
        `UPDATE baileys_sessions SET lastActivity = ? WHERE id = ?`,
        [new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  /**
   * Delete a session
   */
  static async deleteSession(phoneNumber: string): Promise<void> {
    const db = this.getDb();
    
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await db.execute(
        `DELETE FROM baileys_sessions WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error('Error deleting Baileys session:', error);
      throw error;
    }
  }

  /**
   * Disconnect a session (mark as disconnected)
   */
  static async disconnectSession(phoneNumber: string): Promise<void> {
    const db = this.getDb();
    
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await db.execute(
        `UPDATE baileys_sessions SET status = 'disconnected', updatedAt = ? WHERE id = ?`,
        [new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error disconnecting session:', error);
      throw error;
    }
  }

  /**
   * Get session data (parsed)
   */
  static async getSessionData(phoneNumber: string): Promise<any | null> {
    try {
      const session = await this.getSession(phoneNumber);
      if (!session || !session.sessionData) return null;

      return JSON.parse(session.sessionData);
    } catch (error) {
      console.error('Error parsing session data:', error);
      return null;
    }
  }
}
