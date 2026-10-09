create table if not exists public.waitlist_launch_campaigns (
    id uuid primary key default gen_random_uuid(),
    idempotency_key uuid not null unique,
    subject text not null check (length(subject) between 1 and 200),
    preview_text text not null default '' check (length(preview_text) <= 200),
    body text not null check (length(body) between 1 and 30000),
    initiated_by text not null,
    audience_count integer not null default 0 check (audience_count >= 0),
    status text not null default 'queued'
        check (status in ('queued', 'processing', 'complete', 'complete_with_errors')),
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

create table if not exists public.waitlist_launch_deliveries (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.waitlist_launch_campaigns(id) on delete cascade,
    subscriber_id uuid not null references public.waitlist_subscribers(id) on delete restrict,
    email_snapshot text not null,
    status text not null default 'queued'
        check (status in ('queued', 'processing', 'accepted', 'failed', 'skipped')),
    attempt_count integer not null default 0 check (attempt_count between 0 and 3),
    provider_message_id text,
    last_error text,
    created_at timestamptz not null default now(),
    processing_at timestamptz,
    accepted_at timestamptz,
    failed_at timestamptz,
    unique (campaign_id, subscriber_id)
);

create index if not exists waitlist_launch_campaigns_created_at_idx
    on public.waitlist_launch_campaigns (created_at desc);
create index if not exists waitlist_subscribers_eligible_idx
    on public.waitlist_subscribers (id)
    where status = 'active' and consent_status is true;
create unique index if not exists waitlist_launch_one_active_campaign_idx
    on public.waitlist_launch_campaigns ((true))
    where status in ('queued', 'processing');
create index if not exists waitlist_launch_deliveries_queue_idx
    on public.waitlist_launch_deliveries (campaign_id, status, created_at);
create index if not exists waitlist_launch_deliveries_subscriber_idx
    on public.waitlist_launch_deliveries (subscriber_id, created_at desc);

alter table public.waitlist_launch_campaigns enable row level security;
alter table public.waitlist_launch_deliveries enable row level security;
revoke all on table public.waitlist_launch_campaigns from public, anon, authenticated;
revoke all on table public.waitlist_launch_deliveries from public, anon, authenticated;
grant all on table public.waitlist_launch_campaigns to service_role;
grant all on table public.waitlist_launch_deliveries to service_role;

create or replace function public.create_waitlist_launch_campaign(
    p_idempotency_key uuid,
    p_subject text,
    p_preview_text text,
    p_body text,
    p_initiated_by text,
    p_expected_audience_count integer
)
returns table (campaign_id uuid, audience_count integer, campaign_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    current_campaign public.waitlist_launch_campaigns%rowtype;
    inserted_campaign_id uuid;
    inserted_audience_count integer;
begin
    if p_idempotency_key is null
        or p_subject is null or length(btrim(p_subject)) not between 1 and 200
        or p_preview_text is null or length(p_preview_text) > 200
        or p_body is null or length(btrim(p_body)) not between 1 and 30000
        or p_initiated_by is null or length(p_initiated_by) > 254
        or p_expected_audience_count is null or p_expected_audience_count < 0 then
        raise exception using errcode = '22023', message = 'Invalid campaign data';
    end if;

    select campaign.*
    into current_campaign
    from public.waitlist_launch_campaigns as campaign
    where campaign.idempotency_key = p_idempotency_key
    for update;

    if found then
        if current_campaign.subject <> btrim(p_subject)
            or current_campaign.preview_text <> p_preview_text
            or current_campaign.body <> p_body
            or current_campaign.initiated_by <> p_initiated_by then
            raise exception using errcode = '22023', message = 'Idempotency key was already used';
        end if;

        return query select current_campaign.id, current_campaign.audience_count, current_campaign.status;
        return;
    end if;

    lock table public.waitlist_subscribers in share mode;

    select count(*)::integer
    into inserted_audience_count
    from public.waitlist_subscribers as subscriber
    where subscriber.status = 'active'
        and subscriber.consent_status = true;

    if inserted_audience_count <> p_expected_audience_count then
        return query select null::uuid, inserted_audience_count, 'audience_changed'::text;
        return;
    end if;

    select campaign.*
    into current_campaign
    from public.waitlist_launch_campaigns as campaign
    where campaign.idempotency_key = p_idempotency_key
    for update;

    if found then
        if current_campaign.subject <> btrim(p_subject)
            or current_campaign.preview_text <> p_preview_text
            or current_campaign.body <> p_body
            or current_campaign.initiated_by <> p_initiated_by then
            raise exception using errcode = '22023', message = 'Idempotency key was already used';
        end if;

        return query select current_campaign.id, current_campaign.audience_count, current_campaign.status;
        return;
    end if;

    insert into public.waitlist_launch_campaigns (
        idempotency_key, subject, preview_text, body, initiated_by
    )
    values (
        p_idempotency_key, btrim(p_subject), p_preview_text, p_body, p_initiated_by
    )
    on conflict (idempotency_key) do nothing
    returning id into inserted_campaign_id;

    if inserted_campaign_id is null then
        select campaign.*
        into current_campaign
        from public.waitlist_launch_campaigns as campaign
        where campaign.idempotency_key = p_idempotency_key
        for update;

        if current_campaign.subject <> btrim(p_subject)
            or current_campaign.preview_text <> p_preview_text
            or current_campaign.body <> p_body
            or current_campaign.initiated_by <> p_initiated_by then
            raise exception using errcode = '22023', message = 'Idempotency key was already used';
        end if;

        return query select current_campaign.id, current_campaign.audience_count, current_campaign.status;
        return;
    end if;

    insert into public.waitlist_launch_deliveries (
        campaign_id, subscriber_id, email_snapshot
    )
    select inserted_campaign_id, subscriber.id, subscriber.email
    from public.waitlist_subscribers as subscriber
    where subscriber.status = 'active'
        and subscriber.consent_status = true
    on conflict (campaign_id, subscriber_id) do nothing;

    get diagnostics inserted_audience_count = row_count;
    update public.waitlist_launch_campaigns as campaign
    set audience_count = inserted_audience_count,
        status = case when inserted_audience_count = 0 then 'complete' else 'queued' end,
        completed_at = case when inserted_audience_count = 0 then now() else null end
    where campaign.id = inserted_campaign_id;

    return query
    select inserted_campaign_id, inserted_audience_count,
        case when inserted_audience_count = 0 then 'complete' else 'queued' end;
end;
$$;

create or replace function public.claim_waitlist_launch_batch(
    p_campaign_id uuid,
    p_batch_size integer default 10
)
returns table (
    delivery_id uuid,
    subscriber_id uuid,
    email_snapshot text,
    attempt_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if p_batch_size is null or p_batch_size not between 1 and 25 then
        raise exception using errcode = '22023', message = 'Invalid batch size';
    end if;

    if not pg_try_advisory_xact_lock(hashtextextended(p_campaign_id::text, 0)) then
        return;
    end if;

    update public.waitlist_launch_deliveries as delivery
    set status = case when delivery.attempt_count >= 3 then 'failed' else 'queued' end,
        last_error = case when delivery.attempt_count >= 3
            then 'Delivery timed out after the maximum number of attempts'
            else delivery.last_error
        end,
        failed_at = case when delivery.attempt_count >= 3 then now() else null end,
        processing_at = null
    where delivery.campaign_id = p_campaign_id
        and delivery.status = 'processing'
        and delivery.processing_at < now() - interval '15 minutes';

    if exists (
        select 1
        from public.waitlist_launch_deliveries as delivery
        where delivery.campaign_id = p_campaign_id
            and delivery.status = 'processing'
    ) then
        return;
    end if;

    update public.waitlist_launch_deliveries as delivery
    set status = 'skipped',
        last_error = 'Subscriber is no longer eligible for launch email',
        processing_at = null
    from public.waitlist_subscribers as subscriber
    where delivery.subscriber_id = subscriber.id
        and delivery.campaign_id = p_campaign_id
        and delivery.status = 'queued'
        and (subscriber.status <> 'active' or subscriber.consent_status is not true);

    update public.waitlist_launch_campaigns as campaign
    set status = 'processing'
    where campaign.id = p_campaign_id and campaign.status = 'queued';

    return query
    with candidates as (
        select delivery.id
        from public.waitlist_launch_deliveries as delivery
        where delivery.campaign_id = p_campaign_id
            and delivery.status = 'queued'
        order by delivery.created_at, delivery.id
        limit p_batch_size
        for update skip locked
    ),
    claimed as (
        update public.waitlist_launch_deliveries as delivery
        set status = 'processing',
            attempt_count = delivery.attempt_count + 1,
            processing_at = now(),
            last_error = null
        from candidates
        where delivery.id = candidates.id
        returning delivery.id, delivery.subscriber_id, delivery.email_snapshot, delivery.attempt_count
    )
    select claimed.id, claimed.subscriber_id, claimed.email_snapshot, claimed.attempt_count
    from claimed;
end;
$$;

create or replace function public.get_waitlist_admin_summary()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
    select jsonb_build_object(
        'total_subscribers',
            (select count(*) from public.waitlist_subscribers),
        'active_subscribers',
            (select count(*) from public.waitlist_subscribers
                where status = 'active' and consent_status is true),
        'new_last_7_days',
            (select count(*) from public.waitlist_subscribers
                where created_at >= now() - interval '7 days'),
        'new_last_30_days',
            (select count(*) from public.waitlist_subscribers
                where created_at >= now() - interval '30 days'),
        'pending_notifications',
            (select count(*) from public.waitlist_notification_outbox where status = 'pending'),
        'failed_notifications',
            (select count(*) from public.waitlist_notification_outbox where status = 'failed'),
        'signup_trend',
            coalesce((
                select jsonb_agg(jsonb_build_object('date', daily.signup_date, 'count', daily.signup_count)
                    order by daily.signup_date)
                from (
                    select day::date as signup_date,
                        (select count(*)
                            from public.waitlist_subscribers as subscriber
                            where subscriber.created_at >= (day at time zone 'UTC')
                                and subscriber.created_at < ((day + interval '1 day') at time zone 'UTC')) as signup_count
                    from generate_series(
                        date_trunc('day', now() at time zone 'UTC') - interval '29 days',
                        date_trunc('day', now() at time zone 'UTC'),
                        interval '1 day'
                    ) as days(day)
                ) as daily
            ), '[]'::jsonb),
        'recent_signups',
            coalesce((
                select jsonb_agg(jsonb_build_object(
                    'email', recent.email,
                    'created_at', recent.created_at,
                    'status', recent.status,
                    'consent_status', recent.consent_status
                ) order by recent.created_at desc)
                from (
                    select email, created_at, status, consent_status
                    from public.waitlist_subscribers
                    order by created_at desc
                    limit 8
                ) as recent
            ), '[]'::jsonb),
        'recent_activity',
            coalesce((
                select jsonb_agg(jsonb_build_object(
                    'email', recent.email,
                    'status', recent.status,
                    'attempt_count', recent.attempt_count,
                    'created_at', recent.created_at,
                    'sent_at', recent.sent_at,
                    'last_error', recent.last_error
                ) order by recent.created_at desc)
                from (
                    select subscriber.email, notification.status, notification.attempt_count,
                        notification.created_at, notification.sent_at, notification.last_error
                    from public.waitlist_notification_outbox as notification
                    join public.waitlist_subscribers as subscriber
                        on subscriber.id = notification.subscriber_id
                    order by notification.created_at desc
                    limit 8
                ) as recent
            ), '[]'::jsonb)
    );
$$;

revoke all on function public.create_waitlist_launch_campaign(uuid, text, text, text, text, integer)
    from public, anon, authenticated;
revoke all on function public.claim_waitlist_launch_batch(uuid, integer)
    from public, anon, authenticated;
revoke all on function public.get_waitlist_admin_summary()
    from public, anon, authenticated;
grant execute on function public.create_waitlist_launch_campaign(uuid, text, text, text, text, integer)
    to service_role;
grant execute on function public.claim_waitlist_launch_batch(uuid, integer)
    to service_role;
grant execute on function public.get_waitlist_admin_summary()
    to service_role;
