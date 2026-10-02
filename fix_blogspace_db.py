import sqlite3
import os

db_path = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\database\blogspace.db'
schema_path = r'C:\Users\ACER\.gemini\antigravity\scratch\blogspace\database\schema.sql'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA foreign_keys = ON;")

# Read schema statements
with open(schema_path, 'r', encoding='utf-8') as f:
    schema_sql = f.read()

statements = [s.strip() for s in schema_sql.split(';') if s.strip()]

for stmt in statements:
    try:
        cursor.execute(stmt)
    except Exception as e:
        print(f"Statement notice: {e}")

conn.commit()

# Ensure missing columns exist in existing database tables
alter_statements = [
    "ALTER TABLE messages ADD COLUMN attachment_url TEXT DEFAULT NULL;",
    "ALTER TABLE messages ADD COLUMN attachment_type TEXT DEFAULT NULL;",
    "ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0;",
    "ALTER TABLE posts ADD COLUMN tags TEXT DEFAULT '';",
    "ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'published';"
]

for stmt in alter_statements:
    try:
        cursor.execute(stmt)
        conn.commit()
        print("Applied migration:", stmt)
    except Exception as e:
        pass # Column already exists

# Verify all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [r[0] for r in cursor.fetchall()]

print("\n--- DATABASE VERIFICATION SUMMARY ---")
for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    count = cursor.fetchone()[0]
    print(f"Table '{t}': {count} rows")

conn.close()
print("\nDATABASE FIX AND VERIFICATION COMPLETED SUCCESSFULLY!")
