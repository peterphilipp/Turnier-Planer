export interface FeedbackItem {
  id: number;
  ratingWorkload?: number | null;
  ratingOrganization?: number | null;
  ratingFun?: number | null;
  ratingComment?: string | null;
  shift?: {
    workArea?: {
      id?: number;
      name?: string;
      icon?: string;
    } | null;
  } | null;
}

export interface WorkAreaFeedbackAggregation {
  workAreaName: string;
  workAreaIcon: string;
  totalRatings: number;
  avgWorkload: number | null;
  avgOrganization: number | null;
  avgFun: number | null;
  comments: { id: number; comment: string; workAreaName: string }[];
}

export function aggregateFeedbackByWorkArea(feedbacks: FeedbackItem[]): Record<string, WorkAreaFeedbackAggregation> {
  const result: Record<string, WorkAreaFeedbackAggregation> = {};

  for (const item of feedbacks) {
    const areaName = item.shift?.workArea?.name || 'Allgemein';
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

    // Compute simple running averages or collect values
    if (item.ratingWorkload != null && item.ratingWorkload >= 1 && item.ratingWorkload <= 5) {
      agg.avgWorkload = agg.avgWorkload === null 
        ? item.ratingWorkload 
        : (agg.avgWorkload * agg.totalRatings + item.ratingWorkload) / (agg.totalRatings + 1);
    }
    if (item.ratingOrganization != null && item.ratingOrganization >= 1 && item.ratingOrganization <= 5) {
      agg.avgOrganization = agg.avgOrganization === null 
        ? item.ratingOrganization 
        : (agg.avgOrganization * agg.totalRatings + item.ratingOrganization) / (agg.totalRatings + 1);
    }
    if (item.ratingFun != null && item.ratingFun >= 1 && item.ratingFun <= 5) {
      agg.avgFun = agg.avgFun === null 
        ? item.ratingFun 
        : (agg.avgFun * agg.totalRatings + item.ratingFun) / (agg.totalRatings + 1);
    }

    if (item.ratingWorkload != null || item.ratingOrganization != null || item.ratingFun != null) {
      agg.totalRatings += 1;
    }

    if (item.ratingComment && item.ratingComment.trim().length > 0) {
      agg.comments.push({
        id: item.id,
        comment: item.ratingComment.trim(),
        workAreaName: areaName
      });
    }
  }

  // Rundung auf 1 Nachkommastelle
  for (const key in result) {
    const agg = result[key];
    if (agg.avgWorkload !== null) agg.avgWorkload = Math.round(agg.avgWorkload * 10) / 10;
    if (agg.avgOrganization !== null) agg.avgOrganization = Math.round(agg.avgOrganization * 10) / 10;
    if (agg.avgFun !== null) agg.avgFun = Math.round(agg.avgFun * 10) / 10;
  }

  return result;
}
