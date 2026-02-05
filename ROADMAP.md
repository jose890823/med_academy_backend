# ROADMAP BACKEND - Ultrasound MedAcademy

## Estado Actual: 9/10
Fecha de auditoría: 2026-02-05
Última actualización: 2026-02-05

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
- [x] Módulo de notificaciones (entity, service, controller)
- [x] Cola de emails con Bull/Redis
- [x] Eventos automáticos (enrollment, certificate, payment, etc.)
- [x] Notificaciones in-app
- [x] Preferencias de notificación del usuario (por categoría y canal)
- [x] Broadcast masivo para admin
- [x] Digest emails (instant, daily, weekly)
- [ ] Plantillas HTML personalizadas (requiere EmailModule)
- **Estimado:** 2-3 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

### 4. Calificación Manual de Evaluaciones
- [x] Endpoint para instructor calificar intento (POST /v1/admin/grading/:id/grade)
- [x] Calificación rápida (POST /v1/admin/grading/:id/quick-grade)
- [x] Estados de intento: in_progress, submitted, graded
- [x] Campo de feedback personalizado (por respuesta y general)
- [x] Notificación al estudiante cuando califican (evento evaluation.graded)
- [x] Dashboard de intentos pendientes por calificar (GET /v1/admin/grading/pending)
- **Estimado:** 2-3 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

### 5. Gestión de Archivos/Materiales
- [x] Entidad Material (vinculada a Course y CourseModule)
- [x] Tipos: video, pdf, document, image, audio, presentation, spreadsheet, archive
- [x] Soporte para múltiples proveedores: local, S3, GCS, Cloudinary, Vimeo, YouTube
- [x] Endpoints CRUD admin (crear, listar, actualizar, eliminar, reordenar)
- [x] Endpoint de descarga para estudiantes inscritos
- [x] Materiales públicos (sin autenticación)
- [x] Control de acceso (isPublic, allowDownload)
- [x] Estadísticas de descargas
- [ ] Integración real con S3/CloudStorage (preparado, falta configurar)
- **Estimado:** 3-4 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

---

## 🟠 FASE 2: MUY IMPORTANTES (Post-MVP)

### 6. Dashboard Analytics
- [x] Módulo de analytics con métricas comparativas
- [x] Métricas: usuarios, inscripciones, ingresos, certificados, evaluaciones
- [x] Comparación con período anterior (cambio %)
- [x] Datos de tendencia para gráficos (enrollments, revenue, users, certificates)
- [x] Distribución por curso
- [x] Analytics por curso individual
- [x] Top performers (estudiantes destacados)
- [x] Exportación a CSV
- **Estimado:** 4-5 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

### 7. Foros/Comunidad
- [x] Entidades: Discussion, Post, PostLike, DiscussionSubscription
- [x] Tipos de discusión: pregunta, discusión, anuncio, encuesta
- [x] Foro general y foros por curso
- [x] Respuestas anidadas (estructura de árbol con closure table)
- [x] Sistema de likes/votos
- [x] Marcar respuesta aceptada
- [x] Discusiones fijadas (pinned)
- [x] Estados: open, closed, locked, archived
- [x] Suscripción a discusiones para notificaciones
- [x] Búsqueda por tags y contenido
- [x] Historial de ediciones de posts
- [x] Moderación: cerrar, bloquear, archivar, ocultar posts
- [x] Solo estudiantes inscritos pueden participar en foros de curso
- [x] Contadores: vistas, posts, likes
- **Estimado:** 4-5 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

### 8. Reviews y Ratings
- [x] Entidad Review con rating (1-5), título, comentario
- [x] Estados: pending, approved, rejected, hidden
- [x] Marca de compra verificada (isVerifiedPurchase)
- [x] Solo estudiantes inscritos (ACTIVE/COMPLETED) pueden dejar review
- [x] Un review por estudiante por curso
- [x] Respuesta del instructor (instructorResponse)
- [x] Sistema de moderación (aprobar, rechazar, ocultar)
- [x] Reviews destacados (isFeatured)
- [x] Votos de utilidad (helpfulCount)
- [x] Estadísticas: promedio, distribución por rating
- [x] Endpoints públicos: ver reviews de curso, resumen de reviews
- [x] Endpoints autenticados: crear, actualizar, eliminar mi review
- [x] Endpoints admin: listar todos, moderar, responder, destacar
- **Estimado:** 2-3 días
- **Estado:** ✅ COMPLETADO (2026-02-05)

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
| Evaluations | 2026-02 | ✅ Completo (con calificación manual) |
| Referrals | 2026-02 | ✅ Completo |
| Progress | 2026-02 | ✅ Completo |
| Workshops | 2026-02 | ✅ Completo |
| Certificates | 2026-02 | ✅ Completo |
| Notifications | 2026-02 | ✅ Completo |
| Materials | 2026-02 | ✅ Completo |
| Analytics | 2026-02 | ✅ Completo |
| Reviews | 2026-02 | ✅ Completo |
| Forums | 2026-02 | ✅ Completo |

---

## Notas

- Priorizar FASE 1 antes de lanzar a producción
- FASE 2 puede implementarse en sprints post-lanzamiento
- FASE 3 son mejoras nice-to-have
