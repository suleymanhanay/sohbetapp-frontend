const initSqlJs = require("sql.js");
const bcrypt = require("bcryptjs");
let db;

async function initDB() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  const tables = [
    `CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, displayName TEXT, avatar TEXT, bio TEXT DEFAULT '', role TEXT DEFAULT 'user', status TEXT DEFAULT 'offline', lastSeen TEXT, isBlocked INTEGER DEFAULT 0, showOnline INTEGER DEFAULT 1, showLastSeen INTEGER DEFAULT 1, createdAt TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, senderId INTEGER, receiverId INTEGER, roomId TEXT, groupId INTEGER, content TEXT, type TEXT DEFAULT 'text', mediaData TEXT, fileName TEXT, replyToId INTEGER, forwardedFrom INTEGER, isRead INTEGER DEFAULT 0, readAt TEXT, isPinned INTEGER DEFAULT 0, deletedForAll INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE groups_table (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', avatar TEXT, createdBy INTEGER, createdAt TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE group_members (id INTEGER PRIMARY KEY AUTOINCREMENT, groupId INTEGER, userId INTEGER, role TEXT DEFAULT 'member', UNIQUE(groupId, userId))`,
    `CREATE TABLE stories (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, content TEXT, mediaData TEXT, type TEXT DEFAULT 'text', bgColor TEXT DEFAULT '#6C5CE7', viewCount INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), expiresAt TEXT)`,
    `CREATE TABLE story_views (id INTEGER PRIMARY KEY AUTOINCREMENT, storyId INTEGER, viewerId INTEGER, viewedAt TEXT DEFAULT (datetime('now')), UNIQUE(storyId, viewerId))`,
    `CREATE TABLE reactions (id INTEGER PRIMARY KEY AUTOINCREMENT, messageId INTEGER, userId INTEGER, emoji TEXT, UNIQUE(messageId, userId))`,
    `CREATE TABLE friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, friendId INTEGER, status TEXT DEFAULT 'pending', createdAt TEXT DEFAULT (datetime('now')), UNIQUE(userId, friendId))`,
    `CREATE TABLE blocked_users (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, blockedId INTEGER, UNIQUE(userId, blockedId))`
  ];
  tables.forEach(t => { try { db.run(t); } catch {} });

  const a = db.exec("SELECT id FROM users WHERE username='admin'");
  if (!a.length) {
    db.run("INSERT INTO users (username,password,displayName,role) VALUES (?,?,?,?)", ["admin", bcrypt.hashSync("admin123",10), "Admin", "admin"]);
  }
  console.log("[DB] Ready");
  return db;
}
function getDB() { return db; }
module.exports = { initDB, getDB };
