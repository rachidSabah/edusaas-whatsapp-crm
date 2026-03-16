import { getDbContext } from './db-context';

/**
 * Baileys Session Service
 * Manages WhatsApp connections via Baileys with Turso persistence
 */

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
  private static db = getDbContext();

  /**
   * Create or update a session
   */
  static async saveSession(
    phoneNumber: string,
    sessionData: string,
    qrCode?: string
  ): Promise<BaileysSession> {
    const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
    const now = new Date().toISOString();

    try {
      const existing = await this.getSession(phoneNumber);

      if (existing) {
        // Update existing session
        await this.db.execute(
          `UPDATE baileys_sessions 
           SET sessionData = ?, qrCode = ?, status = ?, updatedAt = ?
           WHERE id = ?`,
          [sessionData, qrCode || existing.qrCode, 'connected', now, id]
        );
      } else {
        // Create new session
        await this.db.execute(
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
    try {
      const result = await this.db.query<BaileysSession>(
        `SELECT * FROM baileys_sessions WHERE phoneNumber = ?`,
        [phoneNumber]
      );

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting Baileys session:', error);
      return null;
    }
  }

  /**
   * Get all active sessions
   */
  static async getAllSessions(): Promise<BaileysSession[]> {
    try {
      const result = await this.db.query<BaileysSession>(
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
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await this.db.execute(
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
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await this.db.execute(
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
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await this.db.execute(
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
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await this.db.execute(
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
    try {
      const id = `baileys_${phoneNumber.replace(/\D/g, '')}`;
      await this.db.execute(
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
