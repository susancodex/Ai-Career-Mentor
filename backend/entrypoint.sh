#!/bin/sh
set -e

echo "Waiting for postgres..."
until python -c "import psycopg2; psycopg2.connect('${DATABASE_URL}')" 2>/dev/null; do
  sleep 1
done
echo "Postgres ready."

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
