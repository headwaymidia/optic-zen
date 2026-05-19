#!/bin/bash
# Backup semanal do Supabase via pg_dump
# Roda via crontab: 0 2 * * 0 (todo domingo às 2h)

set -e

BACKUP_DIR="/root/backups/supabase"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${DATE}.sql.gz"
KEEP_DAYS=30

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# String de conexão — usar conexão direta (não pooler)
DB_URL="postgresql://postgres:headwaymidiacrm@db.fxcgvlukzjmwzpzuvzcp.supabase.co:5432/postgres"

echo "[$(date)] Iniciando backup..."

# Executar pg_dump comprimido
pg_dump "$DB_URL" \
  --no-owner \
  --no-acl \
  --schema=public \
  | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date)] Backup concluído: $FILENAME ($SIZE)"

# Remover backups mais antigos que KEEP_DAYS dias
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Backups antigos removidos (retenção: ${KEEP_DAYS} dias)"

# Listar backups disponíveis
echo "[$(date)] Backups disponíveis:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "  Nenhum"
