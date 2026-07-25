import { describe, it, expect } from 'vitest';
import { aggregateFeedbackByWorkArea, FeedbackItem } from '../src/utils/ratingUtils.js';

describe('aggregateFeedbackByWorkArea', () => {
  it('aggregates ratings and comments correctly by work area', () => {
    const mockFeedbacks: FeedbackItem[] = [
      {
        id: 1,
        ratingWorkload: 5,
        ratingOrganization: 4,
        ratingFun: 5,
        ratingComment: 'Zu stressig ab 14 Uhr, wir brauchten 1 Helfer mehr',
        shift: { workArea: { name: 'Kaffee & Kuchen', icon: '🍰' } }
      },
      {
        id: 2,
        ratingWorkload: 3,
        ratingOrganization: 4,
        ratingFun: 4,
        ratingComment: '',
        shift: { workArea: { name: 'Kaffee & Kuchen', icon: '🍰' } }
      },
      {
        id: 3,
        ratingWorkload: 2,
        ratingOrganization: 5,
        ratingFun: 5,
        ratingComment: 'Alles top organisiert',
        shift: { workArea: { name: 'Turnierleitung', icon: '🏆' } }
      }
    ];

    const aggregated = aggregateFeedbackByWorkArea(mockFeedbacks);

    expect(Object.keys(aggregated)).toHaveLength(2);
    
    const kaffee = aggregated['Kaffee & Kuchen'];
    expect(kaffee.totalRatings).toBe(2);
    expect(kaffee.avgWorkload).toBe(4); // (5+3)/2
    expect(kaffee.avgOrganization).toBe(4); // (4+4)/2
    expect(kaffee.avgFun).toBe(4.5); // (5+4)/2
    expect(kaffee.comments).toHaveLength(1);
    expect(kaffee.comments[0].comment).toBe('Zu stressig ab 14 Uhr, wir brauchten 1 Helfer mehr');

    const leitung = aggregated['Turnierleitung'];
    expect(leitung.totalRatings).toBe(1);
    expect(leitung.avgWorkload).toBe(2);
    expect(leitung.avgOrganization).toBe(5);
    expect(leitung.avgFun).toBe(5);
    expect(leitung.comments).toHaveLength(1);
    expect(leitung.comments[0].comment).toBe('Alles top organisiert');
  });

  it('handles empty feedbacks array', () => {
    const aggregated = aggregateFeedbackByWorkArea([]);
    expect(aggregated).toEqual({});
  });
});
