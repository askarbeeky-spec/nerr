# ✅ Подключение к внешней базе skybeer_wifi - ИНСТРУКЦИЯ

## 📋 Что сделано:

1. ✅ Обновлен файл `.env` для подключения к базе **skybeer_wifi**
2. ✅ Обновлен `compose.yaml` (удален внутренний postgres)
3. ✅ Контейнеры перезапущены

---

## 🔧 Что нужно сделать СЕЙЧАС:

### ⚠️ ВАЖНО: Проверить таблицы в базе skybeer_wifi

**Откройте вашу программу для работы с PostgreSQL:**
- pgAdmin
- DBeaver  
- или другой клиент

**Подключитесь к базе:**
- Хост: localhost
- Порт: 5050
- База: **skybeer_wifi**
- Пользователь: postgres
- Пароль: 07042005

---

### Шаг 1: Проверьте существующие таблицы

Выполните SQL:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'rad%';
```

**Ожидается:**
- radcheck
- radreply
- radgroupcheck
- radgroupreply
- radusergroup
- radacct
- radpostauth
- nas

---

### Шаг 2: Если таблиц НЕТ - создайте их

Откройте файл: `check-and-create-tables.sql`

**Раскомментируйте** весь блок (уберите `/*` и `*/`) и выполните весь SQL.

Это создаст:
- ✅ Все таблицы FreeRADIUS
- ✅ Тестового пользователя (testuser/testpass)
- ✅ NAS для MikroTik

---

### Шаг 3: Проверьте пользователей

```sql
SELECT * FROM radcheck;
SELECT * FROM nas;
```

Должны быть хотя бы тестовые данные.

---

## 🧪 Тестирование

После создания таблиц проверьте работу:

```powershell
# В папке radius
docker exec radius-server radclient localhost auth testing123 <<< "User-Name=testuser,User-Password=testpass"
```

**Ожидается:** `Received Access-Accept`

---

## 🌐 Веб-панель

После создания таблиц откройте:

**URL:** http://localhost:8080

Здесь можно управлять пользователями через браузер!

---

## 📊 Проверка подключения к базе

Проверить логи админ-панели:

```powershell
docker logs radius-admin
```

Если есть ошибки подключения к базе - проверьте:
1. PostgreSQL работает на порту 5050
2. База **skybeer_wifi** существует
3. Пользователь postgres имеет доступ

---

## 🔄 Если нужно перезапустить

```powershell
cd C:\Users\hante\Desktop\radius
docker compose restart
```

---

## ❓ Есть таблицы в базе skybeer_wifi?

Если да - система готова! ✅  
Если нет - выполните SQL из `check-and-create-tables.sql` 📝

**Следующий шаг:** Настройка MikroTik для подключения к RADIUS!
