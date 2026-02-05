# ROADMAP BACKEND - Ultrasound MedAcademy

## Estado Actual: 7.5/10
Fecha de auditoría: 2026-02-05

---

## 🔴 FASE 1: CRÍTICOS (Bloquean producción)

### 1. Sistema de Certificados PDF
- [x] Servicio de generación PDF (pdfkit)
- [x] Templates de certificados por tipo de curso
- [x] Número único verificable (CERT-YYYY-NNNNNN + código corto)
- [x] QR code para validación online
- [ ] Almacenamiento en S3/CloudStorage (pendiente integración)
- [x] Endpoint para descargar certificado
- [x] Endpoint público para verificar certificado
- **Estimado:** 3-4 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

### 2. Webhooks de Stripe
- [ ] Endpoint webhook handler
- [ ] Verificación de firma Stripe
- [ ] Eventos: payment_intent.succeeded, payment_intent.failed
- [ ] Eventos: invoice.paid, invoice.payment_failed
- [ ] Eventos: customer.subscription.created/updated/deleted
- [ ] Sincronizar estado de pagos automáticamente
- [ ] Actualizar inscripciones según pago
- **Estimado:** 2-3 días
- **Estado:** ⏳ PENDIENTE

### 3. Sistema de Notificaciones
- [ ] Módulo de notificaciones (entity, service, controller)
- [ ] Cola de emails con Bull/Redis
- [ ] Plantillas de email:
  - [ ] Confirmación de inscripción
  - [ ] Certificado emitido
  - [ ] Recordatorio de workshop
  - [ ] Calificación disponible
  - [ ] Deadline de evaluación
  - [ ] Pago exitoso/fallido
- [ ] Notificaciones in-app (opcional WebSockets)
- [ ] Preferencias de notificación del usuario
- **Estimado:** 2-3 días
- **Estado:** ⏳ PENDIENTE

### 4. Calificación Manual de Evaluaciones
- [ ] Endpoint para instructor calificar intento
- [ ] Estados de intento: pending_review, graded
- [ ] Campo de feedback personalizado
- [ ] Notificación al estudiante cuando califican
- [ ] Dashboard de intentos pendientes por calificar
- **Estimado:** 2-3 días
- **Estado:** ⏳ PENDIENTE

### 5. Gestión de Archivos/Materiales
- [ ] Servicio de upload a S3/CloudStorage
- [ ] Entidad Material (vinculada a CourseModule)
- [ ] Tipos: video, pdf, document, image, audio
- [ ] Endpoint de upload para admin
- [ ] Endpoint de descarga para estudiantes inscritos
- [ ] Validación de acceso (solo inscritos activos)
- **Estimado:** 3-4 días
- **Estado:** ⏳ PENDIENTE

---

## 🟠 FASE 2: MUY IMPORTANTES (Post-MVP)

### 6. Dashboard Analytics
- [ ] Módulo de reportes
- [ ] Métricas: estudiantes activos, ingresos, certificados
- [ ] Gráficos de tendencia
- [ ] Exportación a Excel
- **Estimado:** 4-5 días
- **Estado:** ⏳ PENDIENTE

### 7. Foros/Comunidad
- [ ] Entidades: Discussion, Post, Reply
- [ ] Por curso y general
- [ ] Moderación
- [ ] Notificaciones de respuestas
- **Estimado:** 4-5 días
- **Estado:** ⏳ PENDIENTE

### 8. Reviews y Ratings
- [ ] Entidad CourseReview
- [ ] Rating 1-5 estrellas
- [ ] Comentario opcional
- [ ] Promedio en curso
- [ ] Solo estudiantes que completaron pueden dejar review
- **Estimado:** 2-3 días
- **Estado:** ⏳ PENDIENTE

### 9. Perfiles de Instructores
- [ ] Entidad InstructorProfile
- [ ] Bio, foto, especialidades
- [ ] Página pública del instructor
- [ ] Cursos del instructor
- **Estimado:** 2-3 días
- **Estado:** ⏳ PENDIENTE

### 10. Mensajería Directa
- [ ] Entidades: Conversation, Message
- [ ] Entre estudiante-instructor
- [ ] Notificaciones de nuevos mensajes
- [ ] Opcional: WebSockets para tiempo real
- **Estimado:** 3-4 días
- **Estado:** ⏳ PENDIENTE

---

## 🟡 FASE 3: MEJORAS (Futuro)

### 11. Calendario de Eventos
- [ ] Deadlines de evaluaciones
- [ ] Fechas de workshops
- [ ] Integración Google Calendar
- **Estado:** ⏳ PENDIENTE

### 12. Tracking Asistencia Workshops
- [ ] QR codes para check-in
- [ ] Lista de asistencia exportable
- **Estado:** ⏳ PENDIENTE

### 13. Exportación de Reportes
- [ ] Progreso del estudiante en PDF
- [ ] Reportes admin en Excel
- **Estado:** ⏳ PENDIENTE

### 14. Two-Factor Authentication
- [ ] TOTP (Google Authenticator)
- [ ] SMS backup
- **Estado:** ⏳ PENDIENTE

### 15. Verificación Online de Certificados
- [ ] Página pública para verificar
- [ ] Búsqueda por número de certificado
- **Estado:** ⏳ PENDIENTE

---

## Módulos Completados ✅

| Módulo | Fecha | Estado |
|--------|-------|--------|
| Auth | 2026-01 | ✅ Completo |
| Users | 2026-01 | ✅ Completo |
| Security | 2026-01 | ✅ Completo |
| Email | 2026-01 | ✅ Completo |
| Payments | 2026-01 | ✅ Básico (falta webhooks) |
| Contact | 2026-01 | ✅ Básico |
| Courses | 2026-02 | ✅ Completo |
| Enrollments | 2026-02 | ✅ Completo |
| Evaluations | 2026-02 | ✅ Completo (falta manual grading) |
| Referrals | 2026-02 | ✅ Completo |
| Progress | 2026-02 | ✅ Completo |
| Workshops | 2026-02 | ✅ Completo |
| Certificates | 2026-02 | ✅ Completo |

---

## Notas

- Priorizar FASE 1 antes de lanzar a producción
- FASE 2 puede implementarse en sprints post-lanzamiento
- FASE 3 son mejoras nice-to-have
