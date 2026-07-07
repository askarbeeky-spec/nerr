# 🔐 Ошибка доступа к PostgreSQL (pg_hba.conf)

Мы успешно достучались до PostgreSQL на порту **5432**! 🎉
Но база данных отвергла подключение с ошибкой:
`no pg_hba.conf entry for host "10.250.60.73", user "postgres", database "skybeer_wifi"`

Это значит, что сервер PostgreSQL работает, но его защитные настройки запрещают подключаться с этого IP.

## 🛠️ Как исправить (это нужно сделать на Windows)

### 1. Найдите файл `pg_hba.conf`
Обычно он лежит здесь:
- `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`
- или `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
(Версия может отличаться).

### 2. Отредактируйте файл
1. Откройте Блокнот **от имени Администратора**.
2. В Блокноте откройте файл `pg_hba.conf`.
3. Прокрутите в самый низ.
4. Добавьте эту строку в конец файла:

```text
host    all             all             0.0.0.0/0               scram-sha-256
```
*(Если `scram-sha-256` не сработает, попробуйте `md5` или `trust` - но `trust` небезопасно)*

Эта строка разрешает подключение:
- Тип: `host` (tcp/ip)
- База: `all` (любая)
- Пользователь: `all` (любой)
- Откуда: `0.0.0.0/0` (с любого IP адреса)
- Метод: `scram-sha-256` (пароль)

### 3. Перезагрузите PostgreSQL
Откройте PowerShell от администратора и выполните:
```powershell
net stop postgresql-x64-16
net start postgresql-x64-16
```
*(Замените `16` на вашу версию PostgreSQL, если она другая. Или просто перезагрузите компьютер)*.

### 4. Проверьте FreeRADIUS
После перезагрузки PostgreSQL выполните в папке radius:
```powershell
docker compose restart radius-server
docker logs -f radius-server
```

Должно заработать! 🚀
