begin;

delete from public.prototype_reviews;
delete from public.prototype_review_configs;
delete from storage.objects where bucket_id = 'review-assets';

commit;
