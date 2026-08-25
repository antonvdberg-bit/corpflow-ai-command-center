import { useMemo, useState } from 'react';
import { pipelineStageLabel } from '../../lib/app/prospect-operations-pipeline.js';

/**
 * Operating Workspace — Postgres-backed Prospect Pipeline (#997).
 * Cards are the same shared prospect records as Prospect Operations.
 * Stage moves PATCH /api/app/prospect. No browser storage. No send.
 *
 * @param {{
 *   lanes?: Array<{
 *     stage: string,
 *     label?: string,
 *     count?: number,
 *     prospects?: Array<Record<string, unknown>>,
 *   }>,
 *   filters?: { owner?: string, product?: string, source?: string, urgency?: string },
 *   filterOptions?: { owners?: string[], products?: string[], sources?: string[], urgencies?: string[] },
 *   dataSource?: string,
 *   count?: number,
 *   unfilteredCount?: number,
 *   busy?: boolean,
 *   proofWanted?: boolean,
 *   movingId?: string,
 *   moveError?: string,
 *   onFilterChange?: (next: Record<string, string>) => void,
 *   onMoveStage?: (id: string, canonicalStage: string) => void,
 * }} props
 */
export default function ProspectPipelineBoard({
  lanes,
  filters,
  filterOptions,
  dataSource,
  count,
  unfilteredCount,
  busy,
  proofWanted,
  movingId,
  moveError,
  onFilterChange,
  onMoveStage,
}) {
  const laneList = Array.isArray(lanes) ? lanes : [];
  const filterState = filters && typeof filters === 'object' ? filters : {};
  const options = filterOptions && typeof filterOptions === 'object' ? filterOptions : {};

  if (busy) return null;

  return (
    <section className="cf-app-panel" data-testid="prospect-pipeline">
      <h1 className="cf-app-h1">Prospect Pipeline</h1>
      <p className="cf-app-lead">
        Canonical sell-cycle board for the same Postgres prospect records as Prospect Operations
        and Today / My Work. Stage changes persist through the shared write path. The retired
        browser checklist at <a href="/change/revenue">/change/revenue</a> is a notice only —
        not a pipeline.
      </p>
      {dataSource ? (
        <p className="cf-app-muted" data-testid="prospect-pipeline-meta">
          Data source <code data-testid="prospect-pipeline-data-source">{dataSource}</code>
          {' · '}
          {count ?? 0} shown
          {unfilteredCount != null && unfilteredCount !== count ? ` of ${unfilteredCount}` : ''}
          {' · '}
          Postgres-backed
        </p>
      ) : null}

      <form
        className="cf-pipe-filters"
        data-testid="prospect-pipeline-filters"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="cf-app-label">
          Owner
          <select
            className="cf-app-input"
            data-testid="pipeline-filter-owner"
            value={String(filterState.owner || '')}
            onChange={(event) =>
              onFilterChange?.({ ...filterState, owner: event.target.value })
            }
          >
            <option value="">All owners</option>
            {(options.owners || []).map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className="cf-app-label">
          Product / source
          <select
            className="cf-app-input"
            data-testid="pipeline-filter-product"
            value={String(filterState.product || '')}
            onChange={(event) =>
              onFilterChange?.({ ...filterState, product: event.target.value })
            }
          >
            <option value="">All products</option>
            {(options.products || []).map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </label>
        <label className="cf-app-label">
          Urgency
          <select
            className="cf-app-input"
            data-testid="pipeline-filter-urgency"
            value={String(filterState.urgency || '')}
            onChange={(event) =>
              onFilterChange?.({ ...filterState, urgency: event.target.value })
            }
          >
            <option value="">All urgency</option>
            {(options.urgencies || []).map((urgency) => (
              <option key={urgency} value={urgency}>
                {urgency}
              </option>
            ))}
          </select>
        </label>
      </form>

      {moveError ? (
        <p className="cf-app-error" data-testid="pipeline-move-error">
          {moveError}
        </p>
      ) : null}

      <div className="cf-pipe-board" data-testid="prospect-pipeline-board">
        {laneList.map((lane) => (
          <PipelineLane
            key={lane.stage}
            lane={lane}
            proofWanted={proofWanted}
            movingId={movingId}
            onMoveStage={onMoveStage}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   lane: {
 *     stage: string,
 *     label?: string,
 *     count?: number,
 *     prospects?: Array<Record<string, unknown>>,
 *   },
 *   proofWanted?: boolean,
 *   movingId?: string,
 *   onMoveStage?: (id: string, canonicalStage: string) => void,
 * }} props
 */
function PipelineLane({ lane, proofWanted, movingId, onMoveStage }) {
  const cards = Array.isArray(lane.prospects) ? lane.prospects : [];
  return (
    <div
      className="cf-pipe-lane"
      data-testid={`pipeline-lane-${lane.stage}`}
      data-stage={lane.stage}
    >
      <div className="cf-pipe-lane-head">
        <strong>{lane.label || pipelineStageLabel(lane.stage)}</strong>
        <span className="cf-app-muted">{cards.length}</span>
      </div>
      {cards.length === 0 ? (
        <p className="cf-app-muted cf-pipe-empty">No prospects in this stage.</p>
      ) : (
        cards.map((card) => (
          <PipelineCard
            key={String(card.id)}
            card={card}
            proofWanted={proofWanted}
            moving={movingId === String(card.id)}
            onMoveStage={onMoveStage}
          />
        ))
      )}
    </div>
  );
}

/**
 * @param {{
 *   card: Record<string, unknown>,
 *   proofWanted?: boolean,
 *   moving?: boolean,
 *   onMoveStage?: (id: string, canonicalStage: string) => void,
 * }} props
 */
function PipelineCard({ card, proofWanted, moving, onMoveStage }) {
  const id = String(card.id || '');
  const name = String(card.organisation_name || card.person_name || id);
  const allowed = Array.isArray(card.allowed_canonical_stages)
    ? card.allowed_canonical_stages.map((item) => String(item))
    : [];
  const signals = Array.isArray(card.exception_signals) ? card.exception_signals : [];
  const shared = card.shared_detail_path ? String(card.shared_detail_path) : `/app/prospects/${id}`;
  const sharedHref =
    shared && proofWanted ? `${shared}${shared.includes('?') ? '&' : '?'}proof=1` : shared;
  const [nextStage, setNextStage] = useState('');
  const valueLabel =
    card.estimated_value != null && String(card.estimated_value).trim()
      ? `${card.currency ? `${card.currency} ` : ''}${card.estimated_value}`
      : '—';

  const staleBits = useMemo(() => {
    const days = card.stage_age_days;
    const stale = card.stale === true;
    if (days == null && !stale) return '—';
    const age = days != null ? `${days}d` : '';
    return stale ? `stale${age ? ` · ${age}` : ''}` : age;
  }, [card.stage_age_days, card.stale]);

  return (
    <article
      className="cf-pipe-card"
      data-testid={`pipeline-card-${id}`}
      data-stale={card.stale === true ? 'true' : 'false'}
      data-stage={String(card.canonical_stage || '')}
    >
      <a className="cf-pipe-card-title" href={sharedHref} data-testid={`pipeline-detail-${id}`}>
        {name}
      </a>
      <p className="cf-app-muted">{String(card.person_name || card.reference || id)}</p>
      <dl className="cf-pipe-card-meta">
        <div>
          <dt>Owner</dt>
          <dd>{String(card.owner || 'Unassigned')}</dd>
        </div>
        <div>
          <dt>Product</dt>
          <dd>{String(card.offer_title || card.product_service_path || card.product || '—')}</dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd>{valueLabel}</dd>
        </div>
        <div>
          <dt>Next action</dt>
          <dd>
            {String(card.next_action || card.recommended_next_action || '—')}
            {card.next_action_due ? (
              <div className="cf-app-muted">{String(card.next_action_due)}</div>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd data-testid={`pipeline-age-${id}`}>{staleBits}</dd>
        </div>
      </dl>
      {signals.length > 0 ? (
        <div className="cf-pipe-signals">
          {signals.map((signal) => (
            <span key={String(signal)} className="cf-app-signal">
              {String(signal)}
            </span>
          ))}
        </div>
      ) : null}
      <form
        className="cf-pipe-move"
        data-testid={`pipeline-move-form-${id}`}
        onSubmit={(event) => {
          event.preventDefault();
          const stage = String(nextStage || '').trim();
          if (!stage) return;
          onMoveStage?.(id, stage);
        }}
      >
        <label className="cf-app-label">
          Move stage
          <select
            className="cf-app-input"
            data-testid={`pipeline-move-${id}`}
            value={nextStage}
            disabled={moving || allowed.length === 0}
            onChange={(event) => setNextStage(event.target.value)}
          >
            <option value="">Allowed next stage</option>
            {allowed.map((stage) => (
              <option key={stage} value={stage}>
                {pipelineStageLabel(stage)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="cf-app-btn"
          data-testid={`pipeline-move-submit-${id}`}
          disabled={moving || !nextStage}
        >
          {moving ? 'Saving…' : 'Persist stage'}
        </button>
      </form>
    </article>
  );
}
