-- Account-scoped storage usage for IronKnuckle's private file buckets.
-- SECURITY INVOKER keeps the caller subject to storage.objects RLS policies.
CREATE OR REPLACE FUNCTION public.get_ironknuckle_storage_usage()
RETURNS TABLE (
  used_bytes bigint,
  case_file_bytes bigint,
  technical_library_bytes bigint,
  file_count bigint,
  case_file_count bigint,
  technical_library_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH owned_objects AS (
    SELECT
      o.bucket_id,
      COALESCE(NULLIF(o.metadata ->> 'size', '')::bigint, 0) AS size_bytes
    FROM storage.objects AS o
    WHERE o.bucket_id IN (
      'ironknuckle-case-files',
      'ironknuckle-technical-library'
    )
      AND (storage.foldername(o.name))[1] = (SELECT auth.uid())::text
  )
  SELECT
    COALESCE(SUM(size_bytes), 0)::bigint,
    COALESCE(SUM(size_bytes) FILTER (WHERE bucket_id = 'ironknuckle-case-files'), 0)::bigint,
    COALESCE(SUM(size_bytes) FILTER (WHERE bucket_id = 'ironknuckle-technical-library'), 0)::bigint,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE bucket_id = 'ironknuckle-case-files')::bigint,
    COUNT(*) FILTER (WHERE bucket_id = 'ironknuckle-technical-library')::bigint
  FROM owned_objects;
$function$;

REVOKE ALL ON FUNCTION public.get_ironknuckle_storage_usage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ironknuckle_storage_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_ironknuckle_storage_usage() TO authenticated;
