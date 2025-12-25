import { QuotaAudienceData } from "@/components/quota-audience-selector";

/**
 * Backend-safe quota payload
 *  - sends ONLY active quotas
 *  - strips UI-only fields
 *  - matches Joi validation exactly
 */
export const buildQuotaUpdatePayload = (quotaAudience: QuotaAudienceData) => {
  const isActive = (q: any) =>
    (q.quota_type === "COUNT" && q.target_count > 0) ||
    (q.quota_type === "PERCENTAGE" && q.target_percentage > 0);

  return {
    total_target: quotaAudience.totalTarget,

    completed_url: quotaAudience.completedUrl ?? "",
    terminated_url: quotaAudience.terminatedUrl ?? "",
    quota_full_url: quotaAudience.quotaFullUrl ?? "",

    is_active: quotaAudience.quotaEnabled,

    age_quotas: quotaAudience.ageQuotas
      .filter(isActive)
      .map(
        ({
          min_age,
          max_age,
          quota_type,
          target_count,
          target_percentage,
        }) => ({
          min_age,
          max_age,
          quota_type,
          ...(quota_type === "COUNT"
            ? { target_count }
            : { target_percentage }),
        })
      ),

    gender_quotas: quotaAudience.genderQuotas
      .filter(isActive)
      .map(({ gender, quota_type, target_count, target_percentage }) => ({
        gender,
        quota_type,
        ...(quota_type === "COUNT" ? { target_count } : { target_percentage }),
      })),

    location_quotas: quotaAudience.locationQuotas
      .filter(isActive)
      .map(
        ({
          country,
          state,
          city,
          postal_code,
          quota_type,
          target_count,
          target_percentage,
        }) => ({
          country,
          state,
          city,
          postal_code,
          quota_type,
          ...(quota_type === "COUNT"
            ? { target_count }
            : { target_percentage }),
        })
      ),

    category_quotas: (quotaAudience.categoryQuotas || [])
      .filter(isActive)
      .map(
        ({
          surveyCategoryId,
          categoryName,
          quota_type,
          target_count,
          target_percentage,
        }) => ({
          surveyCategoryId,
          categoryName, // REQUIRED by Joi
          quota_type,
          ...(quota_type === "COUNT"
            ? { target_count }
            : { target_percentage }),
        })
      ),

    screening_questions: quotaAudience.screeningQuestions,
  };
};
