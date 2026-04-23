Additional Intake
🍔 Consumos adicionales fuera del plan



POST
/additional-intake
Registrar consumo adicional fuera del plan



PATCH
/additional-intake/{id}/confirm
Confirmar consumo y sumar calorías al balance



POST
/additional-intake/{id}/discard
Descartar consumo adicional



GET
/additional-intake/me
Mis consumos adicionales (paciente)



GET
/additional-intake/patient/{id}
Consumos adicionales de un paciente (nutricionista)



GET
/additional-intake/patient/{id}/impact
Análisis del impacto calórico de consumos adicionales


Adherence
📈 Índice de adherencia semanal



GET
/adherence/me/current-week
Adherencia de la semana actual (paciente)


Admin
🛡️ Gestión administrativa de usuarios



GET
/admin/users
Listar usuarios para panel administrativo



POST
/admin/nutritionists
Crear cuenta de nutricionista



PATCH
/admin/users/{id}
Editar datos permitidos de usuario



PATCH
/admin/users/{id}/status
Cambiar estado de cuenta de un usuario



POST
/admin/users/{id}/reset-password
Resetear contraseña de un usuario e invalidar sesiones


Alerts
🔔 Alertas clínicas automáticas



GET
/alerts
Listar alertas de la nutricionista



PATCH
/alerts/{id}/review
Marcar alerta como revisada


Appointments
📅 Citas nutricionales



GET
/appointments/me
Mis próximas citas (paciente - app móvil)



POST
/appointments
Programar nueva cita



GET
/appointments
Listar citas con filtros



GET
/appointments/patient/{id}
Historial de citas de un paciente con estadísticas



GET
/appointments/{id}
Detalle de una cita



PUT
/appointments/{id}
Actualizar fecha/hora y notas de una cita



DELETE
/appointments/{id}
Eliminar cita



PATCH
/appointments/{id}/status
Cambiar estado de la cita



PATCH
/appointments/{id}/link-evaluation
Vincular evaluación clínica a la cita


Auth
🔐 Registro, login y gestión de sesiones JWT



POST
/auth/register
Registrar nuevo paciente


POST
/auth/login
Iniciar sesión


POST
/auth/refresh
Renovar access token


POST
/auth/logout
Cerrar sesión



GET
/auth/me
Datos del usuario autenticado



PATCH
/auth/change-password
Cambiar contraseña


Calorie Control
🔥 Balance calórico diario



GET
/calorie-control/today
Balance calórico del día actual (paciente)



GET
/calorie-control/me/history
Historial de balance calórico del paciente



GET
/calorie-control/me/weekly
Balance calórico de los últimos 7 días



GET
/calorie-control/patient/{id}/today
Balance calórico de hoy de un paciente (nutricionista)


Clinical Evaluations
⚖️ Evaluaciones de bioimpedancia



POST
/clinical-evaluations
Registrar nueva evaluación clínica



GET
/clinical-evaluations/me/history
Historial propio del paciente



GET
/clinical-evaluations/patient/{id}
Historial de evaluaciones de un paciente



GET
/clinical-evaluations/patient/{id}/compare
Comparar dos evaluaciones



GET
/clinical-evaluations/patient/{id}/trends
Tendencias clínicas para gráficos



GET
/clinical-evaluations/{id}
Detalle de una evaluación


Dashboard
📱 Dashboards y métricas consolidadas



GET
/dashboard/nutritionist
Dashboard principal de la nutricionista



GET
/dashboard/patient/{id}
Dashboard completo de un paciente



GET
/dashboard/me/progress
Progreso propio del paciente (app móvil)


Dishes
🍽️ Catálogo de platos y recetas



GET
/dishes
Listar platos


POST
/dishes
Crear plato con ingredientes



GET
/dishes/{id}
Detalle de un plato con ingredientes


POST
/dishes/{id}/ingredients
Agregar o actualizar ingrediente en el plato


Exercise Tracking
🏋️ Seguimiento diario de ejercicios



GET
/exercise-tracking/today
Ejercicios del día con estado de cumplimiento



POST
/exercise-tracking
Marcar ejercicio como completado o no completado


Exercises
🏃 Catálogo de ejercicios



GET
/exercises
Listar ejercicios con filtros


POST
/exercises
Crear ejercicio


Foods
🍎 Catálogo de alimentos



GET
/foods
Listar alimentos con filtros


POST
/foods
Crear alimento


Health
❤️ Estado del servidor y base de datos


Meal Tracking
✅ Seguimiento diario de comidas



GET
/meal-tracking/today
Comidas del día con estado de cumplimiento



POST
/meal-tracking
Marcar comida como realizada o no realizada



GET
/meal-tracking/patient/{id}
Historial de comidas de un paciente


Nutrition Plans
🥗 Planes nutricionales y estructura semanal



GET
/nutrition-plans/me/active
Plan activo del paciente (app móvil)



POST
/nutrition-plans/patient/{perfilId}
Crear plan nutricional para un paciente



GET
/nutrition-plans/patient/{perfilId}
Historial de planes de un paciente



PATCH
/nutrition-plans/{id}/activate
Activar plan con fecha de inicio



PATCH
/nutrition-plans/{id}/suspend
Suspender plan activo



PATCH
/nutrition-plans/{id}/reactivate
Reactivar plan suspendido



PATCH
/nutrition-plans/{id}/lock-module
Bloquear módulo Mi Plan



PATCH
/nutrition-plans/{id}/unlock-module
Desbloquear módulo Mi Plan



POST
/nutrition-plans/{planId}/weeks
Crear semana dentro del plan



POST
/nutrition-plans/weeks/{weekId}/days/{day}/menus
Asignar menú a un día y tiempo de comida



POST
/nutrition-plans/weeks/{weekId}/days/{day}/exercises
Asignar ejercicio a un día del plan


Patient Profile
📋 Formulario inicial del paciente



GET
/patient-profile/medical-conditions
Catálogo de condiciones médicas


GET
/patient-profile/options
Catálogos para onboarding móvil



GET
/patient-profile/me
Ver mi formulario inicial



PUT
/patient-profile/me
Guardar formulario inicial completo



GET
/patient-profile/{patientId}
Ver formulario de un paciente


Patients
👥 Listado y ficha de pacientes



GET
/patients
Listar todos los pacientes



GET
/patients/me
Datos del paciente autenticado



GET
/patients/{id}
Ficha completa de un paciente


Weight Records
📊 Registro de peso diario



POST
/weight-records
Registrar peso del día