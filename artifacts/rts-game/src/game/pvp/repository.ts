import type { PvpBattleRecord, PvpDbData, PvpProfile } from './types';

/**
 * 対戦データの保存先を抽象化したインターフェース。
 * いまは localStorage を使う「仮想DB」だけ実装している。
 * Supabase に切り替えるときは、このインターフェースを満たすクラスを
 * 1つ書いて `pvpRepo` に差し替えるだけでよい(ゲーム側のコードは触らない)。
 */
export interface PvpRepository {
  listProfiles(): Promise<PvpProfile[]>;
  getProfile(id: string): Promise<PvpProfile | null>;
  upsertProfile(profile: PvpProfile): Promise<void>;
  upsertProfiles(profiles: PvpProfile[]): Promise<void>;
  removeProfile(id: string): Promise<void>;
  appendLog(record: PvpBattleRecord): Promise<void>;
  listLog(limit?: number): Promise<PvpBattleRecord[]>;
}

const STORAGE_KEY = 'citywars_pvp_db_v1';
const MAX_LOG = 100;

function emptyDb(): PvpDbData {
  return { version: 1, profiles: [], log: [] };
}

function readDb(): PvpDbData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDb();
    const data = JSON.parse(raw) as PvpDbData;
    if (data?.version !== 1 || !Array.isArray(data.profiles) || !Array.isArray(data.log)) {
      return emptyDb();
    }
    return data;
  } catch {
    return emptyDb();
  }
}

function writeDb(db: PvpDbData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 容量オーバーなどは無視(対戦自体は続行できる)
  }
}

/** localStorage 上の仮想DB。API は Supabase と同じく非同期にしてある。 */
export class LocalPvpRepository implements PvpRepository {
  async listProfiles() {
    return readDb().profiles;
  }

  async getProfile(id: string) {
    return readDb().profiles.find((p) => p.id === id) ?? null;
  }

  async upsertProfile(profile: PvpProfile) {
    await this.upsertProfiles([profile]);
  }

  async upsertProfiles(profiles: PvpProfile[]) {
    const db = readDb();
    for (const profile of profiles) {
      const idx = db.profiles.findIndex((p) => p.id === profile.id);
      if (idx >= 0) db.profiles[idx] = profile;
      else db.profiles.push(profile);
    }
    writeDb(db);
  }

  async removeProfile(id: string) {
    const db = readDb();
    db.profiles = db.profiles.filter((p) => p.id !== id);
    writeDb(db);
  }

  async appendLog(record: PvpBattleRecord) {
    const db = readDb();
    db.log.unshift(record);
    db.log = db.log.slice(0, MAX_LOG);
    writeDb(db);
  }

  async listLog(limit = 10) {
    return readDb().log.slice(0, limit);
  }
}

/** ゲーム全体で使うリポジトリ。Supabase版を作ったらここを差し替える。 */
export const pvpRepo: PvpRepository = new LocalPvpRepository();
