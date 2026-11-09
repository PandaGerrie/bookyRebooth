import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, uploadMedia } from "../api/client";
import type {
  Flow,
  FlowStep,
  FlowStepType,
  Location,
  ProductSet,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";

type DraftStep = FlowStep & { key: string };
type SlideMode = "pick" | "configure";
type BuilderTab = "builder" | "settings";
type SelectOption = { value: string; label: string };

function normalizeStep(step: FlowStep): FlowStep {
  if (step.type === "LOCATIONS") {
    return {
      ...step,
      config: {
        locationIds: step.config.locationIds ?? [],
        showImage: step.config.showImage ?? true,
      },
    };
  }
  return step;
}

const BLOCKS: Array<{
  type: FlowStepType;
  title: string;
  description: string;
}> = [
  {
    type: "FREE_CHOICE",
    title: "Vrije keuze toevoegen",
    description: "Eigen opties met naam, slug en optionele afbeelding.",
  },
  {
    type: "PRODUCT_SET",
    title: "Product set",
    description: "Kies één globale product set.",
  },
  {
    type: "LOCATIONS",
    title: "Locaties",
    description: "Selecteer één of meer locaties van jouw entiteit.",
  },
  {
    type: "SELLERS_AGENDA",
    title: "Verkopers agenda's",
    description: "Beschikbare verkopers worden automatisch opgehaald.",
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createDraftStep(type: FlowStepType): DraftStep {
  const key = crypto.randomUUID();
  switch (type) {
    case "FREE_CHOICE":
      return {
        key,
        type,
        config: { options: [{ name: "", slug: "", imageUrl: null }] },
      };
    case "PRODUCT_SET":
      return { key, type, config: { productSetId: "" } };
    case "LOCATIONS":
      return { key, type, config: { locationIds: [], showImage: true } };
    case "SELLERS_AGENDA":
      return { key, type, config: {} };
  }
}

function stepTitle(type: FlowStepType) {
  return BLOCKS.find((block) => block.type === type)?.title ?? type;
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 15.4 6 14l6-6 6 6-1.4 1.4L12 10.8z"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z"
      />
    </svg>
  );
}

export function FlowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [entitySlug, setEntitySlug] = useState(user?.entity?.slug || "global");
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [productSets, setProductSets] = useState<ProductSet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<SlideMode>("pick");
  const [draftStep, setDraftStep] = useState<DraftStep | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState<
    number | null
  >(null);
  const [activeTab, setActiveTab] = useState<BuilderTab>("builder");

  const locationOptions = useMemo<SelectOption[]>(
    () =>
      locations.map((location) => ({
        value: location.id,
        label: location.name,
      })),
    [locations],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [flowData, productSetsData] = await Promise.all([
          api<{ flow: Flow }>(`/flows/${id}`),
          api<{ productSets: ProductSet[] }>("/product-sets"),
        ]);

        if (cancelled) return;

        const flow = flowData.flow;
        setName(flow.name);
        setSlug(flow.slug || slugify(flow.name));
        setSlugTouched(Boolean(flow.slug));
        setFeaturedImage(flow.featuredImage);
        setActive(flow.active);
        setEntitySlug(flow.entity?.slug || "global");
        setProductSets(productSetsData.productSets);
        setSteps(
          (flow.steps ?? []).map((step) => ({
            ...normalizeStep(step),
            key: step.id ?? crypto.randomUUID(),
          })),
        );

        const locationsData = await api<{ locations: Location[] }>(
          `/locations?entityId=${encodeURIComponent(flow.entityId)}`,
        );
        if (!cancelled) setLocations(locationsData.locations);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Laden mislukt");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function openPicker() {
    setEditingKey(null);
    setDraftStep(null);
    setSlideMode("pick");
    setSlideOpen(true);
  }

  function openConfigure(type: FlowStepType) {
    setDraftStep(createDraftStep(type));
    setSlideMode("configure");
  }

  function openEdit(step: DraftStep) {
    setEditingKey(step.key);
    setDraftStep({
      ...structuredClone(normalizeStep(step)),
      key: step.key,
    } as DraftStep);
    setSlideMode("configure");
    setSlideOpen(true);
  }

  function closeSlide() {
    setSlideOpen(false);
    setSlideMode("pick");
    setDraftStep(null);
    setEditingKey(null);
  }

  function confirmDraftStep() {
    if (!draftStep) return;

    if (draftStep.type === "FREE_CHOICE") {
      const options = draftStep.config.options.filter(
        (option) => option.name.trim() && option.slug.trim(),
      );
      if (options.length === 0) {
        setError("Voeg minstens één optie toe met naam en slug");
        return;
      }
      draftStep.config.options = options;
    }

    if (draftStep.type === "PRODUCT_SET" && !draftStep.config.productSetId) {
      setError("Kies een product set");
      return;
    }

    if (
      draftStep.type === "LOCATIONS" &&
      draftStep.config.locationIds.length === 0
    ) {
      setError("Selecteer minstens één locatie");
      return;
    }

    setError(null);
    setSteps((prev) => {
      if (editingKey) {
        return prev.map((step) =>
          step.key === editingKey ? { ...draftStep, key: editingKey } : step,
        );
      }
      return [...prev, { ...draftStep, key: crypto.randomUUID() }];
    });
    closeSlide();
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((step) => step.key !== key));
  }

  function moveStep(key: string, direction: -1 | 1) {
    setSteps((prev) => {
      const index = prev.findIndex((step) => step.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function saveFlow() {
    if (!id) return;
    if (!name.trim()) {
      setError("Naam is verplicht");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is verplicht");
      setActiveTab("settings");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await api<{ flow: Flow }>(`/flows/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          featuredImage,
          active,
          steps: steps.map(({ type, config }) => ({ type, config })),
        }),
      });

      setSteps(
        (data.flow.steps ?? []).map((step) => ({
          ...normalizeStep(step),
          key: step.id ?? crypto.randomUUID(),
        })),
      );
      navigate("/new-flow");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  async function uploadOptionImage(index: number, file: File | null) {
    if (!file || !draftStep || draftStep.type !== "FREE_CHOICE") return;
    setUploadingOptionIndex(index);
    setError(null);
    try {
      const url = await uploadMedia(file, entitySlug);
      setDraftStep({
        ...draftStep,
        config: {
          options: draftStep.config.options.map((option, optionIndex) =>
            optionIndex === index ? { ...option, imageUrl: url } : option,
          ),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislukt");
    } finally {
      setUploadingOptionIndex(null);
    }
  }

  function renderStepSummary(step: DraftStep) {
    if (step.type === "FREE_CHOICE") {
      return `${step.config.options.length} optie(s)`;
    }
    if (step.type === "PRODUCT_SET") {
      return (
        productSets.find((item) => item.id === step.config.productSetId)
          ?.name || "Geen product set"
      );
    }
    if (step.type === "LOCATIONS") {
      return `${step.config.locationIds.length} locatie(s)`;
    }
    return "Automatisch uit systeem";
  }

  if (loading) {
    return <div className="empty">Laden…</div>;
  }

  return (
    <div className={slideOpen ? "flow-page with-slide" : "flow-page"}>
      <div className="page-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="muted" style={{ marginBottom: "0.35rem" }}>
            <Link to="/new-flow">← Terug naar overzicht</Link>
          </p>
          <input
            className="page-title-input"
            value={name}
            onChange={(e) => {
              const nextName = e.target.value;
              setName(nextName);
              if (!slugTouched) {
                setSlug(slugify(nextName));
              }
            }}
            placeholder="Naam van de flow"
            aria-label="Naam van de flow"
          />
          <p>Bouw de stappen van deze bookingflow.</p>
        </div>
        <div className="page-header-actions">
          <label
            className="switch-row switch-row-compact"
            title={active ? "Actief" : "Inactief"}
          >
            <span className="switch">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                aria-label={active ? "Deactiveer flow" : "Activeer flow"}
              />
              <span className="switch-slider" />
            </span>
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => void saveFlow()}
            disabled={saving}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="error" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      ) : null}

      <div className="tabs" role="tablist" aria-label="Flow secties">
        <button
          type="button"
          role="tab"
          className={activeTab === "builder" ? "tab active" : "tab"}
          aria-selected={activeTab === "builder"}
          onClick={() => setActiveTab("builder")}
        >
          Flow builder
        </button>
        <button
          type="button"
          role="tab"
          className={activeTab === "settings" ? "tab active" : "tab"}
          aria-selected={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        >
          Flow settings
        </button>
      </div>

      {activeTab === "builder" ? (
        <div className="panel flow-canvas">
          <div className="flow-track">
            {steps.map((step, index) => (
              <div key={step.key} className="flow-step-wrap">
                {index > 0 ? (
                  <div className="flow-connector" aria-hidden="true" />
                ) : null}
                <div className="flow-step-card">
                  <div className="flow-step-head">
                    <div>
                      <strong>{stepTitle(step.type)}</strong>
                      <p className="muted">{renderStepSummary(step)}</p>
                    </div>
                    <div className="actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Omhoog"
                        aria-label="Omhoog"
                        disabled={index === 0}
                        onClick={() => moveStep(step.key, -1)}
                      >
                        <IconChevronUp />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Omlaag"
                        aria-label="Omlaag"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(step.key, 1)}
                      >
                        <IconChevronDown />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => openEdit(step)}
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => removeStep(step.key)}
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {steps.length > 0 ? (
              <div className="flow-connector" aria-hidden="true" />
            ) : null}

            <button type="button" className="flow-add-btn" onClick={openPicker}>
              <span className="add-product-circle">+</span>
              <span>Voeg stap toe</span>
            </button>

            {steps.length === 0 ? (
              <p className="muted" style={{ textAlign: "center" }}>
                Nog geen stappen. Klik op “Voeg stap toe” om te beginnen.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body stack" style={{ maxWidth: 520 }}>
            <label>
              Flow slug
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="bijv. bmw-proefrit"
                required
              />
            </label>

            <label>
              Featured image
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) return;
                  setUploadingFeatured(true);
                  setError(null);
                  try {
                    const url = await uploadMedia(file, entitySlug);
                    setFeaturedImage(url);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Upload mislukt",
                    );
                  } finally {
                    setUploadingFeatured(false);
                  }
                }}
              />
            </label>

            {uploadingFeatured ? (
              <p className="muted">Afbeelding uploaden…</p>
            ) : null}

            {featuredImage ? (
              <div className="stack">
                <img
                  src={featuredImage}
                  alt="Featured"
                  style={{
                    width: "100%",
                    maxWidth: 360,
                    height: 200,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                  }}
                />
                <div className="actions" style={{ justifyContent: "flex-start" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => setFeaturedImage(null)}
                  >
                    Afbeelding verwijderen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {slideOpen ? (
        <>
          <button
            type="button"
            className="slideout-backdrop"
            aria-label="Sluit panel"
            onClick={closeSlide}
          />
          <aside className="slideout">
            <div className="slideout-header">
              <div>
                <h2>
                  {slideMode === "pick"
                    ? "Stap toevoegen"
                    : editingKey
                      ? "Stap bewerken"
                      : draftStep
                        ? stepTitle(draftStep.type)
                        : "Configureer stap"}
                </h2>
                <p className="muted">
                  {slideMode === "pick"
                    ? "Kies een builderblok"
                    : "Vul de instellingen in"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={closeSlide}
              >
                Sluiten
              </button>
            </div>

            <div className="slideout-body stack">
              {slideMode === "pick" ? (
                BLOCKS.map((block) => (
                  <button
                    key={block.type}
                    type="button"
                    className="builder-block"
                    onClick={() => openConfigure(block.type)}
                  >
                    <strong>{block.title}</strong>
                    <span className="muted">{block.description}</span>
                  </button>
                ))
              ) : draftStep ? (
                <>
                  {draftStep.type === "FREE_CHOICE" ? (
                    <div className="stack">
                      <div className="flow-step-head">
                        <h3>Opties</h3>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() =>
                            setDraftStep({
                              ...draftStep,
                              config: {
                                options: [
                                  ...draftStep.config.options,
                                  { name: "", slug: "", imageUrl: null },
                                ],
                              },
                            })
                          }
                        >
                          Optie toevoegen
                        </button>
                      </div>

                      {draftStep.config.options.map((option, index) => (
                        <div
                          key={`option-${index}`}
                          className="repeater-item"
                        >
                          <div className="panel-body stack">
                            <div className="form-grid two">
                              <label>
                                Naam
                                <input
                                  value={option.name}
                                  onChange={(e) => {
                                    const nextName = e.target.value;
                                    setDraftStep({
                                      ...draftStep,
                                      config: {
                                        options: draftStep.config.options.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  name: nextName,
                                                  slug: item.slug
                                                    ? item.slug
                                                    : slugify(nextName),
                                                }
                                              : item,
                                        ),
                                      },
                                    });
                                  }}
                                />
                              </label>
                              <label>
                                Slug
                                <input
                                  value={option.slug}
                                  onChange={(e) =>
                                    setDraftStep({
                                      ...draftStep,
                                      config: {
                                        options: draftStep.config.options.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  slug: e.target.value,
                                                }
                                              : item,
                                        ),
                                      },
                                    })
                                  }
                                />
                              </label>
                            </div>
                            <label>
                              Afbeelding (optioneel)
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  void uploadOptionImage(
                                    index,
                                    e.target.files?.[0] ?? null,
                                  )
                                }
                              />
                            </label>
                            {uploadingOptionIndex === index ? (
                              <p className="muted">Uploaden…</p>
                            ) : null}
                            {option.imageUrl ? (
                              <img
                                src={option.imageUrl}
                                alt={option.name || "Optie"}
                                className="repeater-preview"
                              />
                            ) : null}
                            {draftStep.config.options.length > 1 ? (
                              <div className="actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-small"
                                  onClick={() =>
                                    setDraftStep({
                                      ...draftStep,
                                      config: {
                                        options:
                                          draftStep.config.options.filter(
                                            (_item, itemIndex) =>
                                              itemIndex !== index,
                                          ),
                                      },
                                    })
                                  }
                                >
                                  Optie verwijderen
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {draftStep.type === "PRODUCT_SET" ? (
                    <label>
                      Product set
                      <select
                        value={draftStep.config.productSetId}
                        onChange={(e) =>
                          setDraftStep({
                            ...draftStep,
                            config: { productSetId: e.target.value },
                          })
                        }
                      >
                        <option value="">Kies product set…</option>
                        {productSets.map((set) => (
                          <option key={set.id} value={set.id}>
                            {set.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {draftStep.type === "LOCATIONS" ? (
                    <div className="stack">
                      <label>
                        Locaties
                        <Select
                          isMulti
                          classNamePrefix="rs"
                          options={locationOptions}
                          value={locationOptions.filter((option) =>
                            draftStep.config.locationIds.includes(option.value),
                          )}
                          onChange={(selected) =>
                            setDraftStep({
                              ...draftStep,
                              config: {
                                ...draftStep.config,
                                locationIds: selected.map(
                                  (option) => option.value,
                                ),
                              },
                            })
                          }
                          placeholder="Selecteer locaties…"
                          noOptionsMessage={() => "Geen locaties"}
                        />
                      </label>
                      <label className="switch-row switch-row-compact">
                        <span className="switch">
                          <input
                            type="checkbox"
                            checked={draftStep.config.showImage}
                            onChange={(e) =>
                              setDraftStep({
                                ...draftStep,
                                config: {
                                  ...draftStep.config,
                                  showImage: e.target.checked,
                                },
                              })
                            }
                          />
                          <span className="switch-slider" />
                        </span>
                        <span>Afbeelding tonen</span>
                      </label>
                    </div>
                  ) : null}

                  {draftStep.type === "SELLERS_AGENDA" ? (
                    <div className="info-box">
                      De beschikbare verkopers worden automatisch opgehaald uit
                      het systeem.
                    </div>
                  ) : null}

                  <div className="actions">
                    {!editingKey ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSlideMode("pick")}
                      >
                        Terug
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      onClick={confirmDraftStep}
                      disabled={uploadingOptionIndex !== null}
                    >
                      {editingKey ? "Bijwerken" : "Toevoegen aan flow"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
