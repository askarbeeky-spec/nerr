# RADIUS Stand Project

A complete project to run FreeRADIUS with PostgreSQL and a web admin panel in Docker on Windows.

## Project Structure

- `admin/`: Web interface (FastAPI) to manage users.
- `freeradius/`: Configuration for FreeRADIUS.
- `postgres/`: Database initialization script.
- `compose.yaml`: Docker Compose definition.

## Prerequisites

- Docker Desktop for Windows installed.
- PowerShell or CMP/Bash.

## Quick Start

1. Open PowerShell in this directory.
2. Run:
   ```powershell
   docker compose up -d --build
   ```
3. Open your browser to [http://localhost:8080](http://localhost:8080).
   - Login: `test` / `123` (already created).
   - Use the web interface to add users or MAC addresses.

## MikroTik RouterOS Configuration

Run these commands on your MikroTik to connect to this RADIUS server (Laptop IP 192.168.88.253):

```mikrotik
# 1. Add RADIUS Server
/radius add service=hotspot address=192.168.88.253 secret=radius123 authentication-port=1812 accounting-port=1813

# 2. Configure Hotspot Profile
/ip hotspot profile set [find name="hsprof1"] use-radius=yes login-by=http-pap,mac

# Note: Replace "hsprof1" with your actual hotspot profile name (default often "default" or "hsprof1").
# To see profiles: /ip hotspot profile print

# 3. Enable Logging for Debugging
/system logging add topics=radius,debug action=memory

# 4. Test Connectivity
/tool ping 192.168.88.253 count=4
```

## How It Works

1. **MikroTik** sends an Access-Request to **FreeRADIUS** (UDP 1812).
2. **FreeRADIUS** checks the **PostgreSQL** database.
   - If username/password matches -> `Access-Accept`.
   - If user has a `mac` set, it verifies `Calling-Station-Id` matches.
   - If `rate_limit` is set, it returns `Mikrotik-Rate-Limit` attribute.
3. **App Admin** writes to the same PostgreSQL database.

## Troubleshooting

- **Logs**:
  ```powershell
  docker compose logs -f freeradius
  ```
  You will see full debug output (`-X` mode).
- **Database**:
  To clean the DB volume:
  ```powershell
  docker compose down -v
  docker compose up -d
  ```
