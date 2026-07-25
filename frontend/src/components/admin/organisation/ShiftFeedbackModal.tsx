import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../../api';
import { Tournament } from '../shared';

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
    if (val === null) return <span style={{ color: '#888' }}>–</span>;
    if (val >= 4.0) return <span style={{ background: '#f8d7da', color: '#721c24', padding: '2px 8px', borderRadius: 6, fontWeight: 'bold' }}>{val} / 5 🥵 (Hoch)</span>;
    if (val <= 1.8) return <span style={{ background: '#d1ecf1', color: '#0c5460', padding: '2px 8px', borderRadius: 6, fontWeight: 'bold' }}>{val} / 5 😴 (Ruhig)</span>;
    return <span style={{ background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: 6, fontWeight: 'bold' }}>{val} / 5 😊 (Optimal)</span>;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#0d6efd', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊</span> Helfer-Feedback & Learnings ({tournament.name})
            </h2>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Erkenntnisse und Bewertungen nach Kriterien für die zukünftige Schicht- & Turnierplanung.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666', padding: 4 }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: '#666', fontSize: 16 }}>Lade Bewertungen...</div>}
          {error && <div style={{ padding: 16, background: '#f8d7da', color: '#721c24', borderRadius: 10 }}>{error}</div>}

          {!loading && !error && feedbacks.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 12, color: '#666' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>Noch keine Bewertungen vorhanden</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Sobald Helfer nach ihren Schichten eine Bewertung oder Notiz abgeben, erscheinen diese hier.</div>
            </div>
          )}

          {!loading && !error && feedbacks.length > 0 && (
            <>
              {/* Aggregation Cards per WorkArea */}
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#333' }}>📈 Auswertung nach Arbeitsbereichen</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                  {areas.map(area => {
                    const agg = aggregations[area];
                    const isHighLoad = agg.avgWorkload !== null && agg.avgWorkload >= 4.0;
                    return (
                      <div key={area} style={{ border: '1px solid #e9ecef', borderRadius: 12, padding: 16, background: isHighLoad ? '#fffcfc' : '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #f1f3f5', paddingBottom: 8 }}>
                          <span style={{ fontSize: 20 }}>{agg.workAreaIcon}</span>
                          <strong style={{ fontSize: 15, color: '#333' }}>{agg.workAreaName}</strong>
                          <span style={{ marginLeft: 'auto', fontSize: 12, background: '#e9ecef', padding: '2px 8px', borderRadius: 10 }}>{agg.totalRatings} Bewertungen</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#555' }}>Stress / Auslastung:</span>
                            {getWorkloadBadge(agg.avgWorkload)}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#555' }}>Organisation / Info:</span>
                            <span style={{ fontWeight: 'bold' }}>{agg.avgOrganization !== null ? `${agg.avgOrganization} / 5 ⭐` : '–'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#555' }}>Spaß / Stimmung:</span>
                            <span style={{ fontWeight: 'bold' }}>{agg.avgFun !== null ? `${agg.avgFun} / 5 🤩` : '–'}</span>
                          </div>
                        </div>

                        {/* Learning Recommendation */}
                        {isHighLoad && (
                          <div style={{ marginTop: 12, padding: '8px 10px', background: '#f8d7da', color: '#721c24', borderRadius: 8, fontSize: 12, display: 'flex', gap: 6 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#333' }}>💬 Notizen & Verbesserungsvorschläge ({allComments.length})</h3>
                  {areas.length > 1 && (
                    <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #ccc', fontSize: 13 }}>
                      <option value="all">Alle Bereiche</option>
                      {areas.map(a => <option key={a} value={a}>{aggregations[a].workAreaIcon} {a}</option>)}
                    </select>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allComments
                    .filter(c => selectedArea === 'all' || (c.shift?.workArea?.name || c.role) === selectedArea)
                    .map(item => (
                      <div key={item.id} style={{ padding: 14, background: '#f8f9fa', borderRadius: 10, borderLeft: '4px solid #0d6efd', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                          <div>
                            <strong style={{ color: '#333', fontSize: 13 }}>{item.shift?.workArea?.icon || '📍'} {item.shift?.workArea?.name || item.role}</strong>
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span>{new Date(item.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ({item.slot})</span>
                          </div>
                          <div style={{ fontWeight: '500', color: '#495057' }}>👤 {item.user?.name || 'Helfer'}</div>
                        </div>
                        <div style={{ fontSize: 14, color: '#212529', fontStyle: 'italic', background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e9ecef' }}>
                          "{item.ratingComment}"
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
                          {item.ratingWorkload != null && <span>Stress: <strong>{item.ratingWorkload}/5</strong></span>}
                          {item.ratingOrganization != null && <span>Orga: <strong>{item.ratingOrganization}/5</strong></span>}
                          {item.ratingFun != null && <span>Spaß: <strong>{item.ratingFun}/5</strong></span>}
                        </div>
                      </div>
                    ))}
                  {allComments.filter(c => selectedArea === 'all' || (c.shift?.workArea?.name || c.role) === selectedArea).length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#888', background: '#f8f9fa', borderRadius: 10 }}>Keine Kommentare in diesem Bereich vorhanden.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', background: '#f8f9fa' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0d6efd', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Schließen</button>
        </div>
      </div>
    </div>
  );
}
