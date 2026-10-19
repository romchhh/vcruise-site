"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/components/admin/adminApi";
import { Field, Modal } from "@/components/admin/AdminForm";
import {
  AdminCard,
  AdminPageHeader,
  DangerButton,
  DeleteIconButton,
  EditIconButton,
  GhostButton,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/AdminUi";
import ui from "@/components/admin/AdminUi.module.css";
import { formatKyivDateTime } from "@/lib/datetime";
import type { Lead, LeadStatus } from "@/lib/cms/store";

type FilterKey = LeadStatus | "all";

const POLL_INTERVAL_MS = 12_000;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "new", label: "Нові" },
  { key: "in_progress", label: "В роботі" },
  { key: "done", label: "Закриті" },
  { key: "archived", label: "Архів" },
  { key: "all", label: "Усі" },
];

const STATUS_ACTIONS: Array<{ status: LeadStatus; label: string }> = [
  { status: "new", label: "Нова" },
  { status: "in_progress", label: "В роботу" },
  { status: "done", label: "Закрити" },
  { status: "archived", label: "В архів" },
];

type LeadForm = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  cruise: string;
  details: string;
  notes: string;
  status: LeadStatus;
};

const emptyForm: LeadForm = {
  name: "",
  phone: "",
  email: "",
  source: "Адмін",
  cruise: "",
  details: "",
  notes: "",
  status: "new",
};

function leadToForm(lead: Lead): LeadForm {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email || "",
    source: lead.source || "",
    cruise: lead.cruise || "",
    details: lead.details || "",
    notes: lead.notes || "",
    status: lead.status,
  };
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className={ui.detailRow}>
      <span className={ui.detailLabel}>{label}</span>
      <span className={ui.detailValue}>{value || "—"}</span>
    </div>
  );
}

function MetaRows({
  title,
  data,
}: {
  title: string;
  data?: Record<string, unknown>;
}) {
  const entries = data ? Object.entries(data) : [];
  if (entries.length === 0) return null;
  return (
    <>
      {entries.map(([key, value]) => (
        <DetailRow
          key={`${title}-${key}`}
          label={`${title}: ${key}`}
          value={formatMetaValue(value)}
        />
      ))}
    </>
  );
}

export default function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("new");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (silent = false) => {
    try {
      const data = await adminFetch<{ ok: boolean; leads: Lead[] }>(
        "/api/admin/leads",
      );
      setLeads(data.leads || []);
      setError("");
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : "Не вдалося завантажити заявки",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = {
      new: 0,
      in_progress: 0,
      done: 0,
      archived: 0,
      all: leads.length,
    };
    for (const lead of leads) result[lead.status] += 1;
    return result;
  }, [leads]);

  const visible = useMemo(() => {
    const byStatus =
      filter === "all" ? leads : leads.filter((lead) => lead.status === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter((lead) => {
      const hay = [
        lead.name,
        lead.phone,
        lead.email,
        lead.source,
        lead.cruise,
        lead.details,
        lead.notes,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, filter, query]);

  const detail = useMemo(
    () => leads.find((lead) => lead.id === detailId) ?? null,
    [leads, detailId],
  );

  async function changeStatus(lead: Lead, status: LeadStatus) {
    if (lead.status === status) return;
    setSaving(true);
    try {
      const data = await adminFetch<{ ok: boolean; lead: Lead }>(
        "/api/admin/leads",
        {
          method: "PATCH",
          body: JSON.stringify({ id: lead.id, status }),
        },
      );
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? data.lead : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося змінити статус");
    } finally {
      setSaving(false);
    }
  }

  async function removeLead(lead: Lead) {
    if (!window.confirm(`Видалити заявку «${lead.name}»?`)) return;
    setSaving(true);
    try {
      await adminFetch(`/api/admin/leads?id=${encodeURIComponent(lead.id)}`, {
        method: "DELETE",
      });
      setLeads((current) => current.filter((item) => item.id !== lead.id));
      setDetailId((current) => (current === lead.id ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити заявку");
    } finally {
      setSaving(false);
    }
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Вкажіть ім'я та телефон");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (form.id) {
        const data = await adminFetch<{ ok: boolean; lead: Lead }>(
          "/api/admin/leads",
          { method: "PATCH", body: JSON.stringify(form) },
        );
        setLeads((current) =>
          current.map((item) => (item.id === data.lead.id ? data.lead : item)),
        );
      } else {
        const created = await adminFetch<{ ok: boolean; lead: Lead }>(
          "/api/admin/leads",
          { method: "POST", body: JSON.stringify(form) },
        );
        let lead = created.lead;
        if (form.status !== "new") {
          const patched = await adminFetch<{ ok: boolean; lead: Lead }>(
            "/api/admin/leads",
            {
              method: "PATCH",
              body: JSON.stringify({ id: lead.id, status: form.status }),
            },
          );
          lead = patched.lead;
        }
        setLeads((current) => [lead, ...current]);
      }
      setForm(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  }

  function updateForm<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <>
      <AdminPageHeader
        title="Заявки"
        description="Заявки оновлюються автоматично. Нові — зі звуком у всій адмінці (після першого кліку на сторінці)."
        action={
          <PrimaryButton
            onClick={() => {
              setFormError("");
              setForm({ ...emptyForm });
            }}
          >
            Додати заявку
          </PrimaryButton>
        }
      />

      <div className={ui.toolbarRow}>
        <div className={ui.filters} data-tour="tour-leads-filters">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${ui.filterChip} ${filter === item.key ? ui.filterChipActive : ""}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label} ({counts[item.key]})
            </button>
          ))}
        </div>
        <input
          className={ui.searchInput}
          type="search"
          placeholder="Пошук: імʼя, телефон, круїз…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {error ? <p className={ui.empty}>{error}</p> : null}

      <AdminCard>
        <div data-tour="tour-leads-table">
          {loading ? (
            <div className={ui.loading}>Завантаження…</div>
          ) : visible.length === 0 ? (
            <p className={ui.empty}>Заявок у цій категорії немає.</p>
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Клієнт</th>
                    <th>Телефон</th>
                    <th>Джерело</th>
                    <th>Круїз</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((lead) => (
                    <tr
                      key={lead.id}
                      className={ui.rowClickable}
                      onClick={() => setDetailId(lead.id)}
                    >
                      <td style={{ fontWeight: 700 }}>{lead.name}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.source || "—"}</td>
                      <td>{lead.cruise || "—"}</td>
                      <td>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td>{formatKyivDateTime(lead.createdAt)}</td>
                      <td>
                        <div className={ui.iconActions}>
                          <EditIconButton
                            label="Редагувати"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFormError("");
                              setForm(leadToForm(lead));
                            }}
                          />
                          <DeleteIconButton
                            label="Видалити"
                            disabled={saving}
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeLead(lead);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminCard>

      {detail ? (
        <Modal title={`Заявка: ${detail.name}`} onClose={() => setDetailId(null)} wide>
          <div className={ui.detailGrid}>
            <div className={ui.detailRow}>
              <span className={ui.detailLabel}>Статус</span>
              <span>
                <StatusBadge status={detail.status} />
              </span>
            </div>
            <DetailRow label="Ім'я" value={detail.name} />
            <DetailRow label="Телефон" value={detail.phone} />
            <DetailRow label="Email" value={detail.email} />
            <DetailRow label="Джерело" value={detail.source} />
            <DetailRow label="Круїз / компанія" value={detail.cruise} />
            <DetailRow label="Деталі" value={detail.details} />
            <DetailRow label="Нотатки" value={detail.notes} />
            <DetailRow label="Сторінка" value={detail.page} />
            <DetailRow label="Створено" value={formatKyivDateTime(detail.createdAt)} />
            <DetailRow label="Оновлено" value={formatKyivDateTime(detail.updatedAt)} />
            <MetaRows title="Бронювання" data={detail.booking} />
            <MetaRows title="Мета" data={detail.meta} />
          </div>

          <div className={ui.formActions}>
            {STATUS_ACTIONS.filter((item) => item.status !== detail.status).map(
              (item) => (
                <GhostButton
                  key={item.status}
                  disabled={saving}
                  onClick={() => void changeStatus(detail, item.status)}
                >
                  {item.label}
                </GhostButton>
              ),
            )}
            <PrimaryButton
              onClick={() => {
                setFormError("");
                setForm(leadToForm(detail));
              }}
            >
              Редагувати
            </PrimaryButton>
            <DangerButton disabled={saving} onClick={() => void removeLead(detail)}>
              Видалити
            </DangerButton>
          </div>
        </Modal>
      ) : null}

      {form ? (
        <Modal
          title={form.id ? "Редагувати заявку" : "Нова заявка"}
          onClose={() => setForm(null)}
          wide
        >
          <form onSubmit={submitForm} className={ui.modalBody}>
            <div className={ui.formGrid}>
              <Field label="Ім'я *">
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                />
              </Field>
              <Field label="Телефон *">
                <input
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                />
              </Field>
              <Field label="Джерело">
                <input
                  value={form.source}
                  onChange={(event) => updateForm("source", event.target.value)}
                />
              </Field>
              <Field label="Круїз / компанія">
                <input
                  value={form.cruise}
                  onChange={(event) => updateForm("cruise", event.target.value)}
                />
              </Field>
              <Field label="Статус">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value as LeadStatus)
                  }
                >
                  <option value="new">Нова</option>
                  <option value="in_progress">В роботі</option>
                  <option value="done">Закрита</option>
                  <option value="archived">Архів</option>
                </select>
              </Field>
            </div>
            <Field label="Деталі">
              <textarea
                value={form.details}
                onChange={(event) => updateForm("details", event.target.value)}
              />
            </Field>
            <Field label="Нотатки">
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
              />
            </Field>
            {formError ? (
              <p style={{ color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>
                {formError}
              </p>
            ) : null}
            <div className={ui.formActions}>
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? "Збереження…" : "Зберегти"}
              </PrimaryButton>
              <GhostButton onClick={() => setForm(null)}>Скасувати</GhostButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
