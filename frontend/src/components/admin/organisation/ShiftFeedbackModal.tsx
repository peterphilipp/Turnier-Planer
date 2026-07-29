import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../api';
import { Tournament } from '../shared';
import '../../../styles/components/dashboard.css';

interface FeedbackItem {
  id: number;
  ratingWorkload?: number | null;
  ratingOrganization?: number | null;
  ratingFun?: number | null;
  ratingComment?: string | null;
  date: string;
  slot: string;
  role: string;
  user?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  shift?: {
    startMin?: number | null;
    endMin?: number | null;
    workArea?: {
      id?: number;
      name?: string;
      icon?: string;
    } | null;
  } | null;
}

interface WorkAreaAggregation {
  workAreaName: string;
  workAreaIcon: string;
  totalRatings: number;
  avgWorkload: number | null;
  avgOrganization: number | null;
  avgFun: number | null;
  comments: { id: number; comment: string; userName: string; slot: string; date: string }[];
}

interface ShiftFeedbackModalProps {
  tournament: Tournament;
  onClose: () => void;
}

export default function ShiftFeedbackModal({ tournament, onClose }: ShiftFeedbackModalProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('all');

  useEffect(() => {
    loadFeedback();
  }, [tournament.id]);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/volunteer-shifts/feedback?tournamentId=${tournament.id}`);
      setFeedbacks(data || []);
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Laden der Schicht-Bewertungen');
    } finally {
      setLoading(false);
    }
  };

  const aggregate = (): Record<string, WorkAreaAggregation> => {
    const result: Record<string, WorkAreaAggregation> = {};

    for (const item of feedbacks) {
      const areaName = item.shift?.workArea?.name || item.role || 'Allgemein';
      const areaIcon = item.shift?.workArea?.icon || '📍';

      if (!result[areaName]) {
        result[areaName] = {
          workAreaName: areaName,
          workAreaIcon: areaIcon,
          totalRatings: 0,
          avgWorkload: null,
          avgOrganization: null,
          avgFun: null,
          comments: []
        };
      }

      const agg = result[areaName];
      let hasRating = false;

      if (item.ratingWorkload != null && item.ratingWorkload >= 1 && item.ratingWorkload <= 5) {
        agg.avgWorkload = agg.avgWorkload === null 
          ? item.ratingWorkload 
          : (agg.avgWorkload * agg.totalRatings + item.ratingWorkload) / (agg.totalRatings + 1);
        hasRating = true;
      }
      if (item.ratingOrganization != null && item.ratingOrganization >= 1 && item.ratingOrganization <= 5) {
        agg.avgOrganization = agg.avgOrganization === null 
          ? item.ratingOrganization 
          : (agg.avgOrganization * (hasRating ? agg.totalRatings : agg.totalRatings) + item.ratingOrganization) / (hasRating ? agg.totalRatings + 1 : agg.totalRatings + 1);
        hasRating = true;
      }
      if (item.ratingFun != null && item.ratingFun >= 1 && item.ratingFun <= 5) {
        agg.avgFun = agg.avgFun === null 
          ? item.ratingFun 
          : (agg.avgFun * (hasRating ? agg.totalRatings : agg.totalRatings) + item.ratingFun) / (hasRating ? agg.totalRatings + 1 : agg.totalRatings + 1);
        hasRating = true;
      }

      if (hasRating) {
        agg.totalRatings += 1;
      }

      if (item.ratingComment && item.ratingComment.trim().length > 0) {
        agg.comments.push({
          id: item.id,
          comment: item.ratingComment.trim(),
          userName: item.user?.name || 'Helfer',
          slot: item.slot,
          date: new Date(item.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
        });
      }
    }

    for (const key in result) {
      const agg = result[key];
      if (agg.avgWorkload !== null) agg.avgWorkload = Math.round(agg.avgWorkload * 10) / 10;
      if (agg.avgOrganization !== null) agg.avgOrganization = Math.round(agg.avgOrganization * 10) / 10;
      if (agg.avgFun !== null) agg.avgFun = Math.round(agg.avgFun * 10) / 10;
    }

    return result;
  };

  const aggregations = aggregate();
  const allComments = feedbacks.filter(f => f.ratingComment && f.ratingComment.trim().length > 0);
  const areas = Object.keys(aggregations);

  const getWorkloadBadge = (val: number | null) => {
    if (val === null) return <span className="feedback-badge-empty">–</span>;
    if (val >= 4.0) return <span className="feedback-badge-high">{val} / 5 🥵 (Hoch)</span>;
    if (val <= 1.8) return <span className="feedback-badge-low">{val} / 5 😴 (Ruhig)</span>;
    return <span className="feedback-badge-opt">{val} / 5 😊 (Optimal)</span>;
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal-content">
        
        {/* Header */}
        <div className="feedback-modal-header">
          <div>
            <h2 className="feedback-modal-title">
              <span>📊</span> Helfer-Feedback & Learnings ({tournament.name})
            </h2>
            <div className="feedback-modal-subtitle">
              Erkenntnisse und Bewertungen nach Kriterien für die zukünftige Schicht- & Turnierplanung.
            </div>
          </div>
          <button onClick={onClose} className="feedback-modal-close">✕</button>
        </div>

        {/* Content */}
        <div className="feedback-modal-body">
          {loading && <div className="feedback-loading">Lade Bewertungen...</div>}
          {error && <div className="feedback-error">{error}</div>}

          {!loading && !error && feedbacks.length === 0 && (
            <div className="feedback-empty">
              <div className="feedback-empty-icon">📝</div>
              <div className="feedback-empty-title">Noch keine Bewertungen vorhanden</div>
              <div className="feedback-empty-desc">Sobald Helfer nach ihren Schichten eine Bewertung oder Notiz abgeben, erscheinen diese hier.</div>
            </div>
          )}

          {!loading && !error && feedbacks.length > 0 && (
            <>
              {/* Aggregation Cards per WorkArea */}
              <div>
                <h3 className="feedback-section-title">📈 Auswertung nach Arbeitsbereichen</h3>
                <div className="feedback-grid">
                  {areas.map(area => {
                    const agg = aggregations[area];
                    const isHighLoad = agg.avgWorkload !== null && agg.avgWorkload >= 4.0;
                    return (
                      <div key={area} className={`feedback-agg-card ${isHighLoad ? "feedback-agg-card-highload" : "feedback-agg-card-normal"}`}>
                        <div className="feedback-agg-header">
                          <span className="feedback-agg-icon">{agg.workAreaIcon}</span>
                          <strong className="feedback-agg-title">{agg.workAreaName}</strong>
                          <span className="feedback-agg-count">{agg.totalRatings} Bewertungen</span>
                        </div>

                        <div className="feedback-agg-stats">
                          <div className="feedback-agg-stat-row">
                            <span className="feedback-agg-stat-label">Stress / Auslastung:</span>
                            {getWorkloadBadge(agg.avgWorkload)}
                          </div>
                          <div className="feedback-agg-stat-row">
                            <span className="feedback-agg-stat-label">Organisation / Info:</span>
                            <span className="feedback-agg-stat-value">{agg.avgOrganization !== null ? `${agg.avgOrganization} / 5 ⭐` : '–'}</span>
                          </div>
                          <div className="feedback-agg-stat-row">
                            <span className="feedback-agg-stat-label">Spaß / Stimmung:</span>
                            <span className="feedback-agg-stat-value">{agg.avgFun !== null ? `${agg.avgFun} / 5 🤩` : '–'}</span>
                          </div>
                        </div>

                        {/* Learning Recommendation */}
                        {isHighLoad && (
                          <div className="feedback-learning-alert">
                            <span>💡</span>
                            <span><strong>Learning:</strong> Hohe Arbeitsbelastung. Für künftige Turniere +1 Helfer oder kürzere Schichten prüfen!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter for Comments */}
              <div>
                <div className="feedback-comments-header">
                  <h3 className="feedback-comments-title">💬 Notizen & Verbesserungsvorschläge ({allComments.length})</h3>
                  {areas.length > 1 && (
                    <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="feedback-comments-select">
                      <option value="all">Alle Bereiche</option>
                      {areas.map(a => <option key={a} value={a}>{aggregations[a].workAreaIcon} {a}</option>)}
                    </select>
                  )}
                </div>

                <div className="feedback-comments-list">
                  {allComments
                    .filter(c => selectedArea === 'all' || (c.shift?.workArea?.name || c.role) === selectedArea)
                    .map(item => (
                      <div key={item.id} className="feedback-comment-card">
                        <div className="feedback-comment-meta">
                          <div>
                            <strong className="feedback-comment-area">{item.shift?.workArea?.icon || '📍'} {item.shift?.workArea?.name || item.role}</strong>
                            <span className="feedback-comment-dot">•</span>
                            <span>{new Date(item.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ({item.slot})</span>
                          </div>
                          <div className="feedback-comment-user">👤 {item.user?.name || 'Helfer'}</div>
                        </div>
                        <div className="feedback-comment-text">
                          "{item.ratingComment}"
                        </div>
                        <div className="feedback-comment-ratings">
                          {item.ratingWorkload != null && <span>Stress: <strong>{item.ratingWorkload}/5</strong></span>}
                          {item.ratingOrganization != null && <span>Orga: <strong>{item.ratingOrganization}/5</strong></span>}
                          {item.ratingFun != null && <span>Spaß: <strong>{item.ratingFun}/5</strong></span>}
                        </div>
                      </div>
                    ))}
                  {allComments.filter(c => selectedArea === 'all' || (c.shift?.workArea?.name || c.role) === selectedArea).length === 0 && (
                    <div className="feedback-comments-empty">Keine Kommentare in diesem Bereich vorhanden.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="feedback-modal-footer">
          <button onClick={onClose} className="feedback-modal-btn">Schließen</button>
        </div>
      </div>
    </div>
  );
}
