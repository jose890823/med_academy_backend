# Testing del Sistema de Notificaciones

## 🧪 Endpoint de Testing

Hemos creado un endpoint especial para probar todas las notificaciones del sistema sin tener que pasar por todo el flujo real del POA.

**⚠️ IMPORTANTE:** Este endpoint solo está disponible para usuarios con rol `super_admin`.

## 📧 Emails de Prueba Configurados

- **Cliente**: josemx890823@gmail.com
- **Admin**: jose890823@gmail.com

## 🚀 Cómo Usar

### Opción 1: Probar TODAS las notificaciones (15 emails)

**Endpoint:**
```
POST http://localhost:3001/notifications/test/poa-lifecycle
```

**Headers:**
```
Authorization: Bearer <tu_token_de_super_admin>
Content-Type: application/json
```

**Body:**
```json
{
  "clientEmail": "josemx890823@gmail.com",
  "adminEmail": "jose890823@gmail.com"
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "15 notification events emitted. Check your emails at josemx890823@gmail.com and jose890823@gmail.com",
  "results": [
    { "event": "poa.created", "status": "emitted", "to": "jose890823@gmail.com" },
    { "event": "poa.submitted", "status": "emitted", "to": "josemx890823@gmail.com" },
    ...
  ],
  "note": "Emails may take a few seconds to arrive. Check spam folder if not received."
}
```

**Esto enviará:**

| # | Evento | Email A | Template |
|---|--------|---------|----------|
| 1 | POA Creado | Admin | poa-new-admin.hbs |
| 2 | POA Enviado | Cliente | poa-submitted.hbs |
| 3 | POA Asignado | Cliente | poa-assigned.hbs |
| 4 | POA En Revisión | Cliente | poa-in-review.hbs |
| 5 | POA Aprobado | Cliente | poa-approved.hbs |
| 6 | POA Rechazado | Cliente | poa-rejected.hbs |
| 7 | POA Notarizado | Cliente | poa-notarized.hbs |
| 8 | POA Activado | Cliente | poa-activated.hbs |
| 9 | POA Ejecutado | Cliente | poa-executed.hbs |
| 10 | POA Completado | Cliente | poa-completed.hbs |
| 11 | Documento Subido | Cliente + Admin | document-uploaded.hbs |
| 12 | Documento Aprobado | Cliente | document-approved.hbs |
| 13 | Documento Rechazado | Cliente | document-rejected.hbs |
| 14 | Mensaje Recibido (Cliente) | Cliente | message-received-client.hbs |
| 15 | Mensaje Recibido (Admin) | Admin | message-received-admin.hbs |

### Opción 2: Probar UNA notificación específica

**Endpoint:**
```
POST http://localhost:3001/notifications/test/single-event
```

**Body:**
```json
{
  "eventType": "poa.approved",
  "clientEmail": "josemx890823@gmail.com",
  "adminEmail": "jose890823@gmail.com"
}
```

**Eventos disponibles:**
- `poa.approved` - POA aprobado
- `poa.rejected` - POA rechazado
- `poa.submitted` - POA enviado
- `poa.assigned` - POA asignado
- `poa.created` - POA creado

## 🔧 Usando Postman/Insomnia

1. **Obtén tu token de super admin:**
   ```
   POST http://localhost:3001/auth/login
   Body: {
     "email": "tu-email-super-admin@example.com",
     "password": "tu-password"
   }
   ```

2. **Copia el `accessToken` de la respuesta**

3. **Llama al endpoint de testing:**
   - URL: `POST http://localhost:3001/notifications/test/poa-lifecycle`
   - Headers:
     - `Authorization: Bearer <tu-access-token>`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "clientEmail": "josemx890823@gmail.com",
       "adminEmail": "jose890823@gmail.com"
     }
     ```

4. **Revisa tus bandejas de entrada** (josemx890823@gmail.com y jose890823@gmail.com)

## 📝 Usando cURL

```bash
# Primero obtén el token
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-super-admin@example.com",
    "password": "tu-password"
  }' | jq -r '.data.accessToken')

# Luego ejecuta el test
curl -X POST http://localhost:3001/notifications/test/poa-lifecycle \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientEmail": "josemx890823@gmail.com",
    "adminEmail": "jose890823@gmail.com"
  }'
```

## ✅ Verificación

Después de ejecutar el endpoint, deberías:

1. **Ver en los logs del servidor:**
   ```
   [PoaEventListener] POA created: #TEST-POA-001
   [NotificationSenderService] Sending email to: jose890823@gmail.com
   [PoaEventListener] POA submitted: #TEST-POA-001
   [NotificationSenderService] Sending email to: josemx890823@gmail.com
   ...
   ```

2. **Recibir emails en ambas cuentas:**
   - josemx890823@gmail.com → Emails de cliente (12 emails)
   - jose890823@gmail.com → Emails de admin (4 emails)

3. **Revisar carpeta de SPAM** si no ves los emails en inbox

## 🎨 Templates Enviados

Todos los templates usan el layout base con:
- Logo de EchoMedDx
- Degradado morado (#667eea → #764ba2)
- Footer con información de contacto
- Diseño responsive

## 🐛 Troubleshooting

### No recibo emails

1. **Verifica la configuración de Resend:**
   ```bash
   # En .env debe estar:
   RESEND_API_KEY=re_UM96xnWb_7eZjr71p88hQ692i6Uun747o
   EMAIL_FROM=onboarding@resend.dev
   ```

2. **Verifica los logs:**
   ```
   [EmailService] ✅ EmailService configurado correctamente con Resend
   [NotificationSenderService] Sending email to: ...
   [EmailService] Email sent successfully
   ```

3. **Revisa spam/junk folder**

4. **Intenta con un solo evento primero:**
   ```bash
   curl -X POST http://localhost:3001/notifications/test/single-event \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "eventType": "poa.approved",
       "clientEmail": "josemx890823@gmail.com"
     }'
   ```

### Error 401 Unauthorized

- Asegúrate de estar usando un token de un usuario con rol `super_admin`
- El token puede haber expirado, obtén uno nuevo

### Error 403 Forbidden

- Solo usuarios `super_admin` pueden usar este endpoint
- Verifica tu rol en la base de datos

## 🔒 Seguridad

**Este endpoint solo debe usarse en desarrollo/testing.**

En producción, deberías:
1. Deshabilitarlo completamente
2. O protegerlo con autenticación adicional
3. O limitarlo solo a entornos de staging

Para deshabilitarlo, comenta el controlador en `notifications.module.ts`:

```typescript
controllers: [
  NotificationsController,
  NotificationsAdminController,
  // NotificationsTestController, // ⬅️ Comentar en producción
],
```

## 📊 Swagger Documentation

Una vez que el servidor esté corriendo, puedes ver la documentación en:
```
http://localhost:3001/api/docs
```

Busca la sección **"Notifications - Testing"** para probar directamente desde Swagger UI.

---

**¡Listo para probar!** 🚀

Recuerda reiniciar el servidor después de estos cambios para que el nuevo endpoint esté disponible.
