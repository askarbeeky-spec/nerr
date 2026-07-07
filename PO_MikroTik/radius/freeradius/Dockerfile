FROM freeradius/freeradius-server:latest

# Копируем наши исправленные конфиги
COPY clients.conf /etc/freeradius/clients.conf
COPY mods-enabled/sql /etc/freeradius/mods-enabled/sql
COPY sites-enabled/default /etc/freeradius/sites-enabled/default
COPY queries.conf /etc/freeradius/custom-queries.conf

# Права на конфиги
RUN chmod 640 /etc/freeradius/clients.conf || true

# ОТКЛЮЧАЕМ ненужные модули, которые вызывают ошибки при запуске
# inner-tunnel требует EAP, EAP требует сертификатов. Удаляем их для MVP.
RUN rm -f /etc/freeradius/sites-enabled/inner-tunnel && \
    rm -f /etc/freeradius/mods-enabled/eap && \
    rm -f /etc/freeradius/mods-enabled/sqlcounter || true

CMD ["freeradius", "-X"]
