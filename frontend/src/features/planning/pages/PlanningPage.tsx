import { useEffect, useMemo, useState } from "react";
import {
    Briefcase,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit,
    Eye,
    MapPin,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { api } from "../../../services/api";
import type { Job } from "../../../types/job";
import type {
    CalendarEvent,
    CalendarEventPayload,
    CalendarEventStatus,
    CalendarEventType,
} from "../../../types/planning";

type AppSettingsResponse = {
    work_weekends: boolean;
};
import "../styles/PlanningPage.css";

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const eventTypeLabels: Record<CalendarEventType, string> = {
    VISIT: "Visita",
    JOB: "Trabajo",
    REMINDER: "Recordatorio",
};

const statusLabels: Record<CalendarEventStatus, string> = {
    PLANNED: "Planificado",
    COMPLETED: "Completado",
    CANCELLED: "Cancelado",
};

const statusClassNames: Record<CalendarEventStatus, string> = {
    PLANNED: "status-pill status-pill--info",
    COMPLETED: "status-pill status-pill--success",
    CANCELLED: "status-pill status-pill--danger",
};

type EventFormData = {
    job: string;
    title: string;
    event_type: CalendarEventType;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    location: string;
    description: string;
    status: CalendarEventStatus;
};

const emptyFormData: EventFormData = {
    job: "",
    title: "",
    event_type: "VISIT",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    description: "",
    status: "PLANNED",
};

function getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateRangeKeys(startValue: string, endValue: string, includeWeekends = true) {
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    const currentDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
    );

    const lastDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
    );

    const keys: string[] = [];

    while (currentDate <= lastDate) {
        const dayOfWeek = currentDate.getDay();

        if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
            keys.push(getDateKey(currentDate));
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return keys;
}

function getEventLabelForDay(event: CalendarEvent) {
    return event.job_display_name || event.title;
}

function formatMonth(date: Date) {
    return new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatEventTime(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toEventFormDateTime(value: string) {
    const [date = "", time = ""] = toDateTimeLocalValue(value).split("T");

    return {
        date,
        time,
    };
}

function buildDateForDay(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function buildDateTimeLocalValue(date: string, time: string) {
    return `${date}T${time}`;
}

function getCalendarDays(currentMonth: Date) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const firstCalendarDay = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(firstCalendarDay);
        day.setDate(firstCalendarDay.getDate() + index);
        return day;
    });
}

function extractErrorMessage(error: unknown) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;

    if (!responseData) {
        return "No se ha podido guardar el evento.";
    }

    if (typeof responseData === "string") {
        return responseData;
    }

    if (Array.isArray(responseData)) {
        return responseData.join(" ");
    }

    if (typeof responseData === "object") {
        return Object.values(responseData as Record<string, unknown>)
            .flat()
            .join(" ");
    }

    return "No se ha podido guardar el evento.";
}

export function PlanningPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState<EventFormData>(emptyFormData);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [workWeekends, setWorkWeekends] = useState(true);
    const isEditingJobEvent = Boolean(selectedEvent?.job && selectedEvent.event_type === "JOB");

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const [eventsResponse, jobsResponse, settingsResponse] = await Promise.all([
                api.get<CalendarEvent[]>("/planning/"),
                api.get<Job[]>("/jobs/"),
                api.get<AppSettingsResponse>("/app-settings/").catch(() => ({ data: { work_weekends: true } })),
            ]);

            setEvents(eventsResponse.data);
            setJobs(jobsResponse.data);
            setWorkWeekends(settingsResponse.data.work_weekends ?? true);
        } catch {
            setErrorMessage("No se ha podido cargar la planificación.");
        } finally {
            setIsLoading(false);
        }
    }

    const calendarDays = useMemo(
        () => getCalendarDays(currentMonth),
        [currentMonth]
    );

    const eventsByDay = useMemo(() => {
        return events.reduce<Record<string, CalendarEvent[]>>((accumulator, event) => {
            const shouldSkipWeekends = event.event_type === "JOB" && !workWeekends;
            const dayKeys = getDateRangeKeys(event.start_at, event.end_at, !shouldSkipWeekends);

            dayKeys.forEach((key) => {
                if (!accumulator[key]) {
                    accumulator[key] = [];
                }

                accumulator[key].push(event);
            });

            return accumulator;
        }, {});
    }, [events, workWeekends]);

    const selectedDateKey = getDateKey(selectedDate);

    const selectedDayEvents = useMemo(() => {
        return [...(eventsByDay[selectedDateKey] ?? [])].sort(
            (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );
    }, [eventsByDay, selectedDateKey]);

    const monthEvents = useMemo(() => {
        return events.filter((event) => {
            const eventDate = new Date(event.start_at);
            return (
                eventDate.getMonth() === currentMonth.getMonth() &&
                eventDate.getFullYear() === currentMonth.getFullYear()
            );
        });
    }, [events, currentMonth]);

    const monthJobCount = useMemo(() => {
        const jobIds = new Set<number>();
        let standaloneJobEvents = 0;

        monthEvents.forEach((event) => {
            if (event.event_type !== "JOB") {
                return;
            }

            if (event.job) {
                jobIds.add(event.job);
                return;
            }

            standaloneJobEvents += 1;
        });

        return jobIds.size + standaloneJobEvents;
    }, [monthEvents]);

    const monthEventCount = useMemo(() => {
        const nonJobEventCount = monthEvents.filter(
            (event) => event.event_type !== "JOB"
        ).length;

        return monthJobCount + nonJobEventCount;
    }, [monthEvents, monthJobCount]);

    function goToPreviousMonth() {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
    }

    function goToNextMonth() {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );
    }

    function goToCurrentMonth() {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today);
    }

    function openCreateModal(date = selectedDate) {
        setSelectedEvent(null);
        setFormData({
            ...emptyFormData,
            start_date: buildDateForDay(date),
            end_date: buildDateForDay(date),
            start_time: "09:00",
            end_time: "10:00",
        });
        setIsFormOpen(true);
    }

    function openEditModal(event: CalendarEvent) {
        if (event.event_type === "JOB") {
            openDetailModal(event);
            return;
        }

        const startDateTime = toEventFormDateTime(event.start_at);
        const endDateTime = toEventFormDateTime(event.end_at);

        setSelectedEvent(event);
        setFormData({
            job: event.job ? String(event.job) : "",
            title: event.title,
            event_type: event.event_type,
            start_date: startDateTime.date,
            end_date: endDateTime.date,
            start_time: startDateTime.time,
            end_time: endDateTime.time,
            location: event.location,
            description: event.description,
            status: event.status,
        });
        setIsDetailOpen(false);
        setIsFormOpen(true);
    }

    function closeFormModal() {
        setSelectedEvent(null);
        setFormData(emptyFormData);
        setIsFormOpen(false);
    }

    function openDetailModal(event: CalendarEvent) {
        setDetailEvent(event);
        setIsDetailOpen(true);
    }

    function closeDetailModal() {
        setDetailEvent(null);
        setIsDetailOpen(false);
    }

    async function handleSubmitEvent(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const startAt = buildDateTimeLocalValue(formData.start_date, formData.start_time);
        const endAt = buildDateTimeLocalValue(formData.end_date, formData.end_time);

        const payload: CalendarEventPayload = {
            job: selectedEvent?.job ?? (formData.job ? Number(formData.job) : null),
            title: formData.title,
            event_type: formData.event_type,
            start_at: startAt,
            end_at: endAt,
            location: formData.location,
            description: formData.description,
            status: formData.status,
        };

        try {
            setIsSaving(true);

            if (selectedEvent) {
                const response = await api.patch<CalendarEvent>(
                    `/planning/${selectedEvent.id}/`,
                    payload
                );

                setEvents((currentEvents) =>
                    currentEvents.map((currentEvent) =>
                        currentEvent.id === selectedEvent.id ? response.data : currentEvent
                    )
                );
            } else {
                const response = await api.post<CalendarEvent>("/planning/", payload);
                setEvents((currentEvents) => [...currentEvents, response.data]);
            }

            closeFormModal();
        } catch (error) {
            alert(extractErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteEvent(event: CalendarEvent) {
        const hasConfirmed = window.confirm(
            `¿Seguro que quieres eliminar el evento "${event.title}"?`
        );

        if (!hasConfirmed) {
            return;
        }

        try {
            await api.delete(`/planning/${event.id}/`);
            setEvents((currentEvents) =>
                currentEvents.filter((currentEvent) => currentEvent.id !== event.id)
            );
            closeDetailModal();
        } catch {
            alert("No se ha podido eliminar el evento.");
        }
    }

    return (
        <section className="planning-page">
            <div className="planning-page__header page-header">
                <div>
                    <h1 className="page-header__title">Calendario</h1>
                    <p className="page-header__subtitle">
                        Planifica visitas, trabajos y recordatorios del pintor
                    </p>
                </div>

                <button
                    type="button"
                    className="planning-page__create-button"
                    onClick={() => openCreateModal()}
                >
                    <Plus size={18} />
                    Nuevo evento
                </button>
            </div>

            <div className="planning-summary">
                <article className="planning-summary__card card">
                    <p>Eventos del mes</p>
                    <strong>{monthEventCount}</strong>
                    <CalendarDays size={22} />
                </article>

                <article className="planning-summary__card card">
                    <p>Trabajos</p>
                    <strong>{monthJobCount}</strong>
                    <Briefcase size={22} />
                </article>

                <article className="planning-summary__card card">
                    <p>Visitas</p>
                    <strong>
                        {monthEvents.filter((event) => event.event_type === "VISIT").length}
                    </strong>
                    <Eye size={22} />
                </article>

                <article className="planning-summary__card card">
                    <p>Completados</p>
                    <strong>
                        {monthEvents.filter((event) => event.status === "COMPLETED").length}
                    </strong>
                    <Clock size={22} />
                </article>
            </div>

            <div className="planning-layout">
                <section className="planning-calendar card">
                    <div className="planning-calendar__toolbar">
                        <div>
                            <h2>{formatMonth(currentMonth)}</h2>
                            <p>Selecciona un día para ver su planificación</p>
                        </div>

                        <div className="planning-calendar__actions">
                            <button type="button" onClick={goToPreviousMonth}>
                                <ChevronLeft size={18} />
                            </button>

                            <button type="button" onClick={goToCurrentMonth}>
                                Hoy
                            </button>

                            <button type="button" onClick={goToNextMonth}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {isLoading && (
                        <p className="planning-state">Cargando planificación...</p>
                    )}

                    {!isLoading && errorMessage && (
                        <p className="planning-state planning-state--error">
                            {errorMessage}
                        </p>
                    )}

                    {!isLoading && !errorMessage && (
                        <>
                            <div className="planning-calendar__weekdays">
                                {weekDays.map((day) => (
                                    <span key={day}>{day}</span>
                                ))}
                            </div>

                            <div className="planning-calendar__grid">
                                {calendarDays.map((day) => {
                                    const dayKey = getDateKey(day);
                                    const dayEvents = eventsByDay[dayKey] ?? [];
                                    const isCurrentMonth =
                                        day.getMonth() === currentMonth.getMonth();
                                    const isSelected = dayKey === selectedDateKey;
                                    const isToday = dayKey === getDateKey(new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                    return (
                                        <button
                                            key={dayKey}
                                            type="button"
                                            className={[
                                                "planning-day",
                                                !isCurrentMonth ? "planning-day--muted" : "",
                                                isSelected ? "planning-day--selected" : "",
                                                isToday ? "planning-day--today" : "",
                                                isWeekend && isCurrentMonth ? "planning-day--weekend" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                            onClick={() => setSelectedDate(day)}
                                            onDoubleClick={() => openCreateModal(day)}
                                        >
                                            <span className="planning-day__number">
                                                {day.getDate()}
                                            </span>

                                            <div className="planning-day__events">
                                                {dayEvents.slice(0, 3).map((event) => (
                                                    <button
                                                        key={`${dayKey}-${event.id}`}
                                                        type="button"
                                                        className={`planning-event-dot planning-event-dot--${event.event_type.toLowerCase()}`}
                                                        onClick={(clickEvent) => {
                                                            clickEvent.stopPropagation();
                                                            openEditModal(event);
                                                        }}
                                                        onDoubleClick={(doubleClickEvent) => {
                                                            doubleClickEvent.stopPropagation();
                                                        }}
                                                    >
                                                        {getEventLabelForDay(event)}
                                                    </button>
                                                ))}

                                                {dayEvents.length > 3 && (
                                                    <span className="planning-day__more">
                                                        +{dayEvents.length - 3} más
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>

                <aside className="planning-detail card">
                    <div className="planning-detail__header">
                        <div>
                            <h2>{formatDate(selectedDate)}</h2>
                            <p>{selectedDayEvents.length} eventos planificados</p>
                        </div>

                        <button type="button" onClick={() => openCreateModal(selectedDate)}>
                            <Plus size={17} />
                        </button>
                    </div>

                    <div className="planning-detail__list">
                        {selectedDayEvents.map((event) => (
                            <article key={event.id} className="planning-detail__event">
                                <div className="planning-detail__event-header">
                                    <div>
                                        <span>{eventTypeLabels[event.event_type]}</span>
                                        <h3>{event.title}</h3>
                                    </div>

                                    <span className={statusClassNames[event.status]}>
                                        {statusLabels[event.status]}
                                    </span>
                                </div>

                                <p className="planning-detail__time">
                                    <Clock size={15} />
                                    {formatEventTime(event.start_at)} -{" "}
                                    {formatEventTime(event.end_at)}
                                </p>

                                {event.location && (
                                    <p className="planning-detail__location">
                                        <MapPin size={15} />
                                        {event.location}
                                    </p>
                                )}

                                {event.job_title && (
                                    <p className="planning-detail__job">
                                        <Briefcase size={15} />
                                        {event.job_title}
                                    </p>
                                )}

                                <div className="planning-detail__actions">
                                    <button type="button" onClick={() => openDetailModal(event)}>
                                        Ver
                                    </button>

                                    <button type="button" onClick={() => openEditModal(event)}>
                                        Editar
                                    </button>

                                    <button type="button" onClick={() => handleDeleteEvent(event)}>
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}

                        {selectedDayEvents.length === 0 && (
                            <p className="planning-detail__empty">
                                No hay eventos para este día.
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            {isFormOpen && (
                <div className="planning-modal-backdrop">
                    <div className="planning-modal card">
                        <div className="planning-modal__header">
                            <div>
                                <h2>{selectedEvent ? "Editar evento" : "Nuevo evento"}</h2>
                                <p>Completa los datos de planificación</p>
                            </div>

                            <button type="button" onClick={closeFormModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form className="planning-form" onSubmit={handleSubmitEvent}>
                            <label>
                                Título
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(event) =>
                                        setFormData({ ...formData, title: event.target.value })
                                    }
                                    required
                                />
                            </label>

                            <div className="planning-form__row">
                                <label>
                                    Tipo
                                    <select
                                        value={formData.event_type}
                                        disabled={isEditingJobEvent}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                event_type: event.target.value as CalendarEventType,
                                            })
                                        }
                                    >
                                        <option value="VISIT">Visita</option>
                                        <option value="REMINDER">Recordatorio</option>
                                    </select>
                                </label>

                                <label>
                                    Estado
                                    <select
                                        value={formData.status}
                                        onChange={(event) =>
                                            setFormData({
                                                ...formData,
                                                status: event.target.value as CalendarEventStatus,
                                            })
                                        }
                                    >
                                        <option value="PLANNED">Planificado</option>
                                        <option value="COMPLETED">Completado</option>
                                        <option value="CANCELLED">Cancelado</option>
                                    </select>
                                </label>
                            </div>

                            <div className="planning-form__row">
                                <label>
                                    Fecha
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(event) =>
                                            setFormData({ 
                                                ...formData, 
                                                start_date: event.target.value,
                                                end_date: event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </label>
                            </div>

                            <div className="planning-form__row">
                                <label>
                                    Hora inicio
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(event) =>
                                            setFormData({ ...formData, start_time: event.target.value })
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Hora fin
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(event) =>
                                            setFormData({ ...formData, end_time: event.target.value })
                                        }
                                        required
                                    />
                                </label>
                            </div>

                            <label>
                                Trabajo asociado
                                <select
                                    value={formData.job}
                                    disabled={Boolean(selectedEvent?.job)}
                                    onChange={(event) =>
                                        setFormData({ ...formData, job: event.target.value })
                                    }
                                >
                                    <option value="">Sin trabajo asociado</option>
                                    {jobs.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.title} - {job.client_name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Ubicación
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(event) =>
                                        setFormData({ ...formData, location: event.target.value })
                                    }
                                />
                            </label>

                            <label>
                                Descripción
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={(event) =>
                                        setFormData({
                                            ...formData,
                                            description: event.target.value,
                                        })
                                    }
                                />
                            </label>

                            <div className="planning-form__actions">
                                <button type="button" onClick={closeFormModal}>
                                    Cancelar
                                </button>

                                <button type="submit" disabled={isSaving}>
                                    {isSaving ? "Guardando..." : "Guardar evento"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDetailOpen && detailEvent && (
                <div className="planning-modal-backdrop">
                    <div className="planning-modal planning-modal--small card">
                        <div className="planning-modal__header">
                            <div>
                                <h2>{detailEvent.title}</h2>
                                <p>{eventTypeLabels[detailEvent.event_type]}</p>
                            </div>

                            <button type="button" onClick={closeDetailModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="planning-event-detail">
                            <p>
                                <strong>Fecha inicio:</strong>{" "}
                                {formatDate(new Date(detailEvent.start_at))}
                            </p>

                            <p>
                                <strong>Fecha fin:</strong>{" "}
                                {formatDate(new Date(detailEvent.end_at))}
                            </p>

                            <p>
                                <strong>Horario:</strong>{" "}
                                {formatEventTime(detailEvent.start_at)} -{" "}
                                {formatEventTime(detailEvent.end_at)}
                            </p>

                            <p>
                                <strong>Estado:</strong> {statusLabels[detailEvent.status]}
                            </p>

                            <p>
                                <strong>Ubicación:</strong>{" "}
                                {detailEvent.location || "Sin ubicación"}
                            </p>

                            <p>
                                <strong>Trabajo asociado:</strong>{" "}
                                {detailEvent.job_title && detailEvent.job_client_name
                                    ? `${detailEvent.job_title} - ${detailEvent.job_client_name}`
                                    : detailEvent.job_title || "Sin trabajo asociado"}
                            </p>

                            <p>
                                <strong>Descripción:</strong>{" "}
                                {detailEvent.description || "Sin descripción"}
                            </p>
                        </div>

                        <div className="planning-event-detail__actions">
                            <button type="button" onClick={() => openEditModal(detailEvent)}>
                                <Edit size={16} />
                                Editar
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDeleteEvent(detailEvent)}
                            >
                                <Trash2 size={16} />
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
