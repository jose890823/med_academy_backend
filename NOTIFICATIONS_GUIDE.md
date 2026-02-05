# 🔔 Guía del Sistema de Notificaciones - EchoMedDx

## 📋 Tabla de Contenidos
1. [Configuración](#configuración)
2. [Canales Disponibles](#canales-disponibles)
3. [Enviar Notificaciones](#enviar-notificaciones)
4. [Plantillas](#plantillas)
5. [Preferencias de Usuario](#preferencias-de-usuario)
6. [Administración](#administración)

---

## 🔧 Configuración

### Variables de Entorno Requeridas

**Twilio (SMS/WhatsApp):**
```env
TWILIO_ACCOUNT_SID=[TU_ACCOUNT_SID_REAL]      # ⚠️ Reemplaza con tu Account SID de Twilio
TWILIO_AUTH_TOKEN=[TU_AUTH_TOKEN_REAL]        # ⚠️ Reemplaza con tu Auth Token de Twilio
TWILIO_PHONE_NUMBER=[TU_NUMERO_TWILIO]        # ⚠️ Reemplaza con tu número de Twilio
TWILIO_WHATSAPP_NUMBER=[TU_NUMERO_WHATSAPP]   # ⚠️ Reemplaza con tu número de WhatsApp
```

**Redis (Cola de Procesamiento):**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Email (Resend - Ya Configurado):**
```env
RESEND_API_KEY=re_UM96xnWb_7eZjr71p88hQ692i6Uun747o
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=EchoMedDx
```

### Iniciar Redis (Requerido para el Sistema de Colas)

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

---

## 📨 Canales Disponibles

### 1. **Email** ✅ CONFIGURADO
- Proveedor: Resend
- Estado: Activo
- Características: HTML, texto plano, adjuntos

### 2. **SMS** ✅ CONFIGURADO
- Proveedor: Twilio
- Estado: Activo (requiere Auth Token)
- Límite: 1600 caracteres

### 3. **WhatsApp** ✅ CONFIGURADO
- Proveedor: Twilio
- Estado: Activo (requiere Auth Token)
- Características: Texto formateado, imágenes, documentos
- Sandbox: +14155238886 (número de prueba)

### 4. **Push** 🔜 FUTURO
- Proveedor: Firebase Cloud Messaging (FCM)
- Estado: Placeholder

### 5. **In-App** ✅ ACTIVO
- Proveedor: Base de datos
- Estado: Siempre activo
- Uso: Notificaciones dentro de la aplicación

---

## 📤 Enviar Notificaciones

### Desde el Código (Programáticamente)

#### Ejemplo 1: Enviar Email Simple
```typescript
import { NotificationsService } from './modules/notifications/services/notifications.service';

// En tu servicio o controller
async sendWelcomeEmail(userId: string, userName: string) {
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.SYSTEM,
    subject: '¡Bienvenido a EchoMedDx!',
    body: `Hola ${userName},\n\nGracias por registrarte en EchoMedDx.`,
    priority: NotificationPriority.NORMAL,
  });
}
```

#### Ejemplo 2: Enviar WhatsApp con Plantilla
```typescript
async notifyPoaApproved(userId: string, poaType: string) {
  await this.notificationsService.sendFromTemplate(
    userId,
    'poa_approved', // Código de plantilla
    {
      userName: 'Juan Pérez',
      poaType: 'Durable',
      approvalDate: '2025-01-15',
      poaUrl: 'https://app.echomeddx.com/poa/123'
    },
    NotificationChannel.WHATSAPP,
    {
      priority: NotificationPriority.HIGH,
      requiresAction: true,
      actionUrl: 'https://app.echomeddx.com/poa/123'
    }
  );
}
```

#### Ejemplo 3: Enviar SMS Urgente
```typescript
async sendSecurityAlert(userId: string, phoneNumber: string) {
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.SMS,
    category: NotificationCategory.SECURITY,
    priority: NotificationPriority.URGENT,
    subject: 'Alerta de Seguridad',
    body: 'Detectamos un inicio de sesión desde un nuevo dispositivo. Si no fuiste tú, cambia tu contraseña inmediatamente.',
    recipient: phoneNumber, // Formato: +5219624503663
  });
}
```

#### Ejemplo 4: Notificación Multi-Canal
```typescript
async notifyPaymentReceived(userId: string, amount: number) {
  // Email con detalles completos
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.PAYMENT,
    subject: 'Pago Recibido',
    body: `Tu pago de $${amount} USD ha sido procesado exitosamente.`,
  });

  // WhatsApp con confirmación rápida
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.WHATSAPP,
    category: NotificationCategory.PAYMENT,
    subject: '💰 Pago Confirmado',
    body: `Recibimos tu pago de $${amount} USD. ¡Gracias!`,
  });

  // In-App notification
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.IN_APP,
    category: NotificationCategory.PAYMENT,
    subject: 'Pago Recibido',
    body: `Tu pago de $${amount} USD ha sido procesado.`,
    requiresAction: true,
    actionUrl: '/payments/invoices'
  });
}
```

### Desde la API (Endpoints de Admin)

#### Enviar a Usuario Específico
```bash
curl -X POST http://localhost:3001/api/notifications/admin/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "channel": "whatsapp",
    "category": "poa_status",
    "subject": "Tu POA ha sido aprobado",
    "body": "Hola! Tu Power of Attorney ha sido aprobado exitosamente.",
    "priority": "high"
  }'
```

#### Enviar en Batch
```bash
curl -X POST http://localhost:3001/api/notifications/admin/send-batch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [
      "123e4567-e89b-12d3-a456-426614174000",
      "987e6543-e89b-12d3-a456-426614174111"
    ],
    "channel": "email",
    "subject": "Mantenimiento Programado",
    "body": "Tendremos mantenimiento el 15 de enero de 2 AM a 4 AM EST."
  }'
```

#### Broadcast a Todos los Usuarios
```bash
curl -X POST http://localhost:3001/api/notifications/admin/broadcast \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "in_app",
    "category": "system",
    "subject": "Nueva Funcionalidad Disponible",
    "body": "Ya está disponible nuestro nuevo sistema de notificaciones multi-canal."
  }'
```

---

## 🎨 Plantillas

### Crear Plantilla
```typescript
// Desde el código
async createTemplate() {
  await this.templateService.create({
    code: 'payment_received',
    name: 'Pago Recibido',
    description: 'Se envía cuando se procesa un pago exitosamente',
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.PAYMENT,
    subject: 'Pago Recibido - Factura #{{invoiceNumber}}',
    body: `Hola {{userName}},

Hemos recibido tu pago de {{amount}} {{currency}}.

Detalles:
- Número de Factura: {{invoiceNumber}}
- Fecha de Pago: {{paymentDate}}
- Método de Pago: {{paymentMethod}}

Ver factura: {{invoiceUrl}}

Gracias por tu pago!
Equipo EchoMedDx`,
    variables: [
      { name: 'userName', description: 'Nombre del usuario', required: true, example: 'Juan Pérez' },
      { name: 'amount', description: 'Monto del pago', required: true, example: '29.00' },
      { name: 'currency', description: 'Moneda', required: true, example: 'USD' },
      { name: 'invoiceNumber', description: 'Número de factura', required: true, example: 'INV-2025-001' },
      { name: 'paymentDate', description: 'Fecha de pago', required: true, example: '2025-01-15' },
      { name: 'paymentMethod', description: 'Método de pago', required: false, defaultValue: 'Credit Card' },
      { name: 'invoiceUrl', description: 'URL de la factura', required: false }
    ],
    isActive: true,
    locale: 'es'
  });
}
```

### Usar Plantilla
```typescript
await this.notificationsService.sendFromTemplate(
  userId,
  'payment_received',
  {
    userName: 'Juan Pérez',
    amount: '29.00',
    currency: 'USD',
    invoiceNumber: 'INV-2025-001',
    paymentDate: '2025-01-15',
    paymentMethod: 'Stripe',
    invoiceUrl: 'https://app.echomeddx.com/invoices/123'
  },
  NotificationChannel.EMAIL
);
```

### Seedear Plantillas por Defecto
```bash
curl -X POST http://localhost:3001/api/notifications/admin/templates/seed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ⚙️ Preferencias de Usuario

### Estructura de Preferencias
```typescript
{
  // Habilitar/deshabilitar todo
  enabled: true,

  // Habilitar canales específicos
  emailEnabled: true,
  smsEnabled: true,
  whatsappEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,

  // Preferencias por categoría
  categoryPreferences: {
    poa_status: { email: true, sms: true, whatsapp: false, push: true },
    payment: { email: true, sms: false, whatsapp: false, push: true },
    security: { email: true, sms: true, whatsapp: false, push: true }
  },

  // Horario de silencio (Do Not Disturb)
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'America/New_York',

  // Resumen diario/semanal
  digestEnabled: false,
  digestFrequency: 'daily',
  digestTime: '09:00'
}
```

### Usuario Actualiza sus Preferencias
```bash
curl -X PATCH http://localhost:3001/api/notifications/preferences/me \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "whatsappEnabled": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "categoryPreferences": {
      "poa_status": { "whatsapp": true, "email": true }
    }
  }'
```

---

## 👨‍💼 Administración

### Ver Estadísticas
```bash
# Estadísticas generales
curl -X GET http://localhost:3001/api/notifications/admin/stats/overview \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Estado de la cola
curl -X GET http://localhost:3001/api/notifications/admin/queue/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Reintentar Notificación Fallida
```bash
curl -X POST http://localhost:3001/api/notifications/admin/NOTIFICATION_ID/retry \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Cancelar Notificación Pendiente
```bash
curl -X POST http://localhost:3001/api/notifications/admin/NOTIFICATION_ID/cancel \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Limpiar Cola
```bash
curl -X POST http://localhost:3001/api/notifications/admin/queue/clean \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "days": 7 }'
```

---

## 🔍 Casos de Uso Comunes

### 1. Notificación de POA Aprobado
```typescript
async notifyPoaApproved(poa: POA) {
  await this.notificationsService.sendFromTemplate(
    poa.clientId,
    'poa_approved',
    {
      userName: poa.user.fullName,
      poaType: poa.type,
      approvalDate: new Date().toLocaleDateString(),
      poaUrl: `${process.env.APP_URL}/poa/${poa.id}`
    },
    NotificationChannel.EMAIL,
    { priority: NotificationPriority.HIGH }
  );

  // También enviar WhatsApp si el usuario lo tiene habilitado
  await this.notificationsService.send({
    userId: poa.clientId,
    channel: NotificationChannel.WHATSAPP,
    category: NotificationCategory.POA_STATUS,
    subject: '✅ POA Aprobado',
    body: `¡Buenas noticias! Tu ${poa.type} POA ha sido aprobado.`,
    priority: NotificationPriority.HIGH
  });
}
```

### 2. Recordatorio de Cita
```typescript
async sendAppointmentReminder(appointmentId: string) {
  const appointment = await this.getAppointment(appointmentId);

  // 24 horas antes - Email
  await this.notificationsService.send({
    userId: appointment.userId,
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.APPOINTMENT,
    subject: 'Recordatorio: Cita Mañana',
    body: `Tienes una cita mañana a las ${appointment.time}`,
    scheduledFor: new Date(appointment.date.getTime() - 24 * 60 * 60 * 1000).toISOString()
  });

  // 1 hora antes - SMS
  await this.notificationsService.send({
    userId: appointment.userId,
    channel: NotificationChannel.SMS,
    category: NotificationCategory.APPOINTMENT,
    subject: 'Recordatorio: Cita en 1 hora',
    body: `Tu cita es en 1 hora a las ${appointment.time}`,
    scheduledFor: new Date(appointment.date.getTime() - 60 * 60 * 1000).toISOString()
  });
}
```

### 3. Alerta de Seguridad
```typescript
async sendSecurityAlert(userId: string, alertType: string) {
  // Las alertas de seguridad SIEMPRE se envían (ignoran quiet hours y preferencias)
  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.EMAIL,
    category: NotificationCategory.SECURITY,
    priority: NotificationPriority.URGENT,
    subject: '⚠️ Alerta de Seguridad',
    body: `Detectamos actividad inusual en tu cuenta: ${alertType}`,
  });

  await this.notificationsService.send({
    userId,
    channel: NotificationChannel.SMS,
    category: NotificationCategory.SECURITY,
    priority: NotificationPriority.URGENT,
    subject: 'Alerta de Seguridad',
    body: `Actividad inusual detectada. Revisa tu email.`,
  });
}
```

---

## 🐛 Troubleshooting

### Redis no está corriendo
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solución:** Inicia Redis con `sudo systemctl start redis` o `brew services start redis`

### Twilio Auth Token incorrecto
```
Error enviando WhatsApp: Authentication Error - 20003
```
**Solución:** Verifica que `TWILIO_AUTH_TOKEN` en `.env` sea correcto

### Notificaciones no se envían
1. Verifica que Redis esté corriendo
2. Verifica las credenciales en `.env`
3. Revisa las preferencias del usuario
4. Checa los logs de la cola: `GET /api/notifications/admin/queue/stats`

---

## 📚 Recursos

- [Documentación de Twilio](https://www.twilio.com/docs)
- [Twilio WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox)
- [Resend Docs](https://resend.com/docs)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)

---

**¡Sistema de Notificaciones listo para producción! 🚀**
