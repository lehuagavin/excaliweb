#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting ExcaliWeb with PUID=$PUID PGID=$PGID"

# Ensure data directory exists and set ownership using numeric IDs
# (avoids conflicts with existing users like 'node' in the base image)
mkdir -p /app/data
chown -R "$PUID:$PGID" /app/data

# Update supervisord backend command to use numeric UID:GID
sed -i "s|su-exec [^ ]*|su-exec $PUID:$PGID|g" /etc/supervisord.conf

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisord.conf
